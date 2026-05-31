'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'

interface MixIssue {
  id: string
  severity: 'critical' | 'warning' | 'info'
  label: string
  detail: string
}

interface MixAnalysis {
  peak_db: number
  headroom_db: number
  lufs: number
  lra: number
  clips_pct: number
  stereo_width: number
  eq_bands: {
    sub: number
    bass: number
    mud: number
    boxiness: number
    presence: number
    harshness: number
    sibilance: number
    air: number
  }
  waveform?: number[]
  issues: MixIssue[]
  fixes: Record<string, unknown>
}

interface MixResult {
  before: MixAnalysis
  after: MixAnalysis
  download_url: string
  fixes_applied: string[]
}

type Phase = 'idle' | 'analyzing' | 'analyzed' | 'fixing' | 'fixed'

// ── Upload dropzone ──────────────────────────────────────────────────────────

function DropZone({ file, onFile }: { file: File | null; onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const waveRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!file || !waveRef.current) return
    let ws: import('wavesurfer.js').default | null = null
    import('wavesurfer.js').then(({ default: WaveSurfer }) => {
      ws = WaveSurfer.create({
        container: waveRef.current!,
        waveColor: '#DEB04A40',
        progressColor: '#DEB04A',
        height: 40,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        interact: false,
      })
      ws.loadBlob(file)
    })
    return () => { ws?.destroy() }
  }, [file])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }, [onFile])

  return (
    <div
      onClick={() => !file && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed transition-all duration-200 ${
        dragging
          ? 'border-[#DEB04A] bg-[#DEB04A]/5 shadow-[0_0_20px_rgba(201,168,76,0.15)]'
          : file
          ? 'border-[#DEB04A]/40 bg-[#DEB04A]/5 cursor-default'
          : 'border-white/10 bg-[#0F0E1C] hover:border-[#DEB04A]/30 hover:shadow-[0_0_15px_rgba(201,168,76,0.08)] cursor-pointer'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.flac"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      {file ? (
        <div className="w-full">
          <div ref={waveRef} className="w-full" />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[#DEB04A] text-sm font-medium truncate max-w-[220px]">{file.name}</p>
            <button
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
              className="text-white/30 text-xs hover:text-white/60 transition-colors"
            >
              change
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-4">
          <svg className="w-8 h-8 text-[#DEB04A]/40" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="18" width="4" height="12" rx="2" fill="currentColor" />
            <rect x="12" y="10" width="4" height="28" rx="2" fill="currentColor" />
            <rect x="20" y="14" width="4" height="20" rx="2" fill="currentColor" />
            <rect x="28" y="6" width="4" height="36" rx="2" fill="currentColor" />
            <rect x="36" y="16" width="4" height="16" rx="2" fill="currentColor" />
          </svg>
          <p className="text-white/40 text-sm">Drop your mix here or click to browse</p>
          <p className="text-white/20 text-xs">MP3 · WAV · FLAC</p>
        </div>
      )}
    </div>
  )
}

// ── Waveform from server data (no file download needed) ─────────────────────

