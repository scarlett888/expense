import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/utils/db'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { larkClient } from '@/utils/lark/client'
import { parseCommand, formatHelpMessage, formatSuccessMessage, formatErrorMessage } from '@/utils/lark/parser'

const VERIFICATION_TOKEN = process.env.LARK_VERIFICATION_TOKEN!

// POST 处理飞书的所有事件（URL 验证 + 事件回调）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { header, event, challenge, token, type } = body

    console.log('[lark webhook] 收到请求:', JSON.stringify(body).substring(0, 300))

    // URL 验证请求
    if (type === 'url_verification' || challenge) {
      console.log('[lark webhook] URL 验证 challenge:', challenge)
      return NextResponse.json({ challenge: challenge || body.challenge })
    }

    // 验证 token
    if (header?.token !== VERIFICATION_TOKEN) {
      return NextResponse.json({ code: 401, msg: 'Invalid token' }, { status: 401 })
    }

    // 处理心跳事件
    if (event?.type === 'endpoint_ping') {
      return NextResponse.json({ code: 0 })
    }

    // 处理消息事件
    if (event?.type === 'im.message.receive_v1') {
      const message = event.message
      const sender = message?.sender
      const content = message?.content

      if (!sender?.open_id || !content) {
        return NextResponse.json({ code: 0 })
      }

      // 解析消息内容
      let messageContent: { text?: string } = {}
      try {
        messageContent = JSON.parse(content)
      } catch {
        return NextResponse.json({ code: 0 })
      }

      const text = messageContent.text?.replace(/@[\w-]+\s*/g, '').trim() || ''
      if (!text) {
        return NextResponse.json({ code: 0 })
      }

      const parseResult = parseCommand(text)
      const openId = sender.open_id

      switch (parseResult.type) {
        case 'help':
          await larkClient.sendPost(openId, formatHelpMessage())
          break

        case 'personal': {
          // 查找或创建用户绑定
          let binding = await db
            .select()
            .from(schema.lark_bindings)
            .where(eq(schema.lark_bindings.lark_open_id, openId))
            .then(r => r[0])

          if (!binding) {
            // 获取飞书用户信息
            try {
              const userInfo = await larkClient.getUserInfo(openId)
              if (userInfo.email) {
                // 查找已注册用户
                const user = await db
                  .select()
                  .from(schema.users)
                  .where(eq(schema.users.email, userInfo.email))
                  .then(r => r[0])

                if (user) {
                  // 创建绑定
                  const now = new Date().toISOString()
                  await db.insert(schema.lark_bindings).values({
                    id: randomUUID(),
                    user_id: user.id,
                    lark_open_id: openId,
                    lark_union_id: userInfo.union_id || null,
                    lark_email: userInfo.email,
                    created_at: now,
                  })
                  binding = { id: '', user_id: user.id, lark_open_id: openId, lark_union_id: userInfo.union_id || null, lark_email: userInfo.email, created_at: now }
                }
              }
            } catch (e) {
              console.error('Failed to get user info:', e)
            }
          }

          if (!binding) {
            await larkClient.sendPost(openId, {
              zh_cn: {
                title: '请先绑定账户',
                content: [[{ tag: 'text', text: '您的飞书账号尚未绑定记账本账户，请先在网页端登录并绑定飞书账号。' }]],
              },
            })
            break
          }

          // 创建账单
          const now = new Date().toISOString()
          const expenseId = randomUUID()
          const excludedAmount = parseResult.data.excludedAmount || 0
          const finalAmount = parseResult.data.amount - excludedAmount

          await db.insert(schema.expenses).values({
            id: expenseId,
            date: parseResult.data.date,
            amount: -Math.abs(finalAmount),
            note: parseResult.data.note,
            user_id: binding.user_id,
            group_id: null,
            payer_id: binding.user_id,
            source_type: 'personal',
            created_at: now,
          })

          const responseMsg = {
            ...formatSuccessMessage(parseResult.data),
            zh_cn: {
              ...((formatSuccessMessage(parseResult.data) as any).zh_cn),
              content: [
                ...((formatSuccessMessage(parseResult.data) as any).zh_cn.content),
                ...(excludedAmount > 0 ? [[{ tag: 'text', text: `\n(已自动排除 ¥${excludedAmount.toFixed(2)} 不计入账单)` }]] : []),
              ],
            },
          }
          await larkClient.sendPost(openId, responseMsg)
          break
        }

        case 'unknown':
          await larkClient.sendPost(openId, {
            zh_cn: {
              title: '无法识别的命令',
              content: [[{ tag: 'text', text: `「${parseResult.original}」不是有效的记账命令。发送「帮助」查看使用指南。` }]],
            },
          })
          break
      }
    }

    return NextResponse.json({ code: 0 })
  } catch (err) {
    console.error('[lark events]', err)
    return NextResponse.json({ code: 500, msg: 'Internal error' }, { status: 500 })
  }
}
