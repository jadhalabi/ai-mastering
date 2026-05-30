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
from pedalboard import Pedalboard, Compressor, HighpassFilter, PeakFilter


def analyze_mix(path: str) -> dict:
    y, sr = librosa.load(path, sr=None, mono=False)
    if y.ndim == 1:
        y_stereo = np.stack([y, y])
    else:
        y_stereo = y
    y_mono = librosa.to_mono(y_stereo)

    peak_linear = float(np.max(np.abs(y_stereo)))
    peak_db = float(20 * np.log10(peak_linear + 1e-10))
    headroom_db = float(-peak_db)

    clips_pct = float(np.sum(np.abs(y_stereo) >= 0.999) / y_stereo.size * 100)

    meter = pyln.Meter(sr)
    try:
        lufs = float(meter.integrated_loudness(y_mono))
    except Exception:
        lufs = -70.0

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
    lra = float(np.percentile(st_loudness, 95) - np.percentile(st_loudness, 10)) if len(st_loudness) >= 2 else 0.0

    S = np.abs(librosa.stft(y_mono))
    freqs = librosa.fft_frequencies(sr=sr)

    def band_db(f_low, f_high):
        mask = (freqs >= f_low) & (freqs < f_high)
        if not np.any(mask):
            return -80.0
        return float(10 * np.log10(np.mean(S[mask, :] ** 2) + 1e-12))

    bands = {
        "sub":       band_db(20, 80),
        "bass":      band_db(80, 200),
        "mud":       band_db(200, 400),
        "boxiness":  band_db(400, 800),
        "presence":  band_db(800, 2000),
        "harshness": band_db(2000, 5000),
        "sibilance": band_db(5000, 9000),
        "air":       band_db(9000, 20000),
    }

    mid = (y_stereo[0] + y_stereo[1]) / 2
    side = (y_stereo[0] - y_stereo[1]) / 2
    mid_rms = float(np.sqrt(np.mean(mid ** 2)) + 1e-9)
    side_rms = float(np.sqrt(np.mean(side ** 2)) + 1e-9)
    stereo_width = float(side_rms / mid_rms)

    issues = []

    if clips_pct > 0.005:
        issues.append({
            "id": "clipping", "severity": "critical",
            "label": "Digital Clipping Detected",
            "detail": f"{clips_pct:.2f}% of samples are at 0 dBFS — causes audible distortion.",
        })

    if headroom_db < 1.0:
        issues.append({
            "id": "headroom", "severity": "critical",
            "label": "No Headroom",
            "detail": f"Peak at {peak_db:.1f} dBFS. Mastering needs at least 6 dB of headroom.",
        })
    elif headroom_db < 6.0:
        issues.append({
            "id": "headroom", "severity": "warning",
            "label": "Low Headroom",
            "detail": f"Only {headroom_db:.1f} dB of headroom. Aim for –6 dBFS before mastering.",
        })

    if lufs > -8 and lufs < 0:
        issues.append({
            "id": "over_limited", "severity": "critical",
            "label": "Over-Limited Mix",
            "detail": f"{lufs:.1f} LUFS — too loud before mastering. Dynamic range has been crushed.",
        })
    elif lufs > -10 and lufs < 0:
        issues.append({
            "id": "hot_mix", "severity": "warning",
            "label": "Mix Too Hot",
            "detail": f"{lufs:.1f} LUFS — leave more room for the mastering chain to work.",
        })

    if bands["mud"] > bands["presence"] + 5:
        issues.append({
            "id": "mud", "severity": "warning",
            "label": "Muddy Low-Mids (200–400 Hz)",
            "detail": "Low-mids are dominating. Too many instruments sharing this range without EQ carving.",
        })

    if bands["harshness"] > bands["presence"] + 5:
        issues.append({
            "id": "harshness", "severity": "warning",
            "label": "Upper-Mid Harshness (2–5 kHz)",
            "detail": "This range is too aggressive — can cause listener fatigue over time.",
        })

    if bands["sibilance"] > bands["presence"] + 4:
        issues.append({
            "id": "sibilance", "severity": "warning",
            "label": "Sibilance / Air Buildup (5–9 kHz)",
            "detail": "High frequencies are too prominent. Vocals or cymbals may need de-essing.",
        })

    if bands["sub"] > bands["bass"] + 7:
        issues.append({
            "id": "sub_heavy", "severity": "warning",
            "label": "Excessive Sub-Bass (20–80 Hz)",
            "detail": "Sub is too heavy relative to the bass. Will cause issues on earbuds and car speakers.",
        })

    if stereo_width > 1.3:
        issues.append({
            "id": "too_wide", "severity": "info",
            "label": "Very Wide Stereo Image",
            "detail": "Stereo field is very wide. Verify the mix translates to mono.",
        })
    elif stereo_width < 0.05:
        issues.append({
            "id": "mono", "severity": "info",
            "label": "Mix is Near-Mono",
            "detail": "Very little stereo width detected. Consider adding width during mastering.",
        })

    if lra > 14 and lufs > -70:
        issues.append({
            "id": "high_lra", "severity": "info",
            "label": "High Dynamic Range",
            "detail": f"LRA is {lra:.1f} LU. A gentle bus compressor will add glue before mastering.",
        })

    if not issues:
        issues.append({
            "id": "ok", "severity": "info",
            "label": "Mix Looks Clean",
            "detail": "No significant issues detected. Fix will apply headroom staging for mastering.",
        })

    # Compute fix parameters
    mud_cut = 0.0
    if bands["mud"] > bands["presence"] + 5:
        mud_cut = -min(5.0, (bands["mud"] - bands["presence"] - 5) * 0.6)

    harsh_cut = 0.0
    if bands["harshness"] > bands["presence"] + 5:
        harsh_cut = -min(4.0, (bands["harshness"] - bands["presence"] - 5) * 0.5)

    sib_cut = 0.0
    if bands["sibilance"] > bands["presence"] + 4:
        sib_cut = -min(3.0, (bands["sibilance"] - bands["presence"] - 4) * 0.5)

    apply_compression = lra > 10
    compression_ratio = min(2.5, 1.3 + (lra - 10) * 0.1) if apply_compression else 1.5

    fixes = {
        "hp_freq": 28,
        "mud_cut_db": round(mud_cut, 2),
        "harsh_cut_db": round(harsh_cut, 2),
        "sib_cut_db": round(sib_cut, 2),
        "apply_compression": apply_compression,
        "compression_ratio": round(compression_ratio, 2),
        "target_peak_db": -6.0,
    }

    return {
        "peak_db": round(peak_db, 2),
        "headroom_db": round(headroom_db, 2),
        "lufs": round(lufs, 2),
        "lra": round(lra, 2),
        "clips_pct": round(clips_pct, 4),
        "stereo_width": round(stereo_width, 4),
        "eq_bands": {k: round(v, 2) for k, v in bands.items()},
        "waveform": waveform_data(y_mono),
        "issues": issues,
        "fixes": fixes,
    }


