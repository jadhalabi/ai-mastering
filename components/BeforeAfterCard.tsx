"use client"

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface AudioStats {
  lufs: number;
  truePeak: number;
  dynamicRange: number;
  bands: { name: string; points: number[] }[];
}

const DEFAULT_BEFORE: AudioStats = {
  lufs: -22.4, truePeak: -6.2, dynamicRange: 14.1,
  bands: [
    { name: 'Sub',      points: [20, 22, 19, 24, 21, 20, 23] },
    { name: 'Bass',     points: [30, 28, 32, 29, 31, 30, 28] },
    { name: 'Low-Mid',  points: [18, 20, 17, 21, 19, 18, 20] },
    { name: 'Mid',      points: [25, 24, 26, 23, 25, 24, 26] },
    { name: 'High-Mid', points: [15, 16, 14, 17, 15, 16, 14] },
    { name: 'Air',      points: [10, 11, 9,  12, 10, 11, 9]  },
  ],
};

const DEFAULT_AFTER: AudioStats = {
  lufs: -14.2, truePeak: -1.0, dynamicRange: 8.5,
  bands: [
    { name: 'Sub',      points: [21, 23, 22, 24, 23, 22, 24] },
    { name: 'Bass',     points: [31, 30, 33, 32, 33, 31, 32] },
    { name: 'Low-Mid',  points: [16, 17, 15, 17, 16, 17, 16] },
    { name: 'Mid',      points: [27, 26, 28, 27, 28, 26, 27] },
    { name: 'High-Mid', points: [17, 18, 17, 19, 18, 17, 18] },
    { name: 'Air',      points: [13, 14, 13, 15, 14, 13, 14] },
  ],
};

function Sparkline({ points, improved }: { points: number[]; improved: boolean }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 80, h = 28;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const color = improved ? '#22c55e' : '#6b7280';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`0,${h} ${coords.join(' ')} ${w},${h}`} fill={color} fillOpacity="0.1" stroke="none" />
    </svg>
  );
}

function DiffBadge({ before, after, lowerIsBetter = false }: { before: number; after: number; lowerIsBetter?: boolean }) {
  const improved = lowerIsBetter ? after < before : after > before;
  const same = Math.abs(after - before) < 0.05;
  const diff = after - before;
  if (same) return <Minus size={12} className="text-gray-500" />;
  return improved
    ? <span className="flex items-center gap-0.5 text-green-400 text-xs font-medium"><TrendingUp size={11} />{Math.abs(diff).toFixed(1)}</span>
    : <span className="flex items-center gap-0.5 text-red-400 text-xs font-medium"><TrendingDown size={11} />{Math.abs(diff).toFixed(1)}</span>;
}

function StatRow({ label, before, after, unit, lowerIsBetter }: {
  label: string; before: number; after: number; unit: string; lowerIsBetter?: boolean;
}) {
  const improved = lowerIsBetter ? after < before : after > before;
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-500 w-28">{label}</span>
      <span className="text-sm text-gray-400 tabular-nums w-20 text-right">{before.toFixed(1)} {unit}</span>
      <div className="flex items-center gap-2 w-28 justify-end">
        <DiffBadge before={before} after={after} lowerIsBetter={lowerIsBetter} />
        <span className={`text-sm tabular-nums font-medium ${improved ? 'text-green-400' : 'text-gray-300'}`}>
          {after.toFixed(1)} {unit}
        </span>
      </div>
    </div>
  );
}

export default function BeforeAfterCard({ before, after }: { before?: AudioStats; after?: AudioStats }) {
  const b = before ?? DEFAULT_BEFORE;
  const a = after ?? DEFAULT_AFTER;

  return (
    <div className="w-full max-w-2xl rounded-xl p-6" style={{ background: '#0F0E1C', border: '1px solid rgba(255,255,255,0.08)' }}>

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-bold text-lg">Before / After</h2>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Before</span>
          <span className="text-gray-700">→</span>
          <span className="text-green-400">After</span>
        </div>
      </div>

      <div className="rounded-lg p-4 mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <StatRow label="LUFS (Integrated)" before={b.lufs}         after={a.lufs}         unit="LUFS" />
        <StatRow label="True Peak"         before={b.truePeak}     after={a.truePeak}     unit="dBTP" lowerIsBetter />
        <StatRow label="Dynamic Range"     before={b.dynamicRange} after={a.dynamicRange} unit="dB"   lowerIsBetter />
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Frequency Bands</p>
        <div className="grid grid-cols-2 gap-3">
          {b.bands.map((band, i) => {
            const afterBand = a.bands[i];
            const avgBefore = band.points.reduce((s, v) => s + v, 0) / band.points.length;
            const avgAfter  = afterBand.points.reduce((s, v) => s + v, 0) / afterBand.points.length;
            const improved  = avgAfter > avgBefore;
            return (
              <div key={band.name} className="rounded-lg p-3 flex items-center justify-between"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${improved ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)'}` }}>
                <div>
                  <p className="text-xs text-gray-400 mb-1">{band.name}</p>
                  <Sparkline points={afterBand.points} improved={improved} />
                </div>
                {improved && <TrendingUp size={14} className="text-green-400 self-start mt-1" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
