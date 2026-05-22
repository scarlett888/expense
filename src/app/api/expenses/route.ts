import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { db, schema } from '@/utils/db'
import { eq, desc, inArray } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// GET /api/expenses
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const groupIds = searchParams.get('groupIds')

  try {
    if (groupIds) {
      const ids = groupIds.split(',')
      const data = await db.select().from(schema.expenses)
        .where(inArray(schema.expenses.group_id, ids))
        .orderBy(desc(schema.expenses.created_at))
      return NextResponse.json(data)
    }

    const data = await db.select().from(schema.expenses)
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

  try {
    const body = await req.json()
    const { date, amount, note, group_id, memberIds } = body
    const userId = session.user.id
    const expenseId = randomUUID()
    const now = new Date().toISOString()

    await db.insert(schema.expenses).values({
      id: expenseId,
      date,
      amount,
      note: note || null,
      user_id: userId,
      group_id: group_id || null,
      payer_id: userId,
      created_at: now,
    })

    if (group_id && memberIds && memberIds.length > 0) {
      const splitAmount = Number((amount / memberIds.length).toFixed(2))
      const splits = memberIds.map((mid: string) => ({
        id: randomUUID(),
        expense_id: expenseId,
        user_id: mid,
        amount: splitAmount,
        created_at: now,
      }))
      await db.insert(schema.expense_splits).values(splits)
    }

    const [expense] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, expenseId))
    return NextResponse.json(expense, { status: 201 })
  } catch (err) {
    console.error('[expenses POST]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
