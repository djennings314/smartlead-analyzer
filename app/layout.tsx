import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Smartlead Bottleneck Analyzer',
  description: 'Campaign message history analysis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
