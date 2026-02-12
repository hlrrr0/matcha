"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Match } from '@/types/matching'
import { sendCandidateApplicationEmail } from '@/lib/email'
import { generateIntroductionText } from '@/lib/introduction-text'
import { generateCandidateApplicationEmailBody, generateCandidateApplicationEmailSubject } from '@/lib/email-templates'
import { useAuth } from '@/contexts/AuthContext'
import { EmailPreviewDialog } from '@/components/email/EmailPreviewDialog'
import { toast } from 'sonner'
import { 
  Target,
  Send,
  Eye,
  CheckCircle,
  MessageSquare,
  Star,
  XCircle,
  AlertCircle,
  Mail,
  Copy,
  FolderPlus,
  Trash2
} from 'lucide-react'
import { createGoogleDriveFolder, generateCandidateFolderName } from '@/lib/google-drive'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const statusLabels: Record<Match['status'], string> = {
  pending_proposal: '提案待ち',
  suggested: '提案済み',
  applied: '応募済み',
  document_screening: '書類選考中',
  document_passed: '書類選考通過',
  interview: '面接',
  interview_passed: '面接通過',
  offer: '内定',
  offer_accepted: '内定承諾',
  rejected: '不合格',
  withdrawn: '辞退'
}

const statusColors: Record<Match['status'], string> = {
  pending_proposal: 'bg-slate-100 text-slate-800',
  suggested: 'bg-blue-100 text-blue-800',
  applied: 'bg-purple-100 text-purple-800',
  document_screening: 'bg-yellow-100 text-yellow-800',
  document_passed: 'bg-cyan-100 text-cyan-800',
  interview: 'bg-orange-100 text-orange-800',
  interview_passed: 'bg-teal-100 text-teal-800',
  offer: 'bg-green-100 text-green-800',
  offer_accepted: 'bg-green-600 text-white',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800'
}

const statusIcons: Record<Match['status'], React.ComponentType<{ className?: string }>> = {
  pending_proposal: Target,
  suggested: Target,
  applied: Send,
  document_screening: Eye,
  document_passed: CheckCircle,
  interview: MessageSquare,
  interview_passed: CheckCircle,
  offer: Star,
  offer_accepted: CheckCircle,
  rejected: XCircle,
  withdrawn: AlertCircle
}

const statusFlow: Record<Match['status'], Match['status'][]> = {
  pending_proposal: ['suggested', 'rejected', 'withdrawn'],
  suggested: ['applied', 'offer', 'rejected', 'withdrawn'],
  applied: ['document_screening', 'offer', 'rejected', 'withdrawn'],
  document_screening: ['document_passed', 'offer', 'rejected', 'withdrawn'],
  document_passed: ['interview', 'offer', 'rejected', 'withdrawn'],
  interview: ['interview_passed', 'offer', 'rejected', 'withdrawn'],
  interview_passed: ['interview', 'offer', 'rejected', 'withdrawn'],
  offer: ['offer_accepted', 'rejected', 'withdrawn'],
  offer_accepted: [],
  rejected: [],
  withdrawn: []
}

interface StatusUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  match: Match | null
  candidateName?: string
  onUpdate: (status: Match['status'], notes: string, eventDateTime?: Date, startDate?: Date, endDate?: Date) => Promise<void>
  onDelete?: () => Promise<void>  // 進捗削除用のコールバック
  isEditMode?: boolean
  // メール送信用の情報
  candidate?: {
    id: string
    firstName: string
    lastName: string
    phone?: string
    email?: string
    resume?: string
    dateOfBirth?: string
    resumeUrl?: string
    enrollmentDate?: string
    campus?: 'tokyo' | 'osaka' | 'awaji' | 'fukuoka' | 'taiwan' | ''
  }
  job?: {
    title: string
  }
  company?: {
    name: string
    email: string
    consultantId?: string
  }
  userName?: string  // ログインユーザーの名前
}

