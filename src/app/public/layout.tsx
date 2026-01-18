import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '求人情報 - MATCHA',
  description: 'MATCHA 人材紹介サービスの求人情報',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* 公開ページ専用レイアウト - ヘッダーなし */}
      {children}
    </>
  )
}