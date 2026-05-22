import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db } from '@/utils/db'
import { users, profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 })
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    })
    if (existing) {
      return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 })
    }

    const password_hash = await hash(password, 12)
    const userId = randomUUID()
    const now = new Date().toISOString()

    await db.insert(users).values({
      id: userId,
      email,
      password_hash,
      created_at: now,
    })

    await db.insert(profiles).values({
      id: randomUUID(),
      user_id: userId,
      created_at: now,
    })

    return NextResponse.json({ message: '注册成功' }, { status: 201 })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
