"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown, Search } from 'lucide-react'
import { Match } from '@/types/matching'

interface ProgressFiltersProps {
  searchTerm: string
  setSearchTerm: (value: string) => void
  statusFilter: Set<Match['status']>
  setStatusFilter: (value: Set<Match['status']>) => void
  statusFilterOpen: boolean
  setStatusFilterOpen: (value: boolean) => void
  showOverdueOnly: boolean
  setShowOverdueOnly: (value: boolean) => void
}

export default function ProgressFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  statusFilterOpen,
  setStatusFilterOpen,
  showOverdueOnly,
  setShowOverdueOnly
}: ProgressFiltersProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-orange-800">検索とフィルター</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
          <div className="flex-1">
            <Label htmlFor="progress-search">求職者名・職種・企業名</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="progress-search"
                placeholder="求職者名、職種、企業名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">クイックフィルター</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  setShowOverdueOnly(false)
                  setStatusFilter(new Set([
                    'suggested',
                    'applied',
                    'document_screening',
                    'document_passed',
                    'interview',
                    'interview_passed',
                    'offer',
                    'offer_accepted',
                    'rejected',
                    'withdrawn'
                  ]))
                }}
              >
                全選択
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  setShowOverdueOnly(false)
                  setStatusFilter(new Set([
                    'applied',
                    'document_screening',
                    'document_passed',
                    'interview',
                    'interview_passed',
                    'offer'
                  ]))
                }}
              >
                進捗中
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  setShowOverdueOnly(true)
                  setStatusFilter(new Set(['document_passed', 'interview_passed', 'interview']))
                }}
              >
                確認待ち
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setStatusFilterOpen(!statusFilterOpen)}
              className="w-full flex items-center justify-between p-3 border rounded-md hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <Label className="cursor-pointer">ステータスフィルター</Label>
                <Badge variant="secondary" className="text-xs">
                  {statusFilter.size}/10
                </Badge>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${statusFilterOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {statusFilterOpen && (
              <div className="space-y-2 border rounded-md p-3 max-h-[300px] overflow-y-auto bg-background">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Checkbox
                    id="status-all"
                    checked={statusFilter.size === 10}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setStatusFilter(new Set([
                          'suggested',
                          'applied',
                          'document_screening',
                          'document_passed',
                          'interview',
                          'interview_passed',
                          'offer',
                          'offer_accepted',
                          'rejected',
                          'withdrawn'
                        ]))
                      } else {
                        setStatusFilter(new Set())
                      }
                    }}
                  />
                  <label
                    htmlFor="status-all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    すべて
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {[
                    { value: 'pending_proposal', label: '提案待ち' },
                    { value: 'suggested', label: '提案済み' },
                    { value: 'applied', label: '応募済み' },
                    { value: 'document_screening', label: '書類選考中' },
                    { value: 'document_passed', label: '書類選考通過' },
                    { value: 'interview', label: '面接' },
                    { value: 'interview_passed', label: '面接通過' },
                    { value: 'offer', label: '内定' },
                    { value: 'offer_accepted', label: '内定承諾' },
                    { value: 'rejected', label: '不合格' },
                    { value: 'withdrawn', label: '辞退' }
                  ].map((status) => {
                    const isNegativeStatus = status.value === 'rejected' || status.value === 'withdrawn'
                    return (
                      <div key={status.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status.value}`}
                          checked={statusFilter.has(status.value as Match['status'])}
                          onCheckedChange={(checked) => {
                            const newFilter = new Set(statusFilter)
                            if (checked) {
                              newFilter.add(status.value as Match['status'])
                            } else {
                              newFilter.delete(status.value as Match['status'])
                            }
                            setStatusFilter(newFilter)
                          }}
                        />
                        <label
                          htmlFor={`status-${status.value}`}
                          className={`text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer ${
                            isNegativeStatus ? 'text-muted-foreground' : ''
                          }`}
                        >
                          {status.label}
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
