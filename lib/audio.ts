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
