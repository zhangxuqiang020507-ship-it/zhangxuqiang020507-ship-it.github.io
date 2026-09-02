"""Build a subtle, seamless shoreline cinemagraph from a single still image.

The sky, sun, horizon, and dry sand remain locked. Only the open water,
breakers, foam, wet shoreline, and reflected light receive small periodic
displacements. Frames are streamed directly into ffmpeg, so no temporary frame
sequence is left behind.
"""

from __future__ import annotations

import argparse
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps


def smoothstep(edge0: float, edge1: float, value: np.ndarray) -> np.ndarray:
    position = np.clip((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return position * position * (3.0 - 2.0 * position)


def bilinear_sample(image: np.ndarray, map_x: np.ndarray, map_y: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    map_x = np.clip(map_x, 0.0, width - 1.001)
    map_y = np.clip(map_y, 0.0, height - 1.001)

    x0 = np.floor(map_x).astype(np.int32)
    y0 = np.floor(map_y).astype(np.int32)
    x1 = np.minimum(x0 + 1, width - 1)
    y1 = np.minimum(y0 + 1, height - 1)

    fx = (map_x - x0)[..., None]
    fy = (map_y - y0)[..., None]
    top = image[y0, x0] * (1.0 - fx) + image[y0, x1] * fx
    bottom = image[y1, x0] * (1.0 - fx) + image[y1, x1] * fx
    return top * (1.0 - fy) + bottom * fy


def render_frame(
    source: np.ndarray,
    x_grid: np.ndarray,
    y_grid: np.ndarray,
    phase: float,
) -> np.ndarray:
    # Horizon is near y=349 at 1280x720. Fade the deformation in below it and
    # back out before the dry sand, so the original composition stays locked.
    water = smoothstep(346.0, 370.0, y_grid) * (1.0 - smoothstep(576.0, 612.0, y_grid))
    open_water = smoothstep(350.0, 374.0, y_grid) * (1.0 - smoothstep(455.0, 485.0, y_grid))
    breaker = smoothstep(425.0, 456.0, y_grid) * (1.0 - smoothstep(527.0, 562.0, y_grid))
    wet_shore = smoothstep(505.0, 535.0, y_grid) * (1.0 - smoothstep(590.0, 620.0, y_grid))

    # Travelling fields loop exactly at 2*pi. Their amplitudes stay below a few
    # pixels: enough to make the water live, without making the still wobble.
    dx = water * (
        1.15 * np.sin((y_grid * 0.071) + phase)
        + 0.55 * np.sin((y_grid * 0.143) - (phase * 2.0))
    )
    dx += breaker * 0.75 * np.sin((x_grid * 0.019) - phase)

    dy = open_water * (
        0.75 * np.sin((x_grid * 0.012) - phase)
        + 0.35 * np.sin((x_grid * 0.026) + (phase * 2.0))
    )
    dy += breaker * (
        2.55 * np.sin((x_grid * 0.0085) - phase)
        + 0.95 * np.sin((x_grid * 0.020) + (phase * 2.0))
    )
    dy += wet_shore * 0.65 * np.sin((x_grid * 0.017) - (phase * 2.0))

    warped = bilinear_sample(source, x_grid + dx, y_grid + dy)

    # Very small luminance motion in the reflected path and white foam. This is
    # dynamic light, not a color grade; chroma and the static regions stay intact.
    reflection = np.exp(-np.square((x_grid - 640.0) / 135.0))
    reflection *= smoothstep(470.0, 520.0, y_grid) * (1.0 - smoothstep(612.0, 652.0, y_grid))
    shimmer = 1.0 + reflection * (
        0.016 * np.sin((y_grid * 0.165) + (phase * 2.0))
        + 0.008 * np.sin((x_grid * 0.029) - phase)
    )

    luminance = (source[..., 0] * 0.2126) + (source[..., 1] * 0.7152) + (source[..., 2] * 0.0722)
    foam = (luminance > 158.0).astype(np.float32) * breaker
    foam_pulse = 1.0 + foam * 0.009 * np.sin((x_grid * 0.015) - phase)

    warped *= (shimmer * foam_pulse)[..., None]
    return np.clip(warped, 0.0, 255.0).astype(np.uint8)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--duration", type=float, default=8.0)
    parser.add_argument("--fps", type=int, default=24)
    parser.add_argument("--phase-offset-frames", type=int, default=1)
    args = parser.parse_args()

    width, height = 1280, 720
    frame_count = round(args.duration * args.fps)
    if frame_count < 2:
        raise ValueError("duration and fps must produce at least two frames")

    source_image = Image.open(args.input).convert("RGB")
    source_image = ImageOps.fit(source_image, (width, height), method=Image.Resampling.LANCZOS)
    source = np.asarray(source_image, dtype=np.float32)
    x_grid, y_grid = np.meshgrid(
        np.arange(width, dtype=np.float32),
        np.arange(height, dtype=np.float32),
    )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg_command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s:v",
        f"{width}x{height}",
        "-r",
        str(args.fps),
        "-i",
        "-",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "22",
        "-profile:v",
        "high",
        "-level",
        "4.0",
        "-pix_fmt",
        "yuv420p",
        "-g",
        str(args.fps * 2),
        "-keyint_min",
        str(args.fps * 2),
        "-sc_threshold",
        "0",
        "-force_key_frames",
        f"0,{(frame_count - 1) / args.fps:.6f}",
        "-movflags",
        "+faststart",
        str(args.output),
    ]

    process = subprocess.Popen(ffmpeg_command, stdin=subprocess.PIPE)
    assert process.stdin is not None
    try:
        for frame_index in range(frame_count):
            cycle_frame = (frame_index + args.phase_offset_frames) % frame_count
            phase = 2.0 * math.pi * cycle_frame / frame_count
            process.stdin.write(render_frame(source, x_grid, y_grid, phase).tobytes())
    finally:
        process.stdin.close()

    return_code = process.wait()
    if return_code != 0:
        raise RuntimeError(f"ffmpeg failed with exit code {return_code}")

    print(args.output.resolve())


if __name__ == "__main__":
    main()
