import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { EmailHistory } from '@/types/email'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

interface EmailHistoryListProps {
  matchId?: string
  candidateId?: string
  jobId?: string
  companyId?: string
}

export function EmailHistoryList({ matchId, candidateId, jobId, companyId }: EmailHistoryListProps) {
  const [emails, setEmails] = useState<EmailHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEmailHistory = async () => {
      try {
        const emailHistoryRef = collection(db, 'emailHistory')
        let q = query(emailHistoryRef, orderBy('sentAt', 'desc'))

        // フィルターを適用
        if (matchId) {
          q = query(emailHistoryRef, where('matchId', '==', matchId), orderBy('sentAt', 'desc'))
        } else if (candidateId) {
          q = query(emailHistoryRef, where('candidateId', '==', candidateId), orderBy('sentAt', 'desc'))
        } else if (jobId) {
          q = query(emailHistoryRef, where('jobId', '==', jobId), orderBy('sentAt', 'desc'))
        } else if (companyId) {
          q = query(emailHistoryRef, where('companyId', '==', companyId), orderBy('sentAt', 'desc'))
        }

        const snapshot = await getDocs(q)
        const emailData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as EmailHistory[]

        setEmails(emailData)
      } catch (error) {
        console.error('メール履歴の取得に失敗:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEmailHistory()
  }, [matchId, candidateId, jobId, companyId])

  if (loading) {
    return <div className="text-sm text-muted-foreground">読み込み中...</div>
  }

  if (emails.length === 0) {
    return <div className="text-sm text-muted-foreground">メール送信履歴がありません</div>
  }

  return (
    <div className="space-y-4">
      {emails.map((email) => (
        <Card key={email.id}>
          <CardHeader>
            <CardTitle className="text-base">{email.subject}</CardTitle>
            <CardDescription>
              送信先: {email.to}
              {email.sentAt && (
                <span className="ml-2">
                  ({formatDistanceToNow(new Date(email.sentAt), { addSuffix: true, locale: ja })})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md">
              {email.body}
            </pre>
            <div className="mt-2 text-xs text-muted-foreground">
              ステータス: <span className={email.status === 'sent' ? 'text-green-600' : 'text-red-600'}>
                {email.status === 'sent' ? '送信済み' : '送信失敗'}
              </span>
              {email.cc && <span className="ml-4">CC: {email.cc}</span>}
              {email.bcc && <span className="ml-4">BCC: {email.bcc}</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
