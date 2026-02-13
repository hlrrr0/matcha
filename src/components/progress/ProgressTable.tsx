"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowRight, Eye } from 'lucide-react'
import { Candidate } from '@/types/candidate'
import { User } from '@/types/user'
import { Match } from '@/types/matching'
import { MatchWithDetails } from '@/components/progress/types'
import { statusColors, statusIcons, statusLabels, statusFlow } from '@/components/progress/constants'

interface ProgressTableProps {
  filteredMatches: MatchWithDetails[]
  candidates: Candidate[]
  users: User[]
  selectedMatchIds: Set<string>
  toggleSelectAll: () => void
  toggleSelectMatch: (matchId: string) => void
  handleSort: (field: 'candidate' | 'job' | 'company' | 'status' | 'interviewDate' | 'updatedAt') => void
  getSortIcon: (field: 'candidate' | 'job' | 'company' | 'status' | 'interviewDate' | 'updatedAt') => string | null
  calculateAge: (dateOfBirth: Date | string | undefined) => number | null
  setSelectedMatch: (match: MatchWithDetails) => void
  setNewStatus: (status: Match['status']) => void
  setEventDate: (value: string) => void
  setStatusUpdateOpen: (open: boolean) => void
  itemsPerPage: number
  currentPage: number
  totalItems: number
  setCurrentPage: (value: number | ((prev: number) => number)) => void
  setItemsPerPage: (value: number) => void
}

