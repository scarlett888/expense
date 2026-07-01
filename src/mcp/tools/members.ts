import { Tool as MCPTool } from '@modelcontextprotocol/sdk/types.js'

interface Tool extends MCPTool {
  handle: (args: unknown) => Promise<unknown>
}

export function getMemberTools(): Tool[] {
  return [
    {
      name: 'member_list',
      description: '获取指定小组的所有成员列表',
      inputSchema: {
        type: 'object',
        properties: {
          group_id: { type: 'string', description: '小组 ID' },
        },
        required: ['group_id'],
      },
      async handle(args: unknown) {
        const params = args as { group_id: string }
        return db
          .select()
          .from(schema.group_members)
          .where(eq(schema.group_members.group_id, params.group_id))
      },
    },
    {
      name: 'member_add',
      description: '向指定小组添加一个成员',
      inputSchema: {
        type: 'object',
        properties: {
          group_id: { type: 'string', description: '小组 ID' },
          user_id: { type: 'string', description: '用户 ID' },
          nickname: { type: 'string', description: '成员昵称（可选）' },
        },
        required: ['group_id', 'user_id'],
      },
      async handle(args: unknown) {
        const params = args as { group_id: string; user_id: string; nickname?: string }
        const now = new Date().toISOString()
        const id = randomUUID()

        await db.insert(schema.group_members).values({
          id,
          group_id: params.group_id,
          user_id: params.user_id,
          nickname: params.nickname || null,
          created_at: now,
        })

        const [member] = await db.select().from(schema.group_members).where(eq(schema.group_members.id, id))
        return member
      },
    },
    {
      name: 'member_remove',
      description: '从指定小组移除一个成员',
      inputSchema: {
        type: 'object',
        properties: {
          group_id: { type: 'string', description: '小组 ID' },
          member_id: { type: 'string', description: '成员 ID（不是 user_id）' },
        },
        required: ['group_id', 'member_id'],
      },
      async handle(args: unknown) {
        const params = args as { group_id: string; member_id: string }
        await db.delete(schema.group_members).where(eq(schema.group_members.id, params.member_id))
        return { success: true, deleted_member_id: params.member_id }
      },
    },
  ]
}

import { db, schema } from '../database'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
