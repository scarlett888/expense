import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '记账本',
  description: '简单的记账应用',
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