def waveform_data(y_mono: np.ndarray, num_points: int = 200) -> list:
    """Return num_points normalized peak amplitudes for waveform display."""
    chunk = max(1, len(y_mono) // num_points)
    peaks = [float(np.max(np.abs(y_mono[i * chunk:(i + 1) * chunk])))
             for i in range(num_points) if i * chunk < len(y_mono)]
    max_val = max(peaks) if peaks else 1.0
    return [round(v / max_val, 4) for v in peaks] if max_val > 0 else peaks


def process_mix(input_path: str, output_path: str, fixes: dict) -> list:
    """Apply mix corrections and return the after waveform data."""
    y, sr = librosa.load(input_path, sr=None, mono=False)
    if y.ndim == 1:
        y = np.stack([y, y])

    board = Pedalboard([])
    board.append(HighpassFilter(cutoff_frequency_hz=float(fixes["hp_freq"])))

    if fixes["mud_cut_db"] < 0:
        board.append(PeakFilter(cutoff_frequency_hz=300.0, gain_db=float(fixes["mud_cut_db"]), q=0.7))

    if fixes["harsh_cut_db"] < 0:
        board.append(PeakFilter(cutoff_frequency_hz=3500.0, gain_db=float(fixes["harsh_cut_db"]), q=0.8))

    if fixes["sib_cut_db"] < 0:
        board.append(PeakFilter(cutoff_frequency_hz=7000.0, gain_db=float(fixes["sib_cut_db"]), q=1.0))

    if fixes["apply_compression"]:
        board.append(Compressor(
            threshold_db=-18.0,
            ratio=float(fixes["compression_ratio"]),
            attack_ms=30.0,
            release_ms=200.0,
        ))

    processed = board(y, sr)

    current_peak = float(np.max(np.abs(processed)) + 1e-10)
    target_peak = float(10 ** (fixes["target_peak_db"] / 20.0))
    processed = processed * (target_peak / current_peak)
    processed = np.clip(processed, -0.998, 0.998)

    # Capture waveform while audio is still in memory (avoids re-loading)
    after_waveform = waveform_data(librosa.to_mono(processed))

    sf.write(output_path, processed.T, sr, subtype='PCM_24')
    return after_waveform


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    analysis = analyze_mix(args.input)

    if args.output:
        after_waveform = process_mix(args.input, args.output, analysis["fixes"])

        fixes = analysis["fixes"]
        gain_applied_db = fixes["target_peak_db"] - analysis["peak_db"]
        after_lra = round(analysis["lra"] * 0.85, 2) if fixes["apply_compression"] else analysis["lra"]
        after = {
            "peak_db": fixes["target_peak_db"],
            "headroom_db": round(-fixes["target_peak_db"], 2),
            "lufs": round(analysis["lufs"] + gain_applied_db, 2),
            "lra": after_lra,
            "waveform": after_waveform,
            "clips_pct": 0.0,
            "stereo_width": analysis["stereo_width"],
            "eq_bands": analysis["eq_bands"],
        }

        print(json.dumps({"before": analysis, "after": after}))
    else:
        print(json.dumps(analysis))
