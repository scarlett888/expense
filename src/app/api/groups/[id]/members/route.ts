import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { db, schema } from '@/utils/db'
import { eq, and } from 'drizzle-orm'
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
    const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, params.id));
    if (!group) {
      return NextResponse.json({ error: '小组不存在' }, { status: 404 });
    }

    const members = await db
      .select({
        id: schema.group_members.id,
        group_id: schema.group_members.group_id,
        user_id: schema.group_members.user_id,
        nickname: schema.group_members.nickname,
        created_at: schema.group_members.created_at,
        user_email: schema.users.email,
        profile_nickname: schema.profiles.nickname,
      })
      .from(schema.group_members)
      .leftJoin(schema.users, eq(schema.group_members.user_id, schema.users.id))
      .leftJoin(schema.profiles, eq(schema.group_members.user_id, schema.profiles.user_id))
      .where(eq(schema.group_members.group_id, params.id))

    const result = members.map(m => ({
      ...m,
      is_owner: m.user_id === group.owner_id,
    }))

    return NextResponse.json(result)
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
    // Check if current user is the group owner
    const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, params.id));
    if (!group) {
      return NextResponse.json({ error: '小组不存在' }, { status: 404 });
    }
    if (group.owner_id !== session.user.id) {
      return NextResponse.json({ error: '只有组长可以直接添加成员' }, { status: 403 });
    }

    const { user_id, nickname } = await req.json()
    if (!user_id) {
      return NextResponse.json({ error: 'user_id 不能为空' }, { status: 400 })
    }

    const [existing] = await db.select().from(schema.group_members)
      .where(and(eq(schema.group_members.group_id, params.id), eq(schema.group_members.user_id, user_id)))
      .limit(1)
    if (existing) {
      return NextResponse.json({ error: '该成员已在小组中' }, { status: 409 })
    }

    const now = new Date().toISOString()
    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, user_id));
    const resolvedNickname = profile?.nickname || nickname || null;
    await db.insert(schema.group_members).values({
      id: randomUUID(),
      group_id: params.id,
      user_id,
      nickname: resolvedNickname,
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

    // Check if current user is the group owner
    const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, params.id));
    if (!group) {
      return NextResponse.json({ error: '小组不存在' }, { status: 404 });
    }
    if (group.owner_id !== session.user.id) {
      return NextResponse.json({ error: '只有组长可以删除组员' }, { status: 403 });
    }

    // Check if trying to delete the owner
    const [member] = await db.select().from(schema.group_members).where(eq(schema.group_members.id, memberId));
    if (member && member.user_id === group.owner_id) {
      return NextResponse.json({ error: '不能删除组长' }, { status: 400 });
    }

    await db.delete(schema.group_members)
      .where(eq(schema.group_members.id, memberId))

    return NextResponse.json({ message: '已移除' })
  } catch (err) {
    console.error('[members DELETE]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
