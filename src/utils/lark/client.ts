const LARK_APP_ID = process.env.LARK_APP_ID!
const LARK_APP_SECRET = process.env.LARK_APP_SECRET!
const LARK_API_BASE = 'https://open.feishu.cn/open-apis'

interface TokenResponse {
  code: number
  msg: string
  access_token: string
  token_type: string
  expires_in: number
}

interface UserInfoResponse {
  code: number
  msg: string
  data: {
    name: string
    open_id: string
    union_id?: string
    email?: string
    avatar_url?: string
  }
}

interface SendMessageResponse {
  code: number
  msg: string
  data: {
    message_id: string
  }
}

class LarkClient {
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    const res = await fetch(`${LARK_API_BASE}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: LARK_APP_ID, app_secret: LARK_APP_SECRET }),
    })

    const data: TokenResponse = await res.json()
    if (data.code !== 0) {
      throw new Error(`Failed to get access token: ${data.msg}`)
    }

    this.accessToken = data.access_token
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
    return this.accessToken
  }

  async getUserInfo(openId: string): Promise<UserInfoResponse['data']> {
    const token = await this.getAccessToken()
    const res = await fetch(
      `${LARK_API_BASE}/contact/v3/users/${openId}?user_id_type=open_id`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data: UserInfoResponse = await res.json()
    if (data.code !== 0) {
      throw new Error(`Failed to get user info: ${data.msg}`)
    }
    return data.data
  }

  async sendMessage(receiveId: string, msgType: 'text' | 'post', content: object): Promise<string> {
    const token = await this.getAccessToken()
    const res = await fetch(`${LARK_API_BASE}/im/v1/messages?receive_id_type=open_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ receive_id: receiveId, msg_type: msgType, content: JSON.stringify(content) }),
    })
    const data: SendMessageResponse = await res.json()
    if (data.code !== 0) {
      throw new Error(`Failed to send message: ${data.msg}`)
    }
    return data.data.message_id
  }

  async sendText(receiveId: string, text: string): Promise<string> {
    return this.sendMessage(receiveId, 'text', { text })
  }

  async sendPost(receiveId: string, postContent: object): Promise<string> {
    return this.sendMessage(receiveId, 'post', postContent)
  }

  async sendGroupMessage(chatId: string, msgType: 'text' | 'post', content: object): Promise<string> {
    const token = await this.getAccessToken()
    const res = await fetch(`${LARK_API_BASE}/im/v1/messages?receive_id_type=chat_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ receive_id: chatId, msg_type: msgType, content: JSON.stringify(content) }),
    })
    const data: SendMessageResponse = await res.json()
    if (data.code !== 0) {
      throw new Error(`Failed to send message: ${data.msg}`)
    }
    return data.data.message_id
  }
}

export const larkClient = new LarkClient()
