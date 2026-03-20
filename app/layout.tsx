import './globals.css'
import type { Metadata } from 'next'
import { TopBar } from './topbar'

export const metadata: Metadata = {
  title: 'RendezVous — Smart Scheduling',
  description: 'Create polls to find the best meeting time across time zones.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        {children}
      </body>
    </html>
  )
}