export function StatusUpdateDialog({
  open,
  onOpenChange,
  match,
  candidateName,
  onUpdate,
  onDelete,
  isEditMode = false,
  candidate,
  job,
  company,
  userName
}: StatusUpdateDialogProps) {
  const { user } = useAuth()
  const [newStatus, setNewStatus] = useState<Match['status']>('suggested')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [startDate, setStartDate] = useState('') // 入社日
  const [endDate, setEndDate] = useState('') // 退職日
  const [statusNotes, setStatusNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // メールプレビュー用の状態
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [emailPreviewData, setEmailPreviewData] = useState<{
    to: string
    cc?: string
    bcc: string
    subject: string
    body: string
  } | null>(null)
  const [consultantEmail, setConsultantEmail] = useState<string | null>(null)

  // 企業担当者のメールアドレスを取得
  useEffect(() => {
    const fetchConsultantEmail = async () => {
      if (!company?.consultantId) {
        setConsultantEmail(null)
        return
      }

      try {
        const { doc, getDoc } = await import('firebase/firestore')
        const { db } = await import('@/lib/firebase')
        const userDoc = await getDoc(doc(db, 'users', company.consultantId))
        
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setConsultantEmail(userData?.email || null)
        }
      } catch (error) {
        console.error('担当者情報の取得に失敗:', error)
        setConsultantEmail(null)
      }
    }

    fetchConsultantEmail()
  }, [company?.consultantId])

  // 最新のタイムラインアイテムかチェック
  const isLatestTimeline = (): boolean => {
    if (!match?.timeline || match.timeline.length === 0) return false
    
    const sortedTimeline = [...match.timeline].sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
      return timeA - timeB
    })
    
    return sortedTimeline.length > 0
  }

  const handleDelete = async () => {
    if (!onDelete || !match) return

    if (!confirm('この進捗を削除しますか？\nステータスが前の状態に戻ります。')) {
      return
    }

    try {
      setDeleting(true)
      await onDelete()
      toast.success('進捗を削除しました')
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error deleting progress:', error)
      toast.error(error.message || '進捗の削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (!match) return

    const isEndStatus = ['offer_accepted', 'withdrawn', 'rejected'].includes(match.status)
    
    if (isEndStatus || isEditMode) {
      // 編集モード:既存のデータを読み込む
      setNewStatus(match.status)
      
      let initialDate = ''
      let initialTime = ''
      
      // 面接ステータスの場合、timeline から eventDate を取得
      if (match.status === 'interview' && match.timeline) {
        const interviewTimeline = match.timeline
          .filter(item => item.status === 'interview')
          .sort((a, b) => {
            const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
            const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
            return timeB - timeA
          })[0]
        
        if (interviewTimeline?.eventDate) {
          try {
            // Firestore Timestamp の場合は toDate() を使用
            const eventDateValue: any = interviewTimeline.eventDate
            const date = eventDateValue?.toDate ? eventDateValue.toDate() : new Date(eventDateValue)
            if (!isNaN(date.getTime())) {
              initialDate = date.toISOString().split('T')[0]
              initialTime = date.toTimeString().slice(0, 5)
            }
          } catch (error) {
            console.error('面接日時の変換エラー:', error)
          }
        }
      } else if (match.status === 'offer_accepted') {
        // 内定承諾の場合、timeline から eventDate を取得
        const offerAcceptedTimeline = match.timeline
          ?.filter(item => item.status === 'offer_accepted')
          .sort((a, b) => {
            const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
            const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
            return timeB - timeA
          })[0]
        
        if (offerAcceptedTimeline?.eventDate) {
          try {
            const eventDateValue: any = offerAcceptedTimeline.eventDate
            const date = eventDateValue?.toDate ? eventDateValue.toDate() : new Date(eventDateValue)
            if (!isNaN(date.getTime())) {
              initialDate = date.toISOString().split('T')[0]
              initialTime = date.toTimeString().slice(0, 5)
            }
          } catch (error) {
            console.error('内定承諾日時の変換エラー:', error)
          }
        }
      }
      
      setEventDate(initialDate)
      setEventTime(initialTime)
      
      // 入社日の初期化
      if (match.startDate) {
        const startDateObj = new Date(match.startDate)
        setStartDate(startDateObj.toISOString().split('T')[0])
      } else {
        setStartDate('')
      }
      
      // 退職日の初期化
      if (match.endDate) {
        const endDateObj = new Date(match.endDate)
        setEndDate(endDateObj.toISOString().split('T')[0])
      } else {
        setEndDate('')
      }
      
      // 最新のタイムラインからノートを読み込む
      if (match.timeline && match.timeline.length > 0) {
        const sortedTimeline = [...match.timeline].sort((a, b) => {
          const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
          const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
          return timeB - timeA
        })
        setStatusNotes(sortedTimeline[0].notes || '')
      } else {
        setStatusNotes('')
      }
    } else {
      // 通常の「次へ」モード
      const nextStatuses = statusFlow[match.status]
      if (nextStatuses.length > 0) {
        setNewStatus(nextStatuses[0])
        
        let initialDate = ''
        let initialTime = ''
        
        // 面接の場合、timeline から最新の面接日時を取得（2回目以降の面接用）
        if (nextStatuses[0] === 'interview' && match.timeline) {
          const interviewTimeline = match.timeline
            .filter(item => item.status === 'interview' && item.eventDate)
            .sort((a, b) => {
              const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
              const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
              return timeB - timeA
            })[0]
          
          if (interviewTimeline?.eventDate) {
            try {
              // Firestore Timestamp の場合は toDate() を使用
              const eventDateValue: any = interviewTimeline.eventDate
              const date = eventDateValue?.toDate ? eventDateValue.toDate() : new Date(eventDateValue)
              if (!isNaN(date.getTime())) {
                initialDate = date.toISOString().split('T')[0]
                initialTime = date.toTimeString().slice(0, 5)
              }
            } catch (error) {
              console.error('面接日時の変換エラー:', error)
            }
          }
        }
        // 面接通過の場合は日時入力不要
        
        setEventDate(initialDate)
        setEventTime(initialTime)
      } else {
        setNewStatus(match.status)
        setEventDate('')
        setEventTime('')
      }
      setStatusNotes('')
      
      // 入社日の初期化（新規モード）
      if (match.startDate) {
        const startDateObj = new Date(match.startDate)
        setStartDate(startDateObj.toISOString().split('T')[0])
      } else {
        setStartDate('')
      }
    }
  }, [match, isEditMode])

  const handleSubmit = async () => {
    if (!match) return

    setSubmitting(true)
    try {
      let combinedDateTime: Date | undefined = undefined
      
      // 面接通過ステータスの場合は日時を渡さない
      if (newStatus === 'interview_passed') {
        combinedDateTime = undefined
      } else if (eventDate) {
        if (eventTime) {
          combinedDateTime = new Date(`${eventDate}T${eventTime}`)
        } else {
          combinedDateTime = new Date(eventDate)
        }
      }

      // 入社日の処理
      let startDateObj: Date | undefined = undefined
      if (startDate) {
        startDateObj = new Date(startDate)
      }

      // 退職日の処理
      let endDateObj: Date | undefined = undefined
      if (endDate) {
        endDateObj = new Date(endDate)
      }

      // ステータス更新
      await onUpdate(newStatus, statusNotes, combinedDateTime, startDateObj, endDateObj)
      
      toast.success('ステータスを更新しました')
      onOpenChange(false)
      setEventDate('')
      setEventTime('')
      setStartDate('')
      setEndDate('')
      setStatusNotes('')
    } catch (error) {
      console.error('Status update error:', error)
      toast.error('ステータスの更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  // Google Driveフォルダー作成ハンドラー
  const handleCreateFolder = async () => {
    if (!candidate) {
      toast.error('候補者情報が見つかりません')
      return
    }

    if (!candidate.enrollmentDate || !candidate.campus || !candidate.lastName || !candidate.firstName) {
      toast.error('フォルダー作成に必要な情報が不足しています（入社年月、入学校舎、姓、名）')
      return
    }

    setCreatingFolder(true)
    try {
      // フォルダー名を生成
      const folderName = generateCandidateFolderName(
        candidate.enrollmentDate,
        candidate.campus,
        candidate.lastName,
        candidate.firstName
      )

      // Google Driveにフォルダーを作成
      const folderUrl = await createGoogleDriveFolder(folderName)
      
      if (!folderUrl) {
        throw new Error('フォルダーの作成に失敗しました')
      }

      // Firestoreの候補者データを更新
      const candidateRef = doc(db, 'candidates', candidate.id)
      await updateDoc(candidateRef, {
        resumeUrl: folderUrl,
        updatedAt: new Date()
      })

      toast.success('フォルダーを作成しました', {
        action: {
          label: '開く',
          onClick: () => window.open(folderUrl, '_blank')
        }
      })

      // ローカルの candidate オブジェクトも更新（再読み込み促進）
      if (candidate) {
        candidate.resumeUrl = folderUrl
      }

    } catch (error) {
      console.error('フォルダー作成エラー:', error)
      toast.error('フォルダーの作成に失敗しました')
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleCopyIntroduction = () => {
    if (!candidate || !company) {
      toast.error('候補者または企業情報が不足しています')
      return
    }

    const introText = generateIntroductionText({
      companyName: company.name,
      candidateName: `${candidate.lastName} ${candidate.firstName}`,
      candidateDateOfBirth: candidate.dateOfBirth,
      resumeUrl: candidate.resumeUrl,
      teacherComment: candidate.resume,
      userName: userName
    })

    navigator.clipboard.writeText(introText).then(() => {
      toast.success('紹介文をコピーしました')
    }).catch(() => {
      toast.error('コピーに失敗しました')
    })
  }

  const handleSendEmail = async () => {
    if (!candidate || !job) {
      toast.error('候補者または求人情報が不足しています')
      return
    }

    if (!company?.email) {
      toast.error('企業のメールアドレスが設定されていません。企業マスタでメールアドレスを設定してください。')
      return
    }

    // メール内容を構築
    const introText = generateIntroductionText({
      companyName: company.name,
      candidateName: `${candidate.lastName} ${candidate.firstName}`,
      candidateDateOfBirth: candidate.dateOfBirth,
      resumeUrl: candidate.resumeUrl,
      teacherComment: candidate.resume,
      userName: userName
    })

    const candidateName = `${candidate.lastName} ${candidate.firstName}`
    const emailBody = generateCandidateApplicationEmailBody({
      companyName: company.name,
      jobTitle: job.title,
      candidateName: candidateName,
      candidatePhone: candidate.phone,
      candidateEmail: candidate.email,
      candidateResume: introText,
      notes: statusNotes
    })

    const emailSubject = generateCandidateApplicationEmailSubject({
      candidateName: candidateName,
      jobTitle: job.title
    })

    // メールプレビューを表示
    setEmailPreviewData({
      to: company.email,
      cc: consultantEmail || undefined,  // 担当者のメールアドレスをCCに追加
      bcc: 'sales+matcha@super-shift.co.jp',
      subject: emailSubject,
      body: emailBody
    })
    setShowEmailPreview(true)
  }

  // メールプレビューから実際に送信
  const handleConfirmSendEmail = async () => {
    if (!candidate || !job || !company || !emailPreviewData) return

    setSendingEmail(true)
    try {
      const introText = generateIntroductionText({
        companyName: company.name,
        candidateName: `${candidate.lastName} ${candidate.firstName}`,
        candidateDateOfBirth: candidate.dateOfBirth,
        resumeUrl: candidate.resumeUrl,
        teacherComment: candidate.resume,
        userName: userName
      })

      const emailResult = await sendCandidateApplicationEmail({
        companyEmail: company.email,
        companyName: company.name,
        candidateName: `${candidate.lastName} ${candidate.firstName}`,
        candidatePhone: candidate.phone,
        candidateEmail: candidate.email,
        candidateResume: introText,
        jobTitle: job.title,
        notes: statusNotes,
        matchId: match.id,
        candidateId: candidate.id,
        jobId: match.jobId,
        companyId: match.companyId,
        sentBy: user?.uid,
        cc: consultantEmail || undefined  // 担当者のメールアドレスをCCに追加
      })

      if (emailResult.success) {
        toast.success('企業へ応募情報をメール送信しました')
        setShowEmailPreview(false)
        setEmailPreviewData(null)
      } else {
        toast.error(`メール送信に失敗しました: ${emailResult.error}`)
      }
    } catch (error) {
      console.error('Email sending error:', error)
      toast.error('メール送信に失敗しました')
    } finally {
      setSendingEmail(false)
    }
  }

  if (!match) return null

  const availableStatuses = statusFlow[match.status]
  const Icon = statusIcons[match.status]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? '進捗を編集' : '次の進捗へ'}
          </DialogTitle>
          <DialogDescription>
            {candidateName || '次のステータスに進めます'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 現在のステータス */}
          <div>
            <Label className="text-sm text-gray-500">現在のステータス</Label>
            <div className="mt-2">
              <Badge className={`${statusColors[match.status]} text-sm px-3 py-1.5`}>
                <Icon className="h-4 w-4 mr-2" />
                {statusLabels[match.status]}
              </Badge>
            </div>
          </div>

          {/* Google Driveフォルダー作成（履歴書URLが無い場合） */}
          {!candidate?.resumeUrl && candidate && (
            <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Label className="text-sm font-semibold text-orange-900">履歴書フォルダー</Label>
                  <p className="text-xs text-orange-700 mt-1">
                    Google Driveに候補者用のフォルダーを作成します
                  </p>
                  {(!candidate.enrollmentDate || !candidate.campus || !candidate.lastName || !candidate.firstName) && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠ フォルダー作成には、入社年月・入学校舎・姓・名が必要です
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="ml-4 bg-white hover:bg-orange-100 border-orange-300"
                  onClick={handleCreateFolder}
                  disabled={creatingFolder || !candidate.enrollmentDate || !candidate.campus || !candidate.lastName || !candidate.firstName}
                >
                  <FolderPlus className="h-4 w-4 mr-1.5" />
                  {creatingFolder ? '作成中...' : 'フォルダーを作成'}
                </Button>
              </div>
            </div>
          )}

          {/* 次のステータスを選択 */}
          {availableStatuses.length > 0 && (
            <div>
              <Label>次のステータスを選択</Label>
              <div className="mt-2 space-y-2">
                {availableStatuses.map((status) => {
                  const StatusIcon = statusIcons[status]
                  return (
                    <Button
                      key={status}
                      type="button"
                      variant={newStatus === status ? "default" : "outline"}
                      className={`w-full justify-start ${
                        newStatus === status 
                          ? 'bg-orange-600 hover:bg-orange-700' 
                          : ''
                      }`}
                      onClick={() => setNewStatus(status)}
                    >
                      <StatusIcon className="h-4 w-4 mr-2" />
                      {statusLabels[status]}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 日時入力（面接のみ） */}
          {newStatus === 'interview' && 
           (!isEditMode || newStatus !== match.status) && (
            <div>
              <Label>面接日時</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  placeholder="年/月/日"
                />
                <Input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  placeholder="--:--"
                />
              </div>
            </div>
          )}

          {/* 入社日入力（内定承諾のみ） */}
          {newStatus === 'offer_accepted' && (
            <div>
              <Label>入社予定日</Label>
              <div className="mt-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="年/月/日"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ※入社予定日は後から変更できます
              </p>
            </div>
          )}

          {/* 退職日入力（内定承諾のみ） */}
          {newStatus === 'offer_accepted' && (
            <div>
              <Label>退職日</Label>
              <div className="mt-2">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="年/月/日"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ※退職日は後から変更できます（任意）
              </p>
            </div>
          )}

          {/* 備考 */}
          <div>
            <Label>備考</Label>
            <Textarea
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="詳細なメモがあれば記入してください"
              rows={4}
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting || sendingEmail || deleting}
            className="order-1 sm:order-none sm:mr-auto"
          >
            キャンセル
          </Button>
          
          {/* 削除ボタン（編集モード、削除ハンドラーがあり、最新の進捗のみ） */}
          {isEditMode && onDelete && isLatestTimeline() && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting || sendingEmail || deleting}
              className="order-2 sm:order-none sm:mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? '削除中...' : 'この進捗を削除'}
            </Button>
          )}
          
          {/* 「応募済み」→「書類選考中」の場合のみ、紹介文コピーとメール送信ボタンを表示 */}
          {match?.status === 'applied' && 
           newStatus === 'document_screening' && 
           candidate && 
           job && 
           company && (
            <>
              <Button
                variant="outline"
                onClick={handleCopyIntroduction}
                disabled={submitting || sendingEmail || deleting}
                className="order-3 sm:order-none !border-green-600 !text-green-600 hover:!bg-green-50"
              >
                <Copy className="h-4 w-4 mr-2" />
                紹介文をコピー
              </Button>
              <Button
                variant="outline"
                onClick={handleSendEmail}
                disabled={submitting || sendingEmail || deleting || !company.email}
                className={`order-4 sm:order-none ${company.email 
                  ? "!border-blue-600 !text-blue-600 hover:!bg-blue-50" 
                  : "!border-gray-300 !text-gray-400 cursor-not-allowed"
                }`}
                title={!company.email ? '企業のメールアドレスが設定されていません' : ''}
              >
                <Mail className="h-4 w-4 mr-2" />
                企業へメールを送る
              </Button>
            </>
          )}
          
          <Button
            onClick={handleSubmit}
            disabled={submitting || sendingEmail || deleting}
            className="order-5 sm:order-none bg-orange-600 hover:bg-orange-700 text-white"
          >
            {submitting ? '更新中...' : '更新'}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* メールプレビューダイアログ */}
      {emailPreviewData && (
        <EmailPreviewDialog
          open={showEmailPreview}
          onOpenChange={setShowEmailPreview}
          emailData={emailPreviewData}
          onConfirm={handleConfirmSendEmail}
          isSending={sendingEmail}
        />
      )}
    </Dialog>
  )
}
