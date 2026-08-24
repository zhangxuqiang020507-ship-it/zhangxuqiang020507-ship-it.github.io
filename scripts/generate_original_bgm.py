"""Create the original looping background piece used by zhangxuqiang.top.

The composition and every sound are synthesized locally. No samples or source
recordings are read by this script.
"""

from __future__ import annotations

import argparse
import math
import wave
from pathlib import Path

import numpy as np


SAMPLE_RATE = 44_100
BPM = 72
BEAT_SECONDS = 60 / BPM
BAR_SECONDS = BEAT_SECONDS * 4
BAR_COUNT = 24
DURATION_SECONDS = BAR_SECONDS * BAR_COUNT
RANDOM_SEED = 20_260_824


def midi_frequency(note: int) -> float:
    return 440.0 * 2 ** ((note - 69) / 12)


def stereo_gains(pan: float) -> tuple[float, float]:
    angle = (max(-1.0, min(1.0, pan)) + 1.0) * math.pi / 4
    return math.cos(angle), math.sin(angle)


def add_voice(
    mix: np.ndarray,
    start: float,
    duration: float,
    note: int,
    amplitude: float,
    pan: float,
    voice: str,
    rng: np.random.Generator,
) -> None:
    start_sample = max(0, round(start * SAMPLE_RATE))
    sample_count = min(round(duration * SAMPLE_RATE), len(mix) - start_sample)
    if sample_count <= 0:
        return

    time = np.arange(sample_count, dtype=np.float64) / SAMPLE_RATE
    frequency = midi_frequency(note)
    if voice == "piano":
        attack = np.minimum(1.0, time / 0.012)
        envelope = attack * np.exp(-time * (1.7 + frequency / 2_200))
        detune = frequency * 1.0032
        signal = (
            np.sin(2 * np.pi * frequency * time)
            + 0.34 * np.sin(2 * np.pi * frequency * 2.01 * time + 0.18)
            + 0.16 * np.sin(2 * np.pi * frequency * 3.98 * time + 0.41)
            + 0.09 * np.sin(2 * np.pi * detune * time)
        )
        hammer = rng.normal(0, 1, sample_count) * np.exp(-time * 58) * 0.022
        signal = (signal * envelope + hammer) * amplitude
    elif voice == "pluck":
        attack = np.minimum(1.0, time / 0.005)
        envelope = attack * np.exp(-time * 4.6)
        signal = sum(
            (1 / harmonic**1.35)
            * np.sin(2 * np.pi * frequency * harmonic * time + harmonic * 0.13)
            for harmonic in range(1, 7)
        )
        signal = np.tanh(signal * 0.85) * envelope * amplitude
    elif voice == "pad":
        attack = np.minimum(1.0, time / 0.7)
        release = np.minimum(1.0, np.maximum(0.0, duration - time) / 0.8)
        envelope = attack * release
        signal = (
            np.sin(2 * np.pi * frequency * time)
            + 0.33 * np.sin(2 * np.pi * frequency * 0.5 * time + 0.7)
            + 0.12 * np.sin(2 * np.pi * frequency * 2 * time + 1.2)
        )
        signal = signal * envelope * amplitude
    else:
        raise ValueError(f"Unknown voice: {voice}")

    left_gain, right_gain = stereo_gains(pan)
    mix[start_sample : start_sample + sample_count, 0] += signal * left_gain
    mix[start_sample : start_sample + sample_count, 1] += signal * right_gain


def add_rain(mix: np.ndarray, rng: np.random.Generator) -> None:
    sample_count = len(mix)
    noise = rng.normal(0, 1, sample_count)
    spectrum = np.fft.rfft(noise)
    frequencies = np.fft.rfftfreq(sample_count, 1 / SAMPLE_RATE)
    shaping = np.zeros_like(frequencies)
    positive = frequencies > 0
    shaping[positive] = (
        (frequencies[positive] / 600) ** 0.28
        / (1 + (frequencies[positive] / 7_500) ** 2.2)
    )
    rain = np.fft.irfft(spectrum * shaping, n=sample_count)
    rain /= max(1e-9, np.max(np.abs(rain)))
    mix[:, 0] += rain * 0.032
    mix[:, 1] += np.roll(rain, 1_379) * 0.029

    for _ in range(92):
        start = rng.uniform(0.5, DURATION_SECONDS - 0.5)
        duration = rng.uniform(0.08, 0.24)
        start_sample = round(start * SAMPLE_RATE)
        drop_count = min(round(duration * SAMPLE_RATE), sample_count - start_sample)
        time = np.arange(drop_count, dtype=np.float64) / SAMPLE_RATE
        frequency = rng.uniform(1_250, 3_800)
        drop = np.sin(2 * np.pi * frequency * time) * np.exp(-time * rng.uniform(20, 38))
        drop += rng.normal(0, 0.12, drop_count) * np.exp(-time * 30)
        amplitude = rng.uniform(0.005, 0.017)
        left_gain, right_gain = stereo_gains(rng.uniform(-0.95, 0.95))
        mix[start_sample : start_sample + drop_count, 0] += drop * amplitude * left_gain
        mix[start_sample : start_sample + drop_count, 1] += drop * amplitude * right_gain