function WaveformBars({
  data,
  label,
  peak,
  lufs,
  accent,
  playFile,
}: {
  data: number[]
  label: string
  peak: number
  lufs: number
  accent: boolean
  playFile?: File
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [wsReady, setWsReady] = useState(false)

  useEffect(() => {
    if (!playFile || !containerRef.current) return
    let ws: import('wavesurfer.js').default | null = null
    import('wavesurfer.js').then(({ default: WaveSurfer }) => {
      if (!containerRef.current) return
      ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: 'transparent',
        progressColor: 'transparent',
        height: 1,
        interact: false,
      })
      ws.loadBlob(playFile)
      ws.on('ready', () => setWsReady(true))
      ws.on('play', () => setPlaying(true))
      ws.on('pause', () => setPlaying(false))
      ws.on('finish', () => setPlaying(false))
      ws.on('error', (err: unknown) => console.warn('WaveSurfer:', err))
      wsRef.current = ws
    }).catch(() => {})
    return () => { ws?.destroy(); wsRef.current = null }
  }, [playFile])

  const barColor = accent ? '#DEB04A' : '#ffffff'
  const barOpacity = accent ? 0.6 : 0.2

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-xl border ${
      accent ? 'bg-[#DEB04A]/5 border-[#DEB04A]/20' : 'bg-[#0F0E1C] border-white/8'
    }`}>
      <p className={`text-[10px] tracking-widest uppercase ${accent ? 'text-[#DEB04A]/70' : 'text-white/25'}`}>
        {label}
      </p>

      {/* Visual waveform from server data */}
      <div className="flex items-center gap-px h-14 w-full">
        {data.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: `${Math.max(3, v * 100)}%`,
              backgroundColor: barColor,
              opacity: barOpacity,
            }}
          />
        ))}
      </div>

      {/* Hidden wavesurfer for audio playback only */}
      <div ref={containerRef} className="hidden" />

      <div className="flex items-center justify-between">
        {playFile ? (
          <button
            onClick={() => wsRef.current?.playPause()}
            disabled={!wsReady}
            className="flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-white/80 disabled:opacity-30 transition-colors"
          >
            <span className="text-sm">{playing ? '⏸' : '▶'}</span>
            <span>{playing ? 'Pause' : 'Play Original'}</span>
          </button>
        ) : (
          <span className="text-[10px] text-white/25 italic">Download to listen</span>
        )}
        <div className="space-x-1.5">
          <span className="text-[11px] text-white/30">{peak.toFixed(1)} dBFS</span>
          <span className="text-[11px] text-white/20">·</span>
          <span className="text-[11px] text-white/30">{lufs.toFixed(1)} LUFS</span>
        </div>
      </div>
    </div>
  )
}

// ── Severity styles ──────────────────────────────────────────────────────────

const SEVERITY_STYLE = {
  critical: { badge: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-500', card: 'border-red-500/15' },
  warning:  { badge: 'bg-amber-500/15 text-[#E8C060] border-amber-500/30', dot: 'bg-[#E8C060]', card: 'border-amber-500/15' },
  info:     { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30', dot: 'bg-blue-400', card: 'border-blue-500/15' },
}

// ── EQ band bars ─────────────────────────────────────────────────────────────

const BAND_KEYS = ['sub', 'bass', 'mud', 'boxiness', 'presence', 'harshness', 'sibilance', 'air'] as const
const BAND_LABELS: Record<string, string> = {
  sub: 'SUB', bass: 'BASS', mud: 'MUD', boxiness: 'BOX',
  presence: 'PRES', harshness: 'HARSH', sibilance: 'SIB', air: 'AIR',
}
const BAND_ISSUE_MAP: Record<string, string> = {
  mud: 'mud', harshness: 'harshness', sibilance: 'sibilance', sub: 'sub_heavy',
}

function EQBands({ bands, issues }: { bands: MixAnalysis['eq_bands']; issues: MixIssue[] }) {
  const issueIds = new Set(issues.map((i) => i.id))
  const values = BAND_KEYS.map((k) => bands[k])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  return (
    <div className="flex items-end gap-1.5 h-20 w-full">
      {BAND_KEYS.map((k) => {
        const norm = (bands[k] - min) / range
        const height = Math.max(6, Math.round(norm * 56))
        const hasIssue = BAND_ISSUE_MAP[k] ? issueIds.has(BAND_ISSUE_MAP[k]) : false
        return (
          <div key={k} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            <div
              className={`w-full rounded-sm ${hasIssue ? 'bg-[#E8C060]/80' : 'bg-[#DEB04A]/35'}`}
              style={{ height }}
            />
            <span className="text-[9px] text-white/25 tracking-wide leading-none">{BAND_LABELS[k]}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Gold button ──────────────────────────────────────────────────────────────

function GoldButton({ onClick, disabled, children }: {
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 rounded-2xl font-bold text-base bg-[#DEB04A] text-black hover:brightness-110 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed relative overflow-hidden group"
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
    </button>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MixPage() {
  const [track, setTrack] = useState<File | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [analysis, setAnalysis] = useState<MixAnalysis | null>(null)
  const [result, setResult] = useState<MixResult | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleNewFile(f: File) {
    setTrack(f)
    setUploadedUrl(null)
    setPhase('idle')
    setAnalysis(null)
    setResult(null)
    setDownloadUrl(null)
    setError(null)
  }

  async function uploadToStorage(file: File): Promise<string> {
    const urlRes = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, role: 'mix' }),
    })
    const { signedUrl, publicUrl, error: urlErr } = await urlRes.json()
    if (urlErr) throw new Error(urlErr)
    await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'audio/mpeg' } })
    return publicUrl
  }

  async function handleAnalyze() {
    if (!track) return
    setPhase('analyzing')
    setError(null)
    try {
      const url = uploadedUrl ?? await uploadToStorage(track)
      setUploadedUrl(url)
      const res = await fetch('/api/mix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_url: url, action: 'analyze' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setAnalysis(data.analysis)
      setPhase('analyzed')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setPhase('idle')
    }
  }

  async function handleFix() {
    if (!uploadedUrl) return
    setPhase('fixing')
    setError(null)
    try {
      const res = await fetch('/api/mix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_url: uploadedUrl, action: 'fix' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Processing failed')
      setDownloadUrl(data.download_url)
      setResult(data)
      setPhase('fixed')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setPhase('analyzed')
    }
  }

  function handleReset() {
    setTrack(null)
    setUploadedUrl(null)
    setPhase('idle')
    setAnalysis(null)
    setResult(null)
    setDownloadUrl(null)
    setError(null)
  }

  const criticalCount = analysis?.issues.filter((i) => i.severity === 'critical').length ?? 0
  const warningCount  = analysis?.issues.filter((i) => i.severity === 'warning').length ?? 0

  const sortedIssues = analysis
    ? [...analysis.issues].sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] - { critical: 0, warning: 1, info: 2 }[b.severity]))
    : []

  return (
    <main className="min-h-screen pt-24 pb-16 px-6">
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] bg-[url('/noise.png')] bg-repeat z-0" />

      <div className="relative z-10 max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[#DEB04A] text-xs tracking-widest uppercase mb-2">Studio</p>
          <h1 className="text-4xl font-heading font-bold text-white mb-2">Mix Prep</h1>
          <p className="text-white/40 text-base">
            Analyze your mix for EQ issues, dynamics, and headroom problems — then fix them before mastering.
          </p>
        </div>

        {/* Upload zone — hidden once fixed */}
        {phase !== 'fixed' && (
          <div className="mb-5">
            <DropZone file={track} onFile={handleNewFile} />
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* Idle */}
        {phase === 'idle' && (
          <GoldButton onClick={handleAnalyze} disabled={!track}>Analyze Mix</GoldButton>
        )}

        {/* Analyzing */}
        {phase === 'analyzing' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="w-10 h-10 rounded-full border-2 border-[#DEB04A]/20 border-t-[#DEB04A] animate-spin" />
            <p className="text-white/40 text-sm">Scanning EQ, dynamics, and headroom...</p>
          </div>
        )}

        {/* Analysis report */}
        {(phase === 'analyzed' || phase === 'fixing') && analysis && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
            {/* Summary badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {criticalCount > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30">
                  {criticalCount} Critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-[#E8C060] border border-amber-500/30">
                  {warningCount} Warning{warningCount > 1 ? 's' : ''}
                </span>
              )}
              {criticalCount === 0 && warningCount === 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30">
                  Mix Looks Good
                </span>
              )}
              <span className="text-white/20 text-xs">{track?.name}</span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Peak',         value: `${analysis.peak_db.toFixed(1)} dBFS`,        warn: analysis.peak_db > -3 },
                { label: 'Headroom',     value: `${analysis.headroom_db.toFixed(1)} dB`,       warn: analysis.headroom_db < 6 },
                { label: 'LUFS',         value: `${analysis.lufs.toFixed(1)}`,                 warn: analysis.lufs > -10 },
                { label: 'LRA',          value: `${analysis.lra.toFixed(1)} LU`,               warn: false },
                { label: 'Stereo Width', value: analysis.stereo_width.toFixed(2),              warn: analysis.stereo_width > 1.3 },
                { label: 'Clipping',     value: analysis.clips_pct > 0 ? `${analysis.clips_pct.toFixed(2)}%` : 'None', warn: analysis.clips_pct > 0 },
              ].map((m) => (
                <div key={m.label} className="bg-[#0F0E1C] border border-white/8 rounded-xl p-3">
                  <p className="text-[10px] tracking-widest uppercase text-white/25 mb-1">{m.label}</p>
                  <p className={`text-lg font-semibold ${m.warn ? 'text-[#E8C060]' : 'text-white'}`}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* EQ profile */}
            <div className="bg-[#0F0E1C] border border-white/8 rounded-xl p-4">
              <p className="text-[10px] tracking-widest uppercase text-white/25 mb-3">Frequency Profile</p>
              <EQBands bands={analysis.eq_bands} issues={analysis.issues} />
              <p className="text-[10px] text-white/20 mt-2">Highlighted bands have detected issues</p>
            </div>

            {/* Issues */}
            <div className="space-y-2">
              {sortedIssues.map((issue) => {
                const s = SEVERITY_STYLE[issue.severity]
                return (
                  <div key={issue.id} className={`bg-[#0F0E1C] border ${s.card} rounded-xl p-4`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-white">{issue.label}</span>
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed pl-4">{issue.detail}</p>
                  </div>
                )
              })}
            </div>

            {phase === 'analyzed' && <GoldButton onClick={handleFix}>Fix My Mix</GoldButton>}

            {phase === 'fixing' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-10 h-10 rounded-full border-2 border-[#DEB04A]/20 border-t-[#DEB04A] animate-spin" />
                <p className="text-white/40 text-sm">Applying EQ, compression, and gain staging...</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Fixed results */}
        {phase === 'fixed' && result && track && downloadUrl && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">

            <div>
              <p className="text-[#DEB04A] text-xs tracking-widest uppercase mb-1">Complete</p>
              <h2 className="text-2xl font-heading font-bold text-white">Mix is Ready</h2>
              <p className="text-white/40 text-sm mt-1">Play both tracks below to hear what was fixed.</p>
            </div>

            {/* Before / After waveforms — rendered from server data, no file download */}
            <div className="grid grid-cols-2 gap-3">
              <WaveformBars
                data={result.before.waveform ?? []}
                label="Original"
                peak={result.before.peak_db}
                lufs={result.before.lufs}
                accent={false}
                playFile={track}
              />
              <WaveformBars
                data={result.after.waveform ?? []}
                label="Mix-Ready"
                peak={result.after.peak_db}
                lufs={result.after.lufs}
                accent={true}
              />
            </div>

            {/* What changed — visual diff */}
            <div className="bg-[#0F0E1C] border border-white/8 rounded-xl p-4">
              <p className="text-[10px] tracking-widest uppercase text-white/25 mb-3">What Changed</p>
              <div className="space-y-2">
                {[
                  { label: 'Peak',     before: `${result.before.peak_db.toFixed(1)} dBFS`, after: `${result.after.peak_db.toFixed(1)} dBFS`,  improved: result.after.peak_db < result.before.peak_db },
                  { label: 'Headroom', before: `${result.before.headroom_db.toFixed(1)} dB`, after: `${result.after.headroom_db.toFixed(1)} dB`, improved: result.after.headroom_db > result.before.headroom_db },
                  { label: 'LUFS',     before: `${result.before.lufs.toFixed(1)}`,        after: `${result.after.lufs.toFixed(1)}`,           improved: result.after.lufs < result.before.lufs },
                  { label: 'LRA',      before: `${result.before.lra.toFixed(1)} LU`,      after: `${result.after.lra.toFixed(1)} LU`,         improved: false },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-[72px_1fr_20px_1fr] items-center text-sm gap-2">
                    <span className="text-white/30 text-xs">{row.label}</span>
                    <span className="text-white/40 text-right text-xs">{row.before}</span>
                    <span className="text-white/20 text-center">→</span>
                    <span className={`text-xs font-medium ${row.improved ? 'text-[#DEB04A]' : 'text-white/60'}`}>{row.after}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Corrections applied */}
            <div className="bg-[#0F0E1C] border border-white/8 rounded-xl p-4">
              <p className="text-[10px] tracking-widest uppercase text-white/25 mb-3">Corrections Applied</p>
              <ul className="space-y-2">
                {result.fixes_applied.map((fix, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="text-[#DEB04A] font-bold mt-0.5 flex-shrink-0">✓</span>
                    <span className="text-white/70">{fix}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Download + Master */}
            <a
              href={downloadUrl}
              download="mix_prepared.wav"
              className="w-full py-4 rounded-2xl font-bold text-base bg-[#DEB04A] text-black hover:brightness-110 transition-all duration-300 flex items-center justify-center relative overflow-hidden group"
            >
              <span className="relative z-10">Download Mix-Ready File</span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            </a>

            <a
              href="/master"
              className="w-full py-4 rounded-2xl font-bold text-base border border-[#DEB04A]/40 text-[#DEB04A] hover:bg-[#DEB04A]/10 hover:border-[#DEB04A]/70 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>Take to Mastering</span>
              <span>→</span>
            </a>

            <button
              onClick={handleReset}
              className="w-full py-3 rounded-2xl text-sm text-white/40 hover:text-white/70 transition-colors border border-white/10 hover:border-white/20"
            >
              Start Over
            </button>
          </motion.div>
        )}
      </div>
    </main>
  )
}
