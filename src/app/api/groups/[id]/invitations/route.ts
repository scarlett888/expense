import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { db, schema } from '@/utils/db'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// GET /api/groups/[id]/invitations - 获取小组的邀请列表
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const result = await db
      .select({
        id: schema.group_invitations.id,
        group_id: schema.group_invitations.group_id,
        inviter_id: schema.group_invitations.inviter_id,
        invitee_id: schema.group_invitations.invitee_id,
        status: schema.group_invitations.status,
        created_at: schema.group_invitations.created_at,
        updated_at: schema.group_invitations.updated_at,
        inviter_email: schema.users.email,
        inviter_nickname: schema.profiles.nickname,
        invitee_email: schema.users.email,
        invitee_nickname: schema.profiles.nickname,
      })
      .from(schema.group_invitations)
      .leftJoin(schema.users, eq(schema.group_invitations.inviter_id, schema.users.id))
      .leftJoin(schema.profiles, eq(schema.group_invitations.inviter_id, schema.profiles.user_id))
      .where(eq(schema.group_invitations.group_id, params.id))

    return NextResponse.json(result)
  } catch (err) {
    console.error('[groups/[id]/invitations GET]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/groups/[id]/invitations - 创建邀请
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const { email } = await req.json()
    if (!email?.trim()) {
      return NextResponse.json({ error: '邮箱不能为空' }, { status: 400 })
    }

    // Check if group exists and current user is the owner
    const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, params.id))
    if (!group) {
      return NextResponse.json({ error: '小组不存在' }, { status: 404 })
    }
    if (group.owner_id !== userId) {
      return NextResponse.json({ error: '只有组长可以邀请成员' }, { status: 403 })
    }

    // Find user by email
    const [invitee] = await db.select().from(schema.users).where(eq(schema.users.email, email.trim().toLowerCase()))
    if (!invitee) {
      return NextResponse.json({ error: '未找到该用户' }, { status: 404 })
    }

    // Check if invitee is already a member
    const [existingMember] = await db.select()
      .from(schema.group_members)
      .where(and(
        eq(schema.group_members.group_id, params.id),
        eq(schema.group_members.user_id, invitee.id)
      ))
      .limit(1)
    if (existingMember) {
      return NextResponse.json({ error: '该用户已在小组中' }, { status: 409 })
    }

    // Check if there's already a pending invitation
    const [pendingInvitation] = await db.select()
      .from(schema.group_invitations)
      .where(and(
        eq(schema.group_invitations.group_id, params.id),
        eq(schema.group_invitations.invitee_id, invitee.id),
        eq(schema.group_invitations.status, 'pending')
      ))
      .limit(1)
    if (pendingInvitation) {
      return NextResponse.json({ error: '已发送过邀请，等待对方确认' }, { status: 409 })
    }

    const now = new Date().toISOString()
    const invitationId = randomUUID()

    // Create invitation
    await db.insert(schema.group_invitations).values({
      id: invitationId,
      group_id: params.id,
      inviter_id: userId,
      invitee_id: invitee.id,
      status: 'pending',
      created_at: now,
    })

    // Send notification to invitee
    const [inviterProfile] = await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, userId))
    const [inviterUser] = await db.select().from(schema.users).where(eq(schema.users.id, userId))
    const inviterNickname = inviterProfile?.nickname || inviterUser?.email?.split('@')[0] || '某人'

    await db.insert(schema.notifications).values({
      id: randomUUID(),
      user_id: invitee.id,
      type: 'group_invite',
      title: '加入小组邀请',
      message: `${inviterNickname} 邀请你加入 ${group.name}`,
      related_invitation_id: invitationId,
      created_at: now,
    })

    return NextResponse.json({ message: '邀请已发送', invitation_id: invitationId }, { status: 201 })
  } catch (err) {
    console.error('[groups/[id]/invitations POST]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}