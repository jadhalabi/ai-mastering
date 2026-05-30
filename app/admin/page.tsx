import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type Master = {
  id: string
  user_email: string
  file_name: string
  created_at: string
  platform_preset: string | null
  input_lufs: number | null
  output_lufs: number | null
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

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'jad.halabi.123@gmail.com') redirect('/')

  const { data: masters } = await supabase
    .from('masters')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = (masters ?? []) as Master[]

  const totalMasters = rows.length
  const uniqueUsers = new Set(rows.map(m => m.user_email)).size
  const now = new Date()
  const thisMonth = rows.filter(m => {
    const d = new Date(m.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const platformCounts: Record<string, number> = {}
  rows.forEach(m => {
    const p = m.platform_preset ?? 'none'
    platformCounts[p] = (platformCounts[p] || 0) + 1
  })
  const topPlatforms = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const stats = [
    { label: 'Total Masters', value: totalMasters },
    { label: 'Unique Users', value: uniqueUsers },
    { label: 'This Month', value: thisMonth },
  ]

  return (
    <main className="pt-24 pb-16 px-6 min-h-screen">
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] z-0"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '128px 128px' }}
      />
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="mb-12">
          <p className="text-[#DEB04A] tracking-widest text-xs uppercase mb-2">Admin</p>
          <h1 className="text-4xl font-bold">Overview</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-[#0F0E1C] border border-white/8 rounded-2xl p-6">
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">{s.label}</p>
              <p className="text-4xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-10">
          {/* Platform breakdown */}
          <div className="bg-[#0F0E1C] border border-white/8 rounded-2xl p-6 col-span-1">
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-5">Platform Breakdown</p>
            {topPlatforms.length === 0 ? (
              <p className="text-white/20 text-sm">No data yet</p>
            ) : (
              <div className="space-y-3">
                {topPlatforms.map(([platform, count]) => {
                  const pct = totalMasters > 0 ? Math.round((count / totalMasters) * 100) : 0
                  return (
                    <div key={platform}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60">{PLATFORM_LABELS[platform] ?? platform}</span>
                        <span className="text-white/40">{count}</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1">
                        <div className="bg-[#DEB04A] h-1 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent users */}
          <div className="bg-[#0F0E1C] border border-white/8 rounded-2xl p-6 col-span-2">
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-5">Recent Users</p>
            {uniqueUsers === 0 ? (
              <p className="text-white/20 text-sm">No users yet</p>
            ) : (
              <div className="space-y-2">
                {Array.from(new Map(rows.map(m => [m.user_email, m])).values()).slice(0, 6).map(m => (
                  <div key={m.user_email} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-white/70 text-sm">{m.user_email}</span>
                    <span className="text-white/30 text-xs">
                      {rows.filter(r => r.user_email === m.user_email).length} masters
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* All masters table */}
        <div className="bg-[#0F0E1C] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5">
            <p className="text-white/30 text-[10px] uppercase tracking-widest">All Masters</p>
          </div>
          {rows.length === 0 ? (
            <div className="px-6 py-12 text-center text-white/20 text-sm">No masters processed yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {['User', 'File', 'Platform', 'In LUFS', 'Out LUFS', 'Date'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-[10px] uppercase tracking-widest text-white/25 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m, i) => (
                    <tr key={m.id} className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                      <td className="px-6 py-4 text-white/50 text-xs">{m.user_email}</td>
                      <td className="px-6 py-4 text-white/70 max-w-[180px] truncate">{m.file_name}</td>
                      <td className="px-6 py-4 text-white/50">
                        {m.platform_preset ? PLATFORM_LABELS[m.platform_preset] ?? m.platform_preset : '—'}
                      </td>
                      <td className="px-6 py-4 text-white/50 font-mono">
                        {m.input_lufs != null ? m.input_lufs.toFixed(1) : '—'}
                      </td>
                      <td className="px-6 py-4 text-[#DEB04A] font-mono font-medium">
                        {m.output_lufs != null ? m.output_lufs.toFixed(1) : '—'}
                      </td>
                      <td className="px-6 py-4 text-white/30 text-xs">{formatDate(m.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
