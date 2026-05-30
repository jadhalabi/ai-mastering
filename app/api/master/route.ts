import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { existsSync } from 'fs'
import { runPython } from '@/lib/python'
import { createClient } from '@/lib/supabase/server'

const TMP = join(tmpdir(), 'ai-mastering')

const PLATFORM_LUFS: Record<string, number> = {
  spotify: -14,
  apple_music: -16,
  youtube: -14,
  soundcloud: -11,
  tidal: -14,
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function saveTmp(file: File, name: string): Promise<string> {
  await mkdir(TMP, { recursive: true })
  const bytes = await file.arrayBuffer()
  const path = join(TMP, name)
  await writeFile(path, Buffer.from(bytes))
  return path
}

export async function POST(req: NextRequest) {
  const inputPaths: string[] = []

  try {
    const form = await req.formData()
    const mode = form.get('mode') as string
    const yourTrackFile = form.get('your_track') as File | null
    const referenceFile = form.get('reference_track') as File | null
    const description = form.get('description') as string | null
    const platformPreset = form.get('platform_preset') as string | null

    await mkdir(TMP, { recursive: true })

    if (mode === 'describe') {
      return NextResponse.json({
        your_track: {},
        mastered: { lufs: -14.0, true_peak: -1.0 },
        notes: ['Text description mode — connect to audio output in a future update.'],
      })
    }

    if (!yourTrackFile) {
      return NextResponse.json({ error: 'No track uploaded' }, { status: 400 })
    }

    const ts = Date.now()
    const yourPath = await saveTmp(yourTrackFile, `input_${ts}_${sanitizeName(yourTrackFile.name)}`)
    inputPaths.push(yourPath)

    let refPath: string | null = null
    if (referenceFile) {
      refPath = await saveTmp(referenceFile, `ref_${ts}_${sanitizeName(referenceFile.name)}`)
      inputPaths.push(refPath)
    }

    const outputId = `mastered_${ts}.wav`
    const outputPath = join(TMP, outputId)

    // Analyze
    const analyzeArgs = refPath ? [yourPath, refPath] : [yourPath]
    const analysis = JSON.parse(await runPython('analyze.py', analyzeArgs))

    // Build processing params
    const diff = analysis.diff || {}
    const gainDb: number = diff.lufs_diff ?? 0
    const eqBands = diff.eq_bands ? JSON.stringify(diff.eq_bands) : '{}'
    const compress = diff.compress ? JSON.stringify(diff.compress) : '{}'
    const stereoScale: number = diff.stereo_scale ?? 1.0
    const targetLufs = platformPreset
      ? (PLATFORM_LUFS[platformPreset] ?? -14)
      : refPath
      ? (analysis.reference?.lufs ?? -14)
      : -14

    // Process — returns mastered stats directly (no separate verify pass needed)
    const processOut = JSON.parse(await runPython('process.py', [
      yourPath,
      '--output', outputPath,
      '--gain', gainDb.toFixed(2),
      '--eq-bands', eqBands,
      '--compress', compress,
      '--target-lufs', String(targetLufs),
      '--true-peak', '-1.0',
      '--stereo-scale', stereoScale.toFixed(4),
    ]))

    const mastered = processOut.mastered ?? { lufs: targetLufs, true_peak: -1.0, waveform: [] }

    // Save to DB if the user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('masters').insert({
        user_id: user.id,
        user_email: user.email,
        file_name: yourTrackFile.name,
        mode,
        platform_preset: platformPreset ?? null,
        input_lufs: analysis.your_track?.lufs ?? null,
        output_lufs: mastered.lufs ?? null,
        output_peak: mastered.true_peak ?? null,
        waveform: mastered.waveform ?? [],
      })
    }

    return NextResponse.json({
      your_track: analysis.your_track,
      reference: analysis.reference ?? null,
      mastered,
      notes: analysis.notes ?? [],
      download_id: outputId,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Processing failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    for (const p of inputPaths) {
      if (existsSync(p)) unlink(p).catch(() => {})
    }
  }
}
