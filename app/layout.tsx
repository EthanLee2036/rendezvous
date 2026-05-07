import './globals.css'
import type { Metadata } from 'next'
import { TopBar } from './topbar'

export const metadata: Metadata = {
  title: 'RendezVous',
  description: 'Find the perfect time to meet — across timezones',
  manifest: '/manifest.json',
  themeColor: '#2D5A3D',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RendezVous',
  },
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
