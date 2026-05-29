'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type Mode = 'both' | 'track_only' | 'describe'

interface AnalysisResult {
  your_track: Record<string, number | string>
  reference?: Record<string, number | string>
  mastered: Record<string, number | string>
  notes: string[]
  download_id?: string
}

const GENRE_PRESETS = ['Hip-Hop', 'EDM', 'Pop', 'R&B', 'Podcast', 'Rock', 'Lo-Fi', 'Classical']
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
    <svg className="w-8 h-8 text-[#C9A84C]/40" viewBox="0 0 48 48" fill="none">
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
        waveColor: '#C9A84C40',
        progressColor: '#C9A84C',
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
        dragging ? 'border-[#C9A84C] bg-[#C9A84C]/5 shadow-[0_0_20px_rgba(201,168,76,0.15)]'
        : file ? 'border-[#C9A84C]/40 bg-[#C9A84C]/5 cursor-default'
        : 'border-white/10 bg-[#111] hover:border-[#C9A84C]/30 hover:shadow-[0_0_15px_rgba(201,168,76,0.08)] cursor-pointer'
      }`}
    >
      <input ref={inputRef} type="file" accept=".mp3,.wav,.flac" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {file ? (
        <div className="w-full">
          <div ref={waveRef} className="w-full" />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[#C9A84C] text-sm font-medium truncate max-w-[160px]">{file.name}</p>
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

function BeforeAfterPlayer({ originalFile, masteredUrl }: { originalFile: File; masteredUrl: string }) {
  const beforeRef = useRef<HTMLDivElement>(null)
  const afterRef = useRef<HTMLDivElement>(null)
  const beforeWs = useRef<import('wavesurfer.js').default | null>(null)
  const afterWs = useRef<import('wavesurfer.js').default | null>(null)
  const [beforePlaying, setBeforePlaying] = useState(false)
  const [afterPlaying, setAfterPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let bws: import('wavesurfer.js').default
    let aws: import('wavesurfer.js').default
    import('wavesurfer.js').then(({ default: WaveSurfer }) => {
      if (beforeRef.current) {
        bws = WaveSurfer.create({
          container: beforeRef.current,
          waveColor: '#ffffff18',
          progressColor: '#ffffff55',
          height: 72,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
        })
        bws.loadBlob(originalFile)
        bws.on('finish', () => setBeforePlaying(false))
        beforeWs.current = bws
      }
      if (afterRef.current) {
        aws = WaveSurfer.create({
          container: afterRef.current,
          waveColor: '#C9A84C30',
          progressColor: '#C9A84C',
          height: 72,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
        })
        aws.load(masteredUrl)
        aws.on('finish', () => setAfterPlaying(false))
        aws.on('ready', () => setLoaded(true))
        afterWs.current = aws
      }
    })
    return () => {
      bws?.destroy()
      aws?.destroy()
    }
  }, [originalFile, masteredUrl])

  function toggleBefore() {
    if (!beforeWs.current) return
    if (beforePlaying) {
      beforeWs.current.pause()
      setBeforePlaying(false)
    } else {
      afterWs.current?.pause()
      setAfterPlaying(false)
      beforeWs.current.play()
      setBeforePlaying(true)
    }
  }

  function toggleAfter() {
    if (!afterWs.current) return
    if (afterPlaying) {
      afterWs.current.pause()
      setAfterPlaying(false)
    } else {
      beforeWs.current?.pause()
      setBeforePlaying(false)
      afterWs.current.play()
      setAfterPlaying(true)
    }
  }

  return (
    <div className="rounded-xl border border-[#222] overflow-hidden">
      <div className="bg-[#111] px-4 py-3 border-b border-[#222]">
        <p className="text-white/70 text-sm font-medium tracking-wide">Before / After</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-[#222]">
        {/* Before */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
            <p className="text-[#666] text-xs uppercase tracking-widest">Before</p>
          </div>
          <div ref={beforeRef} className="w-full" />
          <button
            onClick={toggleBefore}
            className="flex items-center gap-2.5 px-4 py-2 rounded-lg border border-white/10 text-white/40 text-xs hover:text-white/70 hover:border-white/20 transition-all w-full justify-center"
          >
            <span className="text-base leading-none">{beforePlaying ? '⏸' : '▶'}</span>
            <span>{beforePlaying ? 'Pause' : 'Play Original'}</span>
          </button>
        </div>

        {/* After */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
            <p className="text-[#C9A84C]/60 text-xs uppercase tracking-widest">After</p>
            {!loaded && <span className="text-[#555] text-xs ml-auto">loading...</span>}
          </div>
          <div ref={afterRef} className="w-full" />
          <button
            onClick={toggleAfter}
            disabled={!loaded}
            className="flex items-center gap-2.5 px-4 py-2 rounded-lg border border-[#C9A84C]/20 text-[#C9A84C]/50 text-xs hover:text-[#C9A84C]/80 hover:border-[#C9A84C]/40 hover:shadow-[0_0_12px_rgba(201,168,76,0.1)] transition-all w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="text-base leading-none">{afterPlaying ? '⏸' : '▶'}</span>
            <span>{afterPlaying ? 'Pause' : 'Play Mastered'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function ResultsPanel({
  results,
  originalFile,
  masteredBlobUrl,
  onReset,
}: {
  results: AnalysisResult
  originalFile: File
  masteredBlobUrl: string
  onReset: () => void
}) {
  const metrics = [
    { key: 'lufs', label: 'LUFS' },
    { key: 'true_peak', label: 'True Peak' },
    { key: 'lra', label: 'LRA' },
    { key: 'stereo_width', label: 'Stereo Width' },
    { key: 'spectral_centroid', label: 'Spectral Centroid' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Before / After player */}
      <BeforeAfterPlayer originalFile={originalFile} masteredUrl={masteredBlobUrl} />

      {/* Comparison table */}
      <div className="rounded-xl border border-[#222] overflow-hidden">
        <div className="bg-[#111] px-4 py-3 border-b border-[#222]">
          <p className="text-white/70 text-sm font-medium">Analysis Results</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              <th className="text-left text-[#888] font-normal px-4 py-2">Metric</th>
              <th className="text-right text-[#888] font-normal px-4 py-2">Your Track</th>
              {results.reference && <th className="text-right text-[#888] font-normal px-4 py-2">Reference</th>}
              <th className="text-right text-[#C9A84C]/70 font-normal px-4 py-2">Mastered</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(({ key, label }) => (
              <tr key={key} className="border-b border-[#111] last:border-0">
                <td className="text-[#888] px-4 py-2">{label}</td>
                <td className="text-right text-white/60 px-4 py-2 font-mono text-xs">{results.your_track[key] ?? '—'}</td>
                {results.reference && <td className="text-right text-white/60 px-4 py-2 font-mono text-xs">{results.reference[key] ?? '—'}</td>}
                <td className="text-right text-[#C9A84C] px-4 py-2 font-mono text-xs">{results.mastered[key] ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {results.notes?.length > 0 && (
        <div className="bg-[#111] border border-[#222] rounded-xl px-4 py-4">
          <p className="text-[#888] text-xs mb-2 uppercase tracking-widest">Processing Notes</p>
          <ul className="space-y-1">
            {results.notes.map((note, i) => <li key={i} className="text-white/50 text-sm">• {note}</li>)}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <a
          href={masteredBlobUrl}
          download={`mastered_${originalFile.name.replace(/\.[^.]+$/, '')}.wav`}
          className="relative flex-1 py-4 bg-[#C9A84C] text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors overflow-hidden group text-sm text-center block"
        >
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
          <span className="relative z-10">⬇ Download Master (WAV 24-bit)</span>
        </a>
        <button onClick={onReset} className="px-6 py-4 border border-[#333] text-white/50 rounded-xl hover:border-[#C9A84C]/30 hover:text-white/70 transition-colors text-sm">
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
  const [masteredBlobUrl, setMasteredBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canSubmit =
    (mode === 'both' && yourTrack && referenceTrack) ||
    (mode === 'track_only' && yourTrack) ||
    (mode === 'describe' && description.trim().length > 0)

  async function handleMaster() {
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    setResults(null)
    if (masteredBlobUrl) URL.revokeObjectURL(masteredBlobUrl)
    setMasteredBlobUrl(null)
    setStepIndex(0)

    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, PROCESSING_STEPS.length - 2))
    }, 2500)

    const formData = new FormData()
    formData.append('mode', mode)
    if (yourTrack) formData.append('your_track', yourTrack)
    if (referenceTrack) formData.append('reference_track', referenceTrack)
    if (description) formData.append('description', description)
    if (genrePreset) formData.append('genre_preset', genrePreset)
    if (platformPreset) formData.append('platform_preset', platformPreset)

    try {
      const res = await fetch('/api/master', { method: 'POST', body: formData })
      clearInterval(interval)
      setStepIndex(PROCESSING_STEPS.length - 1)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Processing failed')
      }
      const data = await res.json()

      // Fetch mastered audio as blob so we have it for playback + download
      if (data.download_id) {
        const audioRes = await fetch(`/api/download?id=${data.download_id}`)
        const blob = await audioRes.blob()
        setMasteredBlobUrl(URL.createObjectURL(blob))
      }

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
    if (masteredBlobUrl) URL.revokeObjectURL(masteredBlobUrl)
    setMasteredBlobUrl(null)
  }

  const tabs: { key: Mode; label: string }[] = [
    { key: 'both', label: 'Upload Both' },
    { key: 'track_only', label: 'Track Only' },
    { key: 'describe', label: 'Describe' },
  ]

  if (results && yourTrack && masteredBlobUrl) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 pt-28">
        <h1 className="text-3xl font-bold mb-8">Your Master is Ready</h1>
        <ResultsPanel
          results={results}
          originalFile={yourTrack}
          masteredBlobUrl={masteredBlobUrl}
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
        <p className="text-[#C9A84C] tracking-widest text-xs uppercase mb-2">Studio</p>
        <h1 className="text-4xl font-bold mb-2">Master Your Track</h1>
        <p className="text-[#888] mb-8">AI-powered mastering engineered to your reference.</p>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-[#111] border border-[#222] rounded-lg p-1 mb-6 w-fit">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => { setMode(t.key); setError(null) }}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${mode === t.key ? 'bg-[#C9A84C] text-black' : 'text-[#888] hover:text-white'}`}>
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
                className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-white/80 text-sm placeholder:text-[#888] focus:outline-none focus:border-[#C9A84C]/40 resize-none" />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Presets */}
        <div className="mb-8 space-y-3">
          <p className="text-[#888] text-xs uppercase tracking-widest">Genre Preset</p>
          <div className="flex flex-wrap gap-2">
            {GENRE_PRESETS.map((g) => (
              <button key={g} onClick={() => setGenrePreset(genrePreset === g.toLowerCase() ? null : g.toLowerCase())}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${genrePreset === g.toLowerCase() ? 'border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10 shadow-[0_0_10px_rgba(201,168,76,0.2)]' : 'border-[#222] text-[#888] hover:border-[#C9A84C]/30'}`}>
                {g}
              </button>
            ))}
          </div>
          <p className="text-[#888] text-xs uppercase tracking-widest pt-1">Platform Target</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_PRESETS.map((p) => (
              <button key={p.key} onClick={() => setPlatformPreset(platformPreset === p.key ? null : p.key)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${platformPreset === p.key ? 'border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10 shadow-[0_0_10px_rgba(201,168,76,0.2)]' : 'border-[#222] text-[#888] hover:border-[#C9A84C]/30'}`}>
                {p.label} <span className="opacity-60">{p.lufs}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Master button */}
        <button onClick={handleMaster} disabled={!canSubmit || loading}
          className={`relative w-full py-4 rounded-xl text-base font-semibold transition-all overflow-hidden group ${canSubmit && !loading ? 'bg-[#C9A84C] text-black hover:bg-amber-400 cursor-pointer' : 'bg-white/[0.04] text-white/20 cursor-not-allowed'}`}>
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
