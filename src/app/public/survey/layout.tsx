import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '求職者アンケート - MATCHA',
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
