"use client"

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TrendingUp, Plus, RefreshCw, ArrowRight, Trash2, Users, Briefcase } from 'lucide-react'
import { Match } from '@/types/matching'
import React from 'react'
import { Company } from '@/types/company'
import { Job } from '@/types/job'
import { Store } from '@/types/store'

interface ProgressHeaderProps {
  selectedMatchIds: Set<string>
  isAdmin: boolean
  openBulkStatusUpdate: () => void
  getSelectedMatchesStatus: () => Match['status'] | null
  setBulkDeleteDialogOpen: (open: boolean) => void
  loadData: (forceRefresh?: boolean) => void
  createMatchOpen: boolean
  setCreateMatchOpen: (open: boolean) => void
  setNewMatchData: React.Dispatch<React.SetStateAction<{ candidateId: string; jobId: string; jobIds: string[]; score: number; notes: string }>>
  newMatchData: {
    candidateId: string
    jobId: string
    jobIds: string[]
    score: number
    notes: string
  }
  getSelectedCandidateDisplay: () => string
  setCandidateSelectModalOpen: (open: boolean) => void
  getSelectedJobDisplay: () => string
  setJobSelectModalOpen: (open: boolean) => void
  jobs: Job[]
  companies: Company[]
  stores: Store[]
  handleJobSelect: (jobId: string) => void
  handleCreateMatch: () => void
}

export default function ProgressHeader({
  selectedMatchIds,
  isAdmin,
  openBulkStatusUpdate,
  getSelectedMatchesStatus,
  setBulkDeleteDialogOpen,
  loadData,
  createMatchOpen,
  setCreateMatchOpen,
  setNewMatchData,
  newMatchData,
  getSelectedCandidateDisplay,
  setCandidateSelectModalOpen,
  getSelectedJobDisplay,
  setJobSelectModalOpen,
  jobs,
  companies,
  stores,
  handleJobSelect,
  handleCreateMatch
}: ProgressHeaderProps) {
  return (
    <>
      <div className="mb-8 p-4 sm:p-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg text-white">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-white/20 rounded-full">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">進捗管理</h1>
              <p className="text-orange-100 text-xs sm:text-sm">求職者と求人のマッチング状況を管理</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedMatchIds.size > 0 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openBulkStatusUpdate}
                  disabled={getSelectedMatchesStatus() === null}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">一括で進捗更新 ({selectedMatchIds.size})</span>
                  <span className="sm:hidden">進捗更新 ({selectedMatchIds.size})</span>
                </Button>
                {isAdmin && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">削除 ({selectedMatchIds.size})</span>
                    <span className="sm:hidden">削除 ({selectedMatchIds.size})</span>
                  </Button>
                )}
              </>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadData(true)}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm"
              title="キャッシュをクリアして最新データを取得"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">更新</span>
            </Button>
            <Dialog open={createMatchOpen} onOpenChange={(open) => {
              setCreateMatchOpen(open)
              if (!open) {
                setNewMatchData({ candidateId: '', jobId: '', jobIds: [], score: 50, notes: '' })
              }
            }}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">新規マッチング</span>
                  <span className="sm:hidden">新規</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>新規マッチング作成</DialogTitle>
                  <DialogDescription>
                    求職者と求人をマッチングします
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="candidate">求職者</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      onClick={() => setCandidateSelectModalOpen(true)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {getSelectedCandidateDisplay()}
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor="job">求人（複数選択可）</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      onClick={() => setJobSelectModalOpen(true)}
                    >
                      <Briefcase className="h-4 w-4 mr-2" />
                      {getSelectedJobDisplay()}
                    </Button>
                    {newMatchData.jobIds.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {newMatchData.jobIds.map((jobId) => {
                          const job = jobs.find(j => j.id === jobId)
                          const company = companies.find(c => c.id === job?.companyId)

                          let store: Store | undefined
                          if (job?.storeIds && job.storeIds.length > 0) {
                            store = stores.find(s => s.id === job.storeIds?.[0])
                          } else if (job?.storeId) {
                            store = stores.find(s => s.id === job.storeId)
                          }

                          return (
                            <div key={jobId} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{job?.title}</div>
                                <div className="text-xs text-gray-600 truncate">
                                  {company?.name}
                                  {store && (
                                    <span className="ml-1">
                                      - {store.name}
                                      {store.prefecture && `【${store.prefecture}】`}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 ml-2"
                                onClick={() => handleJobSelect(jobId)}
                              >
                                <Trash2 className="h-3 w-3" />
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
                      onChange={(e) => setNewMatchData({ ...newMatchData, notes: e.target.value })}
                      placeholder="マッチングに関する備考..."
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateMatchOpen(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleCreateMatch}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    作成
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </>
  )
}
