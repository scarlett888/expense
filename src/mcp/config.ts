import { db, schema } from './database'
import { eq } from 'drizzle-orm'

export function getCurrentUserId(): string {
  // 1. 环境变量优先：直接指定用户 ID
  if (process.env.MCP_USER_ID) {
    return process.env.MCP_USER_ID
  }

  // 2. 通过 email 查找用户
  if (process.env.MCP_USER_EMAIL) {
    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, process.env.MCP_USER_EMAIL))
      .get()
    if (user) return user.id
  }

  // 3. 单用户场景默认返回第一条用户
  const firstUser = db.select().from(schema.users).limit(1).get()
  return firstUser?.id || 'default-user'
}
