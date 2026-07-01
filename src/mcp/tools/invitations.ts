import { Tool as MCPTool } from '@modelcontextprotocol/sdk/types.js'
import { db, schema } from '../database'
import { eq, desc, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { getCurrentUserId } from '../config'

// Extended tool type that includes the handler
interface Tool extends MCPTool {
  handle: (args: unknown) => Promise<unknown>
}

export function getInvitationTools(): Tool[] {
  return [
    {
      name: 'group_invitation_pending',
      description: '获取当前用户待处理的加入小组邀请',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      async handle() {
        const userId = getCurrentUserId()
        const result = await db
          .select({
            id: schema.group_invitations.id,
            group_id: schema.group_invitations.group_id,
            inviter_id: schema.group_invitations.inviter_id,
            status: schema.group_invitations.status,
            created_at: schema.group_invitations.created_at,
            inviter_email: schema.users.email,
            inviter_nickname: schema.profiles.nickname,
            group_name: schema.groups.name,
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
        return result
      },
    },
    {
      name: 'group_invitation_action',
      description: '接受或拒绝加入小组的邀请',
      inputSchema: {
        type: 'object',
        properties: {
          invitation_id: { type: 'string', description: '邀请记录 ID' },
          action: { type: 'string', enum: ['accept', 'reject'], description: '操作：accept 接受，reject 拒绝' },
        },
        required: ['invitation_id', 'action'],
      },
      async handle(args: unknown) {
        const params = args as { invitation_id: string; action: 'accept' | 'reject' }
        const userId = getCurrentUserId()

        const [invitation] = await db.select()
          .from(schema.group_invitations)
          .where(eq(schema.group_invitations.id, params.invitation_id))

        if (!invitation) {
          throw new Error('邀请不存在')
        }

        if (invitation.invitee_id !== userId) {
          throw new Error('无权操作此邀请')
        }

        if (invitation.status !== 'pending') {
          throw new Error('邀请已被处理')
        }

        const now = new Date().toISOString()

        if (params.action === 'accept') {
          // Check if already a member
          const [existingMember] = await db.select()
            .from(schema.group_members)
            .where(and(
              eq(schema.group_members.group_id, invitation.group_id),
              eq(schema.group_members.user_id, invitation.invitee_id)
            ))
            .limit(1)

          if (!existingMember) {
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
          }

          // Notify inviter
          const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, invitation.group_id))
          const inviteeUser = await db.select().from(schema.users).where(eq(schema.users.id, invitation.invitee_id))
          const inviteeProfile = await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, invitation.invitee_id))
          const inviteeNickname = inviteeProfile[0]?.nickname || inviteeUser[0]?.email?.split('@')[0] || '用户'

          await db.insert(schema.notifications).values({
            id: randomUUID(),
            user_id: invitation.inviter_id,
            type: 'group_invite_accepted',
            title: '邀请已接受',
            message: `${inviteeNickname} 接受了邀请，已加入 ${group?.name || '小组'}`,
            related_invitation_id: params.invitation_id,
            created_at: now,
          })
        }

        if (params.action === 'reject') {
          const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, invitation.group_id))
          const inviteeUser = await db.select().from(schema.users).where(eq(schema.users.id, invitation.invitee_id))
          const inviteeProfile = await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, invitation.invitee_id))
          const inviteeNickname = inviteeProfile[0]?.nickname || inviteeUser[0]?.email?.split('@')[0] || '用户'

          await db.insert(schema.notifications).values({
            id: randomUUID(),
            user_id: invitation.inviter_id,
            type: 'group_invite_rejected',
            title: '邀请被拒绝',
            message: `${inviteeNickname} 拒绝了加入 ${group?.name || '小组'} 的邀请`,
            related_invitation_id: params.invitation_id,
            created_at: now,
          })
        }

        // Update invitation status
        await db.update(schema.group_invitations)
          .set({ status: params.action === 'accept' ? 'accepted' : 'rejected', updated_at: now })
          .where(eq(schema.group_invitations.id, params.invitation_id))

        return {
          success: true,
          invitation_id: params.invitation_id,
          action: params.action,
          status: params.action === 'accept' ? 'accepted' : 'rejected',
        }
      },
    },
  ]
}