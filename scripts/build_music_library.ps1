[CmdletBinding()]
param(
  [string]$AudioRoot = 'D:\CloudMusic\ncm-studio-71-tracks',
  [string]$LyricsRoot = 'D:\CloudMusic\ncm-studio-71-tracks-lrc-recovered'
)

$ErrorActionPreference = 'Stop'

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "缺少必需命令：$Name"
  }
}

Require-Command 'ffprobe'
Require-Command 'ffmpeg'

if (-not (Test-Path -LiteralPath $AudioRoot -PathType Container)) {
  throw "音频目录不存在：$AudioRoot"
}
if (-not (Test-Path -LiteralPath $LyricsRoot -PathType Container)) {
  throw "歌词目录不存在：$LyricsRoot"
}

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$assetRoot = Join-Path $repoRoot 'assets\music'
$audioOutput = Join-Path $assetRoot 'audio'
$coverOutput = Join-Path $assetRoot 'covers'
$lyricsOutput = Join-Path $assetRoot 'lyrics'
$manifestPath = Join-Path $repoRoot 'js\library.js'

foreach ($directory in @($assetRoot, $audioOutput, $coverOutput, $lyricsOutput)) {
  if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory | Out-Null
  }
}

$audioFiles = @(Get-ChildItem -LiteralPath $AudioRoot -File -Filter '*.mp3' | Sort-Object Name)
if ($audioFiles.Count -ne 80) {
  throw "应找到 80 首 MP3，实际找到 $($audioFiles.Count) 首。"
}

$strictUtf8 = [Text.UTF8Encoding]::new($false, $true)
$manifest = [Collections.Generic.List[object]]::new()
$hashChecks = [Collections.Generic.List[object]]::new()

for ($index = 0; $index -lt $audioFiles.Count; $index += 1) {
  $audioFile = $audioFiles[$index]
  $number = ($index + 1).ToString('000')
  $lyricsFile = Join-Path $LyricsRoot ($audioFile.BaseName + '.lrc')
  if (-not (Test-Path -LiteralPath $lyricsFile -PathType Leaf)) {
    throw "缺少匹配歌词：$($audioFile.Name)"
  }

  $probe = & ffprobe -v error -print_format json -show_format -show_streams -- $audioFile.FullName | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) {
    throw "读取音频元数据失败：$($audioFile.Name)"
  }
  $coverStream = @($probe.streams | Where-Object { $_.disposition.attached_pic -eq 1 }) | Select-Object -First 1
  if (-not $coverStream) {
    throw "音频没有内嵌封面：$($audioFile.Name)"
  }

  $audioDestination = Join-Path $audioOutput "$number.mp3"
  $coverDestination = Join-Path $coverOutput "$number.webp"
  $lyricsDestination = Join-Path $lyricsOutput "$number.lrc"

  Copy-Item -LiteralPath $audioFile.FullName -Destination $audioDestination -Force
  Copy-Item -LiteralPath $lyricsFile -Destination $lyricsDestination -Force

  & ffmpeg -v error -y -i $audioFile.FullName -map '0:v:0' -frames:v 1 -c:v libwebp -quality 84 -compression_level 6 $coverDestination
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $coverDestination -PathType Leaf)) {
    throw "提取封面失败：$($audioFile.Name)"
  }

  $lyricsBytes = [IO.File]::ReadAllBytes($lyricsDestination)
  try {
    $lyricsText = $strictUtf8.GetString($lyricsBytes)
  } catch {
    throw "歌词不是有效 UTF-8：$($audioFile.BaseName).lrc"
  }
  $timedLineCount = @($lyricsText -split "`r?`n" | Where-Object {
    $_ -match '^\[(\d{1,3}):(\d{2})(?:[\.:](\d{1,3}))?\]'
  }).Count

  $sourceHash = (Get-FileHash -LiteralPath $audioFile.FullName -Algorithm SHA256).Hash
  $outputHash = (Get-FileHash -LiteralPath $audioDestination -Algorithm SHA256).Hash
  $hashChecks.Add([pscustomobject]@{
    Number = $number
    File = $audioFile.Name
    Match = $sourceHash -eq $outputHash
  })

  $manifest.Add([ordered]@{
    id = "library-$number"
    title = [string]$probe.format.tags.title
    artist = [string]$probe.format.tags.artist
    album = [string]$probe.format.tags.album
    duration = [math]::Round([double]$probe.format.duration, 3)
    sortOrder = $index
    audioUrl = "./assets/music/audio/$number.mp3"
    coverUrl = "./assets/music/covers/$number.webp"
    lyricsUrl = "./assets/music/lyrics/$number.lrc"
    timedLyrics = $timedLineCount -gt 0
  })

  if (($index + 1) % 10 -eq 0 -or $index -eq $audioFiles.Count - 1) {
    Write-Output "已处理 $($index + 1)/$($audioFiles.Count)"
  }
}

if ($hashChecks.Where({ -not $_.Match }).Count) {
  throw '至少一首复制后的音频与源文件 SHA-256 不一致。'
}

$json = $manifest | ConvertTo-Json -Depth 5
$manifestScript = "window.MUSIC_LIBRARY = Object.freeze($json);`n"
[IO.File]::WriteAllText($manifestPath, $manifestScript, [Text.UTF8Encoding]::new($false))

$generatedAudio = @(Get-ChildItem -LiteralPath $audioOutput -File -Filter '*.mp3')
$generatedCovers = @(Get-ChildItem -LiteralPath $coverOutput -File -Filter '*.webp')
$generatedLyrics = @(Get-ChildItem -LiteralPath $lyricsOutput -File -Filter '*.lrc')
if ($generatedAudio.Count -ne 80 -or $generatedCovers.Count -ne 80 -or $generatedLyrics.Count -ne 80) {
  throw "生成数量不正确：音频 $($generatedAudio.Count)，封面 $($generatedCovers.Count)，歌词 $($generatedLyrics.Count)。"
}

[pscustomobject]@{
  Tracks = $manifest.Count
  TimedLyrics = $manifest.Where({ $_.timedLyrics }).Count
  AudioMB = [math]::Round((($generatedAudio | Measure-Object Length -Sum).Sum / 1MB), 2)
  CoverMB = [math]::Round((($generatedCovers | Measure-Object Length -Sum).Sum / 1MB), 2)
  LyricsKB = [math]::Round((($generatedLyrics | Measure-Object Length -Sum).Sum / 1KB), 2)
  Manifest = $manifestPath
} | Format-List