export default function ProgressTable({
  filteredMatches,
  candidates,
  users,
  selectedMatchIds,
  toggleSelectAll,
  toggleSelectMatch,
  handleSort,
  getSortIcon,
  calculateAge,
  setSelectedMatch,
  setNewStatus,
  setEventDate,
  setStatusUpdateOpen,
  itemsPerPage,
  currentPage,
  totalItems,
  setCurrentPage,
  setItemsPerPage
}: ProgressTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-orange-800">マッチング進捗一覧</CardTitle>
        <CardDescription>
          {filteredMatches.length} 件のマッチング
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedMatchIds.size === filteredMatches.length && filteredMatches.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('candidate')}
                >
                  <div className="flex items-center gap-1">
                    求職者 {getSortIcon('candidate')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('job')}
                >
                  <div className="flex items-center gap-1">
                    職種 {getSortIcon('job')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('company')}
                >
                  <div className="flex items-center gap-1">
                    企業 {getSortIcon('company')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    ステータス {getSortIcon('status')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('interviewDate')}
                >
                  <div className="flex items-center gap-1">
                    面接日時 {getSortIcon('interviewDate')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('updatedAt')}
                >
                  <div className="flex items-center gap-1">
                    更新日 {getSortIcon('updatedAt')}
                  </div>
                </TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    マッチングデータがありません
                  </TableCell>
                </TableRow>
              ) : (
                filteredMatches.map((match) => {
                  const candidate = candidates.find(c => c.id === match.candidateId)
                  const age = candidate?.dateOfBirth ? calculateAge(candidate.dateOfBirth) : null

                  let isInterviewOverdue = false
                  if (match.status === 'interview' && match.timeline && match.timeline.length > 0) {
                    const interviewTimelines = match.timeline
                      .filter(t => t.status === 'interview' && t.eventDate)
                      .sort((a, b) => {
                        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
                        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
                        return timeB - timeA
                      })

                    if (interviewTimelines.length > 0) {
                      const eventDateValue = interviewTimelines[0].eventDate
                      let interviewDate: Date | null = null

                      try {
                        if (eventDateValue && typeof eventDateValue === 'object' && 'toDate' in eventDateValue) {
                          interviewDate = (eventDateValue as any).toDate()
                        } else if (eventDateValue instanceof Date) {
                          interviewDate = eventDateValue
                        } else if (typeof eventDateValue === 'string' || typeof eventDateValue === 'number') {
                          interviewDate = new Date(eventDateValue)
                        }

                        if (interviewDate && !isNaN(interviewDate.getTime())) {
                          const now = new Date()
                          isInterviewOverdue = interviewDate < now
                        }
                      } catch (e) {
                        console.error('面接日時の変換エラー:', e)
                      }
                    }
                  }

                  let rowBgClass = ''
                  if (isInterviewOverdue) {
                    rowBgClass = 'bg-red-100 hover:bg-red-200'
                  } else if (match.status === 'offer_accepted') {
                    rowBgClass = 'bg-blue-50 hover:bg-blue-100'
                  } else if (match.status === 'rejected' || match.status === 'withdrawn') {
                    rowBgClass = 'bg-gray-100 hover:bg-gray-200'
                  }

                  const StatusIcon = statusIcons[match.status]

                  return (
                    <TableRow key={match.id} className={rowBgClass}>
                      <TableCell>
                        <Checkbox
                          checked={selectedMatchIds.has(match.id)}
                          onCheckedChange={() => toggleSelectMatch(match.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-start gap-2">
                          {match.candidateAssignedUserId ? (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={users.find(u => u.id === match.candidateAssignedUserId)?.photoURL} />
                              <AvatarFallback className="text-xs bg-green-100">
                                {users.find(u => u.id === match.candidateAssignedUserId)?.displayName?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                          ) : null}
                          <div>
                            <div>
                              <Link
                                href={`/candidates/${match.candidateId}`}
                                className="hover:underline text-blue-600 hover:text-blue-800"
                              >
                                {match.candidateName}
                              </Link>
                              {age !== null && (
                                <>
                                  （{age}歳）
                                </>
                              )}
                            </div>
                            {candidate?.assignedUserId && (
                              <div className="text-xs text-gray-500 mt-1">
                                担当者：{users.find(u => u.id === candidate.assignedUserId)?.displayName || '担当者不明'}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Link
                            href={`/jobs/${match.jobId}`}
                            className="hover:underline text-blue-600 hover:text-blue-800"
                          >
                            {match.jobTitle}
                          </Link>
                          {match.jobEmploymentType && (
                            <div className="text-xs text-gray-500 mt-1">
                              {match.jobEmploymentType}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          {match.companyAssignedUserId ? (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={users.find(u => u.id === match.companyAssignedUserId)?.photoURL} />
                              <AvatarFallback className="text-xs bg-blue-100">
                                {users.find(u => u.id === match.companyAssignedUserId)?.displayName?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                          ) : null}
                          <div>
                            <Link
                              href={`/companies/${match.companyId}`}
                              className="hover:underline text-blue-600 hover:text-blue-800"
                            >
                              {match.companyName}
                            </Link><br />
                            {match.storeId ? (
                              <Link
                                href={`/stores/${match.storeId}`}
                                className="hover:underline text-blue-600 hover:text-blue-800 text-xs text-gray-500 mt-1"
                              >
                                {match.storeName}
                              </Link>
                            ) : (
                              <span className="text-xs text-gray-500 mt-1">{match.storeName}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[match.status]} border-0`}>
                          <div className="flex items-center gap-1">
                            <StatusIcon className="h-4 w-4" />
                            {statusLabels[match.status]}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          let interviewDate: Date | null = null

                          if (match.timeline && match.timeline.length > 0) {
                            const interviewTimelines = match.timeline
                              .filter(t => t.status === 'interview' && t.eventDate)
                              .sort((a, b) => {
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
                                console.error('面接日時の変換エラー:', e)
                              }
                            }
                          }

                          if (!interviewDate || isNaN(interviewDate.getTime())) {
                            return <span className="text-gray-400">-</span>
                          }

                          const hasTime = interviewDate.getHours() !== 0 || interviewDate.getMinutes() !== 0

                          return (
                            <div className="text-sm">
                              <div>{interviewDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</div>
                              {hasTime ? (
                                <div className="text-xs text-gray-500">
                                  {interviewDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              ) : (
                                <div className="text-xs text-orange-500">
                                  時刻未定
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        {match.updatedAt && typeof match.updatedAt === 'object' && match.updatedAt instanceof Date
                          ? match.updatedAt.toLocaleDateString()
                          : match.updatedAt && typeof match.updatedAt === 'string'
                            ? new Date(match.updatedAt).toLocaleDateString()
                            : '不明'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0"
                            title="詳細を見る"
                          >
                            <Link href={`/progress/${match.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {statusFlow[match.status].length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMatch(match)
                                const nextStatuses = statusFlow[match.status]
                                if (nextStatuses.length > 0) {
                                  setNewStatus(nextStatuses[0])
                                  setEventDate('')
                                }
                                setStatusUpdateOpen(true)
                              }}
                              className="h-8 px-2"
                            >
                              <ArrowRight className="h-4 w-4 mr-1" />
                              <span className="text-xs">次へ</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totalItems > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-white">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                {totalItems}件中 {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}-{Math.min(currentPage * itemsPerPage, totalItems)}件を表示
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value={20}>20件</option>
                <option value={50}>50件</option>
                <option value={100}>100件</option>
                <option value={200}>200件</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                最初
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                前へ
              </Button>
              <span className="text-sm px-4">
                {currentPage} / {Math.ceil(totalItems / itemsPerPage)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalItems / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
              >
                次へ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.ceil(totalItems / itemsPerPage))}
                disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
              >
                最後
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
