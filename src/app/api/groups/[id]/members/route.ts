import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { db, schema } from '@/utils/db'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// GET /api/groups/[id]/members
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const members = await db
      .select({
        id: schema.group_members.id,
        group_id: schema.group_members.group_id,
        user_id: schema.group_members.user_id,
        nickname: schema.group_members.nickname,
        created_at: schema.group_members.created_at,
        user_email: schema.users.email,
      })
      .from(schema.group_members)
      .leftJoin(schema.users, eq(schema.group_members.user_id, schema.users.id))
      .where(eq(schema.group_members.group_id, params.id))

    return NextResponse.json(members)
  } catch (err) {
    console.error('[members GET]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/groups/[id]/members
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const { user_id, nickname } = await req.json()
    if (!user_id) {
      return NextResponse.json({ error: 'user_id 不能为空' }, { status: 400 })
    }

    const existing = await db.query.group_members.findFirst({
      where: (gm, { and, eq: deq }) => and(
        deq(gm.group_id, params.id),
        deq(gm.user_id, user_id)
      ),
    })
    if (existing) {
      return NextResponse.json({ error: '该成员已在小组中' }, { status: 409 })
    }

    const now = new Date().toISOString()
    await db.insert(schema.group_members).values({
      id: randomUUID(),
      group_id: params.id,
      user_id,
      nickname: nickname || null,
      created_at: now,
    })

    return NextResponse.json({ message: '添加成功' }, { status: 201 })
  } catch (err) {
    console.error('[members POST]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// DELETE /api/groups/[id]/members?memberId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const memberId = searchParams.get('memberId')
    if (!memberId) {
      return NextResponse.json({ error: '缺少 memberId' }, { status: 400 })
    }

    await db.delete(schema.group_members)
      .where(eq(schema.group_members.id, memberId))

    return NextResponse.json({ message: '已移除' })
  } catch (err) {
    console.error('[members DELETE]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
