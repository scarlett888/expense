import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { db, schema } from '@/utils/db'
import { eq, and, inArray } from 'drizzle-orm'

// PUT /api/expenses/[id]?action=archive
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    if (action === 'archive') {
      const [expense] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, params.id))
      if (!expense) return NextResponse.json({ error: '记录不存在' }, { status: 404 })
      if (expense.user_id !== session.user.id) return NextResponse.json({ error: '无权操作' }, { status: 403 })
      if (expense.source_type !== 'owe') return NextResponse.json({ error: '只能归档应付记录' }, { status: 400 })

      await db.update(schema.expenses)
        .set({ source_type: 'personal' })
        .where(eq(schema.expenses.id, params.id))

      const [updated] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, params.id))
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 })
  } catch (err) {
    console.error('[expenses PUT]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// DELETE /api/expenses/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    // 如果是 group 主账单，同时删除关联的 owe 记录
    const [expense] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, params.id))
    let deletedOweIds: string[] = []
    if (expense?.source_type === 'group') {
      const relatedOwes = await db.select({ id: schema.expenses.id }).from(schema.expenses)
        .where(eq(schema.expenses.source_expense_id, params.id))
      deletedOweIds = relatedOwes.map((o: { id: string }) => o.id)
      if (deletedOweIds.length > 0) {
        await db.delete(schema.expenses).where(
          and(inArray(schema.expenses.id, deletedOweIds), eq(schema.expenses.source_expense_id, params.id))
        )
      }
    }

    await db.delete(schema.expense_splits).where(eq(schema.expense_splits.expense_id, params.id))
    await db.delete(schema.expenses).where(eq(schema.expenses.id, params.id))
    return NextResponse.json({ message: '已删除', deletedOweIds })
  } catch (err) {
    console.error('[expenses DELETE]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
