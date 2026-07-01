import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { db, schema } from '@/utils/db'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// PATCH /api/invitations/[id]/action - 处理邀请（接受/拒绝）
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const { action } = await req.json()
    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action 必须是 accept 或 reject' }, { status: 400 })
    }

    // Find invitation and verify it belongs to current user
    const [invitation] = await db.select()
      .from(schema.group_invitations)
      .where(eq(schema.group_invitations.id, params.id))

    if (!invitation) {
      return NextResponse.json({ error: '邀请不存在' }, { status: 404 })
    }

    if (invitation.invitee_id !== userId) {
      return NextResponse.json({ error: '无权操作此邀请' }, { status: 403 })
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: '邀请已被处理' }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (action === 'accept') {
      // Check if already a member
      const [existing] = await db.select()
        .from(schema.group_members)
        .where(eq(schema.group_members.group_id, invitation.group_id))
        .limit(1)

      // Query using user_id field
      const { and: andCondition, eq: eq2 } = await import('drizzle-orm')
      const [existingMember] = await db.select()
        .from(schema.group_members)
        .where(andCondition(
          eq2(schema.group_members.group_id, invitation.group_id),
          eq2(schema.group_members.user_id, invitation.invitee_id)
        ))
        .limit(1)

      if (existingMember) {
        // Already a member, just update invitation status
        await db.update(schema.group_invitations)
          .set({ status: 'accepted', updated_at: now })
          .where(eq(schema.group_invitations.id, params.id))
        return NextResponse.json({ message: '已接受（已在小组中）' })
      }

      // Add as group member
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, invitation.invitee_id))
      const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, invitation.invitee_id))
      const nickname = profile?.nickname || user?.email?.split('@')[0] || null

      await db.insert(schema.group_members).values({
        id: randomUUID(),
        group_id: invitation.group_id,
        user_id: invitation.invitee_id,
        nickname,
        created_at: now,
      })

      // Notify inviter
      const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, invitation.group_id))
      const inviterProfile = await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, invitation.inviter_id))
      const inviteeUser = await db.select().from(schema.users).where(eq(schema.users.id, invitation.invitee_id))
      const inviteeProfile = await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, invitation.invitee_id))
      const inviteeNickname = inviteeProfile[0]?.nickname || inviteeUser[0]?.email?.split('@')[0] || '用户'

      await db.insert(schema.notifications).values({
        id: randomUUID(),
        user_id: invitation.inviter_id,
        type: 'group_invite_accepted',
        title: '邀请已接受',
        message: `${inviteeNickname} 接受了邀请，已加入 ${group?.name || '小组'}`,
        related_invitation_id: params.id,
        created_at: now,
      })
    }

    if (action === 'reject') {
      // Get inviter info for notification
      const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, invitation.group_id))
      const inviteeUser = await db.select().from(schema.users).where(eq(schema.users.id, invitation.invitee_id))
      const inviteeProfile = await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, invitation.invitee_id))
      const inviteeNickname = inviteeProfile[0]?.nickname || inviteeUser[0]?.email?.split('@')[0] || '用户'

      // Notify inviter
      await db.insert(schema.notifications).values({
        id: randomUUID(),
        user_id: invitation.inviter_id,
        type: 'group_invite_rejected',
        title: '邀请被拒绝',
        message: `${inviteeNickname} 拒绝了加入 ${group?.name || '小组'} 的邀请`,
        related_invitation_id: params.id,
        created_at: now,
      })
    }

    // Update invitation status
    await db.update(schema.group_invitations)
      .set({ status: action === 'accept' ? 'accepted' : 'rejected', updated_at: now })
      .where(eq(schema.group_invitations.id, params.id))

    return NextResponse.json({ message: action === 'accept' ? '已接受' : '已拒绝' })
  } catch (err) {
    console.error('[invitations/action PATCH]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}