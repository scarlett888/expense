import { Tool as MCPTool } from '@modelcontextprotocol/sdk/types.js'
import { db, schema } from '../database'
import { eq, desc, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// Extended tool type that includes the handler
interface Tool extends MCPTool {
  handle: (args: unknown) => Promise<unknown>
}

export function getNotificationTools(): Tool[] {
  return [
    {
      name: 'notification_list',
      description: '获取当前用户的通知列表',
      inputSchema: {
        type: 'object',
        properties: {
          unread_only: { type: 'boolean', description: '是否只显示未读通知，默认 false' },
        },
      },
      async handle(args: unknown) {
        const params = args as { unread_only?: boolean }
        const userId = getCurrentUserId()
        const conditions = [eq(schema.notifications.user_id, userId)]

        if (params.unread_only) {
          conditions.push(eq(schema.notifications.read, 0))
        }

        return db
          .select()
          .from(schema.notifications)
          .where(and(...conditions))
          .orderBy(desc(schema.notifications.created_at))
      },
    },
    {
      name: 'notification_count',
      description: '获取当前用户的未读通知数量',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      async handle() {
        const userId = getCurrentUserId()
        const result = await db
          .select()
          .from(schema.notifications)
          .where(and(
            eq(schema.notifications.user_id, userId),
            eq(schema.notifications.read, 0)
          ))
        return { unread_count: result.length }
      },
    },
    {
      name: 'notification_mark_read',
      description: '将通知标记为已读',
      inputSchema: {
        type: 'object',
        properties: {
          notification_id: { type: 'string', description: '通知 ID' },
        },
        required: ['notification_id'],
      },
      async handle(args: unknown) {
        const params = args as { notification_id: string }
        await db.update(schema.notifications)
          .set({ read: 1 })
          .where(eq(schema.notifications.id, params.notification_id))
        return { success: true }
      },
    },
    {
      name: 'split_pending',
      description: '获取当前用户待确认的分摊账单',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      async handle() {
        const userId = getCurrentUserId()
        const result = await db
          .select({
            split: schema.expense_splits,
            expense: schema.expenses,
          })
          .from(schema.expense_splits)
          .innerJoin(schema.expenses, eq(schema.expense_splits.expense_id, schema.expenses.id))
          .where(and(
            eq(schema.expense_splits.user_id, userId),
            eq(schema.expense_splits.status, 'pending')
          ))
        return result
      },
    },
    {
      name: 'split_action',
      description: '接受或拒绝待确认的分摊账单',
      inputSchema: {
        type: 'object',
        properties: {
          split_id: { type: 'string', description: '分摊记录 ID' },
          action: { type: 'string', enum: ['accept', 'reject'], description: '操作：accept 接受，reject 拒绝' },
        },
        required: ['split_id', 'action'],
      },
      async handle(args: unknown) {
        const params = args as { split_id: string; action: 'accept' | 'reject' }
        const userId = getCurrentUserId()

        const [split] = await db.select()
          .from(schema.expense_splits)
          .where(eq(schema.expense_splits.id, params.split_id))

        if (!split) {
          throw new Error('分摊记录不存在')
        }

        if (split.user_id !== userId) {
          throw new Error('无权操作此记录')
        }

        const newStatus = params.action === 'accept' ? 'accepted' : 'rejected'
        const now = new Date().toISOString()

        await db.update(schema.expense_splits)
          .set({ status: newStatus, updated_at: now })
          .where(eq(schema.expense_splits.id, params.split_id))

        // 如果是接受，创建 owe 记录到分摊明细
        if (params.action === 'accept') {
          const [expense] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, split.expense_id))
          if (expense) {
            await db.insert(schema.expenses).values({
              id: randomUUID(),
              date: expense.date,
              amount: split.amount,
              note: expense.note,
              user_id: userId,
              group_id: expense.group_id,
              payer_id: expense.payer_id,
              source_type: 'owe',
              source_expense_id: split.expense_id,
              created_at: now,
            })
          }
        }

        if (params.action === 'reject') {
          await db.delete(schema.expenses)
            .where(and(
              eq(schema.expenses.source_expense_id, split.expense_id),
              eq(schema.expenses.user_id, userId),
              eq(schema.expenses.source_type, 'owe')
            ))
        }

        return {
          success: true,
          split_id: params.split_id,
          action: params.action,
          status: newStatus,
        }
      },
    },
  ]
}

import { getCurrentUserId } from '../config'
