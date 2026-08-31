[CmdletBinding()]
param(
  [string]$RepositoryRoot = (Split-Path -Parent $PSScriptRoot)
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-Id3PrefixSize {
  param([Parameter(Mandatory)][string]$Path)

  $stream = [System.IO.File]::OpenRead($Path)
  try {
    $header = [byte[]]::new(10)
    if ($stream.Read($header, 0, 10) -ne 10 -or
        $header[0] -ne 0x49 -or $header[1] -ne 0x44 -or $header[2] -ne 0x33) {
      return 0L
    }
    return 10L + (($header[6] -band 0x7f) -shl 21) + (($header[7] -band 0x7f) -shl 14) +
      (($header[8] -band 0x7f) -shl 7) + ($header[9] -band 0x7f)
  }
  finally {
    $stream.Dispose()
  }
}

function Get-AudioPacketHash {
  param([Parameter(Mandatory)][string]$Path)

  $result = & ffmpeg -hide_banner -loglevel error -i $Path -map 0:a:0 -c copy -f hash -hash sha256 - 2>&1
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg 无法读取音频：$Path`n$result" }
  $line = $result | Where-Object { $_ -match '^SHA256=[0-9a-fA-F]{64}$' } | Select-Object -Last 1
  if (-not $line) { throw "无法取得音频数据哈希：$Path" }
  return ($line -replace '^SHA256=', '').ToLowerInvariant()
}

$root = [System.IO.Path]::GetFullPath($RepositoryRoot)
$allowedDirectories = @(
  [System.IO.Path]::GetFullPath((Join-Path $root 'assets\music\audio')),
  [System.IO.Path]::GetFullPath((Join-Path $root 'assets\audio\background'))
)
$inputs = $allowedDirectories | ForEach-Object {
  if (-not (Test-Path -LiteralPath $_ -PathType Container)) { throw "音频目录不存在：$_" }
  Get-ChildItem -LiteralPath $_ -Filter '*.mp3' -File
}

if (-not $inputs) { throw '没有找到需要优化的 MP3 文件。' }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw '找不到 ffmpeg。' }
if (-not (Get-Command ffprobe -ErrorAction SilentlyContinue)) { throw '找不到 ffprobe。' }

$tempBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$tempRoot = [System.IO.Path]::GetFullPath((Join-Path $tempBase ("zqx-web-audio-{0}" -f [guid]::NewGuid().ToString('N'))))
if (-not $tempRoot.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "临时目录不在系统临时目录内：$tempRoot"
}
New-Item -ItemType Directory -Path $tempRoot | Out-Null

$prepared = [System.Collections.Generic.List[object]]::new()
try {
  foreach ($input in $inputs) {
    $inputPath = [System.IO.Path]::GetFullPath($input.FullName)
    if (-not ($allowedDirectories | Where-Object { $inputPath.StartsWith($_ + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase) })) {
      throw "拒绝处理范围外文件：$inputPath"
    }

    $relativePath = [System.IO.Path]::GetRelativePath($root, $inputPath)
    $outputPath = [System.IO.Path]::GetFullPath((Join-Path $tempRoot $relativePath))
    $outputDirectory = Split-Path -Parent $outputPath
    New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

    & ffmpeg -hide_banner -loglevel error -y -i $inputPath -map 0:a:0 -c:a copy -map_metadata 0 `
      -id3v2_version 3 -write_id3v1 1 $outputPath
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $outputPath -PathType Leaf)) {
      throw "音频优化失败：$relativePath"
    }

    $probeText = & ffprobe -v error -show_entries stream=codec_name -of json $outputPath 2>&1
    if ($LASTEXITCODE -ne 0) { throw "ffprobe 验证失败：$relativePath`n$probeText" }
    $probe = $probeText | ConvertFrom-Json
    if ($probe.streams.Count -ne 1 -or $probe.streams[0].codec_name -ne 'mp3') {
      throw "优化结果仍含有非音频流：$relativePath"
    }

    $beforeHash = Get-AudioPacketHash -Path $inputPath
    $afterHash = Get-AudioPacketHash -Path $outputPath
    if ($beforeHash -ne $afterHash) { throw "音频数据发生变化：$relativePath" }

    $prepared.Add([pscustomobject]@{
      RelativePath = $relativePath
      InputPath = $inputPath
      OutputPath = $outputPath
      BeforeBytes = $input.Length
      AfterBytes = (Get-Item -LiteralPath $outputPath).Length
      BeforeId3Bytes = Get-Id3PrefixSize -Path $inputPath
      AfterId3Bytes = Get-Id3PrefixSize -Path $outputPath
      AudioHash = $afterHash
    })
  }

  foreach ($item in $prepared) {
    [System.IO.File]::Move($item.OutputPath, $item.InputPath, $true)
  }

  $beforeBytes = ($prepared | Measure-Object -Property BeforeBytes -Sum).Sum
  $afterBytes = ($prepared | Measure-Object -Property AfterBytes -Sum).Sum
  $beforeId3Bytes = ($prepared | Measure-Object -Property BeforeId3Bytes -Sum).Sum
  $afterId3Bytes = ($prepared | Measure-Object -Property AfterId3Bytes -Sum).Sum
  [pscustomobject]@{
    Files = $prepared.Count
    BeforeBytes = $beforeBytes
    AfterBytes = $afterBytes
    SavedBytes = $beforeBytes - $afterBytes
    BeforeId3Bytes = $beforeId3Bytes
    AfterId3Bytes = $afterId3Bytes
    AudioPacketHashesVerified = $prepared.Count
  } | Format-List
}
finally {
  if (Test-Path -LiteralPath $tempRoot) {
    $resolvedTempRoot = [System.IO.Path]::GetFullPath($tempRoot)
    if (-not $resolvedTempRoot.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase) -or
        -not ([System.IO.Path]::GetFileName($resolvedTempRoot)).StartsWith('zqx-web-audio-', [System.StringComparison]::Ordinal)) {
      throw "拒绝清理未验证的临时目录：$resolvedTempRoot"
    }
    Remove-Item -LiteralPath $resolvedTempRoot -Recurse -Force
  }
}
