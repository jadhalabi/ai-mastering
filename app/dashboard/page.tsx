'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const MOCK_MASTERS = [
  { id: 1, name: 'midnight_loop_v3.wav', date: 'May 28, 2026', genre: 'Lo-Fi', platform: 'Spotify', lufs: '-14.1' },
  { id: 2, name: 'drop_final.mp3', date: 'May 25, 2026', genre: 'EDM', platform: 'SoundCloud', lufs: '-11.0' },
  { id: 3, name: 'verse_hook_mix2.wav', date: 'May 20, 2026', genre: 'Hip-Hop', platform: 'Apple Music', lufs: '-16.0' },
]

export default function DashboardPage() {
  return (
    <main className="pt-24 px-6 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="text-[#C9A84C] tracking-widest text-xs uppercase mb-2">Dashboard</p>
            <h1 className="text-4xl font-bold">Your Masters</h1>
          </div>
          <Link href="/master" className="px-6 py-3 bg-[#C9A84C] text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors text-sm">
            Master New Track
          </Link>
        </div>

        {MOCK_MASTERS.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-[#888] text-lg mb-6">No masters yet. Upload your first track to get started.</p>
            <Link href="/master" className="px-8 py-4 bg-[#C9A84C] text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors">
              Master a Track Free
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {MOCK_MASTERS.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="bg-[#111] border border-[#222] rounded-xl p-6 flex items-center justify-between hover:border-[#C9A84C]/20 hover:shadow-[0_0_20px_rgba(201,168,76,0.04)] transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-10 h-10 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C]">
                    ♪
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{m.name}</p>
                    <p className="text-[#888] text-xs mt-0.5">{m.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-[#888] text-xs">Genre</p>
                    <p className="text-white/70 text-sm mt-0.5">{m.genre}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[#888] text-xs">Platform</p>
                    <p className="text-white/70 text-sm mt-0.5">{m.platform}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[#888] text-xs">LUFS</p>
                    <p className="text-[#C9A84C] text-sm font-mono mt-0.5">{m.lufs}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 border border-[#333] text-white/50 rounded-lg hover:border-[#C9A84C]/30 hover:text-white/70 transition-colors text-xs">
                      ▶ Play
                    </button>
                    <button className="px-4 py-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] rounded-lg hover:bg-[#C9A84C]/20 transition-colors text-xs">
                      ⬇ Download
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
