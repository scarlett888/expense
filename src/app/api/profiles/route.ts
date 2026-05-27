import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { db, schema } from '@/utils/db'
import { eq } from 'drizzle-orm'

// GET /api/profiles
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, session.user.id)).limit(1)
    return NextResponse.json(profile || null)
  } catch (err) {
    console.error('[profiles GET]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// PUT /api/profiles
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const { avatar_url, nickname } = await req.json()
    const userId = session.user.id

    const [existing] = await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, userId)).limit(1)

    if (existing) {
      await db.update(schema.profiles)
        .set({ avatar_url: avatar_url ?? existing.avatar_url, nickname: nickname ?? existing.nickname })
        .where(eq(schema.profiles.user_id, userId))
    } else {
      const { randomUUID } = await import('crypto')
      await db.insert(schema.profiles).values({
        id: randomUUID(),
        user_id: userId,
        avatar_url: avatar_url || null,
        nickname: nickname || null,
        created_at: new Date().toISOString(),
      })
    }

    const [updated] = await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, userId)).limit(1)
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[profiles PUT]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
