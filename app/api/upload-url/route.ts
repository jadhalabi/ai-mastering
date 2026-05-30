import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { filename, role } = await req.json()
    const ext = filename?.split('.').pop() ?? 'wav'
    const path = `${role === 'ref' ? 'ref' : 'input'}_${randomUUID()}.${ext}`
    const admin = createAdminClient()

    // Create bucket if it doesn't exist yet
    await admin.storage.createBucket('audio', { public: true }).catch(() => {})

    const { data, error } = await admin.storage
      .from('audio')
      .createSignedUploadUrl(path)

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Failed to create upload URL' }, { status: 500 })
    }

    const publicUrl = admin.storage.from('audio').getPublicUrl(path).data.publicUrl

    return NextResponse.json({ signedUrl: data.signedUrl, path, publicUrl })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
