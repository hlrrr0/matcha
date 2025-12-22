"use client"

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Store as StoreIcon, 
  Plus, 
  Search, 
  ExternalLink,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Building2,
  Download,
  Upload,
  FileText,
  User as UserIcon
} from 'lucide-react'
import { Store, statusLabels } from '@/types/store'
import { getStores, deleteStore } from '@/lib/firestore/stores'
import { getCompanies } from '@/lib/firestore/companies'
import { getUsers } from '@/lib/firestore/users'
import { Company } from '@/types/company'
import { User } from '@/types/user'
import { importStoresFromCSV, generateStoresCSVTemplate } from '@/lib/csv/stores'
import { toast } from 'sonner'

const statusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-red-100 text-red-800',
}

export default function StoresPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">読み込み中...</div>
          </div>
        </div>
      }>
        <StoresPageContent />
      </Suspense>
    </ProtectedRoute>
  )
}

function StoresPageContent() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [stores, setStores] = useState<Store[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [csvImporting, setCsvImporting] = useState(false)
  
  // 店舗データの入力率チェック対象フィールド
  const storeFields = [
    'name', 'address', 'nearestStation', 'unitPriceLunch', 'unitPriceDinner',
    'seatCount', 'website', 'ownerPhoto', 'interiorPhoto'
  ]
  
  // 店舗の入力率を計算する関数
  const calculateCompletionRate = (store: Store): number => {
    let filledCount = 0
    storeFields.forEach(field => {
      const value = (store as any)[field]
      if (value !== null && value !== undefined && value !== '') {
        filledCount++
      }
    })
    return Math.round((filledCount / storeFields.length) * 100)
  }
  
  // フィルター・検索状態
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<Store['status'] | 'all'>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  
  // ソート状態
  const [sortBy, setSortBy] = useState<'name' | 'companyName' | 'createdAt' | 'updatedAt' | 'status'>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // 複数選択・削除状態
  const [selectedStores, setSelectedStores] = useState<string[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // ソートハンドラー関数
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      // 同じカラムをクリックした場合は昇順・降順を切り替え
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // 異なるカラムをクリックした場合は、そのカラムで降順ソート
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  // URLパラメータから初期値を設定
  useEffect(() => {
    const companyParam = searchParams.get('company')
    const searchParam = searchParams.get('search')
    const statusParam = searchParams.get('status')
    
    if (companyParam) {
      setCompanyFilter(companyParam)
    }
    if (searchParam) {
      setSearchTerm(searchParam)
    }
    if (statusParam && (statusParam === 'active' || statusParam === 'inactive')) {
      setStatusFilter(statusParam as Store['status'])
    }
  }, [searchParams])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [storesData, companiesData, usersData] = await Promise.all([
        getStores(),
        getCompanies(),
        getUsers()
      ])
      setStores(storesData)
      setCompanies(companiesData)
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading data:', error)
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
      const result = await importStoresFromCSV(text)
      
      if (result.errors.length > 0) {
        toast.error(`インポート完了: 新規${result.success}件、更新${result.updated}件、エラー${result.errors.length}件`)
        console.error('Import errors:', result.errors)
      } else {
        const totalProcessed = result.success + result.updated
        if (result.updated > 0) {
          toast.success(`インポート完了: 新規${result.success}件、更新${result.updated}件（計${totalProcessed}件）`)
        } else {
          toast.success(`${result.success}件の店舗データをインポートしました`)
        }
      }
      
      // データを再読み込み
      await loadData()
    } catch (error) {
      console.error('Error importing CSV:', error)
      toast.error('CSVインポートに失敗しました')
    } finally {
      setCsvImporting(false)
    }
  }

  const downloadCSVTemplate = () => {
    const csvContent = generateStoresCSVTemplate()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'stores_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDeleteStore = async (store: Store) => {
    if (confirm(`${store.name}を削除しますか？この操作は取り消せません。`)) {
      try {
        await deleteStore(store.id)
        await loadData()
      } catch (error) {
        console.error('店舗の削除に失敗しました:', error)
        alert('店舗の削除に失敗しました。')
      }
    }
  }

  // 複数選択機能
  const handleSelectStore = (storeId: string, checked: boolean) => {
    if (checked) {
      setSelectedStores(prev => [...prev, storeId])
    } else {
      setSelectedStores(prev => prev.filter(id => id !== storeId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStores(filteredAndSortedStores.map(store => store.id))
    } else {
      setSelectedStores([])
    }
  }

  const handleBulkDelete = async () => {
    if (selectedStores.length === 0) {
      alert('削除する店舗を選択してください。')
      return
    }

    const confirmMessage = `選択した${selectedStores.length}件の店舗を削除しますか？この操作は取り消せません。`
    if (!confirm(confirmMessage)) {
      return
    }

    setBulkDeleting(true)
    try {
      const deletePromises = selectedStores.map(storeId => deleteStore(storeId))
      await Promise.all(deletePromises)
      
      setSelectedStores([])
      await loadData()
      alert(`${selectedStores.length}件の店舗を削除しました。`)
    } catch (error) {
      console.error('一括削除中にエラー:', error)
      alert('一部の店舗の削除に失敗しました。')
    } finally {
      setBulkDeleting(false)
    }
  }

  // 選択された店舗のCSV出力
  const exportSelectedStoresCSV = () => {
    if (selectedStores.length === 0) {
      toast.error('エクスポートする店舗を選択してください')
      return
    }

    const selectedStoreData = stores.filter(store => selectedStores.includes(store.id))
    
    // CSVヘッダー（CSVテンプレートと同じ形式 + ID）
    const headers = [
      'id',                     // 店舗ID（編集/新規判定用）
      'name',
      'companyId',
      'address',
      'nearestStation',
      'website',
      'unitPriceLunch',
      'unitPriceDinner',
      'seatCount',
      'isReservationRequired',
      'instagramUrl',
      'tabelogUrl',
      'googleReviewScore',
      'tabelogScore',
      'reputation',
      'staffReview',
      'trainingPeriod',
      'ownerPhoto',
      'ownerVideo',
      'interiorPhoto',
      'photo1',
      'photo2',
      'photo3',
      'photo4',
      'photo5',
      'photo6',
      'photo7',
      'status'
    ]

    // CSVデータを生成
    const csvRows = [
      headers.join(','),
      ...selectedStoreData.map(store => {
        return headers.map(header => {
          let value = store[header as keyof Store] || ''
          
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
    link.setAttribute('download', `stores_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success(`${selectedStores.length}件の店舗データをエクスポートしました`)
  }

  // URLパラメータを更新する関数
  const updateURLParams = (params: { search?: string; status?: string; company?: string }) => {
    const newParams = new URLSearchParams()
    
    if (params.search) {
      newParams.set('search', params.search)
    }
    if (params.status && params.status !== 'all') {
      newParams.set('status', params.status)
    }
    if (params.company && params.company !== 'all') {
      newParams.set('company', params.company)
    }
    
    const newURL = newParams.toString() ? `/stores?${newParams.toString()}` : '/stores'
    router.push(newURL, { scroll: false })
  }

  // フィルター変更時にURLを更新
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    updateURLParams({ search: value, status: statusFilter, company: companyFilter })
  }

  const handleStatusFilterChange = (value: Store['status'] | 'all') => {
    setStatusFilter(value)
    updateURLParams({ search: searchTerm, status: value, company: companyFilter })
  }

  const handleCompanyFilterChange = (value: string) => {
    setCompanyFilter(value)
    updateURLParams({ search: searchTerm, status: statusFilter, company: value })
  }

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId)
    return company?.name || '不明な企業'
  }

  const getCompany = (companyId: string) => {
    return companies.find(c => c.id === companyId)
  }

  const filteredAndSortedStores = stores.filter(store => {
    const matchesSearch = (store.name && store.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         getCompanyName(store.companyId).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (store.address && store.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (store.nearestStation && store.nearestStation.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || store.status === statusFilter
    const matchesCompany = companyFilter === 'all' || store.companyId === companyFilter

    return matchesSearch && matchesStatus && matchesCompany
  }).sort((a, b) => {
    let aValue: any
    let bValue: any
    
    switch (sortBy) {
      case 'name':
        aValue = (a.name || '').toLowerCase()
        bValue = (b.name || '').toLowerCase()
        break
      case 'companyName':
        aValue = getCompanyName(a.companyId).toLowerCase()
        bValue = getCompanyName(b.companyId).toLowerCase()
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime()
        bValue = new Date(b.createdAt).getTime()
        break
      case 'updatedAt':
        aValue = new Date(a.updatedAt).getTime()
        bValue = new Date(b.updatedAt).getTime()
        break
      default:
        return 0
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const getStatusBadge = (status: Store['status']) => {
    const color = statusColors[status] || 'bg-gray-100 text-gray-800'
    return (
      <Badge className={color}>
        {statusLabels[status]}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">店舗データを読み込み中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ページヘッダー - オレンジ系テーマ */}
      <div className="mb-8 p-6 bg-gradient-to-r from-green-500 to-green-600 rounded-lg text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-full">
              <StoreIcon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">店舗管理</h1>
              <p className="text-orange-100 mt-1">
                登録店舗の管理・検索・業態別分析
              </p>
            </div>
          </div>
          
          {/* ヘッダーアクション */}
          <div className="flex flex-col sm:flex-col gap-2">
            <Button
              onClick={downloadCSVTemplate}
              variant="outline"
              className="bg-white text-green-600 hover:bg-green-50 border-white flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              CSVテンプレート
            </Button>
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Button
                variant="outline"
                className="bg-white text-green-600 hover:bg-green-50 border-white flex items-center gap-2"
                disabled={csvImporting}
                asChild
              >
                <span>
                  {csvImporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      インポート中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      CSVインポート
                    </>
                  )}
                </span>
              </Button>
            </label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleCSVImport(file)
                  e.target.value = '' // リセット
                }
              }}
            />
            <Link href="/stores/new">
              <Button variant="outline" className="bg-white text-green-600 hover:bg-green-50 border-white">
                <Plus className="h-4 w-4 mr-2" />
                新規店舗追加
              </Button>
            </Link>
            {isAdmin && selectedStores.length > 0 && (
              <>
                <Button 
                  variant="outline" 
                  onClick={exportSelectedStoresCSV}
                  className="bg-white text-green-600 hover:bg-green-50 border-white flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  選択した{selectedStores.length}件をCSV出力
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {bulkDeleting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      削除中...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      選択した{selectedStores.length}件を削除
                    </>
                  )}
                </Button>
              </>
            )}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 検索 */}
            <div>
              <Label htmlFor="store-search">店舗名・企業名・住所</Label>
              <Input
                id="store-search"
                placeholder="店舗名・企業名で検索..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full"
              />
            </div>
            
            {/* ステータスフィルター */}
            <div>
              <Label htmlFor="store-status">ステータス</Label>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
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
            
            {/* ソート選択 */}
            <div>
              <Label htmlFor="store-search">ソート</Label>
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-') as [typeof sortBy, typeof sortOrder]
                setSortBy(field)
                setSortOrder(order)
              }}>
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

      {/* 店舗リスト */}
      <Card>
        <CardHeader>
          <CardTitle>店舗リスト ({filteredAndSortedStores.length}件)</CardTitle>
          <CardDescription>
            登録店舗の一覧と管理
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAndSortedStores.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {stores.length === 0 ? '店舗が登録されていません' : '検索条件に一致する店舗がありません'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedStores.length === filteredAndSortedStores.length && filteredAndSortedStores.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      店舗名
                      {sortBy === 'name' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('companyName')}
                  >
                    <div className="flex items-center gap-1">
                      企業名
                      {sortBy === 'companyName' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>所在地</TableHead>
                  <TableHead>入力率</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      取引状況
                      {sortBy === 'status' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>外部リンク</TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedStores.map((store: Store) => (
                  <TableRow key={store.id}>
                    {isAdmin && (
                      <TableCell>
                        <Checkbox
                          checked={selectedStores.includes(store.id)}
                          onCheckedChange={(checked) => handleSelectStore(store.id, checked as boolean)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div className="font-semibold">
                        {store.name}
                        {store.prefecture && (
                          <span className="ml-2 text-gray-500 font-normal">【{store.prefecture}】</span>
                        )}
                      </div>
                      {/* タグ表示 */}
                      {(store.tags?.michelinStars || store.tags?.hasBibGourmand || store.tags?.tabelogAward || store.tags?.hasTabelogAward || store.tags?.goetMiyoScore) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {store.tags.michelinStars && store.tags.michelinStars > 0 && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                              ⭐ ミシュラン獲得店
                            </Badge>
                          )}
                          {store.tags.hasBibGourmand && (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                              🍽️ ミシュランビブグルマン
                            </Badge>
                          )}
                          {store.tags.tabelogAward && store.tags.tabelogAward.length > 0 && (
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                              📖 食べログ100名店
                            </Badge>
                          )}
                          {store.tags.hasTabelogAward && (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              🏆 食べログアワード
                            </Badge>
                          )}
                          {store.tags.goetMiyoScore && store.tags.goetMiyoScore > 0 && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              🍷 ゴ・エ・ミヨ掲載店
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getCompanyName(store.companyId) ? (
                      <Link 
                        href={`/companies/${store.companyId}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {getCompanyName(store.companyId)}
                      </Link>
                    ) : (
                      <span className="text-gray-500">企業情報なし</span>
                    )}</TableCell>
                    <TableCell className="max-w-xs truncate">{store.address}</TableCell>
                    <TableCell>
                      {(() => {
                        const rate = calculateCompletionRate(store)
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
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">
                          {(() => {
                            const company = getCompany(store.companyId)
                            if (!company?.consultantId) return '-'
                            const user = users.find(u => u.id === company.consultantId)
                            return user?.displayName || user?.email || '不明'
                          })()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(store.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {store.website && (
                          <Link href={store.website} target="_blank">
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                        {store.tabelogUrl && (
                          <Link href={store.tabelogUrl} target="_blank">
                            <Button variant="outline" size="sm" className="text-orange-600">
                              🍽️
                            </Button>
                          </Link>
                        )}
                        {store.instagramUrl && (
                          <Link href={store.instagramUrl} target="_blank">
                            <Button variant="outline" size="sm" className="text-pink-600">
                              📷
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/stores/${store.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/stores/${store.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteStore(store)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
