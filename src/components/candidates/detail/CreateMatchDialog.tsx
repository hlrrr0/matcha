"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Briefcase, Trash2 } from 'lucide-react'
import { Company } from '@/types/company'
import { Job } from '@/types/job'
import { Store } from '@/types/store'
import { Candidate } from '@/types/candidate'
import { getJobTitleWithPrefecture, getStoreNameWithPrefecture } from '@/lib/utils/prefecture'

interface CreateMatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidate: Candidate
  jobs: Job[]
  companies: Company[]
  stores: Store[]
  newMatchData: { jobIds: string[]; notes: string }
  setNewMatchData: React.Dispatch<React.SetStateAction<{ jobIds: string[]; notes: string }>>
  onOpenJobSelect: () => void
  onRemoveJob: (jobId: string) => void
  onCreateMatch: () => void
  getSelectedJobDisplay: () => string
}

export default function CreateMatchDialog({
  open,
  onOpenChange,
  candidate,
  jobs,
  companies,
  stores,
  newMatchData,
  setNewMatchData,
  onOpenJobSelect,
  onRemoveJob,
  onCreateMatch,
  getSelectedJobDisplay
}: CreateMatchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>新規マッチング作成</DialogTitle>
          <DialogDescription>
            {candidate.lastName} {candidate.firstName}さんと求人をマッチングします
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="job">求人（複数選択可）</Label>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
              onClick={onOpenJobSelect}
            >
              <Briefcase className="h-4 w-4 mr-2" />
              {getSelectedJobDisplay()}
            </Button>
            {newMatchData.jobIds.length > 0 && (
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-2">
                {newMatchData.jobIds.map((jobId) => {
                  const job = jobs.find(j => j.id === jobId)
                  const company = companies.find(c => c.id === job?.companyId)
                  const jobStores = job?.storeIds && job.storeIds.length > 0
                    ? stores.filter(s => job.storeIds?.includes(s.id))
                    : job?.storeId
                      ? [stores.find(s => s.id === job.storeId)].filter(Boolean)
                      : []
                  const prefecture = jobStores[0]?.prefecture
                  const displayTitle = getJobTitleWithPrefecture(job?.title || '', prefecture)

                  return (
                    <div key={jobId} className="flex items-start gap-2 p-3 bg-gray-50 rounded text-sm border border-gray-200">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="font-medium">{displayTitle}</div>
                        <div className="text-xs text-gray-600">
                          <div>{company?.name}</div>
                          {jobStores.length > 0 && (
                            <div className="mt-0.5">
                              {jobStores.map(s => getStoreNameWithPrefecture(s?.name || '', s?.prefecture)).filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 flex-shrink-0"
                        onClick={() => onRemoveJob(jobId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="notes">備考</Label>
            <Textarea
              id="notes"
              value={newMatchData.notes}
              onChange={(e) => setNewMatchData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="マッチングに関する備考..."
              className="min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            キャンセル
          </Button>
          <Button
            onClick={onCreateMatch}
            disabled={newMatchData.jobIds.length === 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            作成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
