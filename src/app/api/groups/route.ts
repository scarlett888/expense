import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { db, schema } from '@/utils/db'
import { eq, desc, inArray } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// GET /api/groups
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const userId = session.user.id

    // Find all group IDs the user belongs to
    const memberships = await db.select({ group_id: schema.group_members.group_id })
      .from(schema.group_members)
      .where(eq(schema.group_members.user_id, userId))

    if (memberships.length === 0) return NextResponse.json([])

    const groupIds = memberships.map(m => m.group_id)
    const data = await db.select().from(schema.groups)
      .where(inArray(schema.groups.id, groupIds))
      .orderBy(desc(schema.groups.created_at))

    return NextResponse.json(data)
  } catch (err) {
    console.error('[groups GET]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/groups
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const { name } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: '小组名称不能为空' }, { status: 400 })
    }

    const userId = session.user.id
    const groupId = randomUUID()
    const now = new Date().toISOString()

    await db.insert(schema.groups).values({
      id: groupId,
      name: name.trim(),
      created_by: userId,
      created_at: now,
    })

    // Add creator as member — use their profile nickname, falling back to email prefix
    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, userId));
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
    const creatorNickname = profile?.nickname || user?.email?.split('@')[0] || null;

    await db.insert(schema.group_members).values({
      id: randomUUID(),
      group_id: groupId,
      user_id: userId,
      nickname: creatorNickname,
      created_at: now,
    })

    const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, groupId))
    return NextResponse.json(group, { status: 201 })
  } catch (err) {
    console.error('[groups POST]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
