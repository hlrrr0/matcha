"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Search } from 'lucide-react'
import { Company } from '@/types/company'
import { Job } from '@/types/job'
import { Store } from '@/types/store'

interface JobSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobSearchTerm: string
  setJobSearchTerm: (value: string) => void
  getFilteredJobs: () => Job[]
  newMatchData: {
    jobIds: string[]
  }
  handleJobSelect: (jobId: string) => void
  handleJobSelectComplete: () => void
  companies: Company[]
  stores: Store[]
}

export default function JobSelectDialog({
  open,
  onOpenChange,
  jobSearchTerm,
  setJobSearchTerm,
  getFilteredJobs,
  newMatchData,
  handleJobSelect,
  handleJobSelectComplete,
  companies,
  stores
}: JobSelectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>求人を選択（複数選択可）</DialogTitle>
          <DialogDescription>
            マッチングを作成する求人を選択してください（複数選択可能）
            {newMatchData.jobIds.length > 0 && (
              <span className="ml-2 text-orange-600 font-medium">
                {newMatchData.jobIds.length}件選択中
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div>
            <Label htmlFor="job-dialog-search">検索</Label>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                id="job-dialog-search"
                placeholder="求人名、企業名、店舗名で検索..."
                value={jobSearchTerm}
                onChange={(e) => setJobSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto border rounded-lg">
            <div className="space-y-2 p-4">
              {getFilteredJobs().map((job) => {
                const company = companies.find(c => c.id === job.companyId)

                let store: Store | undefined
                if (job.storeIds && job.storeIds.length > 0) {
                  store = stores.find(s => s.id === job.storeIds?.[0])
                } else if (job.storeId) {
                  store = stores.find(s => s.id === job.storeId)
                }

                const isSelected = newMatchData.jobIds.includes(job.id)

                return (
                  <div
                    key={job.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                    }`}
                    onClick={() => handleJobSelect(job.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-lg">{job.title}</h4>
                        <p className="text-gray-600 text-sm mt-1">
                          {company?.name || '企業名不明'}
                          {store && (
                            <span className="ml-2">
                              - {store.name}
                              {store.prefecture && `【${store.prefecture}】`}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant={job.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {job.status === 'draft' && '下書き'}
                            {job.status === 'active' && '募集中'}
                            {job.status === 'closed' && '募集終了'}
                          </Badge>
                          {(job.salaryInexperienced || job.salaryExperienced) && (
                            <span className="text-xs text-gray-500">
                              {job.salaryInexperienced || job.salaryExperienced}
                            </span>
                          )}
                        </div>
                        {job.jobDescription && (
                          <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                            {job.jobDescription}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-orange-500 mt-1 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                )
              })}

              {getFilteredJobs().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {jobSearchTerm ? '検索条件に一致する求人が見つかりません' : '求人がありません'}
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
              setJobSearchTerm('')
            }}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleJobSelectComplete}
            disabled={newMatchData.jobIds.length === 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            決定（{newMatchData.jobIds.length}件）
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
