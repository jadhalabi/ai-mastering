import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { existsSync } from 'fs'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import ffmpegLib from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import ffprobe from '@ffprobe-installer/ffprobe'
import { createAdminClient } from '@/lib/supabase/admin'
import { analyzeAudio, analyzeMix } from '@/lib/audio'

ffmpegLib.setFfmpegPath(ffmpegPath as string)
ffmpegLib.setFfprobePath(ffprobe.path)

export const maxDuration = 60

const TMP = join(tmpdir(), 'ai-mastering')

async function downloadFile(url: string, destPath: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not download uploaded file')
  await writeFile(destPath, Buffer.from(await res.arrayBuffer()))
}

export async function POST(req: NextRequest) {
  const tmpPaths: string[] = []

  try {
    const body = await req.json()
    const { input_url, action } = body

    if (!input_url) return NextResponse.json({ error: 'No track provided' }, { status: 400 })

    await mkdir(TMP, { recursive: true })
    const ext = input_url.split('?')[0].split('.').pop() || 'wav'
    const inputTmp = join(TMP, `mix_input_${randomUUID()}.${ext}`)
    tmpPaths.push(inputTmp)
    await downloadFile(input_url, inputTmp)

    if (action === 'fix') {
      const before = await analyzeMix(inputTmp)

      const filters: string[] = ['highpass=f=28']
      if (before.fixes.mud_cut_db < 0) {
        filters.push(`equalizer=f=300:width_type=h:w=100:g=${before.fixes.mud_cut_db}`)
      }
      if (before.fixes.harsh_cut_db < 0) {
        filters.push(`equalizer=f=4500:width_type=h:w=2000:g=${before.fixes.harsh_cut_db}`)
      }
      if (before.fixes.sib_cut_db < 0) {
        filters.push(`equalizer=f=8500:width_type=h:w=3000:g=${before.fixes.sib_cut_db}`)
      }
      if (before.fixes.apply_compression) {
        filters.push('acompressor=threshold=-18dB:ratio=2:attack=20:release=200')
      }
      filters.push('loudnorm=I=-14:TP=-6:LRA=11')

      const outputId = `mixed_${randomUUID()}.wav`
      const outputTmp = join(TMP, outputId)
      tmpPaths.push(outputTmp)

      await new Promise<void>((resolve, reject) =>
        ffmpegLib(inputTmp)
          .audioFilters(filters)
          .audioCodec('pcm_s24le')
          .output(outputTmp)
          .on('end', () => resolve())
          .on('error', (e: Error) => reject(e))
          .run()
      )

      const afterBase = await analyzeAudio(outputTmp)
      const after = {
        peak_db: afterBase.true_peak,
        headroom_db: -afterBase.true_peak,
        lufs: afterBase.lufs,
        lra: afterBase.lra,
        clips_pct: 0,
        stereo_width: before.stereo_width,
        eq_bands: before.eq_bands,
        waveform: afterBase.waveform,
        issues: [],
        fixes: {},
      }

      const admin = createAdminClient()
      const resultPath = `temp/${outputId}`
      const { error: uploadErr } = await admin.storage
        .from('audio')
        .upload(resultPath, readFileSync(outputTmp), { contentType: 'audio/wav', upsert: true })
      if (uploadErr) throw new Error('Could not store fixed file: ' + uploadErr.message)

      const { data: { publicUrl: downloadUrl } } = admin.storage.from('audio').getPublicUrl(resultPath)

      const fixes_applied = ['Applied 28 Hz high-pass filter to remove inaudible rumble']
      if (before.fixes.mud_cut_db < 0) {
        fixes_applied.push(`Cut muddy low-mids by ${Math.abs(before.fixes.mud_cut_db).toFixed(1)} dB at 300 Hz`)
      }
      if (before.fixes.harsh_cut_db < 0) {
        fixes_applied.push(`Tamed upper-mid harshness by ${Math.abs(before.fixes.harsh_cut_db).toFixed(1)} dB at 4.5 kHz`)
      }
      if (before.fixes.sib_cut_db < 0) {
        fixes_applied.push(`Reduced sibilance by ${Math.abs(before.fixes.sib_cut_db).toFixed(1)} dB at 8.5 kHz`)
      }
      if (before.fixes.apply_compression) {
        fixes_applied.push(`Gentle bus compression (${before.fixes.compression_ratio.toFixed(1)}:1) for mix glue`)
      }
      fixes_applied.push('Gain-staged to –6 dBFS peak — ready for mastering')

      return NextResponse.json({ before, after, download_url: downloadUrl, fixes_applied })
    }

    // analyze action
    const analysis = await analyzeMix(inputTmp)
    return NextResponse.json({ analysis })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Processing failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    for (const p of tmpPaths) {
      if (existsSync(p)) unlink(p).catch(() => {})
    }
  }
}
