import { Tool as MCPTool } from '@modelcontextprotocol/sdk/types.js'

// Extended tool type that includes the handler
export interface Tool extends MCPTool {
  handle: (args: unknown) => Promise<unknown>
}

export function getExpenseTools(): Tool[] {
  return [
    {
      name: 'expense_list',
      description: '获取当前用户的个人账单列表，支持日期范围筛选',
      inputSchema: {
        type: 'object',
        properties: {
          date_from: { type: 'string', description: '开始日期 (YYYY-MM-DD)' },
          date_to: { type: 'string', description: '结束日期 (YYYY-MM-DD)' },
          limit: { type: 'number', description: '返回记录数上限，默认 50' },
        },
      },
      async handle(args: unknown) {
        const params = args as { date_from?: string; date_to?: string; limit?: number }
        const userId = getCurrentUserId()
        const conditions = [eq(schema.expenses.user_id, userId)]

        if (params.date_from) conditions.push(gte(schema.expenses.date, params.date_from))
        if (params.date_to) conditions.push(lte(schema.expenses.date, params.date_to))

        return db
          .select()
          .from(schema.expenses)
          .where(and(...conditions))
          .orderBy(desc(schema.expenses.created_at))
          .limit(params.limit || 50)
      },
    },
    {
      name: 'expense_add',
      description: '添加一条个人账单记录',
      inputSchema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: '账单日期 (YYYY-MM-DD)' },
          amount: { type: 'number', description: '账单金额' },
          note: { type: 'string', description: '账单备注' },
        },
        required: ['date', 'amount'],
      },
      async handle(args: unknown) {
        const params = args as { date: string; amount: number; note?: string }
        const userId = getCurrentUserId()
        const now = new Date().toISOString()
        const id = randomUUID()

        await db.insert(schema.expenses).values({
          id,
          date: params.date,
          amount: params.amount,
          note: params.note || null,
          user_id: userId,
          group_id: null,
          payer_id: userId,
          source_type: 'personal',
          created_at: now,
        })

        const [expense] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, id))
        return expense
      },
    },
    {
      name: 'expense_delete',
      description: '删除一条账单记录',
      inputSchema: {
        type: 'object',
        properties: {
          expense_id: { type: 'string', description: '要删除的账单 ID' },
        },
        required: ['expense_id'],
      },
      async handle(args: unknown) {
        const params = args as { expense_id: string }
        await db.delete(schema.expenses).where(eq(schema.expenses.id, params.expense_id))
        return { success: true, deleted_id: params.expense_id }
      },
    },
    {
      name: 'expense_split_add',
      description: '创建带分摊的小组账单，支持排除项均摊或完全自定义分配',
      inputSchema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: '账单日期 (YYYY-MM-DD)' },
          amount: { type: 'number', description: '账单总金额' },
          note: { type: 'string', description: '账单备注' },
          group_id: { type: 'string', description: '小组 ID' },
          member_ids: { type: 'array', items: { type: 'string' }, description: '成员 ID 列表' },
          excluded_amount: { type: 'number', description: '排除金额（如单独打包的菜品，会按折扣率打折后再排除）' },
          discount: { type: 'number', description: '折扣率，如 0.9 表示 9 折（会先打折再排除）' },
          custom_splits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                amount: { type: 'number' },
              },
            },
            description: '自定义分配（user_id 和 amount），设置后忽略 excluded_amount',
          },
        },
        required: ['date', 'amount', 'group_id', 'member_ids'],
      },
      async handle(args: unknown) {
        const params = args as {
          date: string
          amount: number
          note?: string
          group_id: string
          member_ids: string[]
          excluded_amount?: number
          discount?: number
          custom_splits?: { user_id: string; amount: number }[]
        }
        const userId = getCurrentUserId()
        const now = new Date().toISOString()
        const expenseId = randomUUID()

        // 创建主账单（金额使用原始金额，note 中记录折扣信息）
        await db.insert(schema.expenses).values({
          id: expenseId,
          date: params.date,
          amount: params.amount,
          note: params.discount && params.discount < 1
            ? `${params.note || ''}${params.note ? ' ' : ''}(${Math.round(params.discount * 100)}折)`
            : (params.note || null),
          user_id: userId,
          group_id: params.group_id,
          payer_id: userId,
          source_type: 'group',
          created_at: now,
        })

        // 计算分摊
        let splits: { user_id: string; amount: number }[] = []

        if (params.custom_splits && params.custom_splits.length > 0) {
          splits = params.custom_splits
        } else {
          const discount = params.discount || 1
          const excludedAmount = params.excluded_amount || 0
          // 折扣计算：先折后总价，再折后排除，最后计算分摊基数
          const discountedTotal = Math.abs(params.amount) * discount
          const discountedExcluded = excludedAmount * discount
          const splitBase = discountedTotal - discountedExcluded
          const splitAmount = Number((splitBase / params.member_ids.length).toFixed(2))

          for (const mid of params.member_ids) {
            splits.push({
              user_id: mid,
              amount: mid === userId
                ? -(splitAmount + discountedExcluded)  // 支付人：分摊 + 折扣后的排除项
                : -splitAmount
            })
          }
        }

        const createdSplits: any[] = []

        for (const split of splits) {
          // 创建分摊明细
          const splitId = randomUUID()
          await db.insert(schema.expense_splits).values({
            id: splitId,
            expense_id: expenseId,
            user_id: split.user_id,
            amount: split.amount,
            status: split.user_id === userId ? 'accepted' : 'pending',
            created_at: now,
          })

          // 支付人：立即创建 owe 记录到分摊明细
          if (split.user_id === userId) {
            const recordId = randomUUID()
            await db.insert(schema.expenses).values({
              id: recordId,
              date: params.date,
              amount: split.amount,
              note: params.note || null,
              user_id: split.user_id,
              group_id: params.group_id,
              payer_id: userId,
              source_type: 'owe',
              source_expense_id: expenseId,
              created_at: now,
            })
          }

          // 为非支付人创建通知（等对方确认后才添加到分摊明细）
          if (split.user_id !== userId) {
            const notifyId = randomUUID()
            await db.insert(schema.notifications).values({
              id: notifyId,
              user_id: split.user_id,
              type: 'split_bill',
              title: '新账单待确认',
              message: `您有一笔 ${Math.abs(split.amount).toFixed(2)} 元的小组账单待确认`,
              related_expense_id: expenseId,
              read: 0,
              created_at: now,
            })
          }

          createdSplits.push({ split_id: splitId, ...split })
        }

        const [expense] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, expenseId))
        return { main: expense, splits: createdSplits }
      },
    },
  ]
}

import { db, schema } from '../database'
import { eq, desc, gte, lte, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { getCurrentUserId } from '../config'
