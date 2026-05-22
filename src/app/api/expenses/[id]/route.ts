import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { db, schema } from '@/utils/db'
import { eq } from 'drizzle-orm'

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
    await db.delete(schema.expense_splits).where(eq(schema.expense_splits.expense_id, params.id))
    await db.delete(schema.expenses).where(eq(schema.expenses.id, params.id))
    return NextResponse.json({ message: '已删除' })
  } catch (err) {
    console.error('[expenses DELETE]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
