'use client'

import { useEffect, useRef, useState } from 'react'

const BAR_COUNT = 32

// Fixed values — no Math.random() at render time
const FADER_TOPS = [35, 52, 28, 44, 60, 22, 48, 38, 55, 30, 42, 50]
const VU_HEIGHTS = [45, 70, 55, 80, 40, 65, 75, 50, 85, 60, 45, 70, 55, 90, 65, 50, 40, 75, 60, 45]
const VU_LIT = [true, true, false, true, true, false, true, true, true, false, true, true, false, true, true, true, false, true, false, true]

export function StudioVisual() {
  const barsRef = useRef<(HTMLDivElement | null)[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const heights = Array.from({ length: BAR_COUNT }, () => Math.random())
    const targets = Array.from({ length: BAR_COUNT }, () => Math.random())
    const speeds = Array.from({ length: BAR_COUNT }, () => 0.02 + Math.random() * 0.04)

    let frame: number
    function tick() {
      for (let i = 0; i < BAR_COUNT; i++) {
        heights[i] += (targets[i] - heights[i]) * speeds[i]
        if (Math.abs(heights[i] - targets[i]) < 0.01) {
          targets[i] = 0.05 + Math.random() * 0.95
        }
        const el = barsRef.current[i]
        if (el) {
          el.style.height = `${8 + heights[i] * 92}%`
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none">

      {/* Studio room background glow */}
      <div className="absolute inset-0 bg-gradient-radial from-amber-900/20 via-transparent to-transparent" />

      {/* Top amber ceiling light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-amber-500/40 rounded-full blur-xl" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-16 bg-amber-600/10 rounded-full blur-2xl" />

      {/* Engineer silhouette */}
      <div className="absolute bottom-[200px] left-1/2 -translate-x-1/2 z-10">
        <svg width="120" height="160" viewBox="0 0 120 160" fill="none">
          <ellipse cx="60" cy="28" rx="18" ry="20" fill="#1a1208" />
          <path d="M42 28 Q42 10 60 10 Q78 10 78 28" stroke="#b45309" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <rect x="38" y="24" width="8" height="12" rx="3" fill="#92400e" />
          <rect x="74" y="24" width="8" height="12" rx="3" fill="#92400e" />
          <path d="M38 60 Q30 100 28 140 L92 140 Q90 100 82 60 Q70 48 60 48 Q50 48 38 60Z" fill="#111008" />
          <path d="M38 70 Q20 80 14 100" stroke="#1a1208" strokeWidth="12" strokeLinecap="round" />
          <path d="M82 70 Q100 80 106 100" stroke="#1a1208" strokeWidth="12" strokeLinecap="round" />
          <circle cx="14" cy="103" r="6" fill="#1a1208" />
          <circle cx="106" cy="103" r="6" fill="#1a1208" />
        </svg>
      </div>

      {/* Mixing console surface */}
      <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-[#0d0a04] to-[#0d0a04]/80 rounded-t-3xl border-t border-amber-900/30">

        {/* Console faders row */}
        <div className="absolute top-6 left-0 right-0 px-6 flex gap-2 justify-center">
          {FADER_TOPS.map((top, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-1 h-16 bg-white/5 rounded-full relative">
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-5 h-2 bg-amber-800/80 rounded-sm border border-amber-700/50 shadow-sm"
                  style={{ top: `${top}%` }}
                />
              </div>
              <div className="w-3 h-3 rounded-full bg-amber-900/60 border border-amber-700/40 mt-1" />
            </div>
          ))}
        </div>

        {/* Console LED strip */}
        <div className="absolute bottom-4 left-6 right-6 h-1 bg-gradient-to-r from-transparent via-amber-600/30 to-transparent rounded-full" />

        {/* VU meters row */}
        <div className="absolute bottom-8 left-8 right-8 flex gap-1 items-end justify-center h-8">
          {VU_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="w-1.5 rounded-sm"
              style={{
                height: `${h}%`,
                backgroundColor: mounted
                  ? VU_LIT[i]
                    ? i > 16 ? '#ef4444' : i > 13 ? '#f59e0b' : '#16a34a'
                    : 'rgba(255,255,255,0.05)'
                  : 'rgba(255,255,255,0.05)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Spectrum analyzer */}
      <div className="absolute bottom-[200px] left-0 right-0 h-[220px] flex items-end px-4 gap-[2px]">
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const isMid = i >= BAR_COUNT / 3 && i <= (BAR_COUNT * 2) / 3
          const color = isMid
            ? 'bg-gradient-to-t from-amber-500/90 to-yellow-300/50'
            : 'bg-gradient-to-t from-amber-600/80 to-amber-400/40'
          return (
            <div
              key={i}
              ref={(el) => { barsRef.current[i] = el }}
              className={`flex-1 rounded-t-sm transition-none ${color}`}
              style={{ height: '40%' }}
            />
          )
        })}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808]/60 to-transparent pointer-events-none" />
      </div>

      {/* Screen glow */}
      <div className="absolute bottom-[220px] left-1/2 -translate-x-1/2 w-3/4 h-32 bg-amber-500/5 blur-3xl rounded-full" />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)',
        }}
      />
    </div>
  )
}
