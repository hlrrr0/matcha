import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '求職者アンケート - 人材紹介システム',
  description: '就職活動サポートのための求職者アンケート',
  robots: {
    index: false,
    follow: false,
  },
}

export default function SurveyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
