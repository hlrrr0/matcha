import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  itemsPerPage?: number
  totalItems?: number
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  itemsPerPage,
  totalItems 
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7 // 表示する最大ページ数（デスクトップ）
    const maxVisibleMobile = 3 // モバイルでの最大ページ数

    // モバイル判定（簡易版）
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

    const visiblePages = isMobile ? maxVisibleMobile : maxVisible

    if (totalPages <= visiblePages) {
      // 全ページを表示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // ページ数が多い場合
      if (isMobile) {
        // モバイル: 現在のページ周辺のみ表示
        if (currentPage === 1) {
          pages.push(1, 2, '...')
        } else if (currentPage === totalPages) {
          pages.push('...', totalPages - 1, totalPages)
        } else {
          pages.push('...', currentPage, '...')
        }
      } else {
        // デスクトップ: 従来の表示
        if (currentPage <= 3) {
          // 最初の方
          for (let i = 1; i <= 5; i++) {
            pages.push(i)
          }
          pages.push('...')
          pages.push(totalPages)
        } else if (currentPage >= totalPages - 2) {
          // 最後の方
          pages.push(1)
          pages.push('...')
          for (let i = totalPages - 4; i <= totalPages; i++) {
            pages.push(i)
          }
        } else {
          // 中間
          pages.push(1)
          pages.push('...')
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            pages.push(i)
          }
          pages.push('...')
          pages.push(totalPages)
        }
      }
    }

    return pages
  }

  const startItem = (currentPage - 1) * (itemsPerPage || 0) + 1
  const endItem = Math.min(currentPage * (itemsPerPage || 0), totalItems || 0)

  if (totalPages <= 1) return null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
      {totalItems && itemsPerPage && (
        <div className="text-xs sm:text-sm text-gray-600 order-1 sm:order-none">
          {totalItems}件中 {startItem}〜{endItem}件を表示
        </div>
      )}
      
      <div className="flex items-center gap-1 order-2 sm:order-none">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
        >
          <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
        >
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>

        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-1 sm:px-2 text-gray-400 text-xs sm:text-sm">...</span>
            ) : (
              <Button
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm"
              >
                {page}
              </Button>
            )}
          </React.Fragment>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
        >
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
        >
          <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>
      
      {/* デスクトップ用スペーサー（SP時は非表示） */}
      {totalItems && itemsPerPage && (
        <div className="hidden sm:block text-sm text-gray-600 invisible">
          {/* スペーサー（左右の要素を均等に配置するため） */}
          {totalItems}件中 {startItem}〜{endItem}件を表示
        </div>
      )}
    </div>
  )
}
