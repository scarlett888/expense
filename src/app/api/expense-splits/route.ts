import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { db, schema } from '@/utils/db'
import { eq, desc, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// GET /api/expense-splits
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const userId = session.user.id
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const expenseId = searchParams.get('expense_id')

  try {
    let conditions = []

    if (searchParams.get('user_id')) {
      conditions.push(eq(schema.expense_splits.user_id, searchParams.get('user_id')!))
    }

    if (status) {
      conditions.push(eq(schema.expense_splits.status, status))
    }

    const query = db.select()
      .from(schema.expense_splits)
      .innerJoin(schema.expenses, eq(schema.expense_splits.expense_id, schema.expenses.id))
      .orderBy(desc(schema.expense_splits.created_at))

    const result = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query

    return NextResponse.json(result)
  } catch (err) {
    console.error('[expense-splits GET]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// PATCH /api/expense-splits - 接受/拒绝分摊
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const body = await req.json()
    const { split_id, action } = body

    if (!split_id || !action) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    const validActions = ['accept', 'reject']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 })
    }

    // 验证这条分摊记录属于当前用户
    const [split] = await db.select()
      .from(schema.expense_splits)
      .where(eq(schema.expense_splits.id, split_id))

    if (!split) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 })
    }

    if (split.user_id !== userId) {
      return NextResponse.json({ error: '无权操作此记录' }, { status: 403 })
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected'
    await db.update(schema.expense_splits)
      .set({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .where(eq(schema.expense_splits.id, split_id))

    // 如果是接受，创建 owe 记录到分摊明细
    if (action === 'accept') {
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
          created_at: new Date().toISOString(),
        })
      }
    }

    // 如果是拒绝，删除对应的 owe 记录
    if (action === 'reject') {
      await db.delete(schema.expenses)
        .where(and(
          eq(schema.expenses.source_expense_id, split.expense_id),
          eq(schema.expenses.user_id, userId),
          eq(schema.expenses.source_type, 'owe')
        ))
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (err) {
    console.error('[expense-splits PATCH]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
