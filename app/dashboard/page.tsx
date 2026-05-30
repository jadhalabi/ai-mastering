'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type Master = {
  id: string
  file_name: string
  created_at: string
  platform_preset: string | null
  input_lufs: number | null
  output_lufs: number | null
  output_peak: number | null
  mode: string
}

const PLATFORM_LABELS: Record<string, string> = {
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  youtube: 'YouTube',
  soundcloud: 'SoundCloud',
  tidal: 'Tidal',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DashboardPage() {
  const [masters, setMasters] = useState<Master[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('masters')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMasters(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <main className="pt-24 pb-16 px-6 min-h-screen">
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] z-0"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '128px 128px' }}
      />
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="text-[#DEB04A] tracking-widest text-xs uppercase mb-2">Dashboard</p>
            <h1 className="text-4xl font-bold">Your Masters</h1>
          </div>
          <Link href="/master" className="px-6 py-3 bg-[#DEB04A] text-black font-heading font-semibold rounded-xl hover:bg-[#E8C060] transition-colors text-sm shadow-[0_0_20px_rgba(222,176,74,0.2)]">
            Master New Track
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#0F0E1C] border border-white/8 rounded-xl p-6 h-20 animate-pulse" />
            ))}
          </div>
        ) : masters.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-white/40 text-lg mb-6">No masters yet. Upload your first track to get started.</p>
            <Link href="/master" className="px-8 py-4 bg-[#DEB04A] text-black font-heading font-semibold rounded-xl hover:bg-[#E8C060] transition-colors">
              Master a Track Free
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {masters.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-[#0F0E1C] border border-white/8 rounded-xl p-6 flex items-center justify-between hover:border-[#DEB04A]/25 hover:shadow-[0_0_24px_rgba(222,176,74,0.06)] transition-all"
              >
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-xl bg-[#DEB04A]/10 flex items-center justify-center text-[#DEB04A] text-lg">
                    ♪
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{m.file_name}</p>
                    <p className="text-white/35 text-xs mt-0.5">{formatDate(m.created_at)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-white/30 text-[10px] uppercase tracking-widest">Platform</p>
                    <p className="text-white/60 text-sm mt-0.5">
                      {m.platform_preset ? PLATFORM_LABELS[m.platform_preset] ?? m.platform_preset : '—'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/30 text-[10px] uppercase tracking-widest">Input LUFS</p>
                    <p className="text-white/60 text-sm font-mono mt-0.5">
                      {m.input_lufs != null ? m.input_lufs.toFixed(1) : '—'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/30 text-[10px] uppercase tracking-widest">Output LUFS</p>
                    <p className="text-[#DEB04A] text-sm font-mono font-medium mt-0.5">
                      {m.output_lufs != null ? m.output_lufs.toFixed(1) : '—'}
                    </p>
                  </div>
                  <Link
                    href="/master"
                    className="px-4 py-2 border border-white/10 text-white/40 rounded-lg hover:border-[#DEB04A]/30 hover:text-white/70 transition-colors text-xs"
                  >
                    Re-master
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
