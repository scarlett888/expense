import { NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { db, schema } from '@/utils/db'
import { eq, desc, and } from 'drizzle-orm'

// GET /api/invitations/pending - 获取当前用户待处理的邀请
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const result = await db
      .select({
        id: schema.group_invitations.id,
        group_id: schema.group_invitations.group_id,
        inviter_id: schema.group_invitations.inviter_id,
        invitee_id: schema.group_invitations.invitee_id,
        status: schema.group_invitations.status,
        created_at: schema.group_invitations.created_at,
        inviter_email: schema.users.email,
        inviter_nickname: schema.profiles.nickname,
        group_name: schema.groups.name,
        group_owner_id: schema.groups.owner_id,
      })
      .from(schema.group_invitations)
      .leftJoin(schema.users, eq(schema.group_invitations.inviter_id, schema.users.id))
      .leftJoin(schema.profiles, eq(schema.group_invitations.inviter_id, schema.profiles.user_id))
      .innerJoin(schema.groups, eq(schema.group_invitations.group_id, schema.groups.id))
      .where(and(
        eq(schema.group_invitations.invitee_id, userId),
        eq(schema.group_invitations.status, 'pending')
      ))
      .orderBy(desc(schema.group_invitations.created_at))

    return NextResponse.json(result)
  } catch (err) {
    console.error('[invitations/pending GET]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}