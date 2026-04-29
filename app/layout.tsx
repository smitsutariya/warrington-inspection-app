import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Warrington Inspection App',
  description: 'Condition Inspection Management for Warrington Residential',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
