import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { tmpdir } from 'os'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { existsSync } from 'fs'

const TMP = join(tmpdir(), 'ai-mastering')

// Same as /api/download but does NOT delete the file — used for waveform preview
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id || !/^(mastered|mixed)_\d+\.wav$/.test(id)) {
    return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 })
  }

  const filePath = join(TMP, id)
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const fileSize = (await stat(filePath)).size
  const nodeStream = createReadStream(filePath)
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk as Buffer)))
      nodeStream.on('end', () => controller.close())
      nodeStream.on('error', (err) => controller.error(err))
    },
    cancel() {
      nodeStream.destroy()
    },
  })

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Length': fileSize.toString(),
      'Accept-Ranges': 'bytes',
    },
  })
}
