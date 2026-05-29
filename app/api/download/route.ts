import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { readFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'

const TMP = join(process.cwd(), 'tmp_audio')

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id || !/^mastered_\d+\.wav$/.test(id)) {
    return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 })
  }

  const filePath = join(TMP, id)
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found or already downloaded' }, { status: 404 })
  }

  const buffer = await readFile(filePath)
  unlink(filePath).catch(() => {})

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Disposition': `attachment; filename="${id}"`,
      'Content-Length': buffer.byteLength.toString(),
    },
  })
}
