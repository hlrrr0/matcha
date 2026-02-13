"use client"

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Mail } from 'lucide-react'
import { formatDateTime } from '@/components/companies/detail/formatters'

interface CompanyHistoryTabProps {
  emailHistory: any[]
  selectedEmail: any | null
  setSelectedEmail: (value: any | null) => void
}

export default function CompanyHistoryTab({
  emailHistory,
  selectedEmail,
  setSelectedEmail
}: CompanyHistoryTabProps) {
  return (
    <>
      {emailHistory.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                メール送信履歴 ({emailHistory.length}件)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">送信日時</th>
                      <th className="text-left py-3 px-4 font-medium">宛先</th>
                      <th className="text-left py-3 px-4 font-medium">件名</th>
                      <th className="text-left py-3 px-4 font-medium">ステータス</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailHistory
                      .sort((a: any, b: any) => {
                        const timeA = a.sentAt || a.createdAt
                        const timeB = b.sentAt || b.createdAt

                        let dateA = new Date(0)
                        let dateB = new Date(0)

                        if (timeA && typeof timeA === 'object' && timeA.toDate) {
                          dateA = timeA.toDate()
                        } else if (timeA instanceof Date) {
                          dateA = timeA
                        } else if (typeof timeA === 'string') {
                          dateA = new Date(timeA)
                        } else if (timeA && typeof timeA === 'object' && timeA.seconds) {
                          dateA = new Date(timeA.seconds * 1000)
                        }

                        if (timeB && typeof timeB === 'object' && timeB.toDate) {
                          dateB = timeB.toDate()
                        } else if (timeB instanceof Date) {
                          dateB = timeB
                        } else if (typeof timeB === 'string') {
                          dateB = new Date(timeB)
                        } else if (timeB && typeof timeB === 'object' && timeB.seconds) {
                          dateB = new Date(timeB.seconds * 1000)
                        }

                        return dateB.getTime() - dateA.getTime()
                      })
                      .map((email: any) => (
                        <tr
                          key={email.id}
                          className="border-b hover:bg-purple-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedEmail(email)}
                        >
                          <td className="py-3 px-4">{formatDateTime(email.sentAt || email.createdAt)}</td>
                          <td className="py-3 px-4">{email.to || '未設定'}</td>
                          <td className="py-3 px-4">{email.subject || '(件名なし)'}</td>
                          <td className="py-3 px-4">
                            <Badge className={email.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {email.status === 'sent' ? '送信済み' : '保留中'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>メール詳細</DialogTitle>
                <DialogDescription>
                  {selectedEmail && formatDateTime(selectedEmail.sentAt || selectedEmail.createdAt)}
                </DialogDescription>
              </DialogHeader>
              {selectedEmail && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600 mb-1">から</h3>
                    <p className="text-sm">{selectedEmail.from || '未設定'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600 mb-1">宛先</h3>
                    <p className="text-sm">{selectedEmail.to || '未設定'}</p>
                  </div>
                  {selectedEmail.cc && (
                    <div>
                      <h3 className="font-semibold text-sm text-gray-600 mb-1">CC</h3>
                      <p className="text-sm">{selectedEmail.cc}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600 mb-1">件名</h3>
                    <p className="text-sm font-medium">{selectedEmail.subject || '(件名なし)'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600 mb-2">本文</h3>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm whitespace-pre-wrap break-words">
                      {selectedEmail.body || '(本文なし)'}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600 mb-1">ステータス</h3>
                    <Badge className={selectedEmail.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {selectedEmail.status === 'sent' ? '送信済み' : '保留中'}
                    </Badge>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <Mail className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>メール送信履歴がありません</p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
