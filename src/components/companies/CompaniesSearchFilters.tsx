'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Company } from '@/types/company'
import { User } from '@/types/user'
import { statusLabels, sizeLabels, dominoStatusLabels, indeedStatusLabels } from './constants'
import { CompanyFilters } from './types'

interface CompaniesSearchFiltersProps {
  filters: CompanyFilters
  users: User[]
  onFilterChange: (newFilters: CompanyFilters) => void
  onUpdateURL?: (params: Partial<CompanyFilters>) => void
}

export const CompaniesSearchFilters: React.FC<CompaniesSearchFiltersProps> = ({
  filters,
  users,
  onFilterChange,
  onUpdateURL,
}) => {
  const handleSearchChange = (value: string) => {
    const newFilters = { ...filters, searchTerm: value }
    onFilterChange(newFilters)
    onUpdateURL?.({ searchTerm: value })
  }

  const handleStatusChange = (value: string) => {
    const status = (value as any)
    const newFilters = { ...filters, status }
    onFilterChange(newFilters)
    onUpdateURL?.({ status })
  }

  const handleSizeChange = (value: string) => {
    const size = (value as any)
    const newFilters = { ...filters, size }
    onFilterChange(newFilters)
    onUpdateURL?.({ size })
  }

  const handleDominoChange = (value: 'all' | 'connected' | 'not_connected') => {
    const newFilters = { ...filters, dominoStatus: value }
    onFilterChange(newFilters)
    onUpdateURL?.({ dominoStatus: value })
  }

  const handleConsultantChange = (value: string) => {
    const newFilters = { ...filters, consultantId: value }
    onFilterChange(newFilters)
    onUpdateURL?.({ consultantId: value })
  }

  const handleIndeedChange = (value: 'all' | 'detected' | 'not_detected' | 'unchecked') => {
    const newFilters = { ...filters, indeedStatus: value }
    onFilterChange(newFilters)
    onUpdateURL?.({ indeedStatus: value })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* 企業名検索 */}
          <div>
            <Label htmlFor="company-search">企業名</Label>
            <Input
              id="company-search"
              placeholder="企業名で検索"
              value={filters.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* ステータスフィルター */}
          <div>
            <Label htmlFor="company-status">ステータス</Label>
            <Select value={filters.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 企業規模フィルター */}
          <div>
            <Label htmlFor="company-size">企業規模</Label>
            <Select value={filters.size} onValueChange={handleSizeChange}>
              <SelectTrigger>
                <SelectValue placeholder="企業規模" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての規模</SelectItem>
                {Object.entries(sizeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Domino連携フィルター */}
          <div>
            <Label htmlFor="company-domino">Domino連携</Label>
            <Select value={filters.dominoStatus} onValueChange={handleDominoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Domino連携" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="connected">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    連携済み
                  </div>
                </SelectItem>
                <SelectItem value="not_connected">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    未連携
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 担当者フィルター */}
          <div>
            <Label htmlFor="company-consultant">担当者</Label>
            <Select value={filters.consultantId} onValueChange={handleConsultantChange}>
              <SelectTrigger>
                <SelectValue placeholder="担当者" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての担当者</SelectItem>
                <SelectItem value="unassigned">未設定</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.displayName || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Indeed掲載フィルター */}
          <div>
            <Label htmlFor="company-indeed">Indeed掲載</Label>
            <Select value={filters.indeedStatus || 'all'} onValueChange={handleIndeedChange}>
              <SelectTrigger>
                <SelectValue placeholder="Indeed掲載" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="detected">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    掲載あり
                  </div>
                </SelectItem>
                <SelectItem value="not_detected">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    掲載なし
                  </div>
                </SelectItem>
                <SelectItem value="unchecked">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    未チェック
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
