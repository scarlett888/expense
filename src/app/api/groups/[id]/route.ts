import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { db, schema } from '@/utils/db'
import { eq } from 'drizzle-orm'

// DELETE /api/groups/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const groupId = params.id

    // Delete all related records
    const relatedExpenses = await db.select({ id: schema.expenses.id })
      .from(schema.expenses).where(eq(schema.expenses.group_id, groupId))
    const expenseIds = relatedExpenses.map(e => e.id)

    if (expenseIds.length > 0) {
      const { inArray } = await import('drizzle-orm')
      await db.delete(schema.expense_splits)
        .where(inArray(schema.expense_splits.expense_id, expenseIds))
    }

    await db.delete(schema.expenses).where(eq(schema.expenses.group_id, groupId))
    await db.delete(schema.group_members).where(eq(schema.group_members.group_id, groupId))
    await db.delete(schema.groups).where(eq(schema.groups.id, groupId))

    return NextResponse.json({ message: '已删除' })
  } catch (err) {
    console.error('[groups DELETE]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
