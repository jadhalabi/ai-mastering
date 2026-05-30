import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { analyzeAudio, processAudio } from '@/lib/audio'

export const maxDuration = 60

const TMP = join(tmpdir(), 'ai-mastering')

const PLATFORM_LUFS: Record<string, number> = {
  spotify: -14, apple_music: -16, youtube: -14, soundcloud: -11, tidal: -14,
}

async function downloadFromStorage(publicUrl: string, destPath: string) {
  const res = await fetch(publicUrl)
  if (!res.ok) throw new Error('Could not download uploaded file')
  await writeFile(destPath, Buffer.from(await res.arrayBuffer()))
}

export async function POST(req: NextRequest) {
  const tmpPaths: string[] = []
  try {
    await mkdir(TMP, { recursive: true })
    const body = await req.json()
    const { input_url, reference_url, mode, platform_preset } = body

    if (!input_url) return NextResponse.json({ error: 'No track provided' }, { status: 400 })

    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Download input file from Supabase public URL
    const inputExt = input_url.split('?')[0].split('.').pop() || 'wav'
    const inputTmp = join(TMP, `input_${randomUUID()}.${inputExt}`)
    await downloadFromStorage(input_url, inputTmp)
    tmpPaths.push(inputTmp)

    let refTmp: string | null = null
    if (reference_url) {
      const refExt = reference_url.split('?')[0].split('.').pop() || 'wav'
      refTmp = join(TMP, `ref_${randomUUID()}.${refExt}`)
      await downloadFromStorage(reference_url, refTmp)
      tmpPaths.push(refTmp)
    }

    // Analyze
    const yourTrack = await analyzeAudio(inputTmp)
    const reference = refTmp ? await analyzeAudio(refTmp) : null

    // Determine target LUFS
    const targetLufs = platform_preset
      ? (PLATFORM_LUFS[platform_preset] ?? -14)
      : reference ? reference.lufs : -14

    // Process
    const outputId = `result_${randomUUID()}.wav`
    const outputTmp = join(TMP, outputId)
    const mastered = await processAudio(inputTmp, outputTmp, targetLufs)
    tmpPaths.push(outputTmp)

    // Upload result to Supabase Storage
    const resultPath = user ? `${user.id}/${outputId}` : `temp/${outputId}`
    const outputBuffer = require('fs').readFileSync(outputTmp)
    const { error: uploadErr } = await admin.storage
      .from('audio')
      .upload(resultPath, outputBuffer, { contentType: 'audio/wav', upsert: true })

    if (uploadErr) throw new Error('Could not store mastered file: ' + uploadErr.message)

    const { data: { publicUrl: downloadUrl } } = admin.storage.from('audio').getPublicUrl(resultPath)

    // Save job to DB if authenticated
    if (user) {
      const fileName = (input_url.split('/').pop() ?? 'track').split('?')[0]
      await supabase.from('masters').insert({
        user_id: user.id,
        user_email: user.email,
        file_name: fileName,
        mode: mode || 'track_only',
        platform_preset: platform_preset || null,
        input_lufs: yourTrack.lufs,
        output_lufs: mastered.lufs,
        output_peak: mastered.true_peak,
        waveform: mastered.waveform,
      })
    }

    return NextResponse.json({
      your_track: yourTrack,
      reference,
      mastered,
      notes: [],
      download_url: downloadUrl,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Processing failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    for (const p of tmpPaths) {
      if (existsSync(p)) unlink(p).catch(() => {})
    }
  }
}
