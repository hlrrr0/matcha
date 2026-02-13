"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, CheckCircle, Edit, XCircle } from 'lucide-react'
import { Candidate, campusLabels } from '@/types/candidate'
import { User } from '@/types/user'
import { MatchWithDetails } from '@/components/progress/types'
import { campusColors } from '@/components/progress/constants'

interface AcceptedMatchesTableProps {
  matches: MatchWithDetails[]
  candidates: Candidate[]
  users: User[]
  editingDateField: { matchId: string, field: 'startDate' | 'endDate' } | null
  editingDateValue: string
  setEditingDateValue: (value: string) => void
  handleSaveDateEdit: (matchId: string, field: 'startDate' | 'endDate') => void
  handleCancelDateEdit: () => void
  handleStartDateEdit: (matchId: string, field: 'startDate' | 'endDate', currentValue?: string | Date) => void
}

export default function AcceptedMatchesTable({
  matches,
  candidates,
  users,
  editingDateField,
  editingDateValue,
  setEditingDateValue,
  handleSaveDateEdit,
  handleCancelDateEdit,
  handleStartDateEdit
}: AcceptedMatchesTableProps) {
  const acceptedMatches = matches
    .filter(match => match.status === 'offer_accepted')
    .sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0
      return dateB - dateA
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-orange-800">内定承諾者一覧</CardTitle>
        <CardDescription>
          内定を承諾した求職者の店舗名と入社日を管理します
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>求職者名</TableHead>
              <TableHead>店舗名</TableHead>
              <TableHead>企業名</TableHead>
              <TableHead>入社日</TableHead>
              <TableHead>退職日</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead>メモ</TableHead>
              <TableHead>進捗詳細</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {acceptedMatches.map(match => {
              const candidate = candidates.find(c => c.id === match.candidateId)
              const assignedUser = users.find(u => u.id === match.candidateAssignedUserId)

              const isStartDatePassed = match.startDate && new Date(match.startDate) < new Date()
              const hasEndDate = !!match.endDate

              let rowClassName = ''
              if (hasEndDate) {
                rowClassName = 'bg-red-50 hover:bg-red-100'
              } else if (isStartDatePassed) {
                rowClassName = 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }

              return (
                <TableRow key={match.id} className={rowClassName}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/candidates/${match.candidateId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {match.candidateName}
                    </Link>
                    {candidate?.campus && (
                      <Badge
                        variant="outline"
                        className={`ml-2 text-xs ${campusColors[candidate.campus]}`}
                      >
                        {campusLabels[candidate.campus]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {match.storeName ? (
                      <Link
                        href={`/stores/${match.storeId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {match.storeName}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {match.companyName ? (
                      <Link
                        href={`/companies/${match.companyId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {match.companyName}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingDateField?.matchId === match.id && editingDateField?.field === 'startDate' ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="date"
                          value={editingDateValue}
                          onChange={(e) => setEditingDateValue(e.target.value)}
                          className="h-8 w-36"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveDateEdit(match.id, 'startDate')
                            } else if (e.key === 'Escape') {
                              handleCancelDateEdit()
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveDateEdit(match.id, 'startDate')}
                          className="h-8 w-8 p-0"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelDateEdit}
                          className="h-8 w-8 p-0"
                        >
                          <XCircle className="h-4 w-4 text-gray-600" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                        onClick={() => handleStartDateEdit(match.id, 'startDate', match.startDate)}
                      >
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {match.startDate ? (
                          new Date(match.startDate).toLocaleDateString('ja-JP')
                        ) : (
                          <span className="text-gray-400">未設定</span>
                        )}
                        <Edit className="h-3 w-3 text-gray-400 ml-1" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingDateField?.matchId === match.id && editingDateField?.field === 'endDate' ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="date"
                          value={editingDateValue}
                          onChange={(e) => setEditingDateValue(e.target.value)}
                          className="h-8 w-36"
                          autoFocus
                          min={match.startDate ? new Date(match.startDate).toISOString().split('T')[0] : undefined}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveDateEdit(match.id, 'endDate')
                            } else if (e.key === 'Escape') {
                              handleCancelDateEdit()
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveDateEdit(match.id, 'endDate')}
                          className="h-8 w-8 p-0"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelDateEdit}
                          className="h-8 w-8 p-0"
                        >
                          <XCircle className="h-4 w-4 text-gray-600" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                        onClick={() => handleStartDateEdit(match.id, 'endDate', match.endDate)}
                      >
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {match.endDate ? (
                          new Date(match.endDate).toLocaleDateString('ja-JP')
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                        <Edit className="h-3 w-3 text-gray-400 ml-1" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {assignedUser ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={assignedUser.photoURL} />
                          <AvatarFallback className="text-xs">
                            {assignedUser.displayName?.charAt(0) || assignedUser.email?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{assignedUser.displayName || assignedUser.email}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">未割当</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {match.notes || '-'}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/progress/${match.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        詳細
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
            {acceptedMatches.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  内定承諾者はまだいません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
