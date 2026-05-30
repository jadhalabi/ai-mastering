'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'both' | 'track_only' | 'describe'

interface TrackStats {
  lufs?: number
  true_peak?: number
  waveform?: number[]
  [key: string]: number | string | number[] | undefined
}

interface AnalysisResult {
  your_track: TrackStats
  reference?: TrackStats
  mastered: TrackStats
  notes: string[]
  download_url?: string
}

const GENRE_PRESETS = [
  'Hip-Hop', 'EDM', 'Pop', 'R&B', 'Podcast', 'Rock', 'Lo-Fi', 'Classical',
  'House', 'Afro House', 'Deep House', 'Deep Melodic House',
]
const PLATFORM_PRESETS = [
  { label: 'Spotify', key: 'spotify', lufs: '-14 LUFS' },
  { label: 'Apple Music', key: 'apple_music', lufs: '-16 LUFS' },
  { label: 'YouTube', key: 'youtube', lufs: '-14 LUFS' },
  { label: 'SoundCloud', key: 'soundcloud', lufs: '-11 LUFS' },
  { label: 'Tidal', key: 'tidal', lufs: '-14 LUFS' },
]

const PROCESSING_STEPS = [
  'Analyzing your track...',
  'Comparing to reference...',
  'Applying EQ...',
  'Limiting & finalizing...',
  'Done',
]

function WaveformIcon() {
  return (
    <svg className="w-8 h-8 text-[#DEB04A]/40" viewBox="0 0 48 48" fill="none">
      <rect x="4" y="18" width="4" height="12" rx="2" fill="currentColor" />
      <rect x="12" y="10" width="4" height="28" rx="2" fill="currentColor" />
      <rect x="20" y="14" width="4" height="20" rx="2" fill="currentColor" />
      <rect x="28" y="6" width="4" height="36" rx="2" fill="currentColor" />
      <rect x="36" y="16" width="4" height="16" rx="2" fill="currentColor" />
    </svg>
  )
}

