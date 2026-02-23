'use client'

import React, { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { RefreshCw, Download, Search, ExternalLink, AlertCircle, CheckCircle2, XCircle, Pencil, FileSpreadsheet } from 'lucide-react'
import { authenticatedGet, authenticatedPost } from '@/lib/api-client'
import { toast } from 'sonner'
import Link from 'next/link'

interface IndeedCompanyStatus {
  id: string
  name: string
  normalizedName: string
  indeedStatus: {
    detected: boolean
    detectedBy: 'agent' | 'external' | null
    indeedUrl?: string
    lastCheckedAt?: string
    error?: string
  } | null
}

interface StatusSummary {
  total: number
  detected: number
  notDetected: number
  error: number
  unchecked: number
}

export default function IndeedManagementPage() {
  const { isAdmin } = useAuth()
  const [companies, setCompanies] = useState<IndeedCompanyStatus[]>([])
  const [summary, setSummary] = useState<StatusSummary>({ total: 0, detected: 0, notDetected: 0, error: 0, unchecked: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [triggering, setTriggering] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportingIndeed, setExportingIndeed] = useState(false)
  const [editingCompany, setEditingCompany] = useState<IndeedCompanyStatus | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [editDetected, setEditDetected] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set())

  const loadStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/indeed/status?filter=${filter}`)
      const data = await response.json()
      if (data.success) {
        setCompanies(data.companies)
        setSummary(data.summary)
      } else {
        toast.error('ステータスの取得に失敗しました')
      }
    } catch (error) {
      console.error('Indeed ステータス取得エラー:', error)
      toast.error('ステータスの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [filter])

  const handleTriggerAll = async () => {
    if (!confirm('全企業のIndeedチェックを実行しますか？\n完了まで数分かかります。')) return

    setTriggering(true)
    try {
      const response = await fetch('/api/indeed/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.error || 'トリガーに失敗しました')
      }
    } catch (error) {
      console.error('Indeed トリガーエラー:', error)
      toast.error('トリガーに失敗しました')
    } finally {
      setTriggering(false)
    }
  }

  const handleTriggerSingle = async (companyId: string, companyName: string) => {
    try {
      const response = await fetch('/api/indeed/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`「${companyName}」のチェック完了`)
        await loadStatus()
      } else {
        toast.error(data.error || 'チェックに失敗しました')
      }
    } catch (error) {
      console.error('Indeed 単体チェックエラー:', error)
      toast.error('チェックに失敗しました')
    }
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/indeed/export-csv?markExported=true')
      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('text/csv')) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `indeed_jobs_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('CSVエクスポートが完了しました')
      } else {
        const data = await response.json()
        toast.info(data.message || 'エクスポート対象の求人がありません')
      }
    } catch (error) {
      console.error('CSV エクスポートエラー:', error)
      toast.error('CSVエクスポートに失敗しました')
    } finally {
      setExporting(false)
    }
  }

  const handleExportIndeedCSV = async () => {
    setExportingIndeed(true)
    try {
      // 選択した企業IDをクエリパラメータとして追加
      const companyIdsParam = selectedCompanyIds.size > 0
        ? `companyIds=${[...selectedCompanyIds].join(',')}`
        : ''
      const response = await fetch(`/api/indeed/export-indeed-csv?${companyIdsParam}`)
      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('text/csv')) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `indeed_template_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Indeedテンプレート形式のCSVをエクスポートしました')
      } else {
        const data = await response.json()
        toast.info(data.message || 'エクスポート対象の求人がありません')
      }
    } catch (error) {
      console.error('Indeed テンプレートCSVエクスポートエラー:', error)
      toast.error('CSVエクスポートに失敗しました')
    } finally {
      setExportingIndeed(false)
    }
  }

  const handleSelectCompany = (companyId: string, checked: boolean) => {
    const newSet = new Set(selectedCompanyIds)
    if (checked) {
      newSet.add(companyId)
    } else {
      newSet.delete(companyId)
    }
    setSelectedCompanyIds(newSet)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCompanyIds(new Set(companies.map(c => c.id)))
    } else {
      setSelectedCompanyIds(new Set())
    }
  }

  const handleMarkNotDetected = async (companyId: string, companyName: string) => {
    try {
      const response = await fetch('/api/indeed/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          indeedUrl: null,
          detected: false,
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`「${companyName}」を掲載なしに更新しました`)
        await loadStatus()
      } else {
        toast.error(data.error || '更新に失敗しました')
      }
    } catch (error) {
      console.error('Indeed ステータス更新エラー:', error)
      toast.error('更新に失敗しました')
    }
  }

  const openEditDialog = (company: IndeedCompanyStatus) => {
    setEditingCompany(company)
    setEditUrl(company.indeedStatus?.indeedUrl || '')
    setEditDetected(company.indeedStatus?.detected ?? false)
  }

  const handleSaveUrl = async () => {
    if (!editingCompany) return
    setSaving(true)
    try {
      const response = await fetch('/api/indeed/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: editingCompany.id,
          indeedUrl: editUrl.trim() || null,
          detected: editUrl.trim() ? editDetected : false,
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`「${editingCompany.name}」のIndeed情報を更新しました`)
        setEditingCompany(null)
        await loadStatus()
      } else {
        toast.error(data.error || '更新に失敗しました')
      }
    } catch (error) {
      console.error('Indeed ステータス更新エラー:', error)
      toast.error('更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateVal?: any) => {
    if (!dateVal) return '-'
    try {
      // Firestore Timestamp オブジェクト対応
      const date = dateVal._seconds
        ? new Date(dateVal._seconds * 1000)
        : new Date(dateVal)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '-'
    }
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Indeed 掲載管理</h1>
            <p className="text-gray-500 text-sm mt-1">
              企業のIndeed掲載状況を確認し、出稿可能な求人を管理します
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadStatus()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              更新
            </Button>
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTriggerAll}
                  disabled={triggering}
                >
                  <Search className={`h-4 w-4 mr-2 ${triggering ? 'animate-spin' : ''}`} />
                  全企業チェック
                </Button>
                <Button
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={exporting}
                >
                  <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
                  CSVエクスポート
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={handleExportIndeedCSV}
                  disabled={exportingIndeed}
                >
                  <FileSpreadsheet className={`h-4 w-4 mr-2 ${exportingIndeed ? 'animate-spin' : ''}`} />
                  Indeed求人CSV
                  {selectedCompanyIds.size > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedCompanyIds.size}
                    </Badge>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-xs text-gray-500">全アクティブ企業</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-orange-600">{summary.detected}</div>
              <div className="text-xs text-gray-500">Indeed掲載あり</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-green-600">{summary.notDetected}</div>
              <div className="text-xs text-gray-500">Indeed掲載なし</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-red-600">{summary.error}</div>
              <div className="text-xs text-gray-500">エラー</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-gray-400">{summary.unchecked}</div>
              <div className="text-xs text-gray-500">未チェック</div>
            </CardContent>
          </Card>
        </div>

        {/* フィルター＋テーブル */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">企業別 Indeed ステータス</CardTitle>
                <CardDescription>{companies.length}件表示中</CardDescription>
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="フィルター" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="detected">掲載あり</SelectItem>
                  <SelectItem value="not_detected">掲載なし</SelectItem>
                  <SelectItem value="error">エラー</SelectItem>
                  <SelectItem value="unchecked">未チェック</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-gray-500">読み込み中...</span>
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                該当する企業がありません
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedCompanyIds.size > 0 && selectedCompanyIds.size === companies.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>企業名</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>検出元</TableHead>
                    <TableHead>最終チェック</TableHead>
                    <TableHead>Indeed URL</TableHead>
                    <TableHead className="text-right">アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedCompanyIds.has(company.id)}
                          onChange={(e) => handleSelectCompany(company.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/companies/${company.id}`}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {company.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {company.indeedStatus ? (
                          company.indeedStatus.error ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              エラー
                            </Badge>
                          ) : company.indeedStatus.detected ? (
                            <Badge className="bg-orange-100 text-orange-800 text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              掲載あり
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              掲載なし
                            </Badge>
                          )
                        ) : (
                          <Badge variant="secondary" className="text-xs">未チェック</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {company.indeedStatus?.detectedBy === 'agent' ? (
                          <Badge variant="outline" className="text-xs">Agent</Badge>
                        ) : company.indeedStatus?.detectedBy === 'external' ? (
                          <Badge variant="outline" className="text-xs">外部</Badge>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {formatDate(company.indeedStatus?.lastCheckedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {company.indeedStatus?.indeedUrl ? (
                            <a
                              href={company.indeedStatus.indeedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[120px]"
                              title={company.indeedStatus.indeedUrl}
                            >
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              確認
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                              onClick={() => openEditDialog(company)}
                              title="URLを編集"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && (
                          <div className="flex items-center justify-end gap-1">
                            {(company.indeedStatus?.error || company.indeedStatus?.detected) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                                onClick={() => handleMarkNotDetected(company.id, company.name)}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                掲載なし
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleTriggerSingle(company.id, company.name)}
                            >
                              <Search className="h-3 w-3 mr-1" />
                              チェック
                            </Button>
                            <a
                              href={`https://www.google.com/search?q=${encodeURIComponent(`site:jp.indeed.com/cmp/ "${company.name}"`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Googleで検索"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        {/* Indeed URL 編集ダイアログ */}
        <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Indeed 情報を編集</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-gray-700">企業名</label>
                <p className="text-sm text-gray-900 mt-1">{editingCompany?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Indeed URL</label>
                <Input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://jp.indeed.com/cmp/企業名"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  空にするとIndeed掲載なしに設定されます
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editDetected"
                  checked={editDetected}
                  onChange={(e) => setEditDetected(e.target.checked)}
                  className="rounded border-gray-300"
                  disabled={!editUrl.trim()}
                />
                <label htmlFor="editDetected" className="text-sm text-gray-700">
                  Indeed掲載あり
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCompany(null)} disabled={saving}>
                キャンセル
              </Button>
              <Button onClick={handleSaveUrl} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
