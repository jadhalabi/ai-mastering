"use client"

import { useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface FrequencyBand {
  name: string;
  level: number;
  diff: 'high' | 'ideal' | 'low';
}

export interface AudioAnalysisData {
  lufs: number;
  dynamicRange: number;
  frequencyBands: FrequencyBand[];
}

const DEFAULT: AudioAnalysisData = {
  lufs: -14.2,
  dynamicRange: 8.5,
  frequencyBands: [
    { name: 'Sub',      level: -3.2, diff: 'ideal' },
    { name: 'Bass',     level: -2.8, diff: 'ideal' },
    { name: 'Low-Mid',  level: -1.5, diff: 'high'  },
    { name: 'Mid',      level: -4.2, diff: 'low'   },
    { name: 'High-Mid', level: -2.1, diff: 'ideal' },
    { name: 'Air',      level: -5.8, diff: 'low'   },
  ],
};

export default function AudioAnalysisCard({ data }: { data?: AudioAnalysisData }) {
  const [isHovered, setIsHovered] = useState(false);
  const d = data ?? DEFAULT;

  const diffColor = (diff: FrequencyBand['diff']) =>
    ({ high: 'bg-red-500', ideal: 'bg-green-500', low: 'bg-blue-500' }[diff]);
  const diffGlow = (diff: FrequencyBand['diff']) =>
    ({ high: 'rgba(239,68,68,.4)', ideal: 'rgba(34,197,94,.4)', low: 'rgba(59,130,246,.4)' }[diff]);
  const diffIcon = (diff: FrequencyBand['diff']) =>
    ({ high: <TrendingUp size={12} className="text-red-500" />, ideal: <Minus size={12} className="text-green-500" />, low: <TrendingDown size={12} className="text-blue-500" /> }[diff]);
  const barWidth = (level: number) => Math.max(0, Math.min(100, ((level + 12) / 12) * 100));
  const lufsColor = (v: number) => v >= -16 && v <= -12 ? 'text-green-400' : v > -12 ? 'text-red-400' : 'text-blue-400';
  const drColor = (v: number) => v >= 7 && v <= 12 ? 'text-green-400' : v < 7 ? 'text-red-400' : 'text-blue-400';

  return (
    <div
      className="relative w-full max-w-2xl rounded-xl overflow-hidden"
      style={{ background: '#08080E', boxShadow: '0 10px 40px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.05)' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(168,85,247,.08) 0%, transparent 70%)', opacity: isHovered ? 1 : 0 }}
      />
      <div className="relative rounded-xl p-6" style={{ background: '#0F0E1C', border: '1px solid rgba(168,85,247,.2)' }}>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(168,85,247,.2),rgba(217,119,6,.2))', border: '1px solid rgba(168,85,247,.3)' }}>
            <Activity className="text-purple-400" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Audio Analysis</h2>
            <p className="text-xs text-gray-400">Frequency & Loudness Report</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-lg p-4" style={{ background: 'rgba(168,85,247,.05)', border: '1px solid rgba(168,85,247,.2)' }}>
            <div className="text-xs text-gray-400 mb-1">LUFS (Integrated)</div>
            <div className={`text-3xl font-bold ${lufsColor(d.lufs)}`}>{d.lufs.toFixed(1)}</div>
            <div className="text-xs text-gray-500 mt-1">Loudness Units</div>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(217,119,6,.05)', border: '1px solid rgba(217,119,6,.2)' }}>
            <div className="text-xs text-gray-400 mb-1">Dynamic Range</div>
            <div className={`text-3xl font-bold ${drColor(d.dynamicRange)}`}>{d.dynamicRange.toFixed(1)}</div>
            <div className="text-xs text-gray-500 mt-1">dB Range</div>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent mb-6" />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Frequency Bands</h3>
          {d.frequencyBands.map((band, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white w-20">{band.name}</span>
                  {diffIcon(band.diff)}
                </div>
                <span className="text-xs text-gray-400 tabular-nums">{band.level.toFixed(1)} dB</span>
              </div>
              <div className="relative h-2 bg-black/40 rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full ${diffColor(band.diff)} rounded-full transition-all duration-500`}
                  style={{ width: `${barWidth(band.level)}%`, boxShadow: `0 0 10px ${diffGlow(band.diff)}` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            {(['high', 'ideal', 'low'] as const).map(diff => (
              <div key={diff} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${diffColor(diff)}`} />
                <span className="text-gray-400">{{ high: 'Too High', ideal: 'Ideal', low: 'Too Low' }[diff]}</span>
              </div>
            ))}
          </div>
          <span className="text-gray-500">Analysis Complete</span>
        </div>
      </div>
    </div>
  );
}
