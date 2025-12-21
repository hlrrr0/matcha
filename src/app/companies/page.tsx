"use client"

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Building2, 
  Plus, 
  Search, 
  Download,
  ExternalLink,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Upload,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Store,
  User
} from 'lucide-react'
import { Company } from '@/types/company'
import { Store as StoreType } from '@/types/store'
import { User as UserType } from '@/types/user'
import { getCompanies, deleteCompany, deleteMultipleCompanies } from '@/lib/firestore/companies'
import { getStoresByCompany } from '@/lib/firestore/stores'
import { getActiveUsers } from '@/lib/firestore/users'
import { importCompaniesFromCSV, generateCompaniesCSVTemplate } from '@/lib/csv/companies'
import { toast } from 'sonner'

const statusLabels = {
  active: 'アクティブ',
  inactive: '非アクティブ',
}

const statusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
}

const sizeLabels = {
  startup: '個人店',
  small: '2~3店舗',
  medium: '4~20店舗',
  large: '21~99店舗',
  enterprise: '100店舗以上',
}

function CompaniesPageContent() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [csvImporting, setCsvImporting] = useState(false)
  
  // ユーザー一覧
  const [users, setUsers] = useState<UserType[]>([])
  const [userDisplayNameMap, setUserDisplayNameMap] = useState<Record<string, string>>({})
  
  console.log('👤 現在のユーザー権限:', { isAdmin })
  
  // 企業データの入力率チェック対象フィールド
  const companyFields = [
    'name', 'address', 'email', 'phone', 'website', 'logo',
    'feature1', 'feature2', 'feature3', 'careerPath', 
    'youngRecruitReason', 'consultantId', 'contractType'
  ]
  
  // 企業の入力率を計算する関数
  const calculateCompletionRate = (company: Company): number => {
    let filledCount = 0
    companyFields.forEach(field => {
      const value = (company as any)[field]
      if (value !== null && value !== undefined && value !== '') {
        filledCount++
      }
    })
    return Math.round((filledCount / companyFields.length) * 100)
  }
  
  // フィルター・検索状態（URLパラメータから初期化）
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState<Company['status'] | 'all'>((searchParams.get('status') as Company['status']) || 'all')
  const [sizeFilter, setSizeFilter] = useState<Company['size'] | 'all'>((searchParams.get('size') as Company['size']) || 'all')
  const [dominoFilter, setDominoFilter] = useState<'all' | 'connected' | 'not_connected'>((searchParams.get('domino') as 'all' | 'connected' | 'not_connected') || 'all')
  const [consultantFilter, setConsultantFilter] = useState<string>(searchParams.get('consultant') || 'all')
  
  // ソート状態
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'updatedAt' | 'status'>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // 削除ダイアログ
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  
  // 一括削除ダイアログ
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [deletingBulk, setDeletingBulk] = useState(false)
  
  // 一括選択状態
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set())
  const [isAllSelected, setIsAllSelected] = useState(false)
  
  // アコーディオンの展開状態と店舗データ
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set())
  const [companyStores, setCompanyStores] = useState<Record<string, StoreType[]>>({})
  const [loadingStores, setLoadingStores] = useState<Set<string>>(new Set())
  
  // 店舗数キャッシュ
  const [storeCounts, setStoreCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    loadCompanies()
    loadUsers()
  }, [])

  // URLパラメータを更新する関数
  const updateURLParams = (params: { 
    search?: string
    status?: string
    size?: string
    domino?: string
    consultant?: string
  }) => {
    const newParams = new URLSearchParams()
    
    if (params.search) newParams.set('search', params.search)
    if (params.status && params.status !== 'all') newParams.set('status', params.status)
    if (params.size && params.size !== 'all') newParams.set('size', params.size)
    if (params.domino && params.domino !== 'all') newParams.set('domino', params.domino)
    if (params.consultant && params.consultant !== 'all') newParams.set('consultant', params.consultant)
    
    router.push(`/companies?${newParams.toString()}`)
  }

  const loadUsers = async () => {
    try {
      console.log('👥 ユーザー一覧を読み込み中...')
      const userData = await getActiveUsers()
      console.log(`📊 取得したユーザー数: ${userData.length}`)
      setUsers(userData)
      
      // ユーザーIDから表示名へのマップを作成
      const displayNameMap = userData.reduce((acc, user) => {
        acc[user.id] = user.displayName
        return acc
      }, {} as Record<string, string>)
      setUserDisplayNameMap(displayNameMap)
      
      console.log('✅ ユーザー表示名マップ作成完了:', displayNameMap)
    } catch (error) {
      console.error('❌ ユーザーデータの読み込みエラー:', error)
      // ユーザーデータの読み込みは必須ではないため、エラートーストは表示しない
    }
  }

  const loadCompanies = async () => {
    try {
      setLoading(true)
      console.log('📋 企業一覧を読み込み中...')
      const data = await getCompanies()
      console.log(`📊 取得した企業数: ${data.length}`)
      console.log('📝 取得した企業一覧:', data.map(c => ({ id: c.id, name: c.name })))
      setCompanies(data)
      
      // 各企業の店舗数を事前に読み込み
      console.log('🏪 店舗数を事前読み込み中...')
      const storeCountPromises = data.map(async (company) => {
        try {
          const stores = await getStoresByCompany(company.id)
          return { companyId: company.id, count: stores.length }
        } catch (error) {
          console.error(`❌ 企業「${company.name}」の店舗数取得エラー:`, error)
          return { companyId: company.id, count: 0 }
        }
      })
      
      const storeCountResults = await Promise.all(storeCountPromises)
      const storeCountsMap = storeCountResults.reduce((acc, { companyId, count }) => {
        acc[companyId] = count
        return acc
      }, {} as Record<string, number>)
      
      setStoreCounts(storeCountsMap)
      console.log('✅ 店舗数キャッシュ完了:', storeCountsMap)
      
    } catch (error) {
      console.error('❌ 企業データの読み込みエラー:', error)
      toast.error('企業データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCSVImport = async (file: File) => {
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('CSVファイルを選択してください')
      return
    }

    setCsvImporting(true)
    try {
      const text = await file.text()
      const result = await importCompaniesFromCSV(text)
      
      if (result.errors.length > 0) {
        toast.error(`インポート完了: 新規${result.success}件、更新${result.updated}件、エラー${result.errors.length}件`)
        console.error('Import errors:', result.errors)
      } else {
        const totalProcessed = result.success + result.updated
        if (result.updated > 0) {
          toast.success(`インポート完了: 新規${result.success}件、更新${result.updated}件（計${totalProcessed}件）`)
        } else {
          toast.success(`${result.success}件の企業データをインポートしました`)
        }
      }
      
      // データを再読み込み
      await loadCompanies()
    } catch (error) {
      console.error('Error importing CSV:', error)
      toast.error('CSVインポートに失敗しました')
    } finally {
      setCsvImporting(false)
    }
  }

  const downloadCSVTemplate = () => {
    const csvContent = generateCompaniesCSVTemplate()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'companies_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 店舗数を取得して表示するための関数（キャッシュから）
  const getStoreCount = (companyId: string): number => {
    return storeCounts[companyId] ?? 0
  }

  // 担当者の表示名を取得する関数
  const getAssignedToDisplayName = (company: Company): string => {
    // まずassignedToフィールドをチェック（Dominoから来るデータ）
    const assignedTo = (company as any).assignedTo
    if (assignedTo && userDisplayNameMap[assignedTo]) {
      return userDisplayNameMap[assignedTo]
    }
    if (assignedTo && typeof assignedTo === 'string') {
      // ユーザーマップにない場合、assignedToの値をそのまま表示
      return assignedTo
    }
    
    // 次にconsultantIdをチェック
    if (company.consultantId && userDisplayNameMap[company.consultantId]) {
      return userDisplayNameMap[company.consultantId]
    }
    
    return '-'
  }

  // 一括選択関連の関数
  const handleSelectAll = () => {
    if (!isAdmin) return
    
    if (isAllSelected) {
      setSelectedCompanies(new Set())
      setIsAllSelected(false)
    } else {
      const filteredCompanyIds = filteredAndSortedCompanies.map(company => company.id)
      setSelectedCompanies(new Set(filteredCompanyIds))
      setIsAllSelected(true)
    }
  }

  const handleSelectCompany = (companyId: string) => {
    if (!isAdmin) return
    
    const newSelected = new Set(selectedCompanies)
    if (newSelected.has(companyId)) {
      newSelected.delete(companyId)
    } else {
      newSelected.add(companyId)
    }
    setSelectedCompanies(newSelected)
    setIsAllSelected(newSelected.size === filteredAndSortedCompanies.length && filteredAndSortedCompanies.length > 0)
  }

  // 選択された企業のCSV出力
  const exportSelectedCompaniesCSV = () => {
    if (selectedCompanies.size === 0) {
      toast.error('エクスポートする企業を選択してください')
      return
    }

    const selectedCompanyData = companies.filter(company => selectedCompanies.has(company.id))
    
    // CSVヘッダー（CSVテンプレートと同じ形式 + ID）
    const headers = [
      'id',              // 企業ID（編集/新規判定用）
      'name',
      'address',
      'phone',
      'website',
      'email',
      'establishedYear',
      'employeeCount',
      'capital',
      'representative',
      'feature1',
      'feature2',
      'feature3',
      'careerPath',
      'youngRecruitReason',
      'logo',
      'status',
      'size',
      'isPublic',
      'hasHousingSupport',
      'fullTimeAgeGroup',
      'independenceRecord',
      'hasIndependenceSupport',
      'consultantId',
      'memo',
      'dominoId',
      'importedAt'
    ]

    // CSVデータを生成
    const csvRows = [
      headers.join(','),
      ...selectedCompanyData.map(company => {
        return headers.map(header => {
          let value = company[header as keyof Company] || ''
          
          // Boolean値を文字列に変換
          if (typeof value === 'boolean') {
            value = value.toString()
          }
          
          // Date値を文字列に変換
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0] // YYYY-MM-DD形式
          }
          
          // Firestore Timestampを文字列に変換
          if (value && typeof value === 'object' && 'toDate' in value && typeof (value as any).toDate === 'function') {
            value = (value as any).toDate().toISOString().split('T')[0] // YYYY-MM-DD形式
          }
          
          // CSVフィールドをエスケープ
          const stringValue = String(value)
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        }).join(',')
      })
    ]

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `companies_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success(`${selectedCompanies.size}件の企業データをエクスポートしました`)
  }

  // アコーディオンの切り替えと店舗データの読み込み
  const toggleStoreAccordion = async (companyId: string) => {
    const isExpanded = expandedCompanies.has(companyId)
    
    if (isExpanded) {
      // 閉じる
      const newExpanded = new Set(expandedCompanies)
      newExpanded.delete(companyId)
      setExpandedCompanies(newExpanded)
    } else {
      // 展開する
      const newExpanded = new Set(expandedCompanies)
      newExpanded.add(companyId)
      setExpandedCompanies(newExpanded)
      
      // 店舗データがまだ読み込まれていない場合は読み込む
      if (!companyStores[companyId]) {
        setLoadingStores(prev => new Set([...prev, companyId]))
        
        try {
          const stores = await getStoresByCompany(companyId)
          setCompanyStores(prev => ({
            ...prev,
            [companyId]: stores
          }))
        } catch (error) {
          console.error(`店舗データの読み込みに失敗しました (企業ID: ${companyId}):`, error)
          toast.error('店舗データの読み込みに失敗しました')
        } finally {
          setLoadingStores(prev => {
            const newLoading = new Set(prev)
            newLoading.delete(companyId)
            return newLoading
          })
        }
      }
    }
  }

  const handleDeleteCompany = async () => {
    if (!companyToDelete) {
      console.error('❌ 削除対象の企業が設定されていません')
      toast.error('削除対象の企業が選択されていません')
      return
    }

    console.log('🗑️ 企業削除を開始:', {
      id: companyToDelete.id,
      name: companyToDelete.name
    })

    try {
      await deleteCompany(companyToDelete.id)
      console.log('✅ 企業削除成功:', companyToDelete.name)
      toast.success(`「${companyToDelete.name}」を削除しました`)
      
    } catch (error) {
      console.error('❌ 企業削除エラー:', error)
      toast.error(`「${companyToDelete.name}」の削除に失敗しました: ${error}`)
    } finally {
      // 成功・失敗に関わらず一覧を更新（データ整合性確保）
      console.log('🔄 企業一覧を再読み込み中...')
      try {
        await loadCompanies()
        console.log('🎯 一覧更新完了')
      } catch (reloadError) {
        console.error('❌ 一覧再読み込みエラー:', reloadError)
        toast.error('一覧の更新に失敗しました。ページを再読み込みしてください。')
      }
      
      setDeleteDialogOpen(false)
      setCompanyToDelete(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCompanies.size === 0) {
      toast.error('削除する企業を選択してください')
      return
    }

    console.log('🗑️ 一括削除を開始:', {
      count: selectedCompanies.size,
      ids: Array.from(selectedCompanies)
    })

    setDeletingBulk(true)

    try {
      const selectedIds = Array.from(selectedCompanies)
      const selectedCompanyNames = companies
        .filter(c => selectedIds.includes(c.id))
        .map(c => c.name)
        .join('、')

      const result = await deleteMultipleCompanies(selectedIds)
      
      console.log('✅ 一括削除完了:', result)
      
      if (result.errors.length > 0) {
        toast.error(`一括削除完了: 成功 ${result.success}件、エラー ${result.errors.length}件`)
        console.error('❌ 一括削除エラー:', result.errors)
      } else {
        toast.success(`${result.success}件の企業とその関連データを削除しました`)
      }
      
    } catch (error) {
      console.error('❌ 一括削除エラー:', error)
      toast.error(`一括削除に失敗しました: ${error}`)
    } finally {
      setDeletingBulk(false)
      setBulkDeleteDialogOpen(false)
      setSelectedCompanies(new Set())
      setIsAllSelected(false)
      
      // 成功・失敗に関わらず一覧を更新
      console.log('🔄 企業一覧を再読み込み中...')
      try {
        await loadCompanies()
        console.log('🎯 一覧更新完了')
      } catch (reloadError) {
        console.error('❌ 一覧再読み込みエラー:', reloadError)
        toast.error('一覧の更新に失敗しました。ページを再読み込みしてください。')
      }
    }
  }

  const getStatusBadge = (status: Company['status']) => {
    return (
      <Badge className={statusColors[status]}>
        {statusLabels[status]}
      </Badge>
    )
  }

  // フィルタリング＆ソート済み企業リスト
  const filteredAndSortedCompanies = companies
    .filter(company => {
      const matchesSearch = (company.name && company.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (company.email && company.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (company.address && company.address.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesStatus = statusFilter === 'all' || company.status === statusFilter
      const matchesSize = sizeFilter === 'all' || company.size === sizeFilter
      
      // Domino連携フィルター
      const matchesDomino = dominoFilter === 'all' || 
                           (dominoFilter === 'connected' && company.dominoId) ||
                           (dominoFilter === 'not_connected' && !company.dominoId)
      
      // 担当者フィルター
      const matchesConsultant = consultantFilter === 'all' || 
                               company.consultantId === consultantFilter ||
                               (consultantFilter === 'unassigned' && (!company.consultantId || company.consultantId === ''))
      
      return matchesSearch && matchesStatus && matchesSize && matchesDomino && matchesConsultant
    })
    .sort((a, b) => {
      let valueA: string | Date
      let valueB: string | Date
      
      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
          break
        case 'createdAt':
          valueA = new Date(a.createdAt)
          valueB = new Date(b.createdAt)
          break
        case 'updatedAt':
          valueA = new Date(a.updatedAt)
          valueB = new Date(b.updatedAt)
          break
        case 'status':
          valueA = a.status
          valueB = b.status
          break
        default:
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
      }
      
      if (valueA < valueB) {
        return sortOrder === 'asc' ? -1 : 1
      }
      if (valueA > valueB) {
        return sortOrder === 'asc' ? 1 : -1
      }
      return 0
    })

  // ソート切り替えハンドラー
  const handleSort = (field: 'name' | 'createdAt' | 'updatedAt' | 'status') => {
    if (sortBy === field) {
      // 同じフィールドの場合は昇順・降順を切り替え
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // 異なるフィールドの場合は昇順に設定
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  // ソートアイコンを取得
  const getSortIcon = (field: 'name' | 'createdAt' | 'updatedAt' | 'status') => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />
  }

  // ソート可能なヘッダーコンポーネント
  const SortableHeader = ({ field, children }: { 
    field: 'name' | 'createdAt' | 'updatedAt' | 'status', 
    children: React.ReactNode 
  }) => (
    <TableHead 
      className="cursor-pointer hover:bg-gray-50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {getSortIcon(field)}
      </div>
    </TableHead>
  )

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">企業データを読み込み中...</span>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        {/* ページヘッダー - 緑系テーマ */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-full">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">企業管理</h1>
              <p className="text-green-100 mt-1">
                登録企業の管理・検索・Dominoシステムとの連携
              </p>
            </div>
          </div>
          
          {/* ヘッダーアクション */}
          <div className="flex flex-col sm:flex-col gap-2">
            <Button 
              onClick={loadCompanies}
              disabled={loading}
              variant="outline"
              className="bg-white text-blue-600 hover:bg-blue-50 border-white flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              更新
            </Button>

            {/* 管理者のみ表示 */}
            {isAdmin && (
              <>
                <Button
                  onClick={exportSelectedCompaniesCSV}
                  disabled={selectedCompanies.size === 0}
                  variant="outline"
                  className="bg-white text-blue-600 hover:bg-blue-50 border-white flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  選択した企業をCSV出力 ({selectedCompanies.size})
                </Button>

                <Button
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  disabled={selectedCompanies.size === 0}
                  variant="outline"
                  className="bg-red-600 text-white hover:bg-red-700 border-red-600 flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  選択した企業を削除 ({selectedCompanies.size})
                </Button>

                <Button
                  onClick={downloadCSVTemplate}
                  variant="outline"
                  className="bg-white text-blue-600 hover:bg-blue-50 border-white flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  CSVテンプレート
                </Button>
              </>
            )}
            
            {!isAdmin && (
              <Button
                onClick={downloadCSVTemplate}
                variant="outline"
                className="bg-white text-blue-600 hover:bg-blue-50 border-white flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                CSVテンプレート
              </Button>
            )}
            <div className="relative">
              <input
                type="file"
                id="csv-upload"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleCSVImport(file)
                    // ファイル選択をリセット
                    e.target.value = ''
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={csvImporting}
              />
              <Button
                variant="outline"
                className="bg-white text-blue-600 hover:bg-blue-50 border-white flex items-center gap-2"
                disabled={csvImporting}
              >
                {csvImporting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                CSVインポート
              </Button>
            </div>
            <Link href="/companies/new">
              <Button variant="outline" className="bg-white text-blue-600 hover:bg-blue-50 border-white">
                <Plus className="h-4 w-4 mr-2" />
                新規企業追加
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 検索・フィルター */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            検索・フィルター・ソート
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* 検索 */}
            <div>
              <Label htmlFor="company-search">企業名・住所</Label>
              <Input
                id="company-search"
                placeholder="企業名・住所で検索..."
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value
                  setSearchTerm(value)
                  updateURLParams({ search: value, status: statusFilter, size: sizeFilter, domino: dominoFilter, consultant: consultantFilter })
                }}
                className="w-full"
              />
            </div>
            
            {/* ステータスフィルター */}
            <div>
              <Label htmlFor="company-status">ステータス</Label>
              <Select value={statusFilter} onValueChange={(value: Company['status'] | 'all') => {
                setStatusFilter(value)
                updateURLParams({ search: searchTerm, status: value, size: sizeFilter, domino: dominoFilter, consultant: consultantFilter })
              }}>
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
              <Select value={sizeFilter} onValueChange={(value: Company['size'] | 'all') => {
                setSizeFilter(value)
                updateURLParams({ search: searchTerm, status: statusFilter, size: value, domino: dominoFilter, consultant: consultantFilter })
              }}>
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
              <Select value={dominoFilter} onValueChange={(value: 'all' | 'connected' | 'not_connected') => {
                setDominoFilter(value)
                updateURLParams({ search: searchTerm, status: statusFilter, size: sizeFilter, domino: value, consultant: consultantFilter })
              }}>
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
              <Select value={consultantFilter} onValueChange={(value) => {
                setConsultantFilter(value)
                updateURLParams({ search: searchTerm, status: statusFilter, size: sizeFilter, domino: dominoFilter, consultant: value })
              }}>
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
            
            {/* ソート選択 */}
            <div>
              <Label htmlFor="company-sort">ソート</Label>
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-') as [typeof sortBy, typeof sortOrder]
                setSortBy(field)
                setSortOrder(order)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="並び順" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">企業名（昇順）</SelectItem>
                  <SelectItem value="name-desc">企業名（降順）</SelectItem>
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

      {/* 企業リスト */}
      <Card>
        <CardHeader>
          <CardTitle>企業リスト ({filteredAndSortedCompanies.length}件)</CardTitle>
          <CardDescription>
            登録企業の一覧と管理
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAndSortedCompanies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {companies.length === 0 ? '企業が登録されていません' : '検索条件に一致する企業がありません'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={companies.length > 0 && selectedCompanies.size === companies.length}
                        onCheckedChange={handleSelectAll}
                        aria-label="全て選択"
                      />
                    </TableHead>
                  )}
                  <SortableHeader field="name">企業名</SortableHeader>
                  <SortableHeader field="status">ステータス</SortableHeader>
                  <TableHead>契約状況</TableHead>
                  <TableHead>入力率</TableHead>
                  <TableHead>Domino連携</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead>店舗数</TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedCompanies.map((company) => {
                  const isInactive = company.status === 'inactive'
                  const isExpanded = expandedCompanies.has(company.id)
                  const storeCount = getStoreCount(company.id)
                  const stores = companyStores[company.id] || []
                  const isLoadingStores = loadingStores.has(company.id)
                  
                  return (
                    <React.Fragment key={company.id}>
                      <TableRow 
                        className={`${isInactive ? 'bg-gray-300 hover:bg-gray-400' : ''} ${company.contractType === 'free_only' ? 'bg-gray-100' : ''}`}
                      >
                        {isAdmin && (
                          <TableCell>
                            <Checkbox
                              checked={selectedCompanies.has(company.id)}
                              onCheckedChange={() => handleSelectCompany(company.id)}
                              aria-label={`${company.name}を選択`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          <Link href={`/companies/${company.id}`} className="hover:text-blue-600 hover:underline">
                            <div className="font-semibold">{company.name}</div>
                          </Link>
                        </TableCell>
                        <TableCell>{getStatusBadge(company.status)}</TableCell>
                        <TableCell>
                          {company.contractType ? (
                            <Badge className={company.contractType === 'paid' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}>
                              {company.contractType === 'paid' ? '有料紹介可' : '無料のみ'}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">未設定</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const rate = calculateCompletionRate(company)
                            return (
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-gray-200 rounded overflow-hidden">
                                  <div 
                                    className={`h-2 ${
                                      rate >= 80 ? 'bg-green-500' :
                                      rate >= 50 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${rate}%` }} 
                                  />
                                </div>
                                <span className={`text-sm font-medium ${
                                  rate >= 80 ? 'text-green-600' :
                                  rate >= 50 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {rate}%
                                </span>
                              </div>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {company.dominoId ? (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-green-700 font-medium">連携済み</span>
                                <a
                                  href={`https://sushi-domino.vercel.app/companies/${company.dominoId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 underline font-mono"
                                >
                                  {company.dominoId.length > 10 
                                    ? `${company.dominoId.substring(0, 10)}...`
                                    : company.dominoId
                                  }
                                </a>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <span className="text-xs text-gray-500">未連携</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-700">
                              {getAssignedToDisplayName(company)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => toggleStoreAccordion(company.id)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Store className="h-4 w-4" />
                            <span>{storeCount}件</span>
                            {storeCount > 0 && (
                              isExpanded ? 
                                <ChevronUp className="h-4 w-4" /> : 
                                <ChevronDown className="h-4 w-4" />
                            )}
                            {isLoadingStores && (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/companies/${company.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {isAdmin && (
                              <Link href={`/companies/${company.id}/edit`}>
                                <Button variant="outline" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                            {isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  console.log('🗑️ 削除ボタンクリック:', {
                                    companyId: company.id,
                                    companyName: company.name
                                  })
                                  setCompanyToDelete(company)
                                  setDeleteDialogOpen(true)
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* 店舗一覧のアコーディオン */}
                      {isExpanded && storeCount > 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-gray-50 p-0">
                            <div className="p-4">
                              <h4 className="font-medium mb-3 text-gray-700">店舗一覧 ({storeCount}件)</h4>
                              <div className="grid gap-2">
                                {stores.map((store) => (
                                  <div
                                    key={store.id}
                                    className="bg-white p-3 rounded border border-gray-200 flex justify-between items-start"
                                  >
                                    <div>
                                      <div className="font-medium">
                                        {store.name}
                                        {store.prefecture && (
                                          <span className="ml-2 text-gray-500">【{store.prefecture}】</span>
                                        )}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {store.address && <div>📍 {store.address}</div>}
                                        {store.website && <div>🌐 <a href={store.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{store.website}</a></div>}
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      <Link href={`/stores/${store.id}`}>
                                        <Button variant="outline" size="sm">
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                      </Link>
                                      {isAdmin && (
                                        <Link href={`/stores/${store.id}/edit`}>
                                          <Button variant="outline" size="sm">
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                        </Link>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>企業の削除</DialogTitle>
            <DialogDescription>
              「{companyToDelete?.name}」を削除しますか？
              この操作は取り消すことができません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCompany}
            >
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 一括削除確認ダイアログ */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>企業の一括削除</DialogTitle>
            <DialogDescription>
              選択された{selectedCompanies.size}件の企業とその関連データ（店舗・求人）を削除しますか？
              <br />
              <strong className="text-red-600">この操作は取り消すことができません。</strong>
              <br />
              <br />
              削除対象企業：
              <br />
              {companies
                .filter(c => selectedCompanies.has(c.id))
                .map(c => c.name)
                .join('、')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={deletingBulk}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deletingBulk}
            >
              {deletingBulk ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  削除中...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {selectedCompanies.size}件削除
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </ProtectedRoute>
  )
}

export default function CompaniesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">読み込み中...</div>
        </div>
      </div>
    }>
      <CompaniesPageContent />
    </Suspense>
  )
}