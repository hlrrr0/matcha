"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TrendingUp, Eye, RefreshCw, Filter } from 'lucide-react'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Match } from '@/types/matching'
import Link from 'next/link'

interface RelatedMatch extends Match {
  candidateName?: string
  jobTitle?: string
  companyName?: string
  storeName?: string
}

interface Props {
  type: 'company' | 'store' | 'job'
  entityId: string
  entityName?: string
}

const statusLabels: Record<Match['status'], string> = {
  pending_proposal: '提案待ち',
  suggested: '提案済み',
  applied: '応募済み',
  document_screening: '書類選考中',
  document_passed: '書類選考通過',
  interview: '面接',
  interview_passed: '面接通過',
  offer: '内定',
  offer_accepted: '内定承諾',
  rejected: '不合格',
  withdrawn: '辞退'
}

const statusColors: Record<Match['status'], string> = {
  pending_proposal: 'bg-slate-100 text-slate-800',
  suggested: 'bg-blue-100 text-blue-800',
  applied: 'bg-purple-100 text-purple-800',
  document_screening: 'bg-yellow-100 text-yellow-800',
  document_passed: 'bg-cyan-100 text-cyan-800',
  interview: 'bg-orange-100 text-orange-800',
  interview_passed: 'bg-teal-100 text-teal-800',
  offer: 'bg-green-100 text-green-800',
  offer_accepted: 'bg-green-600 text-white',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800'
}

// ステータスをグループ化
const statusGroups = {
  active: ['pending_proposal', 'suggested', 'applied', 'document_screening', 'document_passed', 'interview', 'interview_passed', 'offer'] as Match['status'][],
  completed: ['offer_accepted'] as Match['status'][],
  inactive: ['rejected', 'withdrawn'] as Match['status'][]
}

