"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Building2, Store, Briefcase, Users, Search, ArrowRight } from 'lucide-react'
import { getCompanies } from '@/lib/firestore/companies'
import { getStores } from '@/lib/firestore/stores'
import { getJobs } from '@/lib/firestore/jobs'
import { getCandidates } from '@/lib/firestore/candidates'
import { Company } from '@/types/company'
import { Store as StoreType } from '@/types/store'
import { Job } from '@/types/job'
import { Candidate } from '@/types/candidate'

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SearchResult = {
  type: 'company' | 'store' | 'job' | 'candidate'
  id: string
  name: string
  subtitle?: string
  link: string
}

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // データをすべて取得してキャッシュ
  const [allData, setAllData] = useState<{
    companies: Company[]
    stores: StoreType[]
    jobs: Job[]
    candidates: Candidate[]
  }>({
    companies: [],
    stores: [],
    jobs: [],
    candidates: []
  })

  // データを一度だけ読み込む
  useEffect(() => {
    if (open && allData.companies.length === 0) {
      loadAllData()
    }
  }, [open])

  const loadAllData = async () => {
    try {
      setLoading(true)
      const [companies, stores, jobs, candidates] = await Promise.all([
        getCompanies(),
        getStores(),
        getJobs(),
        getCandidates()
      ])
      setAllData({ companies, stores, jobs, candidates })
    } catch (error) {
      console.error('データ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // 検索処理
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    const query = searchQuery.toLowerCase()
    const searchResults: SearchResult[] = []

    // 企業を検索
    allData.companies.forEach(company => {
      if (
        company.name.toLowerCase().includes(query) ||
        company.address?.toLowerCase().includes(query) ||
        company.representative?.toLowerCase().includes(query)
      ) {
        searchResults.push({
          type: 'company',
          id: company.id,
          name: company.name,
          subtitle: company.address,
          link: `/companies/${company.id}`
        })
      }
    })

    // 店舗を検索
    allData.stores.forEach(store => {
      if (
        store.name.toLowerCase().includes(query) ||
        store.address?.toLowerCase().includes(query)
      ) {
        searchResults.push({
          type: 'store',
          id: store.id,
          name: store.name,
          subtitle: store.address,
          link: `/stores/${store.id}`
        })
      }
    })

    // 求人を検索
    allData.jobs.forEach(job => {
      if (
        job.title.toLowerCase().includes(query) ||
        job.jobDescription?.toLowerCase().includes(query)
      ) {
        searchResults.push({
          type: 'job',
          id: job.id,
          name: job.title,
          subtitle: job.jobDescription?.substring(0, 50),
          link: `/jobs/${job.id}`
        })
      }
    })

    // 求職者を検索
    allData.candidates.forEach(candidate => {
      const fullName = `${candidate.lastName} ${candidate.firstName}`
      const fullNameKana = candidate.lastNameKana && candidate.firstNameKana 
        ? `${candidate.lastNameKana} ${candidate.firstNameKana}` 
        : ''
      
      if (
        fullName.toLowerCase().includes(query) ||
        fullNameKana.toLowerCase().includes(query) ||
        candidate.email?.toLowerCase().includes(query) ||
        candidate.phone?.toLowerCase().includes(query)
      ) {
        searchResults.push({
          type: 'candidate',
          id: candidate.id,
          name: fullName,
          subtitle: candidate.email,
          link: `/candidates/${candidate.id}`
        })
      }
    })

    // 最大30件まで表示
    setResults(searchResults.slice(0, 30))
    setSelectedIndex(0)
  }, [searchQuery, allData])

  // キーボード操作
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      navigateToResult(results[selectedIndex])
    }
  }, [results, selectedIndex])

  const navigateToResult = (result: SearchResult) => {
    router.push(result.link)
    onOpenChange(false)
    setSearchQuery('')
  }

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'company':
        return <Building2 className="h-4 w-4 text-blue-600" />
      case 'store':
        return <Store className="h-4 w-4 text-green-600" />
      case 'job':
        return <Briefcase className="h-4 w-4 text-purple-600" />
      case 'candidate':
        return <Users className="h-4 w-4 text-red-600" />
    }
  }

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'company':
        return '企業'
      case 'store':
        return '店舗'
      case 'job':
        return '求人'
      case 'candidate':
        return '求職者'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        {/* スクリーンリーダー用のタイトル（視覚的には非表示） */}
        <DialogTitle className="sr-only">グローバル検索</DialogTitle>
        
        {/* 検索バー */}
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-5 w-5 text-gray-400 mr-3" />
          <Input
            placeholder="企業、店舗、求人、求職者を検索... (名前、住所、メールなど)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            autoFocus
          />
          {loading && (
            <div className="ml-2 text-sm text-gray-500">読み込み中...</div>
          )}
        </div>

        {/* 検索結果 */}
        <div className="max-h-[60vh] overflow-y-auto">
          {searchQuery && results.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>「{searchQuery}」に一致する結果が見つかりませんでした</p>
            </div>
          )}

          {!searchQuery && !loading && (
            <div className="p-8 text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">グローバル検索</p>
              <p className="text-sm">企業、店舗、求人、求職者を検索できます</p>
              <div className="mt-4 text-xs text-gray-400">
                <kbd className="px-2 py-1 bg-gray-100 rounded border">⌘ + K</kbd> または <kbd className="px-2 py-1 bg-gray-100 rounded border">Ctrl + K</kbd> で開く
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => navigateToResult(result)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                    index === selectedIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex-shrink-0">
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{result.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {getTypeLabel(result.type)}
                      </span>
                    </div>
                    {result.subtitle && (
                      <p className="text-sm text-gray-500 truncate mt-0.5">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* フッター（ヘルプ） */}
        {results.length > 0 && (
          <div className="border-t px-4 py-2 text-xs text-gray-500 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↓</kbd>
              移動
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Enter</kbd>
              選択
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Esc</kbd>
              閉じる
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
