import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { db, schema } from '@/utils/db'
import { eq, desc, inArray, and, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// GET /api/expenses
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const groupIds = searchParams.get('groupIds')
  const action = searchParams.get('action')
  const userId = session.user.id

  try {
    if (action === 'user-owes' && groupIds) {
      // 获取当前用户在指定小组中作为债务人的 owe 记录（分摊明细）
      const ids = groupIds.split(',')
      const data = await db.select().from(schema.expenses)
        .where(
          and(
            inArray(schema.expenses.group_id, ids),
            eq(schema.expenses.user_id, userId),
            eq(schema.expenses.source_type, 'owe')
          )
        )
        .orderBy(desc(schema.expenses.created_at))
      return NextResponse.json(data)
    }

    if (groupIds) {
      // 小组账单：该小组中，当前登录用户作为 payer 的 group 记录
      const ids = groupIds.split(',')
      const data = await db.select().from(schema.expenses)
        .where(
          and(
            inArray(schema.expenses.group_id, ids),
            eq(schema.expenses.payer_id, userId)
          )
        )
        .orderBy(desc(schema.expenses.created_at))
      return NextResponse.json(data)
    }

    // 个人账单：只看自己的记录（含 personal、group、owe）
    const data = await db.select().from(schema.expenses)
      .where(eq(schema.expenses.user_id, userId))
      .orderBy(desc(schema.expenses.created_at))
    return NextResponse.json(data)
  } catch (err) {
    console.error('[expenses GET]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/expenses
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  // 批量归档：把当前用户在某小组某日期的应付转为 personal（保留其他成员记录）
  if (action === 'archive-group') {
    const groupId = searchParams.get('groupId')
    const date = searchParams.get('date')
    const userId = session.user.id
    if (!groupId || !date) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    try {
      // 查找当前用户在指定小组、指定日期的全部应付
      const owes = await db.select().from(schema.expenses)
        .where(
          and(
            eq(schema.expenses.user_id, userId),
            eq(schema.expenses.group_id, groupId),
            eq(schema.expenses.date, date),
            eq(schema.expenses.source_type, 'owe')
          )
        )

      if (owes.length === 0) {
        return NextResponse.json({ error: '暂无应付可归档' }, { status: 400 })
      }

      // 删除 owe 记录，创建新的 personal 记录
      const now = new Date().toISOString()
      const archived: typeof schema.expenses.$inferSelect[] = []
      for (const owe of owes) {
        const newId = randomUUID()
        await db.insert(schema.expenses).values({
          id: newId,
          date: owe.date,
          amount: owe.amount,
          note: owe.note,
          user_id: owe.user_id,
          group_id: owe.group_id,
          payer_id: owe.payer_id,
          source_type: 'personal',
          source_expense_id: owe.source_expense_id,
          created_at: now,
        })
        await db.delete(schema.expenses).where(eq(schema.expenses.id, owe.id))
        const [r] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, newId))
        archived.push(r)
      }
      const oweIds = owes.map((o: { id: string }) => o.id)
      return NextResponse.json({ archived, deletedOweIds: oweIds })
    } catch (err) {
      console.error('[expenses POST archive]', err)
      return NextResponse.json({ error: '服务器错误' }, { status: 500 })
    }
  }

  // 普通记账
  try {
    const body = await req.json()
    const { date, amount, note, group_id, memberIds, source_type, excluded_amount, discount, custom_splits } = body
    const userId = session.user.id
    const now = new Date().toISOString()
    const created: typeof schema.expenses.$inferSelect[] = []

    if (group_id && memberIds && memberIds.length > 0) {
      const expenseId = randomUUID()
      const now2 = new Date().toISOString()

      // 创建一条 group 主账单（payer 的总支出）
      // note 中记录折扣信息
      const discountNote = discount && discount < 1
        ? `${note || ''}${note ? ' ' : ''}(${Math.round(discount * 100)}折)`
        : note
      await db.insert(schema.expenses).values({
        id: expenseId,
        date,
        amount,
        note: discountNote || null,
        user_id: userId,
        group_id,
        payer_id: userId,
        source_type: 'group',
        created_at: now2,
      })

      // 计算分摊金额
      let splits: { user_id: string; amount: number }[] = []

      if (custom_splits && custom_splits.length > 0) {
        // 模式 B: 完全自定义分配
        splits = custom_splits
      } else {
        // 模式 A: 排除项均摊或等额均摊
        const discountRate = discount || 1
        const excludedAmount = excluded_amount || 0
        // 折扣计算：先折后总价，再折后排除，最后计算分摊基数
        const discountedTotal = Math.abs(amount) * discountRate
        const discountedExcluded = excludedAmount * discountRate
        const splitBase = discountedTotal - discountedExcluded
        const splitAmount = Number((splitBase / memberIds.length).toFixed(2))

        for (const mid of memberIds) {
          splits.push({
            user_id: mid,
            amount: mid === userId
              ? -(splitAmount + discountedExcluded)  // 支付人：分摊 + 折扣后的排除项
              : -splitAmount
          })
        }
      }

      // 为每位成员创建分摊记录和通知
      for (const split of splits) {
        // 创建分摊明细记录
        const splitId = randomUUID()
        await db.insert(schema.expense_splits).values({
          id: splitId,
          expense_id: expenseId,
          user_id: split.user_id,
          amount: split.amount,
          status: split.user_id === userId ? 'accepted' : 'pending',
          created_at: now2,
        })

        // 支付人：立即创建 owe 记录到分摊明细
        if (split.user_id === userId) {
          const recordId = randomUUID()
          await db.insert(schema.expenses).values({
            id: recordId,
            date,
            amount: split.amount,
            note: note || null,
            user_id: split.user_id,
            group_id,
            payer_id: userId,
            source_type: 'owe',
            source_expense_id: expenseId,
            created_at: now2,
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
            message: `有成员创建了一笔 ${Math.abs(split.amount).toFixed(2)} 元的小组账单待您确认`,
            related_expense_id: expenseId,
            read: 0,
            created_at: now2,
          })
        }
      }

      // 获取所有 owe 记录（只包含支付人的）
      const [expense] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, expenseId))
      const owes = await db.select().from(schema.expenses)
        .where(and(
          eq(schema.expenses.source_expense_id, expenseId),
          eq(schema.expenses.source_type, 'owe')
        ))
      return NextResponse.json({ main: expense, owes }, { status: 201 })

    } else {
      // Personal expense
      const expenseId = randomUUID()
      await db.insert(schema.expenses).values({
        id: expenseId,
        date,
        amount,
        note: note || null,
        user_id: userId,
        group_id: null,
        payer_id: userId,
        source_type: source_type || 'personal',
        created_at: now,
      })
      const [expense] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, expenseId))
      return NextResponse.json({ main: expense, owes: [] }, { status: 201 })
    }
  } catch (err) {
    console.error('[expenses POST]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
