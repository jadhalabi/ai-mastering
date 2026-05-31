'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Upload, X } from 'lucide-react'
import ProcessingStatus from '@/components/ProcessingStatus'
import BeforeAfterCard, { AudioStats } from '@/components/BeforeAfterCard'

type Mode = 'both' | 'track_only' | 'describe'

interface TrackStats {
  lufs?: number
  true_peak?: number
  lra?: number
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
  { label: 'Spotify',     key: 'spotify',      lufs: '-14 LUFS' },
  { label: 'Apple Music', key: 'apple_music',  lufs: '-16 LUFS' },
  { label: 'YouTube',     key: 'youtube',      lufs: '-14 LUFS' },
  { label: 'SoundCloud',  key: 'soundcloud',   lufs: '-11 LUFS' },
  { label: 'Tidal',       key: 'tidal',        lufs: '-14 LUFS' },
]

function toProcessingStep(stepIndex: number) {
  if (stepIndex >= 4) return 5
  return stepIndex
}

function buildAudioStats(track: TrackStats): AudioStats {
  return {
    lufs: track.lufs ?? -23,
    truePeak: track.true_peak ?? -1,
    dynamicRange: track.lra ?? 5,
  }
}

// ── Purple drop zone ────────────────────────────────────────────────────────

function WaveformMini({ file }: { file: File }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    let ws: import('wavesurfer.js').default | null = null
    import('wavesurfer.js').then(({ default: WaveSurfer }) => {
      ws = WaveSurfer.create({
        container: ref.current!,
        waveColor: 'rgba(168,85,247,0.5)',
        progressColor: '#a855f7',
        height: 48,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        interact: false,
      })
      ws.loadBlob(file)
    })
    return () => { ws?.destroy() }
  }, [file])
  return <div ref={ref} className="w-full" />
}

