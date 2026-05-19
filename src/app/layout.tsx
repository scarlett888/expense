import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '记账本 | Expense Book',
  description: '简洁优雅的个人记账应用',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}