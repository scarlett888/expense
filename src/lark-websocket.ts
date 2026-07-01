import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { join } from 'path'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import * as schema from './db/schema'
import { parseCommand, formatHelpMessage, formatSuccessMessage } from './utils/lark/parser'

// 初始化数据库
const dbPath = join(process.cwd(), 'data', 'expense-book.db')
const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite, { schema })

// 硬编码凭证（测试用）
const appId = process.env.LARK_APP_ID || 'cli_aa94e5967a785bee'
const appSecret = process.env.LARK_APP_SECRET || '2pr8N824UAXBj8bUDsJpmh6MvSu3q6rk'

async function main() {
  const sdk = require('@larksuiteoapi/node-sdk')

  console.log('正在连接飞书...')
  console.log('appId:', appId ? '已设置' : '未设置')
  console.log('appSecret:', appSecret ? '已设置' : '未设置')

  // 创建 EventDispatcher
  const eventDispatcher = new sdk.EventDispatcher({
    appId,
    appSecret,
  })

  // 创建 Lark Client 用于发送消息
  const lark = new sdk.Client({ appId, appSecret })

  // 添加消息事件处理器
  eventDispatcher.register({
    'im.message.receive_v1': async (data: any) => {
      console.log('===收到消息===:', JSON.stringify(data).substring(0, 300))

      const message = data.message
      const content = message?.content
      const sender = message?.sender

      if (!sender?.open_id || !content) return

      let text = ''
      try {
        const parsed = JSON.parse(content)
        text = parsed.text?.replace(/@[\w-]+\s*/g, '').trim() || ''
      } catch {
        return
      }

      if (!text) return

      const openId = sender.open_id
      const parseResult = parseCommand(text)

      console.log('解析结果:', parseResult)

      switch (parseResult.type) {
        case 'help':
          lark.im.message.create({
            params: { receive_id_type: 'open_id' },
            data: { receive_id: openId, msg_type: 'post', content: JSON.stringify(formatHelpMessage()) },
          })
          break

        case 'personal': {
          const binding = await db.select().from(schema.lark_bindings).where(eq(schema.lark_bindings.lark_open_id, openId)).then(r => r[0])

          if (!binding) {
            lark.im.message.create({
              params: { receive_id_type: 'open_id' },
              data: { receive_id: openId, msg_type: 'post', content: JSON.stringify({
                zh_cn: { title: '请先绑定账户', content: [[{ tag: 'text', text: '您的飞书账号尚未绑定记账本账户，请先在网页端登录并绑定飞书账号。' }]] },
              }) },
            })
            break
          }

          const now = new Date().toISOString()
          const expenseId = randomUUID()
          const excludedAmount = parseResult.data.excludedAmount || 0
          const finalAmount = Math.abs(parseResult.data.amount) - excludedAmount

          await db.insert(schema.expenses).values({
            id: expenseId,
            date: parseResult.data.date,
            amount: -finalAmount,
            note: parseResult.data.note,
            user_id: binding.user_id,
            group_id: null,
            payer_id: binding.user_id,
            source_type: 'personal',
            created_at: now,
          })

          lark.im.message.create({
            params: { receive_id_type: 'open_id' },
            data: { receive_id: openId, msg_type: 'post', content: JSON.stringify(formatSuccessMessage(parseResult.data)) },
          })
          break
        }

        case 'unknown':
          lark.im.message.create({
            params: { receive_id_type: 'open_id' },
            data: { receive_id: openId, msg_type: 'post', content: JSON.stringify({
              zh_cn: { title: '无法识别的命令', content: [[{ tag: 'text', text: `「${parseResult.original}」不是有效的记账命令。发送「帮助」查看使用指南。` }]] },
            }) },
          })
          break
      }
    }
  })

  // 使用 WebSocket 长连接
  const wsClient = new sdk.WSClient({ appId, appSecret })
  await wsClient.start({ eventDispatcher })

  // 添加万能调试处理器 - 监听所有事件
  eventDispatcher.register({
    '*': (data: any) => {
      console.log('===万能处理器收到事件===:', JSON.stringify(data).substring(0, 500))
    }
  } as any)

  // 检查 WSClient 使用的 dispatcher
  const finalDispatcher = (wsClient as any).eventDispatcher || eventDispatcher
  console.log('WSClient dispatcher handles:', Array.from((finalDispatcher as any).handles.keys()))
  console.log('是否同一个 dispatcher:', finalDispatcher === eventDispatcher)

  console.log('飞书长连接服务已启动，等待消息...')

  process.on('SIGINT', () => {
    wsClient.stop()
    process.exit(0)
  })
}

main().catch(console.error)
