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
      const oweIds = owes.map(o => o.id)
      return NextResponse.json({ archived, deletedOweIds: oweIds })
    } catch (err) {
      console.error('[expenses POST archive]', err)
      return NextResponse.json({ error: '服务器错误' }, { status: 500 })
    }
  }

  // 普通记账
  try {
    const body = await req.json()
    const { date, amount, note, group_id, memberIds, source_type } = body
    const userId = session.user.id
    const now = new Date().toISOString()
    const created: typeof schema.expenses.$inferSelect[] = []

    if (group_id && memberIds && memberIds.length > 0) {
      // 每人应付金额
      const splitAmount = Number((Math.abs(amount) / memberIds.length).toFixed(2))
      const expenseId = randomUUID()
      const now2 = new Date().toISOString()

      // 创建一条 group 主账单（payer 的总支出）
      await db.insert(schema.expenses).values({
        id: expenseId,
        date,
        amount,
        note: note || null,
        user_id: userId,
        group_id,
        payer_id: userId,
        source_type: 'group',
        created_at: now2,
      })

      // 为每位成员（含 payer 自己）创建分摊记录
      for (const mid of memberIds) {
        const recordId = randomUUID()
        await db.insert(schema.expenses).values({
          id: recordId,
          date,
          amount: -splitAmount,
          note: note || null,
          user_id: mid,
          group_id,
          payer_id: userId,
          source_type: 'owe',
          source_expense_id: expenseId,
          created_at: now2,
        })
        const [r] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, recordId))
        created.push(r)
      }

      const [expense] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, expenseId))
      return NextResponse.json({ main: expense, owes: created }, { status: 201 })

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
