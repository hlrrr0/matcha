'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, FileUp, Plus, Edit } from 'lucide-react'
import Link from 'next/link'
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface CompaniesHeaderProps {
  isAdmin: boolean
  companiesCount: number
  selectedCount: number
  isLoading: boolean
  onRefresh: () => void
  onCSVImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  onGenerateTemplate: () => void
  onDeleteClick: () => void
  onDominoExport?: () => void
  onBulkUpdate?: () => void
}

export const CompaniesHeader: React.FC<CompaniesHeaderProps> = ({
  isAdmin,
  companiesCount,
  selectedCount,
  isLoading,
  onRefresh,
  onCSVImport,
  onGenerateTemplate,
  onDeleteClick,
  onDominoExport,
  onBulkUpdate,
}) => {
  return (
    <>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-lg sm:text-2xl">企業管理</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              登録企業の一覧・検索・管理
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 text-xs sm:h-9 sm:text-sm"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              更新
            </Button>

            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onGenerateTemplate}
                  className="h-8 text-xs sm:h-9 sm:text-sm"
                >
                  <FileUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  テンプレート
                </Button>

                <label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs sm:h-9 sm:text-sm"
                    asChild
                  >
                    <span>
                      <FileUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      インポート
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={onCSVImport}
                    className="hidden"
                  />
                </label>

                {isAdmin && onDominoExport && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDominoExport}
                    className="h-8 text-xs sm:h-9 sm:text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300"
                  >
                    <FileUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Domino送信
                  </Button>
                )}

                <Link href="/companies/new">
                  <Button
                    size="sm"
                    className="h-8 text-xs sm:h-9 sm:text-sm"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    新規追加
                  </Button>
                </Link>

                {selectedCount > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onBulkUpdate}
                      className="h-8 text-xs sm:h-9 sm:text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      {selectedCount}件を一括更新
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={onDeleteClick}
                      className="h-8 text-xs sm:h-9 sm:text-sm"
                    >
                      {selectedCount}件削除
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
    </>
  )
}
