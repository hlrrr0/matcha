'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Search } from 'lucide-react'
import { Store, statusLabels } from '@/types/store'

interface StoreFiltersProps {
  searchTerm: string
  statusFilter: Store['status'] | 'all'
  jobFilter: 'all' | 'with-jobs' | 'without-jobs'
  locationFilter: 'all' | 'with-location' | 'without-location'
  sortBy: 'name' | 'companyName' | 'createdAt' | 'updatedAt' | 'status'
  sortOrder: 'asc' | 'desc'
  onSearchChange: (value: string) => void
  onStatusChange: (value: Store['status'] | 'all') => void
  onJobFilterChange: (value: 'all' | 'with-jobs' | 'without-jobs') => void
  onLocationFilterChange: (value: 'all' | 'with-location' | 'without-location') => void
  onSortChange: (value: string) => void
}

const StoreFilters = ({
  searchTerm,
  statusFilter,
  jobFilter,
  locationFilter,
  sortBy,
  sortOrder,
  onSearchChange,
  onStatusChange,
  onJobFilterChange,
  onLocationFilterChange,
  onSortChange,
}: StoreFiltersProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          検索・フィルター・ソート
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* 検索 */}
          <div className="xl:col-span-2">
            <Label htmlFor="store-search">店舗名・企業名・住所</Label>
            <Input
              id="store-search"
              placeholder="店舗名・企業名で検索..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full"
            />
          </div>
          
          {/* ステータスフィルター */}
          <div>
            <Label htmlFor="store-status">ステータス</Label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="取引状況" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての状況</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 求人フィルター */}
          <div>
            <Label htmlFor="job-filter">求人の有無</Label>
            <Select value={jobFilter} onValueChange={onJobFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="求人の有無" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="with-jobs">求人あり</SelectItem>
                <SelectItem value="without-jobs">求人なし</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 位置情報フィルター */}
          <div>
            <Label htmlFor="location-filter">位置情報</Label>
            <Select value={locationFilter} onValueChange={onLocationFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="位置情報" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="with-location">あり</SelectItem>
                <SelectItem value="without-location">なし</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* ソート選択 */}
          <div>
            <Label htmlFor="store-sort">ソート</Label>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={onSortChange}>
              <SelectTrigger>
                <SelectValue placeholder="並び順" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">店舗名（昇順）</SelectItem>
                <SelectItem value="name-desc">店舗名（降順）</SelectItem>
                <SelectItem value="companyName-asc">企業名（昇順）</SelectItem>
                <SelectItem value="companyName-desc">企業名（降順）</SelectItem>
                <SelectItem value="status-asc">ステータス（昇順）</SelectItem>
                <SelectItem value="status-desc">ステータス（降順）</SelectItem>
                <SelectItem value="createdAt-desc">登録日（新しい順）</SelectItem>
                <SelectItem value="createdAt-asc">登録日（古い順）</SelectItem>
                <SelectItem value="updatedAt-desc">更新日（新しい順）</SelectItem>
                <SelectItem value="updatedAt-asc">更新日（古い順）</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default StoreFilters
