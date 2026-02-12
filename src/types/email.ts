// メール履歴の型定義

export interface EmailHistory {
  id: string
  type: 'candidate_application' | 'interview_invitation' | 'offer_notification' | 'general'
  
  // 関連情報
  matchId?: string
  candidateId?: string
  jobId?: string
  companyId?: string
  
  // メール情報
  from: string
  to: string
  cc?: string
  bcc?: string
  subject: string
  body: string
  
  // 送信状況
  status: 'sent' | 'failed' | 'bounced'
  resendId?: string // Resendからの返却ID
  error?: string
  
  // メタデータ
  sentBy?: string // 送信者のユーザーID
  sentAt: string | Date
  createdAt: string | Date
}
