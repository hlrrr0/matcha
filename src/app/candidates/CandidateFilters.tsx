'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Search, Filter } from 'lucide-react'
import { SortBy, SortOrder } from './CandidatePageTypes'

interface CandidateFiltersProps {
  searchTerm: string
  statusFilter: string
  campusFilter: string
  enrollmentMonthFilter: string
  uniqueEnrollmentMonths: string[]
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onCampusChange: (value: string) => void
  onEnrollmentChange: (value: string) => void
}

const CandidateFilters = ({
  searchTerm,
  statusFilter,
  campusFilter,
  enrollmentMonthFilter,
  uniqueEnrollmentMonths,
  onSearchChange,
  onStatusChange,
  onCampusChange,
  onEnrollmentChange,
}: CandidateFiltersProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          検索・フィルタ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          {/* 検索 */}
          <div className="flex-1">
            <Label htmlFor="candidate-search">検索</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="candidate-search"
                placeholder="名前、メール、電話番号で検索..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* ステータスフィルタ */}
          <div className="w-48">
            <Label>ステータス</Label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="active">アクティブ</SelectItem>
                <SelectItem value="inactive">非アクティブ</SelectItem>
                <SelectItem value="hired">就職決定</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 校舎フィルタ */}
          <div className="w-48">
            <Label>校舎</Label>
            <Select value={campusFilter} onValueChange={onCampusChange}>
              <SelectTrigger>
                <SelectValue placeholder="校舎" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="tokyo">東京</SelectItem>
                <SelectItem value="osaka">大阪</SelectItem>
                <SelectItem value="awaji">淡路</SelectItem>
                <SelectItem value="fukuoka">福岡</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 入学年月フィルタ */}
          <div className="w-48">
            <Label>入学年月</Label>
            <Select value={enrollmentMonthFilter} onValueChange={onEnrollmentChange}>
              <SelectTrigger>
                <SelectValue placeholder="入学年月" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {uniqueEnrollmentMonths.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CandidateFilters
