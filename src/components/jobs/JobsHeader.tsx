'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Briefcase,
  Plus,
  RefreshCw,
  Upload,
  Download,
} from 'lucide-react'

interface JobsHeaderProps {
  isAdmin: boolean
  selectedJobsCount: number
  csvImporting: boolean
  onRefresh: () => void
  onCsvImport: (file: File) => void
  onExportCsv: () => void
  onBulkStatusChange: () => void
  onSelectAll: () => void
  isAllSelected: boolean
}

export function JobsHeader({
  isAdmin,
  selectedJobsCount,
  csvImporting,
  onRefresh,
  onCsvImport,
  onExportCsv,
  onBulkStatusChange,
  onSelectAll,
  isAllSelected,
}: JobsHeaderProps) {
  const [csvInputKey, setCsvInputKey] = useState(0)

  return (
    <div className="mb-8 p-4 sm:p-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg text-white">
      <div className="flex justify-between items-center gap-4">
        {/* タイトル部分 */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 bg-white/20 rounded-full">
            <Briefcase className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">求人管理</h1>
            <p className="text-purple-100 mt-1 text-xs sm:text-sm">
              求人情報の管理・検索・マッチング
            </p>
          </div>
        </div>

        {/* ヘッダーアクション */}
        <div className="flex flex-col gap-2">
          {isAdmin && selectedJobsCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-white/20 rounded-lg p-2">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={onSelectAll}
                id="select-all-header"
              />
              <label
                htmlFor="select-all-header"
                className="text-xs sm:text-sm text-white cursor-pointer whitespace-nowrap"
              >
                全て選択 ({selectedJobsCount}件)
              </label>
              <Button
                onClick={onBulkStatusChange}
                variant="outline"
                size="sm"
                className="bg-purple-600 text-white hover:bg-purple-700 border-purple-600 text-xs"
              >
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                ステータス変更
              </Button>
              <Button
                onClick={onExportCsv}
                variant="outline"
                size="sm"
                className="bg-green-600 text-white hover:bg-green-700 border-green-600 text-xs"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                CSV出力
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
              className="bg-white text-purple-600 hover:bg-purple-50 border-white flex items-center gap-1 text-xs sm:text-sm"
              title="最新データを取得"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">更新</span>
            </Button>
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Button
                variant="outline"
                size="sm"
                className="bg-white text-purple-600 hover:bg-purple-50 border-white flex items-center gap-1 text-xs sm:text-sm"
                disabled={csvImporting}
                asChild
              >
                <span>
                  {csvImporting ? (
                    <>
                      <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      <span className="hidden sm:inline">インポート中...</span>
                      <span className="sm:hidden">処理中...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">CSVインポート</span>
                      <span className="sm:hidden">インポート</span>
                    </>
                  )}
                </span>
              </Button>
            </label>
            <input
              id="csv-upload"
              key={csvInputKey}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  onCsvImport(file)
                  setCsvInputKey(prev => prev + 1)
                }
              }}
            />
            <Link href="/jobs/new">
              <Button
                variant="outline"
                size="sm"
                className="bg-white text-purple-600 hover:bg-purple-50 border-white text-xs sm:text-sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">新規求人追加</span>
                <span className="sm:hidden">新規追加</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
