import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/header'
import { AuthProvider } from '@/contexts/AuthContext'
import { ConditionalMain } from '@/components/ConditionalMain'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '人材紹介システム',
  description: 'Dominoシステム連携型人材紹介管理システム',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthProvider>
          <Header />
          <ConditionalMain>
            {children}
          </ConditionalMain>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
