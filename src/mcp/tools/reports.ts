import { Tool as MCPTool } from '@modelcontextprotocol/sdk/types.js'

interface Tool extends MCPTool {
  handle: (args: unknown) => Promise<unknown>
}

export function getReportTools(): Tool[] {
  return [
    {
      name: 'report_monthly',
      description: '获取指定年月的个人支出报表，包括总支出和详细记录',
      inputSchema: {
        type: 'object',
        properties: {
          year: { type: 'number', minimum: 2020, maximum: 2100 },
          month: { type: 'number', minimum: 1, maximum: 12 },
        },
        required: ['year', 'month'],
      },
      async handle(args: unknown) {
        const params = args as { year: number; month: number }
        const userId = getCurrentUserId()

        const startDate = `${params.year}-${String(params.month).padStart(2, '0')}-01`
        const endDate =
          params.month === 12
            ? `${params.year + 1}-01-01`
            : `${params.year}-${String(params.month + 1).padStart(2, '0')}-01`

        const expenses = await db
          .select()
          .from(schema.expenses)
          .where(
            and(
              eq(schema.expenses.user_id, userId),
              gte(schema.expenses.date, startDate),
              lte(schema.expenses.date, endDate)
            )
          )

        const totalAmount = expenses.reduce((sum, e) => sum + Math.abs(e.amount), 0)

        return {
          year: params.year,
          month: params.month,
          total_amount: totalAmount,
          expense_count: expenses.length,
          expenses,
        }
      },
    },
    {
      name: 'report_by_category',
      description: '获取指定时间段内按分类统计的支出报表',
      inputSchema: {
        type: 'object',
        properties: {
          year: { type: 'number', minimum: 2020, maximum: 2100, description: '年份（默认今年）' },
          month: { type: 'number', minimum: 1, maximum: 12, description: '月份（默认本月）' },
        },
      },
      async handle(args: unknown) {
        const params = args as { year?: number; month?: number }
        const userId = getCurrentUserId()
        const now = new Date()
        const year = params.year || now.getFullYear()
        const month = params.month || now.getMonth() + 1

        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const endDate =
          month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, '0')}-01`

        const expenses = await db
          .select()
          .from(schema.expenses)
          .where(
            and(
              eq(schema.expenses.user_id, userId),
              gte(schema.expenses.date, startDate),
              lte(schema.expenses.date, endDate)
            )
          )

        const totalAmount = expenses.reduce((sum, e) => sum + Math.abs(e.amount), 0)

        return {
          year,
          month,
          total_amount: totalAmount,
          expense_count: expenses.length,
        }
      },
    },
  ]
}

import { db, schema } from '../database'
import { eq, and, gte, lte } from 'drizzle-orm'
import { getCurrentUserId } from '../config'
