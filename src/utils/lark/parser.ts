export interface ParsedExpense {
  amount: number
  note: string
  date: string
  excludedAmount?: number
}

export interface ParsedGroupExpense extends ParsedExpense {
  excludedAmount?: number
  groupId?: string
  memberIds?: string[]
}

type ParseResult =
  | { type: 'personal'; data: ParsedExpense }
  | { type: 'group'; data: ParsedGroupExpense }
  | { type: 'help' }
  | { type: 'unknown'; original: string }

export function parseCommand(text: string): ParseResult {
  const trimmed = text.trim()

  // 帮助命令
  if (/^(帮助|help|\?)$/i.test(trimmed)) {
    return { type: 'help' }
  }

  // 匹配记账命令
  // 格式: 记一笔 100 午饭 / 记 100 午饭 / 100 午饭
  // 支持排除项: 150 早饭 排除24 记一笔 150 早饭 排除24 打包
  const patterns = [
    // 记一笔 100 午饭
    /^记一笔\s+(\d+(?:\.\d{1,2})?)\s+(.+)$/,
    // 记 100 午饭
    /^记\s+(\d+(?:\.\d{1,2})?)\s+(.+)$/,
    // 100 午饭
    /^(\d+(?:\.\d{1,2})?)\s+(.+)$/,
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match) {
      const amount = parseFloat(match[1])
      const rest = match[2].trim()

      // 检查是否有排除项
      // 格式: 150 早饭 排除24 或者 150 早饭 排除 24
      const excludeMatch = rest.match(/^(.+?)\s+排除\s*(\d+(?:\.\d{1,2})?)\s*(.*)$/)
      if (excludeMatch) {
        return {
          type: 'personal',
          data: {
            amount,
            note: excludeMatch[1].trim(),
            date: getTodayDate(),
            excludedAmount: parseFloat(excludeMatch[2]),
          },
        }
      }

      return {
        type: 'personal',
        data: {
          amount,
          note: rest,
          date: getTodayDate(),
        },
      }
    }
  }

  return { type: 'unknown', original: trimmed }
}

export function getTodayDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function formatHelpMessage(): object {
  return {
    zh_cn: {
      title: '记账机器人使用指南',
      content: [
        [
          { tag: 'text', text: '📝 个人记账\n' },
          { tag: 'text', text: '发送「记 100 午饭」或「100 午饭」即可记一笔账\n' },
          { tag: 'text', text: '\n' },
          { tag: 'text', text: '📋 支持排除项（不参与分摊的部分）\n' },
          { tag: 'text', text: '发送「150 早饭 排除24」\n' },
          { tag: 'text', text: '\n' },
          { tag: 'text', text: '📊 查询账单\n' },
          { tag: 'text', text: '发送「账单」查看本月记录\n' },
          { tag: 'text', text: '\n' },
          { tag: 'text', text: '❓ 帮助\n' },
          { tag: 'text', text: '发送「帮助」查看本指南' },
        ],
      ],
    },
  }
}

export function formatSuccessMessage(data: ParsedExpense | ParsedGroupExpense): object {
  const note = data.note || '无备注'
  const amount = data.amount.toFixed(2)
  const type = 'excludedAmount' in data && data.excludedAmount ? '（已排除不参与分摊部分）' : ''

  return {
    zh_cn: {
      title: '记账成功 ✓',
      content: [
        [
          { tag: 'text', text: `💰 金额：¥${amount}\n` },
          { tag: 'text', text: `📝 备注：${note}\n` },
          { tag: 'text', text: `📅 日期：${data.date}\n` },
          { tag: 'text', text: type ? `\n${type}` : '' },
        ],
      ],
    },
  }
}

export function formatErrorMessage(error: string): object {
  return {
    zh_cn: {
      title: '记账失败 ✗',
      content: [[{ tag: 'text', text: error }]],
    },
  }
}
