'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import MasteringHistoryTable, { MasterRecord } from '@/components/MasteringHistoryTable'

const PLATFORM_LABELS: Record<string, string> = {
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  youtube: 'YouTube',
  soundcloud: 'SoundCloud',
  tidal: 'Tidal',
}

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

function toRecord(m: Master): MasterRecord {
  return {
    id: m.id,
    trackName: m.file_name,
    date: m.created_at.slice(0, 10),
    genre: m.platform_preset ? (PLATFORM_LABELS[m.platform_preset] ?? m.platform_preset) : '—',
    lufsBefor: m.input_lufs ?? -23,
    lufsAfter: m.output_lufs ?? -14,
    referenceUsed: m.mode === 'both',
    downloadUrl: '#',
  }
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
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-[#DEB04A] tracking-widest text-xs uppercase mb-2">Dashboard</p>
            <h1 className="text-4xl font-bold">Your Masters</h1>
          </div>
          <Link href="/master" className="px-6 py-3 bg-[#DEB04A] text-black font-heading font-semibold rounded-xl hover:bg-[#E8C060] transition-colors text-sm shadow-[0_0_20px_rgba(222,176,74,0.2)]">
            Master New Track
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#0F0E1C] border border-white/8 rounded-xl p-6 h-14 animate-pulse" />
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
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <MasteringHistoryTable records={masters.map(toRecord)} />
          </motion.div>
        )}
      </div>
    </main>
  )
}
