import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { db, schema } from '@/utils/db'
import { eq, desc, and } from 'drizzle-orm'

// GET /api/notifications
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const userId = session.user.id
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const notificationId = searchParams.get('id')

  try {
    if (action === 'count') {
      // 获取未读通知数量
      const result = await db.select()
        .from(schema.notifications)
        .where(and(
          eq(schema.notifications.user_id, userId),
          eq(schema.notifications.read, 0)
        ))
      return NextResponse.json({ count: result.length })
    }

    if (action === 'pending-splits') {
      // 获取当前用户的待确认分摊记录
      const result = await db.select()
        .from(schema.expense_splits)
        .innerJoin(schema.expenses, eq(schema.expense_splits.expense_id, schema.expenses.id))
        .where(and(
          eq(schema.expense_splits.user_id, userId),
          eq(schema.expense_splits.status, 'pending')
        ))
      return NextResponse.json(result)
    }

    if (action === 'pending-invitations') {
      // 获取当前用户的待确认邀请
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
      return NextResponse.json(result)
    }

    // 默认：获取通知列表
    const data = await db.select()
      .from(schema.notifications)
      .where(eq(schema.notifications.user_id, userId))
      .orderBy(desc(schema.notifications.created_at))
    return NextResponse.json(data)
  } catch (err) {
    console.error('[notifications GET]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// PATCH /api/notifications - 标记已读或接受/拒绝分摊
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const userId = session.user.id
  const { searchParams } = new URL(req.url)
  const notificationId = searchParams.get('id')

  try {
    const body = await req.json()
    const { action, status } = body

    if (notificationId) {
      // 更新通知状态
      if (action === 'read') {
        await db.update(schema.notifications)
          .set({ read: 1 })
          .where(eq(schema.notifications.id, notificationId))
        return NextResponse.json({ success: true })
      }
    }

    if (status && body.split_id) {
      // 更新分摊记录状态（接受/拒绝）
      const splitId = body.split_id
      await db.update(schema.expense_splits)
        .set({ status, updated_at: new Date().toISOString() })
        .where(eq(schema.expense_splits.id, splitId))
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  } catch (err) {
    console.error('[notifications PATCH]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
