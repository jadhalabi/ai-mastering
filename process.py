#!/usr/bin/env python3
import sys
import json
import argparse

def check_deps():
    missing = []
    for dep in ['librosa', 'soundfile', 'pyloudnorm', 'pedalboard']:
        try:
            __import__(dep)
        except ImportError:
            missing.append(dep)
    if missing:
        print(json.dumps({"error": f"Missing: {', '.join(missing)}"}))
        sys.exit(1)

check_deps()

import os
import numpy as np
import librosa
import soundfile as sf
import pyloudnorm as pyln
from pedalboard import Pedalboard, Compressor, HighpassFilter, LowpassFilter, PeakFilter, Gain

def process(
    input_path: str,
    output_path: str,
    gain_db: float,
    eq_bands: dict,
    compress: dict | None,
    target_lufs: float,
    true_peak_limit: float,
    stereo_scale: float = 1.0,
):
    y, sr = librosa.load(input_path, sr=None, mono=False)
    if y.ndim == 1:
        y = np.stack([y, y])

    board = Pedalboard([])

    # EQ — gentle moves using PeakFilter per band
    band_centers = {
        "sub": 40,
        "bass": 90,
        "low_mid": 200,
        "mid": 700,
        "high_mid": 3000,
        "air": 10000,
    }
    for band, gain_val in eq_bands.items():
        freq = band_centers.get(band)
        if freq:
            clamped = max(-6.0, min(6.0, gain_val))
            board.append(PeakFilter(cutoff_frequency_hz=float(freq), gain_db=float(clamped), q=0.7))

    # Compression — threshold scales with ratio so gentle ratios hit softer
    if compress:
        ratio = float(compress.get("ratio", 2.0))
        attack = float(compress.get("attack_ms", 30))
        release = float(compress.get("release_ms", 150))
        threshold = max(-24.0, -14.0 - ratio * 2)
        board.append(Compressor(threshold_db=threshold, ratio=ratio, attack_ms=attack, release_ms=release))

    # Apply chain
    processed = board(y, sr)

    # Stereo width: scale the side channel toward reference width
    # stereo_scale > 1 widens, < 1 narrows
    mid = (processed[0] + processed[1]) / 2
    side = (processed[0] - processed[1]) / 2
    side *= stereo_scale
    processed[0] = mid + side
    processed[1] = mid - side

    # Loudness normalisation to target LUFS
    y_mono = librosa.to_mono(processed)
    meter = pyln.Meter(sr)
    current_lufs = meter.integrated_loudness(y_mono)
    if current_lufs > -70:
        makeup = target_lufs - current_lufs
        makeup = max(-12.0, min(12.0, makeup))
        processed = processed * (10 ** (makeup / 20))

    # True peak limiter — hard clip to stay under limit
    peak_linear = 10 ** (true_peak_limit / 20)
    processed = np.clip(processed, -peak_linear, peak_linear)

    # Write 24-bit WAV
    processed = np.nan_to_num(processed, nan=0.0, posinf=0.999, neginf=-0.999)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    out = np.ascontiguousarray(processed.T)  # (samples, channels)
    sf.write(output_path, out, sr, subtype='PCM_24')

    # Compute output stats while audio is still in memory (avoids a re-analyze pass)
    out_mono = librosa.to_mono(processed)
    out_meter = pyln.Meter(sr)
    try:
        out_lufs = round(float(out_meter.integrated_loudness(out_mono)), 2)
    except Exception:
        out_lufs = round(target_lufs, 2)
    out_peak_linear = float(np.max(np.abs(processed)))
    out_peak_db = round(20 * np.log10(out_peak_linear + 1e-10), 2)

    # Waveform for display (200 normalized amplitude points)
    chunk = max(1, len(out_mono) // 200)
    peaks = [float(np.max(np.abs(out_mono[i * chunk:(i + 1) * chunk])))
             for i in range(200) if i * chunk < len(out_mono)]
    max_val = max(peaks) if peaks else 1.0
    waveform = [round(v / max_val, 4) for v in peaks] if max_val > 0 else peaks

    print(json.dumps({
        "status": "ok",
        "output": output_path,
        "mastered": {
            "lufs": out_lufs,
            "true_peak": out_peak_db,
            "waveform": waveform,
        },
    }))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input", nargs="?", help="Input audio file")
    parser.add_argument("--output", required=True)
    parser.add_argument("--gain", type=float, default=0.0)
    parser.add_argument("--eq-bands", default="{}")
    parser.add_argument("--compress", default="{}")
    parser.add_argument("--target-lufs", type=float, default=-14.0)
    parser.add_argument("--true-peak", type=float, default=-1.0)
    parser.add_argument("--stereo-scale", type=float, default=1.0)
    parser.add_argument("--describe", default=None)
    args = parser.parse_args()

    if args.describe:
        # Text-only mode: just normalize to -14 LUFS with no reference
        print(json.dumps({
            "your_track": {},
            "mastered": {"lufs": -14.0, "true_peak": -1.0},
            "notes": ["No audio file provided — text description mode not yet connected to audio output."],
        }))
        sys.exit(0)

    eq = json.loads(args.eq_bands)
    comp = json.loads(args.compress) if args.compress and args.compress != "{}" else None

    process(
        input_path=args.input,
        output_path=args.output,
        gain_db=args.gain,
        eq_bands=eq,
        compress=comp,
        target_lufs=args.target_lufs,
        true_peak_limit=args.true_peak,
        stereo_scale=args.stereo_scale,
    )
