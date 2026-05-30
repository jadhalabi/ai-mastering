#!/usr/bin/env python3
import sys
import json

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

import numpy as np
import librosa
import soundfile as sf
import pyloudnorm as pyln

def waveform_data(y_mono, num_points: int = 200) -> list:
    chunk = max(1, len(y_mono) // num_points)
    peaks = [float(np.max(np.abs(y_mono[i * chunk:(i + 1) * chunk])))
             for i in range(num_points) if i * chunk < len(y_mono)]
    max_val = max(peaks) if peaks else 1.0
    return [round(v / max_val, 4) for v in peaks] if max_val > 0 else peaks


def analyze_file(path: str) -> dict:
    y, sr = librosa.load(path, sr=None, mono=False)

    if y.ndim == 1:
        y_mono = y
        y_stereo = np.stack([y, y])
    else:
        y_mono = librosa.to_mono(y)
        y_stereo = y

    # LUFS
    meter = pyln.Meter(sr)
    lufs = meter.integrated_loudness(y_mono)

    # True peak (per channel, take max)
    peaks = []
    for ch in range(y_stereo.shape[0]):
        peaks.append(float(np.max(np.abs(y_stereo[ch]))))
    true_peak_linear = max(peaks)
    true_peak_db = 20 * np.log10(true_peak_linear) if true_peak_linear > 0 else -120.0

    # LRA (loudness range approximation via short-term blocks)
    block_size = int(sr * 3)
    hop = int(sr * 1)
    st_loudness = []
    for start in range(0, len(y_mono) - block_size, hop):
        block = y_mono[start:start + block_size]
        try:
            l = meter.integrated_loudness(block)
            if l > -70:
                st_loudness.append(l)
        except Exception:
            pass
    if len(st_loudness) >= 2:
        lra = float(np.percentile(st_loudness, 95) - np.percentile(st_loudness, 10))
    else:
        lra = 0.0

    # Stereo width (mid-side ratio)
    mid = (y_stereo[0] + y_stereo[1]) / 2
    side = (y_stereo[0] - y_stereo[1]) / 2
    mid_rms = float(np.sqrt(np.mean(mid**2)) + 1e-9)
    side_rms = float(np.sqrt(np.mean(side**2)) + 1e-9)
    stereo_width = float(side_rms / mid_rms)

    # Spectral centroid
    centroid = librosa.feature.spectral_centroid(y=y_mono, sr=sr)
    spectral_centroid = float(np.mean(centroid))

    # Per-band energy (dB)
    S = np.abs(librosa.stft(y_mono))
    freqs = librosa.fft_frequencies(sr=sr)

    def band_energy(f_low, f_high):
        mask = (freqs >= f_low) & (freqs < f_high)
        if not np.any(mask):
            return -80.0
        energy = np.mean(S[mask, :] ** 2)
        return float(10 * np.log10(energy + 1e-12))

    bands = {
        "sub": band_energy(20, 60),
        "bass": band_energy(60, 120),
        "low_mid": band_energy(120, 300),
        "mid": band_energy(300, 1000),
        "high_mid": band_energy(1000, 5000),
        "air": band_energy(5000, 20000),
    }

    return {
        "lufs": round(float(lufs), 2),
        "true_peak": round(true_peak_db, 2),
        "lra": round(lra, 2),
        "stereo_width": round(stereo_width, 4),
        "spectral_centroid": round(spectral_centroid, 1),
        "eq_bands": bands,
        "waveform": waveform_data(y_mono),
    }

def compute_diff(src: dict, ref: dict) -> dict:
    lufs_diff = ref["lufs"] - src["lufs"]

    # EQ: lower threshold for high-frequency bands, 70% correction strength
    eq_bands = {}
    for band, ref_val in ref["eq_bands"].items():
        src_val = src["eq_bands"].get(band, ref_val)
        diff = ref_val - src_val
        threshold = 1.5 if band in ("air", "high_mid") else 2.5
        if abs(diff) > threshold:
            eq_bands[band] = round(diff * 0.7, 2)

    # Spectral centroid correction: if reference is significantly brighter, boost air/high_mid
    centroid_ratio = ref["spectral_centroid"] / max(src["spectral_centroid"], 1.0)
    if centroid_ratio > 1.15:
        extra_air = min(5.0, (centroid_ratio - 1.0) * 8)
        extra_high_mid = min(3.5, (centroid_ratio - 1.0) * 5)
        if eq_bands.get("air", 0) < extra_air:
            eq_bands["air"] = round(extra_air, 2)
        if eq_bands.get("high_mid", 0) < extra_high_mid:
            eq_bands["high_mid"] = round(extra_high_mid, 2)

    # Stereo scale: ratio of reference width to source width, clamped to safe range
    stereo_scale = ref["stereo_width"] / max(src["stereo_width"], 0.001)
    stereo_scale = max(0.75, min(1.5, stereo_scale))

    # Compression: trigger at 1.5 LU difference (was 4)
    compress = None
    lra_diff = src["lra"] - ref["lra"]
    if lra_diff > 1.5:
        ratio = min(4.0, 1.5 + lra_diff * 0.35)
        compress = {
            "ratio": round(ratio, 2),
            "attack_ms": 30,
            "release_ms": 150,
        }

    notes = []
    if abs(lufs_diff) <= 0.5:
        notes.append("Loudness already within ±0.5 LU of reference — minimal gain applied.")
    if ref["stereo_width"] > src["stereo_width"] * 1.1:
        notes.append("Your track is narrower than the reference — stereo field widened.")
    elif src["stereo_width"] > ref["stereo_width"] * 1.1:
        notes.append("Your track is wider than the reference — stereo field tightened.")
    if not eq_bands:
        notes.append("EQ: frequency balance already close to reference — minimal EQ applied.")

    return {
        "lufs_diff": round(lufs_diff, 2),
        "eq_bands": eq_bands,
        "compress": compress,
        "stereo_scale": round(stereo_scale, 4),
        "notes": notes,
    }

if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print(json.dumps({"error": "Usage: analyze.py <your_track> [reference_track]"}))
        sys.exit(1)

    your_path = args[0]
    ref_path = args[1] if len(args) > 1 else None

    your_analysis = analyze_file(your_path)
    result = {"your_track": your_analysis, "notes": []}

    if ref_path:
        ref_analysis = analyze_file(ref_path)
        result["reference"] = ref_analysis
        result["diff"] = compute_diff(your_analysis, ref_analysis)
        result["notes"] = result["diff"].pop("notes", [])

    print(json.dumps(result))
