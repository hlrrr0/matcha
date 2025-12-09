"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Match } from '@/types/matching'
import {
  Target,
  Send,
  Eye,
  CheckCircle,
  MessageSquare,
  Star,
  XCircle,
  AlertCircle
} from 'lucide-react'

const statusLabels: Record<Match['status'], string> = {
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

interface MatchStatusUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  match: Match | null
  onUpdate: (status: Match['status'], notes: string, eventDateTime?: Date) => Promise<void>
  candidateName?: string
  title?: string
  description?: string
}

export default function MatchStatusUpdateDialog({
  open,
  onOpenChange,
  match,
  onUpdate,
  candidateName,
  title = '次の進捗へ',
  description
}: MatchStatusUpdateDialogProps) {
  const [newStatus, setNewStatus] = useState<Match['status']>('suggested')
  const [statusNotes, setStatusNotes] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (match && open) {
      const isEndStatus = ['offer_accepted', 'withdrawn', 'rejected'].includes(match.status)
      
      if (isEndStatus) {
        // 編集モード
        setNewStatus(match.status)
        
        let initialDate = ''
        let initialTime = ''
        
        if (match.status === 'offer_accepted' && match.acceptedDate) {
          const date = new Date(match.acceptedDate)
          initialDate = date.toISOString().split('T')[0]
          initialTime = date.toTimeString().slice(0, 5)
        }
        
        setEventDate(initialDate)
        setEventTime(initialTime)
        
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
          
          if (nextStatuses[0] === 'interview' && match.interviewDate) {
            const date = new Date(match.interviewDate)
            initialDate = date.toISOString().split('T')[0]
            initialTime = date.toTimeString().slice(0, 5)
          } else if (nextStatuses[0] === 'offer_accepted' && match.acceptedDate) {
            const date = new Date(match.acceptedDate)
            initialDate = date.toISOString().split('T')[0]
            initialTime = date.toTimeString().slice(0, 5)
          }
          
          setEventDate(initialDate)
          setEventTime(initialTime)
        } else {
          setNewStatus(match.status)
          setEventDate('')
          setEventTime('')
        }
        setStatusNotes('')
      }
    }
  }, [match, open])

  const handleSubmit = async () => {
    if (!match) return

    setLoading(true)
    try {
      let combinedDateTime: Date | undefined = undefined
      if (eventDate) {
        if (eventTime) {
          combinedDateTime = new Date(`${eventDate}T${eventTime}`)
        } else {
          combinedDateTime = new Date(eventDate)
        }
      }

      await onUpdate(newStatus, statusNotes, combinedDateTime)
      
      onOpenChange(false)
      setEventDate('')
      setEventTime('')
      setStatusNotes('')
    } catch (error) {
      console.error('Status update error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: Match['status']) => {
    const Icon = statusIcons[status]
    return (
      <Badge className={`${statusColors[status]} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {statusLabels[status]}
      </Badge>
    )
  }

  const getStatusLabel = (status: Match['status'], interviewRound?: number): string => {
    if (status === 'interview' && interviewRound) {
      return `${interviewRound}次面接`
    }
    if (status === 'interview_passed' && interviewRound) {
      return `${interviewRound}次面接合格（${interviewRound + 1}次面接設定中）`
    }
    return statusLabels[status]
  }

  if (!match) return null

  const nextStatuses = statusFlow[match.status] || []
  const isEndStatus = ['offer_accepted', 'withdrawn', 'rejected'].includes(match.status)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEndStatus ? 'ステータスを編集' : title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
          {candidateName && !description && (
            <DialogDescription>
              {candidateName}さんの進捗を更新します
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* 現在のステータス */}
          <div>
            <Label className="text-sm text-gray-500">現在のステータス</Label>
            <div className="mt-2">
              {getStatusBadge(match.status)}
            </div>
          </div>

          {/* 次のステータスを選択 */}
          {nextStatuses.length > 0 && (
            <div>
              <Label>次のステータスを選択</Label>
              <div className="mt-2 space-y-2">
                {nextStatuses
                  .filter(s => !['offer', 'rejected', 'withdrawn'].includes(s))
                  .map((status) => {
                    const Icon = statusIcons[status]
                    return (
                      <Button
                        key={status}
                        type="button"
                        variant={newStatus === status ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => {
                          setNewStatus(status)
                          // ステータス変更時に適切なイベント日時を読み込む
                          let initialDate = ''
                          let initialTime = ''
                          
                          if (status === 'interview' && match.interviewDate) {
                            const date = new Date(match.interviewDate)
                            initialDate = date.toISOString().split('T')[0]
                            initialTime = date.toTimeString().slice(0, 5)
                          } else if (status === 'offer_accepted' && match.acceptedDate) {
                            const date = new Date(match.acceptedDate)
                            initialDate = date.toISOString().split('T')[0]
                            initialTime = date.toTimeString().slice(0, 5)
                          }
                          
                          setEventDate(initialDate)
                          setEventTime(initialTime)
                        }}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {getStatusLabel(status, match.currentInterviewRound)}
                      </Button>
                    )
                  })}
                
                {/* 終了ステータス（横並び） */}
                {nextStatuses.some(s => ['offer', 'rejected', 'withdrawn'].includes(s)) && (
                  <div className="grid grid-cols-3 gap-2">
                    {nextStatuses
                      .filter(s => ['offer', 'rejected', 'withdrawn'].includes(s))
                      .map((status) => {
                        const Icon = statusIcons[status]
                        return (
                          <Button
                            key={status}
                            type="button"
                            variant={newStatus === status ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setNewStatus(status)
                              setEventDate('')
                              setEventTime('')
                            }}
                          >
                            <Icon className="h-4 w-4 mr-1" />
                            {statusLabels[status]}
                          </Button>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 日時入力（面接と内定承諾のみ） */}
          {['interview', 'offer_accepted'].includes(newStatus) && 
           (!isEndStatus || newStatus !== match.status) && (
            <div className="space-y-2">
              <Label>
                {newStatus === 'interview' && '面接日時'}
                {newStatus === 'offer_accepted' && '内定承諾日'}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  placeholder="年 /月/日"
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '更新中...' : '更新'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
