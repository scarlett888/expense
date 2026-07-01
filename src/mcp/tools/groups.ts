import { Tool as MCPTool } from '@modelcontextprotocol/sdk/types.js'

interface Tool extends MCPTool {
  handle: (args: unknown) => Promise<unknown>
}

export function getGroupTools(): Tool[] {
  return [
    {
      name: 'group_list',
      description: '获取当前用户所属的所有小组列表',
      inputSchema: { type: 'object', properties: {} },
      async handle() {
        const userId = getCurrentUserId()
        const memberships = await db
          .select({ group_id: schema.group_members.group_id })
          .from(schema.group_members)
          .where(eq(schema.group_members.user_id, userId))

        if (memberships.length === 0) return []
        const groupIds = memberships.map((m: { group_id: string }) => m.group_id)

        return db
          .select()
          .from(schema.groups)
          .where(inArray(schema.groups.id, groupIds))
          .orderBy(desc(schema.groups.created_at))
      },
    },
    {
      name: 'group_create',
      description: '创建一个新的记账小组',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '小组名称' },
        },
        required: ['name'],
      },
      async handle(args: unknown) {
        const params = args as { name: string }
        const userId = getCurrentUserId()
        const now = new Date().toISOString()
        const id = randomUUID()

        await db.insert(schema.groups).values({
          id,
          name: params.name.trim(),
          owner_id: userId,
          created_by: userId,
          created_at: now,
        })

        await db.insert(schema.group_members).values({
          id: randomUUID(),
          group_id: id,
          user_id: userId,
          nickname: null,
          created_at: now,
        })

        const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, id))
        return group
      },
    },
    {
      name: 'group_delete',
      description: '删除一个小组（同时删除所有成员和账单记录）',
      inputSchema: {
        type: 'object',
        properties: {
          group_id: { type: 'string', description: '要删除的小组 ID' },
        },
        required: ['group_id'],
      },
      async handle(args: unknown) {
        const params = args as { group_id: string }
        await db.delete(schema.group_members).where(eq(schema.group_members.group_id, params.group_id))
        await db.delete(schema.expenses).where(eq(schema.expenses.group_id, params.group_id))
        await db.delete(schema.groups).where(eq(schema.groups.id, params.group_id))
        return { success: true, deleted_group_id: params.group_id }
      },
    },
  ]
}

import { db, schema } from '../database'
import { eq, desc, inArray } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { getCurrentUserId } from '../config'