export default function RelatedMatches({ type, entityId, entityName }: Props) {
  const [matches, setMatches] = useState<RelatedMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [showActive, setShowActive] = useState(true)
  const [showCompleted, setShowCompleted] = useState(true)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    loadMatches()
  }, [entityId])

  const loadMatches = async () => {
    try {
      setLoading(true)
      
      let matchesQuery
      
      // エンティティタイプに応じてクエリを作成
      if (type === 'company') {
        matchesQuery = query(
          collection(db, 'matches'),
          where('companyId', '==', entityId)
        )
      } else if (type === 'store') {
        // 求人から該当店舗を探し、その求人IDでマッチングを検索
        const jobsQuery = query(
          collection(db, 'jobs'),
          where('storeId', '==', entityId)
        )
        const jobsSnapshot = await getDocs(jobsQuery)
        const jobIds = jobsSnapshot.docs.map(doc => doc.id)
        
        if (jobIds.length === 0) {
          setMatches([])
          setLoading(false)
          return
        }
        
        // Firestoreの制限により、in演算子は最大10個まで
        const allMatches: RelatedMatch[] = []
        for (let i = 0; i < jobIds.length; i += 10) {
          const batch = jobIds.slice(i, i + 10)
          const batchQuery = query(
            collection(db, 'matches'),
            where('jobId', 'in', batch)
          )
          const batchSnapshot = await getDocs(batchQuery)
          allMatches.push(...batchSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as RelatedMatch)))
        }
        
        await enrichMatchesData(allMatches)
        setMatches(allMatches)
        setLoading(false)
        return
      } else {
        // job
        matchesQuery = query(
          collection(db, 'matches'),
          where('jobId', '==', entityId)
        )
      }
      
      const matchesSnapshot = await getDocs(matchesQuery)
      const matchesData = matchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RelatedMatch[]
      
      await enrichMatchesData(matchesData)
      setMatches(matchesData)
    } catch (error) {
      console.error('進捗データの取得に失敗しました:', error)
    } finally {
      setLoading(false)
    }
  }

  const enrichMatchesData = async (matchesData: RelatedMatch[]) => {
    // 候補者名、求人名、企業名、店舗名を取得
    for (const match of matchesData) {
      try {
        // 候補者名
        const candidateDoc = await getDoc(doc(db, 'candidates', match.candidateId))
        if (candidateDoc.exists()) {
          const candidateData = candidateDoc.data()
          match.candidateName = `${candidateData.lastName || ''} ${candidateData.firstName || ''}`.trim()
        }
        
        // 求人情報
        if (type !== 'job') {
          const jobDoc = await getDoc(doc(db, 'jobs', match.jobId))
          if (jobDoc.exists()) {
            match.jobTitle = jobDoc.data().title
          }
        }
        
        // 企業情報
        if (type !== 'company') {
          const companyDoc = await getDoc(doc(db, 'companies', match.companyId))
          if (companyDoc.exists()) {
            match.companyName = companyDoc.data().name
          }
        }
        
        // 店舗情報（求人から取得）
        if (type !== 'store') {
          const jobDoc = await getDoc(doc(db, 'jobs', match.jobId))
          if (jobDoc.exists()) {
            const jobData = jobDoc.data()
            if (jobData.storeId) {
              const storeDoc = await getDoc(doc(db, 'stores', jobData.storeId))
              if (storeDoc.exists()) {
                match.storeName = storeDoc.data().name
              }
            }
          }
        }
      } catch (error) {
        console.error('詳細情報の取得エラー:', error)
      }
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-'
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return '-'
    }
  }

  // フィルタリング
  const filteredMatches = matches.filter(match => {
    if (showActive && statusGroups.active.includes(match.status)) return true
    if (showCompleted && statusGroups.completed.includes(match.status)) return true
    if (showInactive && statusGroups.inactive.includes(match.status)) return true
    return false
  })

  // ステータス別の集計
  const statusCounts = {
    active: matches.filter(m => statusGroups.active.includes(m.status)).length,
    completed: matches.filter(m => statusGroups.completed.includes(m.status)).length,
    inactive: matches.filter(m => statusGroups.inactive.includes(m.status)).length
  }

  return (
    <Card className="border-purple-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-purple-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              進捗一覧
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              この{type === 'company' ? '企業' : type === 'store' ? '店舗' : '求人'}に紐づく進捗状況
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-purple-600 border-purple-200">
              {filteredMatches.length}件表示中
            </Badge>
            <Button
              onClick={loadMatches}
              variant="outline"
              size="sm"
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* フィルタ */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">ステータスフィルタ</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-active"
                checked={showActive}
                onCheckedChange={(checked) => setShowActive(!!checked)}
              />
              <label htmlFor="show-active" className="text-sm cursor-pointer">
                進行中 <Badge variant="outline" className="ml-1">{statusCounts.active}</Badge>
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-completed"
                checked={showCompleted}
                onCheckedChange={(checked) => setShowCompleted(!!checked)}
              />
              <label htmlFor="show-completed" className="text-sm cursor-pointer">
                完了 <Badge variant="outline" className="ml-1 bg-green-50">{statusCounts.completed}</Badge>
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={(checked) => setShowInactive(!!checked)}
              />
              <label htmlFor="show-inactive" className="text-sm cursor-pointer">
                終了 <Badge variant="outline" className="ml-1 bg-gray-50">{statusCounts.inactive}</Badge>
              </label>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-500">読み込み中...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {matches.length === 0 ? '進捗データがありません' : '表示する進捗がありません'}
            </p>
            {matches.length > 0 && (
              <p className="text-sm text-gray-400 mt-2">
                フィルタを変更して確認してください
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>求職者</TableHead>
                  {type !== 'job' && <TableHead>求人</TableHead>}
                  {type !== 'company' && <TableHead>企業</TableHead>}
                  {type !== 'store' && <TableHead>店舗</TableHead>}
                  <TableHead>ステータス</TableHead>
                  <TableHead>更新日</TableHead>
                  <TableHead className="text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatches.map((match) => (
                  <TableRow key={match.id} className="hover:bg-purple-50">
                    <TableCell>
                      <Link 
                        href={`/candidates/${match.candidateId}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {match.candidateName || '不明'}
                      </Link>
                    </TableCell>
                    {type !== 'job' && (
                      <TableCell>
                        <Link 
                          href={`/jobs/${match.jobId}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {match.jobTitle || '不明'}
                        </Link>
                      </TableCell>
                    )}
                    {type !== 'company' && (
                      <TableCell className="text-sm">
                        {match.companyName || '-'}
                      </TableCell>
                    )}
                    {type !== 'store' && (
                      <TableCell className="text-sm">
                        {match.storeName || '-'}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge className={`${statusColors[match.status]} border-0`}>
                        {statusLabels[match.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(match.updatedAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={`/progress/${match.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