def compose() -> np.ndarray:
    rng = np.random.default_rng(RANDOM_SEED)
    sample_count = round(DURATION_SECONDS * SAMPLE_RATE)
    mix = np.zeros((sample_count, 2), dtype=np.float64)

    chords = [
        (48, 55, 59, 64),  # Cmaj7
        (47, 55, 59, 62),  # G/B add9
        (45, 52, 55, 60),  # Am7
        (43, 50, 55, 59),  # G6
        (41, 48, 52, 57),  # Fmaj7
        (40, 48, 55, 60),  # C/E
        (50, 57, 60, 65),  # Dm7
        (43, 50, 55, 62),  # G
    ]
    arpeggio = (0, 2, 1, 3, 2, 1, 0, 2)
    melody = [
        ((1.5, 67, 0.75), (3.0, 69, 0.7)),
        ((0.5, 71, 0.55), (2.5, 69, 0.8)),
        ((1.0, 64, 0.65), (2.0, 67, 0.65), (3.25, 69, 0.55)),
        ((0.5, 67, 0.75), (2.5, 62, 0.8)),
        ((1.0, 64, 0.7), (2.5, 65, 0.7)),
        ((0.5, 67, 0.55), (1.75, 72, 0.7), (3.0, 71, 0.6)),
        ((1.0, 69, 0.7), (2.5, 65, 0.75)),
        ((0.5, 62, 0.8), (2.25, 67, 0.85)),
    ]

    for bar in range(BAR_COUNT):
        chord = chords[bar % len(chords)]
        bar_start = bar * BAR_SECONDS
        section = bar // 8
        pad_level = (0.022, 0.026, 0.029)[section]
        for note_index, note in enumerate(chord):
            add_voice(
                mix,
                bar_start,
                BAR_SECONDS * 0.98,
                note - 12 if note_index < 2 else note,
                pad_level,
                -0.45 + note_index * 0.3,
                "pad",
                rng,
            )

        for step, chord_index in enumerate(arpeggio):
            start = bar_start + step * BEAT_SECONDS / 2
            note = chord[chord_index] + (12 if step in (3, 7) else 0)
            velocity = 0.055 + (0.008 if step in (0, 4) else 0)
            add_voice(mix, start, 2.1, note, velocity, -0.32 + step * 0.09, "piano", rng)

        for beat in (0, 2):
            add_voice(
                mix,
                bar_start + beat * BEAT_SECONDS,
                1.7,
                chord[0] - 12,
                0.052,
                -0.18,
                "pluck",
                rng,
            )

        if section > 0 or bar % 8 in (2, 4, 6):
            for beat_offset, note, length_beats in melody[bar % 8]:
                variation = 12 if section == 2 and bar % 8 in (1, 5) else 0
                add_voice(
                    mix,
                    bar_start + beat_offset * BEAT_SECONDS,
                    length_beats * BEAT_SECONDS + 1.2,
                    note + variation,
                    0.034 if variation else 0.043,
                    0.18,
                    "piano",
                    rng,
                )

    add_rain(mix, rng)

    dry = mix.copy()
    for delay_seconds, gain, swap in ((0.13, 0.17, True), (0.29, 0.11, False), (0.47, 0.075, True)):
        delay = round(delay_seconds * SAMPLE_RATE)
        delayed = dry[:-delay, ::-1] if swap else dry[:-delay]
        mix[delay:] += delayed * gain

    fade_samples = round(0.22 * SAMPLE_RATE)
    fade = np.linspace(0, 1, fade_samples)
    mix[:fade_samples] *= fade[:, None]
    mix[-fade_samples:] *= fade[::-1, None]
    mix = np.tanh(mix * 1.18)
    peak = np.max(np.abs(mix))
    if peak:
        mix *= 0.86 / peak
    return mix


def write_wave(path: Path, audio: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.round(np.clip(audio, -1, 1) * 32_767).astype("<i2")
    with wave.open(str(path), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm.tobytes())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    audio = compose()
    write_wave(args.output, audio)
    print(args.output.resolve())


if __name__ == "__main__":
    main()
