"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, User, Calendar, ArrowLeft, Eye } from 'lucide-react'
import { getAllDiagnoses } from '@/lib/firestore/diagnosis'
import { getCandidateById } from '@/lib/firestore/candidates'
import { Diagnosis } from '@/types/diagnosis'
import { Candidate } from '@/types/candidate'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface DiagnosisWithCandidate extends Diagnosis {
  candidate?: Candidate
}

export default function DiagnosisListPage() {
  const router = useRouter()
  const [diagnoses, setDiagnoses] = useState<DiagnosisWithCandidate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDiagnoses()
  }, [])

  const loadDiagnoses = async () => {
    try {
      setIsLoading(true)
      const diagnosesData = await getAllDiagnoses()
      
      // 候補者情報を取得
      const diagnosesWithCandidates = await Promise.all(
        diagnosesData.map(async (diagnosis) => {
          try {
            const candidate = await getCandidateById(diagnosis.candidateId)
            return { ...diagnosis, candidate: candidate || undefined }
          } catch (error) {
            return { ...diagnosis, candidate: undefined }
          }
        })
      )

      setDiagnoses(diagnosesWithCandidates)
    } catch (error) {
      console.error('Error loading diagnoses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-'
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return format(date, 'yyyy/MM/dd HH:mm', { locale: ja })
    } catch (error) {
      return '-'
    }
  }

  const getTopValuesText = (results: any[]) => {
    if (!results || results.length === 0) return '-'
    return results
      .slice(0, 3)
      .filter(r => r.score > 0)
      .map(r => r.label)
      .join(', ')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-gray-500">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <Button
            onClick={() => router.push('/candidates')}
            variant="ghost"
            size="sm"
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            求職者一覧に戻る
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="h-8 w-8" />
            診断結果一覧
          </h1>
          <p className="text-gray-600 mt-2">
            求職者のキャリア価値観診断結果を確認できます
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>診断完了数</CardDescription>
              <CardTitle className="text-3xl">{diagnoses.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>今月の診断数</CardDescription>
              <CardTitle className="text-3xl">
                {diagnoses.filter(d => {
                  const completedAt = d.completedAt?.toDate?.()
                  if (!completedAt) return false
                  const now = new Date()
                  return completedAt.getMonth() === now.getMonth() &&
                         completedAt.getFullYear() === now.getFullYear()
                }).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>今週の診断数</CardDescription>
              <CardTitle className="text-3xl">
                {diagnoses.filter(d => {
                  const completedAt = d.completedAt?.toDate?.()
                  if (!completedAt) return false
                  const now = new Date()
                  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                  return completedAt >= weekAgo
                }).length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 診断結果テーブル */}
        <Card>
          <CardHeader>
            <CardTitle>診断結果一覧</CardTitle>
            <CardDescription>
              最新の診断結果から表示しています
            </CardDescription>
          </CardHeader>
          <CardContent>
            {diagnoses.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">診断結果はまだありません</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>求職者名</TableHead>
                      <TableHead>TOP3 価値観</TableHead>
                      <TableHead>診断完了日</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diagnoses.map((diagnosis) => (
                      <TableRow key={diagnosis.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium">
                                {diagnosis.candidate?.firstName && diagnosis.candidate?.lastName
                                  ? `${diagnosis.candidate.lastName} ${diagnosis.candidate.firstName}`
                                  : '不明'}
                              </p>
                              {diagnosis.candidate?.email && (
                                <p className="text-xs text-gray-500">
                                  {diagnosis.candidate.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {diagnosis.results.slice(0, 3).map((result, index) => (
                              result.score > 0 && (
                                <Badge
                                  key={result.valueId}
                                  variant="secondary"
                                  className={`
                                    ${index === 0 ? 'bg-yellow-100 text-yellow-800' : ''}
                                    ${index === 1 ? 'bg-gray-200 text-gray-800' : ''}
                                    ${index === 2 ? 'bg-orange-100 text-orange-800' : ''}
                                  `}
                                >
                                  {index + 1}位 {result.label}
                                </Badge>
                              )
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            {formatDate(diagnosis.completedAt)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => router.push(`/admin/diagnosis/${diagnosis.id}`)}
                            size="sm"
                            variant="outline"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            詳細
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
