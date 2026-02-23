"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowDown, ArrowRight, ArrowUp, Briefcase, Building, Copy, Edit, Eye, Plus, RefreshCw, Trash2, TrendingUp, XCircle } from 'lucide-react'
import { Match } from '@/types/matching'
import { MatchWithDetails } from '@/components/candidates/detail/types'

interface CandidateMatchesSectionProps {
  matches: MatchWithDetails[]
  matchesLoading: boolean
  selectedMatchIds: Set<string>
  bulkWithdrawing: boolean
  sortOrder: 'asc' | 'desc'
  onToggleSortOrder: () => void
  onSelectAll: (checked: boolean) => void
  onSelectMatch: (matchId: string, checked: boolean) => void
  onBulkWithdraw: () => void
  onBulkMoveNext: () => void
  onCopySuggestedJobs: () => void
  onCopyPendingProposalJobs: () => void
  onCopyJobInfo: (jobId: string) => void
  onOpenCreateMatch: () => void
  onOpenStatusUpdate: (match: MatchWithDetails) => void
  onOpenDeleteDialog: (match: MatchWithDetails) => void
  getStatusBadge: (status: Match['status'], interviewRound?: number) => React.ReactNode
  formatDate: (date: any) => string
}

export default function CandidateMatchesSection({
  matches,
  matchesLoading,
  selectedMatchIds,
  bulkWithdrawing,
  sortOrder,
  onToggleSortOrder,
  onSelectAll,
  onSelectMatch,
  onBulkWithdraw,
  onBulkMoveNext,
  onCopySuggestedJobs,
  onCopyPendingProposalJobs,
  onCopyJobInfo,
  onOpenCreateMatch,
  onOpenStatusUpdate,
  onOpenDeleteDialog,
  getStatusBadge,
  formatDate
}: CandidateMatchesSectionProps) {
  const suggestedCount = matches.filter(m => m.status === 'suggested').length
  const pendingProposalCount = matches.filter(m => m.status === 'pending_proposal').length
  const selectableCount = matches.filter(m => m.status !== 'withdrawn' && m.status !== 'rejected').length

  return (
    <Card className="border-purple-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-purple-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              マッチング進捗
            </CardTitle>
            <CardDescription>
              この候補者のマッチング状況と進捗
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-purple-600 border-purple-200">
              {matches.length}件
            </Badge>
            {matchesLoading && <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />}
            {pendingProposalCount > 0 && (
              <Button
                onClick={onCopyPendingProposalJobs}
                variant="outline"
                size="sm"
                className="text-amber-600 border-amber-200 hover:bg-amber-50"
              >
                <Copy className="h-4 w-4 mr-2" />
                提案待ちをコピー ({pendingProposalCount})
              </Button>
            )}
            {suggestedCount > 0 && (
              <Button
                onClick={onCopySuggestedJobs}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Copy className="h-4 w-4 mr-2" />
                提案中をコピー ({suggestedCount})
              </Button>
            )}
            {selectedMatchIds.size > 0 && (
              <>
                <Button
                  onClick={onBulkMoveNext}
                  disabled={bulkWithdrawing}
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  {bulkWithdrawing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      選択を次へ ({selectedMatchIds.size})
                    </>
                  )}
                </Button>
                <Button
                  onClick={onBulkWithdraw}
                  disabled={bulkWithdrawing}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  {bulkWithdrawing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      選択を辞退 ({selectedMatchIds.size})
                    </>
                  )}
                </Button>
              </>
            )}
            <Button
              onClick={onOpenCreateMatch}
              variant="outline"
              size="sm"
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              進捗を作成
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {matchesLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600">マッチング情報を読み込み中...</p>
          </div>
        ) : matches.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedMatchIds.size > 0 && selectedMatchIds.size === selectableCount}
                    onCheckedChange={onSelectAll}
                  />
                </TableHead>
                <TableHead className="min-w-[250px]">求人</TableHead>
                <TableHead className="min-w-[250px]">企業/店舗</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 hover:bg-gray-100"
                    onClick={onToggleSortOrder}
                  >
                    ステータス
                    {sortOrder === 'asc' ? (
                      <ArrowUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>面接日時</TableHead>
                <TableHead>備考</TableHead>
                <TableHead>更新日</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match) => {
                let rowBgClass = 'hover:bg-purple-50'
                if (match.status === 'offer_accepted') {
                  rowBgClass = 'bg-red-50 hover:bg-red-100'
                } else if (match.status === 'rejected' || match.status === 'withdrawn') {
                  rowBgClass = 'bg-gray-100 hover:bg-gray-200'
                }

                return (
                  <TableRow key={match.id} className={rowBgClass}>
                    <TableCell>
                      <Checkbox
                        checked={selectedMatchIds.has(match.id)}
                        onCheckedChange={(checked) => onSelectMatch(match.id, checked as boolean)}
                        disabled={match.status === 'withdrawn' || match.status === 'rejected'}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 flex-1">
                          <Briefcase className="h-4 w-4 text-purple-600" />
                          <div>
                            <Link href={`/jobs/${match.jobId}`} className="hover:underline">
                              <div className="font-medium">{match.jobTitle}</div>
                            </Link>
                            {match.employmentType && (
                              <div className="text-xs text-gray-500 mt-1">
                                {match.employmentType}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onCopyJobInfo(match.jobId)
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          title="求人情報をコピー"
                        >
                          <Copy className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/companies/${match.companyId}`}>
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{match.companyName}</span>
                        </div>
                        {match.storeNames && match.storeNames.length > 0 ? (
                          <div className="text-xs text-gray-500 mt-1">
                            {match.storeNames.length <= 3
                              ? match.storeNames.join(', ')
                              : `${match.storeNames.slice(0, 3).join(', ')} +${match.storeNames.length - 3}店舗`
                            }
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(match.status, match.currentInterviewRound)}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        let interviewDate: Date | null = null
                        if (match.timeline && match.timeline.length > 0) {
                          const interviewTimelines = match.timeline
                            .filter((t: { status: string; eventDate?: string | Date; timestamp: string | Date }) => t.status === 'interview' && !!t.eventDate)
                            .sort((a: { timestamp: string | Date }, b: { timestamp: string | Date }) => {
                              const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
                              const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
                              return timeB - timeA
                            })

                          if (interviewTimelines.length > 0) {
                            const eventDateValue = interviewTimelines[0].eventDate
                            try {
                              if (eventDateValue && typeof eventDateValue === 'object' && 'toDate' in eventDateValue) {
                                interviewDate = (eventDateValue as any).toDate()
                              } else if (eventDateValue instanceof Date) {
                                interviewDate = eventDateValue
                              } else if (typeof eventDateValue === 'string' || typeof eventDateValue === 'number') {
                                interviewDate = new Date(eventDateValue)
                              }
                            } catch (e) {
                              console.error('Failed to parse eventDate:', e)
                            }
                          }
                        }

                        if (!interviewDate || isNaN(interviewDate.getTime())) {
                          return <span className="text-gray-400">-</span>
                        }

                        return (
                          <div className="text-sm">
                            <div>{interviewDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</div>
                            <div className="text-xs text-gray-500">
                              {interviewDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        if (!match.timeline || match.timeline.length === 0) {
                          return <span className="text-gray-400 text-sm">-</span>
                        }
                        const sortedTimeline = [...match.timeline].sort((a, b) => {
                          const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
                          const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
                          return timeB - timeA
                        })
                        const latestNotes = sortedTimeline[0]?.notes
                        if (!latestNotes || latestNotes.trim() === '') {
                          return <span className="text-gray-400 text-sm">-</span>
                        }
                        const maxLength = 50
                        const displayNotes = latestNotes.length > maxLength
                          ? latestNotes.substring(0, maxLength) + '...'
                          : latestNotes
                        return (
                          <div className="text-sm text-gray-700 max-w-xs">
                            <div className="whitespace-pre-wrap break-words" title={latestNotes}>
                              {displayNotes}
                            </div>
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDate(match.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        {['offer_accepted', 'withdrawn', 'rejected'].includes(match.status) ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onOpenStatusUpdate(match)}
                              className="text-orange-600 border-orange-200 hover:bg-orange-50"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              編集
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="text-purple-600 border-purple-200 hover:bg-purple-50"
                            >
                              <Link href={`/progress/${match.id}`}>
                                <Eye className="h-3 w-3 mr-1" />
                                詳細
                              </Link>
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onOpenStatusUpdate(match)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              次へ
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="text-purple-600 border-purple-200 hover:bg-purple-50"
                            >
                              <Link href={`/progress/${match.id}`}>
                                <Eye className="h-3 w-3 mr-1" />
                              </Link>
                            </Button>
                            {match.status === 'suggested' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenDeleteDialog(match)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              マッチングがありません
            </h3>
            <p className="text-gray-600 mb-4">
              この候補者にはまだマッチングが作成されていません
            </p>
            <Button asChild className="bg-purple-600 hover:bg-purple-700">
              <Link href="/progress">
                進捗管理でマッチングを作成
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
