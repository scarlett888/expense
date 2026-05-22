import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/auth'
import { db, schema } from '@/utils/db'
import { eq } from 'drizzle-orm'

// GET /api/users/find?email=xxx
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    if (!email) {
      return NextResponse.json({ error: '缺少 email 参数' }, { status: 400 })
    }

    const user = await db.select({ id: schema.users.id, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1)

    if (user.length === 0) {
      return NextResponse.json(null)
    }
    return NextResponse.json(user[0])
  } catch (err) {
    console.error('[users/find GET]', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
