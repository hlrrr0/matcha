'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Store, Building2, X, Check } from 'lucide-react'
import { Job, jobStatusLabels } from '@/types/job'
import { User } from '@/types/user'
import { FilterState } from './types'
import { tagOptions, tabelogExceptionReasons } from './constants'

interface JobsSearchFiltersProps {
  filterState: FilterState
  users: User[]
  availableEmploymentTypes: string[]
  onFilterChange: (updates: Partial<FilterState>) => void
  onUpdateURLParams: (params: Record<string, string | number>) => void
}

export function JobsSearchFilters({
  filterState,
  users,
  availableEmploymentTypes,
  onFilterChange,
  onUpdateURLParams,
}: JobsSearchFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFilterChange({ searchTerm: value })
    onUpdateURLParams({
      search: value,
      status: filterState.statusFilter,
      employmentType: Array.from(filterState.employmentTypeFilter).join(','),
      consultant: filterState.consultantFilter,
      ageLimit: filterState.ageLimitFilter,
    })
  }

  const handleStatusChange = (value: Job['status'] | 'all') => {
    onFilterChange({ statusFilter: value })
    onUpdateURLParams({
      search: filterState.searchTerm,
      status: value,
      employmentType: Array.from(filterState.employmentTypeFilter).join(','),
      consultant: filterState.consultantFilter,
      ageLimit: filterState.ageLimitFilter,
    })
  }

  const handleEmploymentTypeChange = (type: string, checked: boolean) => {
    const newFilter = new Set(filterState.employmentTypeFilter)
    if (checked) {
      newFilter.add(type)
    } else {
      newFilter.delete(type)
    }
    onFilterChange({ employmentTypeFilter: newFilter })
    onUpdateURLParams({
      search: filterState.searchTerm,
      status: filterState.statusFilter,
      employmentType: Array.from(newFilter).join(','),
      consultant: filterState.consultantFilter,
      ageLimit: filterState.ageLimitFilter,
    })
  }

  const handleConsultantChange = (value: string) => {
    onFilterChange({ consultantFilter: value })
    onUpdateURLParams({
      search: filterState.searchTerm,
      status: filterState.statusFilter,
      employmentType: Array.from(filterState.employmentTypeFilter).join(','),
      consultant: value,
      ageLimit: filterState.ageLimitFilter,
    })
  }

  const handleAgeLimitChange = (value: string) => {
    onFilterChange({ ageLimitFilter: value })
    onUpdateURLParams({
      search: filterState.searchTerm,
      status: filterState.statusFilter,
      employmentType: Array.from(filterState.employmentTypeFilter).join(','),
      consultant: filterState.consultantFilter,
      ageLimit: value,
    })
  }

  const handleFlagToggle = (flag: 'highDemand' | 'provenTrack' | 'weakRelationship') => {
    const newFilter = new Set(filterState.flagFilter)
    if (newFilter.has(flag)) {
      newFilter.delete(flag)
    } else {
      newFilter.add(flag)
    }
    onFilterChange({ flagFilter: newFilter })
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          検索・フィルター
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* 検索 */}
          <div>
            <Label htmlFor="job-search">求人名/企業名/住所</Label>
            <Input
              id="job-search"
              placeholder="求人名・企業名・住所で検索..."
              value={filterState.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full"
            />
          </div>

          {/* ステータスフィルター */}
          <div>
            <Label htmlFor="status-filter">ステータス</Label>
            <Select
              value={filterState.statusFilter}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                {Object.entries(jobStatusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 雇用形態フィルター */}
          <div>
            <Label>雇用形態</Label>
            <div className="border rounded-md p-3 space-y-2 bg-white">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="employment-fulltime"
                  checked={filterState.employmentTypeFilter.has('full-time')}
                  onCheckedChange={(checked) =>
                    handleEmploymentTypeChange('full-time', checked as boolean)
                  }
                />
                <label
                  htmlFor="employment-fulltime"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  正社員
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="employment-contract"
                  checked={filterState.employmentTypeFilter.has('contract')}
                  onCheckedChange={(checked) =>
                    handleEmploymentTypeChange('contract', checked as boolean)
                  }
                />
                <label
                  htmlFor="employment-contract"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  契約社員
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="employment-parttime"
                  checked={filterState.employmentTypeFilter.has('part-time')}
                  onCheckedChange={(checked) =>
                    handleEmploymentTypeChange('part-time', checked as boolean)
                  }
                />
                <label
                  htmlFor="employment-parttime"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  アルバイト
                </label>
              </div>
            </div>
          </div>

          {/* 担当者フィルター */}
          <div>
            <Label htmlFor="consultant-filter">担当者</Label>
            <Select
              value={filterState.consultantFilter}
              onValueChange={handleConsultantChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="担当者" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての担当者</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.displayName || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 年齢上限フィルター */}
          <div>
            <Label htmlFor="age-limit-filter">年齢上限</Label>
            <Select
              value={filterState.ageLimitFilter}
              onValueChange={handleAgeLimitChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="年齢上限" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="exists">年齢上限あり</SelectItem>
                <SelectItem value="none">年齢上限なし</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* フラグフィルター */}
          <div className="col-span-2">
            <Label>フラグ</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button
                type="button"
                variant={filterState.flagFilter.has('highDemand') ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFlagToggle('highDemand')}
              >
                🔥ニーズ高
              </Button>
              <Button
                type="button"
                variant={
                  filterState.flagFilter.has('provenTrack') ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => handleFlagToggle('provenTrack')}
              >
                🎉実績あり
              </Button>
              <Button
                type="button"
                variant={
                  filterState.flagFilter.has('weakRelationship') ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => handleFlagToggle('weakRelationship')}
              >
                💧関係薄め
              </Button>
            </div>
          </div>
        </div>

        {/* 店舗条件フィルター */}
        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="store-conditions">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                店舗条件で絞り込み
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <StoreConditionFilters
                filterState={filterState}
                onFilterChange={onFilterChange}
              />
            </AccordionContent>
          </AccordionItem>

          {/* 企業条件フィルター */}
          <AccordionItem value="company-conditions">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                企業条件で絞り込み
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CompanyConditionFilters
                filterState={filterState}
                onFilterChange={onFilterChange}
              />
            </AccordionContent>
          </AccordionItem>

          {/* その他フィルター */}
          <AccordionItem value="other-filters">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                その他の条件で絞り込み
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <OtherFilters
                filterState={filterState}
                onFilterChange={onFilterChange}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}

// =========== Sub-Components ===========

interface StoreConditionFiltersProps {
  filterState: FilterState
  onFilterChange: (updates: Partial<FilterState>) => void
}

function StoreConditionFilters({
  filterState,
  onFilterChange,
}: StoreConditionFiltersProps) {
  const hasActiveFilters =
    filterState.unitPriceLunchMin !== '' ||
    filterState.unitPriceLunchMax !== '' ||
    filterState.unitPriceDinnerMin !== '' ||
    filterState.unitPriceDinnerMax !== '' ||
    filterState.reservationSystemFilter !== 'all'

  const handleClear = () => {
    onFilterChange({
      unitPriceLunchMin: '',
      unitPriceLunchMax: '',
      unitPriceDinnerMin: '',
      unitPriceDinnerMax: '',
      reservationSystemFilter: 'all',
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* 昼価格 */}
        <div>
          <Label htmlFor="lunch-price-min">昼客単価 (最小)</Label>
          <Input
            id="lunch-price-min"
            type="number"
            placeholder="¥"
            value={filterState.unitPriceLunchMin}
            onChange={(e) =>
              onFilterChange({ unitPriceLunchMin: e.target.value })
            }
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor="lunch-price-max">昼客単価 (最大)</Label>
          <Input
            id="lunch-price-max"
            type="number"
            placeholder="¥"
            value={filterState.unitPriceLunchMax}
            onChange={(e) =>
              onFilterChange({ unitPriceLunchMax: e.target.value })
            }
            className="w-full"
          />
        </div>

        {/* 夜価格 */}
        <div>
          <Label htmlFor="dinner-price-min">夜客単価 (最小)</Label>
          <Input
            id="dinner-price-min"
            type="number"
            placeholder="¥"
            value={filterState.unitPriceDinnerMin}
            onChange={(e) =>
              onFilterChange({ unitPriceDinnerMin: e.target.value })
            }
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor="dinner-price-max">夜客単価 (最大)</Label>
          <Input
            id="dinner-price-max"
            type="number"
            placeholder="¥"
            value={filterState.unitPriceDinnerMax}
            onChange={(e) =>
              onFilterChange({ unitPriceDinnerMax: e.target.value })
            }
            className="w-full"
          />
        </div>
      </div>

      {/* 予約システム */}
      <div>
        <Label htmlFor="reservation-system">予約システム</Label>
        <Select
          value={filterState.reservationSystemFilter}
          onValueChange={(value) =>
            onFilterChange({ reservationSystemFilter: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="予約システム" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="yes">あり</SelectItem>
            <SelectItem value="no">なし</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="w-full"
        >
          店舗条件をクリア
        </Button>
      )}
    </div>
  )
}

interface CompanyConditionFiltersProps {
  filterState: FilterState
  onFilterChange: (updates: Partial<FilterState>) => void
}

function CompanyConditionFilters({
  filterState,
  onFilterChange,
}: CompanyConditionFiltersProps) {
  const hasActiveFilters =
    filterState.housingSupportFilter !== 'all' ||
    filterState.independenceSupportFilter !== 'all'

  const handleClear = () => {
    onFilterChange({
      housingSupportFilter: 'all',
      independenceSupportFilter: 'all',
    })
  }

  return (
    <div className="space-y-4">
      {/* 住宅サポート */}
      <div>
        <Label htmlFor="housing-support">住宅サポート</Label>
        <Select
          value={filterState.housingSupportFilter}
          onValueChange={(value) =>
            onFilterChange({ housingSupportFilter: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="住宅サポート" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="yes">あり</SelectItem>
            <SelectItem value="no">なし</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 独立支援 */}
      <div>
        <Label htmlFor="independence-support">独立支援</Label>
        <Select
          value={filterState.independenceSupportFilter}
          onValueChange={(value) =>
            onFilterChange({ independenceSupportFilter: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="独立支援" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="yes">あり</SelectItem>
            <SelectItem value="no">なし</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="w-full"
        >
          企業条件をクリア
        </Button>
      )}
    </div>
  )
}

interface OtherFiltersProps {
  filterState: FilterState
  onFilterChange: (updates: Partial<FilterState>) => void
}

function OtherFilters({
  filterState,
  onFilterChange,
}: OtherFiltersProps) {
  const [tagsOpen, setTagsOpen] = useState(false)

  const hasActiveFilters =
    filterState.tabelogExceptionFilter !== 'all' ||
    filterState.tagFilter.size > 0

  const handleClear = () => {
    onFilterChange({
      tabelogExceptionFilter: 'all',
      tagFilter: new Set(),
    })
  }

  const handleTagToggle = (tag: string) => {
    const newFilter = new Set(filterState.tagFilter)
    if (newFilter.has(tag)) {
      newFilter.delete(tag)
    } else {
      newFilter.add(tag)
    }
    onFilterChange({ tagFilter: newFilter })
  }

  return (
    <div className="space-y-4">
      {/* Tabelog例外理由 */}
      <div>
        <Label htmlFor="tabelog-exception">Tabelog例外理由</Label>
        <Select
          value={filterState.tabelogExceptionFilter}
          onValueChange={(value) =>
            onFilterChange({ tabelogExceptionFilter: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Tabelog例外理由" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {tabelogExceptionReasons.map((reason) => (
              <SelectItem key={reason.value} value={reason.value}>
                {reason.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* タグマルチセレクト */}
      <div>
        <Label>受賞タグ</Label>
        <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between"
            >
              <span className="truncate">
                {filterState.tagFilter.size > 0
                  ? `${filterState.tagFilter.size}個選択`
                  : 'タグを選択...'}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandList>
                <CommandGroup>
                  {tagOptions.map((tag) => (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={() => handleTagToggle(tag)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span>{tag}</span>
                      {filterState.tagFilter.has(tag) && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="w-full"
        >
          その他の条件をクリア
        </Button>
      )}
    </div>
  )
}
