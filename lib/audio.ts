import ffmpegLib from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import ffprobe from '@ffprobe-installer/ffprobe'
import { mkdir, writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

ffmpegLib.setFfmpegPath(ffmpegPath as string)
ffmpegLib.setFfprobePath(ffprobe.path)

const TMP = join(tmpdir(), 'ai-mastering')

async function generateWaveform(audioPath: string): Promise<number[]> {
  const rawPath = join(TMP, `wf_${randomUUID()}.raw`)
  await new Promise<void>((resolve, reject) =>
    ffmpegLib(audioPath)
      .audioChannels(1)
      .audioFrequency(8000)
      .audioCodec('pcm_s16le')
      .format('s16le')
      .output(rawPath)
      .on('end', () => resolve())
      .on('error', (e: Error) => reject(e))
      .run()
  )
  const raw = await readFile(rawPath)
  const samples = Math.floor(raw.length / 2)
  const chunkSize = Math.max(1, Math.floor(samples / 200))
  const peaks: number[] = []
  for (let i = 0; i < 200; i++) {
    let max = 0
    const end = Math.min((i + 1) * chunkSize, samples)
    for (let j = i * chunkSize; j < end; j++) {
      const idx = j * 2
      if (idx + 1 < raw.length) {
        const v = Math.abs(raw.readInt16LE(idx)) / 32768
        if (v > max) max = v
      }
    }
    peaks.push(Math.round(max * 10000) / 10000)
  }
  await unlink(rawPath).catch(() => {})
  return peaks
}

function parseLoudnormJson(stderr: string): Record<string, string> {
  const match = stderr.match(/\{[\s\S]*?\}/)
  if (!match) return {}
  try { return JSON.parse(match[0]) } catch { return {} }
}

export async function analyzeAudio(inputPath: string): Promise<{
  lufs: number; true_peak: number; lra: number; waveform: number[]
}> {
  await mkdir(TMP, { recursive: true })
  let stderr = ''
  await new Promise<void>((resolve, reject) =>
    ffmpegLib(inputPath)
      .audioFilters('loudnorm=print_format=json')
      .format('null')
      .output('-')
      .on('stderr', (line: string) => { stderr += line + '\n' })
      .on('end', () => resolve())
      .on('error', (e: Error) => reject(e))
      .run()
  )
  const d = parseLoudnormJson(stderr)
  const waveform = await generateWaveform(inputPath)
  return {
    lufs: parseFloat(d.input_i ?? '') || -23,
    true_peak: parseFloat(d.input_tp ?? '') || -1,
    lra: parseFloat(d.input_lra ?? '') || 5,
    waveform,
  }
}

async function measureBandRMS(audioPath: string, filter: string): Promise<number> {
  let stderr = ''
  await new Promise<void>((resolve, reject) =>
    ffmpegLib(audioPath)
      .audioFilters([filter, 'volumedetect'])
      .format('null')
      .output('-')
      .on('stderr', (line: string) => { stderr += line + '\n' })
      .on('end', () => resolve())
      .on('error', (e: Error) => reject(e))
      .run()
  )
  const m = stderr.match(/mean_volume:\s*([-\d.]+)\s*dB/i)
  return m ? parseFloat(m[1]) : -60
}

export type MixIssue = { id: string; severity: 'critical' | 'warning' | 'info'; label: string; detail: string }
export type MixFixes = { mud_cut_db: number; harsh_cut_db: number; sib_cut_db: number; apply_compression: boolean; compression_ratio: number }
export type MixAnalysisResult = {
  peak_db: number; headroom_db: number; lufs: number; lra: number
  clips_pct: number; stereo_width: number
  eq_bands: { sub: number; bass: number; mud: number; boxiness: number; presence: number; harshness: number; sibilance: number; air: number }
  waveform: number[]; issues: MixIssue[]; fixes: MixFixes
}

export async function analyzeMix(inputPath: string): Promise<MixAnalysisResult> {
  await mkdir(TMP, { recursive: true })

  const [base, sub, bass, mud, boxiness, presence, harshness, sibilance, air, midDb, sideDb] =
    await Promise.all([
      analyzeAudio(inputPath),
      measureBandRMS(inputPath, 'lowpass=f=80'),
      measureBandRMS(inputPath, 'bandpass=f=150:width_type=h:w=170'),
      measureBandRMS(inputPath, 'bandpass=f=350:width_type=h:w=300'),
      measureBandRMS(inputPath, 'bandpass=f=550:width_type=h:w=550'),
      measureBandRMS(inputPath, 'bandpass=f=2500:width_type=h:w=3000'),
      measureBandRMS(inputPath, 'bandpass=f=4500:width_type=h:w=3000'),
      measureBandRMS(inputPath, 'bandpass=f=8500:width_type=h:w=5000'),
      measureBandRMS(inputPath, 'highpass=f=12000').catch(() => -60),
      measureBandRMS(inputPath, 'pan=mono|c0=c0+c1').catch(() => -60),
      measureBandRMS(inputPath, 'pan=mono|c0=c0-c1').catch(() => -60),
    ])

  const peak_db = base.true_peak
  const lufs = base.lufs
  const lra = base.lra
  const headroom_db = -peak_db
  const clips_pct = peak_db > -0.3 ? Math.min(10, Math.abs(peak_db + 0.3) * 3) : 0

  const stereo_width = sideDb < -50
    ? 0
    : Math.round(Math.min(2, Math.max(0, Math.pow(10, (sideDb - midDb) / 20))) * 100) / 100

  const eq_bands = { sub, bass, mud, boxiness, presence, harshness, sibilance, air }
  const bandVals = [sub, bass, mud, boxiness, presence, harshness, sibilance, air]
  const bandAvg = bandVals.reduce((a, b) => a + b, 0) / bandVals.length

  const issues: MixIssue[] = []
  const fixes: MixFixes = { mud_cut_db: 0, harsh_cut_db: 0, sib_cut_db: 0, apply_compression: false, compression_ratio: 2.0 }

  if (peak_db > -0.3) {
    issues.push({ id: 'clipping', severity: 'critical', label: 'Clipping / Near-Clipping',
      detail: `Your track peaks at ${peak_db.toFixed(1)} dBFS — any mastering processing will add distortion.` })
  }
  if (headroom_db < 6 && peak_db <= -0.3) {
    issues.push({ id: 'headroom', severity: 'critical', label: 'Insufficient Headroom',
      detail: `Only ${headroom_db.toFixed(1)} dB of headroom — mastering needs at least 6 dB to work effectively.` })
  }
  if (mud > bandAvg + 7) {
    fixes.mud_cut_db = -Math.min(6, Math.round((mud - bandAvg - 7) * 0.5 * 10) / 10)
    issues.push({ id: 'mud', severity: 'warning', label: 'Mud Buildup',
      detail: `Low-mid frequencies (200–500 Hz) are elevated — this creates a muddy, cloudy sound.` })
  }
  if (harshness > bandAvg + 6) {
    fixes.harsh_cut_db = -Math.min(4, Math.round((harshness - bandAvg - 6) * 0.5 * 10) / 10)
    issues.push({ id: 'harshness', severity: 'warning', label: 'Upper-Mid Harshness',
      detail: `The 4.5 kHz region is elevated — this causes listener fatigue and a harsh tone.` })
  }
  if (sibilance > bandAvg + 5) {
    fixes.sib_cut_db = -Math.min(3, Math.round((sibilance - bandAvg - 5) * 0.5 * 10) / 10)
    issues.push({ id: 'sibilance', severity: 'warning', label: 'Excessive Sibilance',
      detail: `High-frequency presence at 8.5 kHz is pronounced — "s" and "sh" sounds may be harsh.` })
  }
  if (sub > bass + 4) {
    issues.push({ id: 'sub_heavy', severity: 'warning', label: 'Sub-Bass Heavy',
      detail: `Sub-bass energy below 80 Hz dominates — this can cause pumping and reduce mid clarity.` })
  }
  if (stereo_width > 1.4) {
    issues.push({ id: 'width', severity: 'info', label: 'Very Wide Stereo Image',
      detail: `Stereo width of ${stereo_width.toFixed(2)} may cause phase issues on mono playback.` })
  }
  if (lufs > -9) {
    issues.push({ id: 'lufs', severity: 'warning', label: 'Already Too Loud',
      detail: `Integrated loudness of ${lufs.toFixed(1)} LUFS leaves little room for mastering enhancement.` })
  }
  if (lra > 14 || headroom_db < 8) {
    fixes.apply_compression = true
  }

  return { peak_db, headroom_db, lufs, lra, clips_pct, stereo_width, eq_bands, waveform: base.waveform, issues, fixes }
}

export async function processAudio(
  inputPath: string,
  outputPath: string,
  targetLufs: number
): Promise<{ lufs: number; true_peak: number; waveform: number[] }> {
  await mkdir(TMP, { recursive: true })
  let stderr = ''
  await new Promise<void>((resolve, reject) =>
    ffmpegLib(inputPath)
      .audioFilters(`loudnorm=I=${targetLufs}:TP=-1:LRA=11:print_format=json`)
      .audioCodec('pcm_s24le')
      .output(outputPath)
      .on('stderr', (line: string) => { stderr += line + '\n' })
      .on('end', () => resolve())
      .on('error', (e: Error) => reject(e))
      .run()
  )
  const d = parseLoudnormJson(stderr)
  const waveform = await generateWaveform(outputPath)
  return {
    lufs: parseFloat(d.output_i ?? '') || targetLufs,
    true_peak: parseFloat(d.output_tp ?? '') || -1,
    waveform,
  }
}
