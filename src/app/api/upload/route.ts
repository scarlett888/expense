import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// POST /api/upload
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: '未上传文件' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${session.user.id}-${Date.now()}.${ext}`
    const uploadDir = join(process.cwd(), 'public', 'avatars')

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    await writeFile(join(uploadDir, filename), buffer)
    const url = `/avatars/${filename}`

    return NextResponse.json({ url })
  } catch (err) {
    console.error('[upload POST]', err)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}
