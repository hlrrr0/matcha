"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Search } from 'lucide-react'
import { Candidate, campusLabels } from '@/types/candidate'
import { campusColors } from '@/components/progress/constants'

interface CandidateSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidateSearchTerm: string
  setCandidateSearchTerm: (value: string) => void
  getFilteredCandidates: () => Candidate[]
  newMatchData: {
    candidateId: string
  }
  handleCandidateSelect: (candidateId: string) => void
  calculateAge: (dateOfBirth: Date | string | undefined) => number | null
}

export default function CandidateSelectDialog({
  open,
  onOpenChange,
  candidateSearchTerm,
  setCandidateSearchTerm,
  getFilteredCandidates,
  newMatchData,
  handleCandidateSelect,
  calculateAge
}: CandidateSelectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>求職者を選択</DialogTitle>
          <DialogDescription>
            マッチングを作成する求職者を選択してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div>
            <Label htmlFor="candidate-dialog-search">検索</Label>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                id="candidate-dialog-search"
                placeholder="氏名、カナ、メールアドレスで検索..."
                value={candidateSearchTerm}
                onChange={(e) => setCandidateSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto border rounded-lg">
            <div className="space-y-2 p-4">
              {getFilteredCandidates().map((candidate) => {
                const isSelected = newMatchData.candidateId === candidate.id
                const age = calculateAge(candidate.dateOfBirth)

                return (
                  <div
                    key={candidate.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                    }`}
                    onClick={() => handleCandidateSelect(candidate.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-lg">
                            {candidate.lastName} {candidate.firstName}
                          </h4>
                          {age !== null && (
                            <span className="text-sm text-gray-600">
                              （{age}歳）
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mt-1">
                          {candidate.lastNameKana} {candidate.firstNameKana}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          {candidate.enrollmentDate && (
                            <span className="text-xs text-gray-600">
                              📅 入学: {new Date(candidate.enrollmentDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
                            </span>
                          )}
                          {candidate.campus && (
                            <Badge className={`${campusColors[candidate.campus]} border text-xs font-medium`}>
                              {campusLabels[candidate.campus]}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-orange-500 mt-1" />
                      )}
                    </div>
                  </div>
                )
              })}

              {getFilteredCandidates().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {candidateSearchTerm ? '検索条件に一致する求職者が見つかりません' : '求職者がいません'}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setCandidateSearchTerm('')
            }}
          >
            キャンセル
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false)
              setCandidateSearchTerm('')
            }}
            disabled={!newMatchData.candidateId}
            className="bg-orange-600 hover:bg-orange-700"
          >
            選択
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