function DropZone({
  label,
  file,
  onFile,
  onClear,
}: {
  label: string
  file: File | null
  onFile: (f: File) => void
  onClear: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }, [onFile])

  return (
    <>
      <style>{`
        @keyframes pulse-border {
          0%,100% { border-color: rgba(168,85,247,.5); box-shadow: 0 0 0 0 rgba(168,85,247,.3); }
          50%      { border-color: rgba(168,85,247,.9); box-shadow: 0 0 24px 6px rgba(168,85,247,.2); }
        }
      `}</style>
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.flac"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }}
      />
      <div
        onClick={() => !file && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{ animation: dragging ? 'pulse-border 1.2s ease-in-out infinite' : 'none' }}
        className={`relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 min-h-[160px]
          ${dragging
            ? 'border-purple-500 bg-purple-500/10 cursor-copy'
            : file
              ? 'border-purple-600/50 bg-[#0F0E1C] cursor-default'
              : 'border-purple-600/25 bg-[#0F0E1C] hover:border-purple-500/50 hover:bg-purple-500/5 cursor-pointer'
          }`}
      >
        {file ? (
          <div className="w-full">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-purple-400 uppercase tracking-widest">{label}</p>
              <button
                onClick={(e) => { e.stopPropagation(); onClear() }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
            <WaveformMini file={file} />
            <p className="text-white/50 text-xs mt-2 truncate">{file.name}</p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Upload size={20} className="text-purple-400" />
            </div>
            <div className="text-center">
              <p className="text-white/70 text-sm font-medium">{label}</p>
              <p className="text-white/25 text-xs mt-1">WAV · MP3 · FLAC</p>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ── Before/After audio player ───────────────────────────────────────────────

function WaveformBarsSimple({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return <div className="h-[64px] bg-white/5 rounded-lg" />
  return (
    <div className="flex items-center gap-px h-[64px] w-full">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-full"
          style={{ height: `${Math.max(3, v * 100)}%`, backgroundColor: color, opacity: 0.6 }}
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
  const beforeWs  = useRef<import('wavesurfer.js').default | null>(null)
  const [playing, setPlaying]   = useState(false)
  const [wsReady, setWsReady]   = useState(false)

  useEffect(() => {
    let bws: import('wavesurfer.js').default
    import('wavesurfer.js').then(({ default: WaveSurfer }) => {
      if (!beforeRef.current) return
      bws = WaveSurfer.create({ container: beforeRef.current, waveColor: 'transparent', progressColor: 'transparent', height: 1, interact: false })
      bws.loadBlob(originalFile)
      bws.on('ready',  () => setWsReady(true))
      bws.on('finish', () => setPlaying(false))
      bws.on('error',  () => {})
      beforeWs.current = bws
    }).catch(() => {})
    return () => { bws?.destroy() }
  }, [originalFile])

  function toggle() {
    if (!beforeWs.current || !wsReady) return
    if (playing) { beforeWs.current.pause(); setPlaying(false) }
    else          { beforeWs.current.play();  setPlaying(true) }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0F0E1C', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-5 py-3 border-b border-white/5">
        <p className="text-white/60 text-sm font-medium">Listen: Before / After</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-white/8">
        {/* Before */}
        <div className="p-5 space-y-3">
          <p className="text-white/30 text-xs uppercase tracking-widest">Before</p>
          <WaveformBarsSimple data={beforeWaveform} color="#ffffff" />
          <div ref={beforeRef} className="hidden" />
          <button onClick={toggle} disabled={!wsReady}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-white/40 text-xs hover:text-white/70 hover:border-white/20 transition-all w-full justify-center disabled:opacity-40">
            <span>{playing ? '⏸' : '▶'}</span>
            <span>{playing ? 'Pause' : 'Play Original'}</span>
          </button>
        </div>
        {/* After */}
        <div className="p-5 space-y-3">
          <p className="text-purple-400/70 text-xs uppercase tracking-widest">Mastered</p>
          <WaveformBarsSimple data={afterWaveform} color="#a855f7" />
          <a href={downloadUrl} download="mastered.wav"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-500/30 text-purple-300/70 text-xs hover:text-purple-300 hover:border-purple-500/60 hover:bg-purple-500/5 transition-all w-full justify-center">
            ↓ Download Mastered
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Results panel ───────────────────────────────────────────────────────────

function ResultsPanel({ results, originalFile, onReset }: { results: AnalysisResult; originalFile: File; onReset: () => void }) {
  const beforeWaveform = (results.your_track.waveform as number[]) ?? []
  const afterWaveform  = (results.mastered.waveform  as number[]) ?? []
  const beforeStats    = buildAudioStats(results.your_track)
  const afterStats     = buildAudioStats(results.mastered)

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <BeforeAfterCard before={beforeStats} after={afterStats} />

      {results.download_url && (
        <BeforeAfterPlayer
          originalFile={originalFile}
          beforeWaveform={beforeWaveform}
          afterWaveform={afterWaveform}
          downloadUrl={results.download_url}
        />
      )}

      {results.notes?.length > 0 && (
        <div className="rounded-xl px-5 py-4" style={{ background: '#0F0E1C', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-white/40 text-xs mb-2 uppercase tracking-widest">Processing Notes</p>
          <ul className="space-y-1">
            {results.notes.map((note, i) => <li key={i} className="text-white/50 text-sm">• {note}</li>)}
          </ul>
        </div>
      )}

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
        <button onClick={onReset} className="px-6 py-4 border border-white/10 text-white/50 rounded-xl hover:border-purple-500/30 hover:text-white/70 transition-colors text-sm">
          Master Another
        </button>
      </div>
    </motion.div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

function MasterPageInner() {
  const searchParams = useSearchParams()
  const [mode, setMode]                   = useState<Mode>('both')
  const [yourTrack, setYourTrack]         = useState<File | null>(null)
  const [referenceTrack, setReferenceTrack] = useState<File | null>(null)
  const [description, setDescription]    = useState('')
  const [genrePreset, setGenrePreset]     = useState<string | null>(searchParams.get('genre'))
  const [platformPreset, setPlatformPreset] = useState<string | null>(searchParams.get('platform'))
  const [loading, setLoading]             = useState(false)
  const [stepIndex, setStepIndex]         = useState(0)
  const [results, setResults]             = useState<AnalysisResult | null>(null)
  const [error, setError]                 = useState<string | null>(null)

  const canSubmit =
    (mode === 'both'       && yourTrack && referenceTrack) ||
    (mode === 'track_only' && yourTrack) ||
    (mode === 'describe'   && description.trim().length > 0)

  async function handleMaster() {
    if (!canSubmit || !yourTrack) return
    setLoading(true)
    setError(null)
    setResults(null)
    setStepIndex(0)

    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, 3))
    }, 2500)

    try {
      async function getUploadUrl(file: File, role: string) {
        const res = await fetch('/api/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, role }),
        })
        if (!res.ok) throw new Error('Could not get upload URL')
        return res.json() as Promise<{ signedUrl: string; path: string; publicUrl: string }>
      }

      async function uploadToStorage(file: File, role: string) {
        const { signedUrl, publicUrl } = await getUploadUrl(file, role)
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'audio/wav' },
        })
        if (!uploadRes.ok) throw new Error('Upload failed')
        return publicUrl
      }

      const inputUrl = await uploadToStorage(yourTrack, 'input')
      let referenceUrl: string | null = null
      if (referenceTrack) {
        referenceUrl = await uploadToStorage(referenceTrack, 'ref').catch(() => null)
      }

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
      setStepIndex(4)

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
    { key: 'both',       label: 'Upload Both' },
    { key: 'track_only', label: 'Track Only'  },
    { key: 'describe',   label: 'Describe'    },
  ]

  if (results && yourTrack) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 pt-28">
        <p className="text-purple-400 tracking-widest text-xs uppercase mb-2">Studio</p>
        <h1 className="text-3xl font-heading font-bold mb-8">Your Master is Ready</h1>
        <ResultsPanel results={results} originalFile={yourTrack} onReset={handleReset} />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 pt-28">
      {/* Grain */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] z-0"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '128px 128px' }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-purple-400 tracking-widest text-xs uppercase mb-2">Studio</p>
        <h1 className="text-4xl font-heading font-bold mb-2">Master Your Track</h1>
        <p className="text-white/40 mb-8">AI-powered mastering engineered to your reference.</p>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 mb-6 w-fit rounded-xl" style={{ background: '#0F0E1C', border: '1px solid rgba(168,85,247,0.15)' }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => { setMode(t.key); setError(null) }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === t.key
                  ? 'bg-purple-600 text-white shadow-[0_0_16px_rgba(168,85,247,0.4)]'
                  : 'text-white/40 hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Upload zones */}
        <AnimatePresence mode="wait">
          <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="mb-6">
            {mode === 'both' && (
              <div className="grid grid-cols-2 gap-4">
                <DropZone label="Your Track"       file={yourTrack}      onFile={setYourTrack}      onClear={() => setYourTrack(null)} />
                <DropZone label="Reference Track"  file={referenceTrack} onFile={setReferenceTrack} onClear={() => setReferenceTrack(null)} />
              </div>
            )}
            {mode === 'track_only' && (
              <DropZone label="Your Track" file={yourTrack} onFile={setYourTrack} onClear={() => setYourTrack(null)} />
            )}
            {mode === 'describe' && (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the sound you're going for — genre, energy, references, mood..."
                rows={4}
                className="w-full rounded-xl px-4 py-3 text-white/80 text-sm placeholder:text-white/30 focus:outline-none resize-none"
                style={{ background: '#0F0E1C', border: '1px solid rgba(168,85,247,0.25)' }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Presets */}
        <div className="mb-8 space-y-3">
          <p className="text-white/40 text-xs uppercase tracking-widest">Genre Preset</p>
          <div className="flex flex-wrap gap-2">
            {GENRE_PRESETS.map((g) => (
              <button key={g}
                onClick={() => setGenrePreset(genrePreset === g.toLowerCase() ? null : g.toLowerCase())}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  genrePreset === g.toLowerCase()
                    ? 'border-purple-500 text-purple-300 bg-purple-500/15 shadow-[0_0_10px_rgba(168,85,247,0.25)]'
                    : 'border-white/8 text-white/40 hover:border-purple-500/30 hover:text-white/60'
                }`}>
                {g}
              </button>
            ))}
          </div>

          <p className="text-white/40 text-xs uppercase tracking-widest pt-1">Platform Target</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_PRESETS.map((p) => (
              <button key={p.key}
                onClick={() => setPlatformPreset(platformPreset === p.key ? null : p.key)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  platformPreset === p.key
                    ? 'border-purple-500 text-purple-300 bg-purple-500/15 shadow-[0_0_10px_rgba(168,85,247,0.25)]'
                    : 'border-white/8 text-white/40 hover:border-purple-500/30 hover:text-white/60'
                }`}>
                {p.label} <span className="opacity-50">{p.lufs}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Processing stepper — shown while loading */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <ProcessingStatus currentStep={toProcessingStep(stepIndex)} orientation="horizontal" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Master button */}
        <button
          onClick={handleMaster}
          disabled={!canSubmit || loading}
          className={`relative w-full py-4 rounded-xl text-base font-semibold transition-all overflow-hidden group ${
            canSubmit && !loading
              ? 'bg-[#DEB04A] text-black hover:bg-[#E8C060] cursor-pointer'
              : 'bg-white/[0.04] text-white/20 cursor-not-allowed'
          }`}
        >
          {canSubmit && !loading && (
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
          )}
          <span className="relative z-10">{loading ? 'Processing…' : 'Master Track'}</span>
        </button>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-red-400/80 text-sm">
            {error}
          </motion.p>
        )}
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