function DropZone({ label, file, onFile }: { label: string; file: File | null; onFile: (f: File) => void }) {
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
        dragging ? 'border-[#DEB04A] bg-[#DEB04A]/5 shadow-[0_0_20px_rgba(201,168,76,0.15)]'
        : file ? 'border-[#DEB04A]/40 bg-[#DEB04A]/5 cursor-default'
        : 'border-white/10 bg-[#0F0E1C] hover:border-[#DEB04A]/30 hover:shadow-[0_0_15px_rgba(201,168,76,0.08)] cursor-pointer'
      }`}
    >
      <input ref={inputRef} type="file" accept=".mp3,.wav,.flac" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {file ? (
        <div className="w-full">
          <div ref={waveRef} className="w-full" />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[#DEB04A] text-sm font-medium truncate max-w-[160px]">{file.name}</p>
            <button onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }} className="text-white/30 text-xs hover:text-white/60">change</button>
          </div>
        </div>
      ) : (
        <>
          <WaveformIcon />
          <div className="text-center">
            <p className="text-white/60 text-sm font-medium">{label}</p>
            <p className="text-white/25 text-xs mt-1">mp3, wav, flac</p>
          </div>
        </>
      )}
    </div>
  )
}

function WaveformBarsSimple({ data, accent }: { data: number[]; accent: boolean }) {
  if (!data.length) return <div className="h-[72px] bg-white/5 rounded" />
  return (
    <div className="flex items-center gap-px h-[72px] w-full">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-full"
          style={{
            height: `${Math.max(3, v * 100)}%`,
            backgroundColor: accent ? '#DEB04A' : '#ffffff',
            opacity: accent ? 0.6 : 0.18,
          }}
        />
      ))}
    </div>
  )
}

function BeforeAfterPlayer({
  originalFile,
  beforeWaveform,
  afterWaveform,
  downloadUrl,
}: {
  originalFile: File
  beforeWaveform: number[]
  afterWaveform: number[]
  downloadUrl: string
}) {
  const beforeRef = useRef<HTMLDivElement>(null)
  const beforeWs = useRef<import('wavesurfer.js').default | null>(null)
  const [beforePlaying, setBeforePlaying] = useState(false)
  const [wsReady, setWsReady] = useState(false)

  useEffect(() => {
    let bws: import('wavesurfer.js').default
    import('wavesurfer.js').then(({ default: WaveSurfer }) => {
      if (!beforeRef.current) return
      bws = WaveSurfer.create({
        container: beforeRef.current,
        waveColor: 'transparent',
        progressColor: 'transparent',
        height: 1,
        interact: false,
      })
      bws.loadBlob(originalFile)
      bws.on('ready', () => setWsReady(true))
      bws.on('finish', () => setBeforePlaying(false))
      bws.on('error', () => {})
      beforeWs.current = bws
    }).catch(() => {})
    return () => { bws?.destroy() }
  }, [originalFile])

  function toggleBefore() {
    if (!beforeWs.current || !wsReady) return
    if (beforePlaying) { beforeWs.current.pause(); setBeforePlaying(false) }
    else { beforeWs.current.play(); setBeforePlaying(true) }
  }

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <div className="bg-[#0F0E1C] px-4 py-3 border-b border-white/8">
        <p className="text-white/70 text-sm font-medium tracking-wide">Before / After</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-white/8">
        {/* Before */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
            <p className="text-white/30 text-xs uppercase tracking-widest">Before</p>
          </div>
          <WaveformBarsSimple data={beforeWaveform} accent={false} />
          <div ref={beforeRef} className="hidden" />
          <button
            onClick={toggleBefore}
            disabled={!wsReady}
            className="flex items-center gap-2.5 px-4 py-2 rounded-lg border border-white/10 text-white/40 text-xs hover:text-white/70 hover:border-white/20 transition-all w-full justify-center disabled:opacity-40"
          >
            <span className="text-base leading-none">{beforePlaying ? '⏸' : '▶'}</span>
            <span>{beforePlaying ? 'Pause' : 'Play Original'}</span>
          </button>
        </div>

        {/* After */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#DEB04A]" />
            <p className="text-[#DEB04A]/60 text-xs uppercase tracking-widest">Mastered</p>
          </div>
          <WaveformBarsSimple data={afterWaveform} accent={true} />
          <a
            href={downloadUrl}
            download="mastered.wav"
            className="flex items-center gap-2.5 px-4 py-2 rounded-lg border border-[#DEB04A]/20 text-[#DEB04A]/60 text-xs hover:text-[#DEB04A]/90 hover:border-[#DEB04A]/40 transition-all w-full justify-center"
          >
            ↓ Download Mastered
          </a>
        </div>
      </div>
    </div>
  )
}

function ResultsPanel({
  results,
  originalFile,
  onReset,
}: {
  results: AnalysisResult
  originalFile: File
  onReset: () => void
}) {
  const metrics = [
    { key: 'lufs', label: 'LUFS' },
    { key: 'true_peak', label: 'True Peak' },
    { key: 'lra', label: 'LRA' },
    { key: 'stereo_width', label: 'Stereo Width' },
    { key: 'spectral_centroid', label: 'Spectral Centroid' },
  ]
  const beforeWaveform = (results.your_track.waveform as number[]) ?? []
  const afterWaveform  = (results.mastered.waveform  as number[]) ?? []

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Before / After */}
      {results.download_url && (
        <BeforeAfterPlayer
          originalFile={originalFile}
          beforeWaveform={beforeWaveform}
          afterWaveform={afterWaveform}
          downloadUrl={results.download_url}
        />
      )}

      {/* Comparison table */}
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <div className="bg-[#0F0E1C] px-4 py-3 border-b border-white/8">
          <p className="text-white/70 text-sm font-medium">Analysis Results</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-white/40 font-normal px-4 py-2">Metric</th>
              <th className="text-right text-white/40 font-normal px-4 py-2">Your Track</th>
              {results.reference && <th className="text-right text-white/40 font-normal px-4 py-2">Reference</th>}
              <th className="text-right text-[#DEB04A]/70 font-normal px-4 py-2">Mastered</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(({ key, label }) => (
              <tr key={key} className="border-b border-[#111] last:border-0">
                <td className="text-white/40 px-4 py-2">{label}</td>
                <td className="text-right text-white/60 px-4 py-2 font-mono text-xs">{results.your_track[key] ?? '—'}</td>
                {results.reference && <td className="text-right text-white/60 px-4 py-2 font-mono text-xs">{results.reference[key] ?? '—'}</td>}
                <td className="text-right text-[#DEB04A] px-4 py-2 font-mono text-xs">{results.mastered[key] ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {results.notes?.length > 0 && (
        <div className="bg-[#0F0E1C] border border-white/8 rounded-xl px-4 py-4">
          <p className="text-white/40 text-xs mb-2 uppercase tracking-widest">Processing Notes</p>
          <ul className="space-y-1">
            {results.notes.map((note, i) => <li key={i} className="text-white/50 text-sm">• {note}</li>)}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {results.download_url && (
          <a
            href={results.download_url}
            download={`mastered_${originalFile.name.replace(/\.[^.]+$/, '')}.wav`}
            className="relative flex-1 py-4 bg-[#DEB04A] text-black font-semibold rounded-xl hover:bg-[#E8C060] transition-colors overflow-hidden group text-sm text-center block"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
            <span className="relative z-10">⬇ Download Master (WAV 24-bit)</span>
          </a>
        )}
        <button onClick={onReset} className="px-6 py-4 border border-white/10 text-white/50 rounded-xl hover:border-[#DEB04A]/30 hover:text-white/70 transition-colors text-sm">
          Master Another
        </button>
      </div>
    </motion.div>
  )
}

function MasterPageInner() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>('both')
  const [yourTrack, setYourTrack] = useState<File | null>(null)
  const [referenceTrack, setReferenceTrack] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [genrePreset, setGenrePreset] = useState<string | null>(searchParams.get('genre'))
  const [platformPreset, setPlatformPreset] = useState<string | null>(searchParams.get('platform'))
  const [loading, setLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canSubmit =
    (mode === 'both' && yourTrack && referenceTrack) ||
    (mode === 'track_only' && yourTrack) ||
    (mode === 'describe' && description.trim().length > 0)

  async function handleMaster() {
    if (!canSubmit || !yourTrack) return
    setLoading(true)
    setError(null)
    setResults(null)
    setStepIndex(0)

    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, PROCESSING_STEPS.length - 2))
    }, 2500)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const folder = user ? user.id : 'temp'
      const uuid = crypto.randomUUID()

      // Upload input to Supabase Storage (bypasses Vercel's 4.5MB limit)
      const inputStoragePath = `${folder}/input_${uuid}_${yourTrack.name}`
      const { error: uploadErr } = await supabase.storage
        .from('audio')
        .upload(inputStoragePath, yourTrack, { upsert: true })
      if (uploadErr) throw new Error('Upload failed: ' + uploadErr.message)

      const { data: { publicUrl: inputUrl } } = supabase.storage.from('audio').getPublicUrl(inputStoragePath)

      let referenceUrl: string | null = null
      if (referenceTrack) {
        const refPath = `${folder}/ref_${uuid}_${referenceTrack.name}`
        const { error: refErr } = await supabase.storage
          .from('audio')
          .upload(refPath, referenceTrack, { upsert: true })
        if (!refErr) {
          referenceUrl = supabase.storage.from('audio').getPublicUrl(refPath).data.publicUrl
        }
      }

      // Call API with public URLs (no size limit)
      const res = await fetch('/api/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_url: inputUrl,
          reference_url: referenceUrl,
          mode,
          platform_preset: platformPreset,
          genre_preset: genrePreset,
        }),
      })

      clearInterval(interval)
      setStepIndex(PROCESSING_STEPS.length - 1)

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Processing failed')
      setResults(data)
    } catch (e: unknown) {
      clearInterval(interval)
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setResults(null)
    setYourTrack(null)
    setReferenceTrack(null)
  }

  const tabs: { key: Mode; label: string }[] = [
    { key: 'both', label: 'Upload Both' },
    { key: 'track_only', label: 'Track Only' },
    { key: 'describe', label: 'Describe' },
  ]

  if (results && yourTrack) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 pt-28">
        <h1 className="text-3xl font-heading font-bold mb-8">Your Master is Ready</h1>
        <ResultsPanel
          results={results}
          originalFile={yourTrack}
          onReset={handleReset}
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 pt-28">
      {/* grain */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '128px 128px' }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[#DEB04A] tracking-widest text-xs uppercase mb-2">Studio</p>
        <h1 className="text-4xl font-heading font-bold mb-2">Master Your Track</h1>
        <p className="text-white/40 mb-8">AI-powered mastering engineered to your reference.</p>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-[#0F0E1C] border border-white/8 rounded-lg p-1 mb-6 w-fit">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => { setMode(t.key); setError(null) }}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${mode === t.key ? 'bg-[#DEB04A] text-black' : 'text-white/40 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Upload zones */}
        <AnimatePresence mode="wait">
          <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="mb-6">
            {mode === 'both' && (
              <div className="grid grid-cols-2 gap-4">
                <DropZone label="Drop Your Track" file={yourTrack} onFile={setYourTrack} />
                <DropZone label="Drop Reference Track" file={referenceTrack} onFile={setReferenceTrack} />
              </div>
            )}
            {mode === 'track_only' && <DropZone label="Drop Your Track" file={yourTrack} onFile={setYourTrack} />}
            {mode === 'describe' && (
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the sound you're going for — genre, energy, references, mood..."
                rows={4}
                className="w-full bg-[#0F0E1C] border border-white/8 rounded-xl px-4 py-3 text-white/80 text-sm placeholder:text-white/40 focus:outline-none focus:border-[#DEB04A]/40 resize-none" />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Presets */}
        <div className="mb-8 space-y-3">
          <p className="text-white/40 text-xs uppercase tracking-widest">Genre Preset</p>
          <div className="flex flex-wrap gap-2">
            {GENRE_PRESETS.map((g) => (
              <button key={g} onClick={() => setGenrePreset(genrePreset === g.toLowerCase() ? null : g.toLowerCase())}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${genrePreset === g.toLowerCase() ? 'border-[#DEB04A] text-[#DEB04A] bg-[#DEB04A]/10 shadow-[0_0_10px_rgba(201,168,76,0.2)]' : 'border-white/8 text-white/40 hover:border-[#DEB04A]/30'}`}>
                {g}
              </button>
            ))}
          </div>
          <p className="text-white/40 text-xs uppercase tracking-widest pt-1">Platform Target</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_PRESETS.map((p) => (
              <button key={p.key} onClick={() => setPlatformPreset(platformPreset === p.key ? null : p.key)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${platformPreset === p.key ? 'border-[#DEB04A] text-[#DEB04A] bg-[#DEB04A]/10 shadow-[0_0_10px_rgba(201,168,76,0.2)]' : 'border-white/8 text-white/40 hover:border-[#DEB04A]/30'}`}>
                {p.label} <span className="opacity-60">{p.lufs}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Master button */}
        <button onClick={handleMaster} disabled={!canSubmit || loading}
          className={`relative w-full py-4 rounded-xl text-base font-semibold transition-all overflow-hidden group ${canSubmit && !loading ? 'bg-[#DEB04A] text-black hover:bg-[#E8C060] cursor-pointer' : 'bg-white/[0.04] text-white/20 cursor-not-allowed'}`}>
          {canSubmit && !loading && <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />}
          {loading ? (
            <div className="space-y-2">
              <p className="text-black/80 text-sm">{PROCESSING_STEPS[stepIndex]}</p>
              <div className="w-48 mx-auto bg-black/20 rounded-full h-1">
                <div className="bg-black/60 h-1 rounded-full transition-all duration-500" style={{ width: `${((stepIndex + 1) / PROCESSING_STEPS.length) * 100}%` }} />
              </div>
            </div>
          ) : 'Master Track'}
        </button>

        {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-red-400/80 text-sm">{error}</motion.p>}
      </motion.div>
    </div>
  )
}

export default function MasterPage() {
  return (
    <Suspense>
      <MasterPageInner />
    </Suspense>
  )
}
