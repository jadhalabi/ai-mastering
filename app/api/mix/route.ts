import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { existsSync } from 'fs'
import { runPython } from '@/lib/python'

const TMP = join(tmpdir(), 'ai-mastering')

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
    const action = (form.get('action') as string) || 'analyze'
    const trackFile = form.get('track') as File | null

    if (!trackFile) {
      return NextResponse.json({ error: 'No track uploaded' }, { status: 400 })
    }

    await mkdir(TMP, { recursive: true })
    const ts = Date.now()
    const inputPath = await saveTmp(trackFile, `mix_input_${ts}_${sanitizeName(trackFile.name)}`)
    inputPaths.push(inputPath)

    if (action === 'analyze') {
      const raw = await runPython('mix.py', [inputPath])
      const analysis = JSON.parse(raw)
      return NextResponse.json({ analysis })
    }

    // action === 'fix'
    const outputId = `mixed_${ts}.wav`
    const outputPath = join(TMP, outputId)

    const raw = await runPython('mix.py', [inputPath, '--output', outputPath])
    const result = JSON.parse(raw) as { before: Record<string, unknown>; after: Record<string, unknown> }

    const fixes = result.before.fixes as Record<string, unknown>
    const fixes_applied: string[] = []
    fixes_applied.push('Applied 28 Hz high-pass filter to remove inaudible rumble')
    if ((fixes.mud_cut_db as number) < 0) {
      fixes_applied.push(`Cut muddy low-mids by ${Math.abs(fixes.mud_cut_db as number).toFixed(1)} dB at 300 Hz`)
    }
    if ((fixes.harsh_cut_db as number) < 0) {
      fixes_applied.push(`Tamed upper-mid harshness by ${Math.abs(fixes.harsh_cut_db as number).toFixed(1)} dB at 3.5 kHz`)
    }
    if ((fixes.sib_cut_db as number) < 0) {
      fixes_applied.push(`Reduced sibilance by ${Math.abs(fixes.sib_cut_db as number).toFixed(1)} dB at 7 kHz`)
    }
    if (fixes.apply_compression) {
      fixes_applied.push(`Gentle bus compression (${(fixes.compression_ratio as number).toFixed(1)}:1) for mix glue`)
    }
    fixes_applied.push('Gain-staged to –6 dBFS peak — ready for mastering')

    return NextResponse.json({
      before: result.before,
      after: result.after,
      download_id: outputId,
      fixes_applied,
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
