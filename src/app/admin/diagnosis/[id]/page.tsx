"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { TrendingUp, User, Calendar, ArrowLeft, CheckCircle } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getCandidateById } from '@/lib/firestore/candidates'
import { Diagnosis } from '@/types/diagnosis'
import { Candidate } from '@/types/candidate'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function DiagnosisDetailPage() {
  const params = useParams()
  const router = useRouter()
  const diagnosisId = params.id as string

  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDiagnosisDetail()
  }, [diagnosisId])

  const loadDiagnosisDetail = async () => {
    try {
      setIsLoading(true)
      
      // 診断結果を取得
      const diagnosisDoc = await getDoc(doc(db, 'diagnoses', diagnosisId))
      if (!diagnosisDoc.exists()) {
        router.push('/admin/diagnosis')
        return
      }

      const diagnosisData = {
        id: diagnosisDoc.id,
        ...diagnosisDoc.data()
      } as Diagnosis

      setDiagnosis(diagnosisData)

      // 候補者情報を取得
      try {
        const candidateData = await getCandidateById(diagnosisData.candidateId)
        setCandidate(candidateData)
      } catch (error) {
        console.error('Error loading candidate:', error)
      }
    } catch (error) {
      console.error('Error loading diagnosis detail:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-'
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return format(date, 'yyyy年MM月dd日 HH:mm', { locale: ja })
    } catch (error) {
      return '-'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-gray-500">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!diagnosis) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-gray-500">診断結果が見つかりません</p>
        </div>
      </div>
    )
  }

  const maxScore = Math.max(...diagnosis.results.map(r => r.score))

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <Button
            onClick={() => router.push('/admin/diagnosis')}
            variant="ghost"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            診断結果一覧に戻る
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="h-8 w-8" />
            診断結果詳細
          </h1>
        </div>

        {/* 求職者情報 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              求職者情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">氏名</p>
                <p className="font-medium text-lg">
                  {candidate?.firstName && candidate?.lastName
                    ? `${candidate.lastName} ${candidate.firstName}`
                    : '不明'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">メールアドレス</p>
                <p className="font-medium">
                  {candidate?.email || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">電話番号</p>
                <p className="font-medium">
                  {candidate?.phone || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">診断完了日</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <p className="font-medium">
                    {formatDate(diagnosis.completedAt)}
                  </p>
                </div>
              </div>
            </div>
            {candidate && (
              <div className="mt-4">
                <Button
                  onClick={() => router.push(`/candidates/${diagnosis.candidateId}`)}
                  size="sm"
                  variant="outline"
                >
                  求職者詳細を見る
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 診断結果 */}
        <Card className="border-green-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-green-800 flex items-center gap-2">
                  <CheckCircle className="h-6 w-6" />
                  キャリア価値観診断結果
                </CardTitle>
                <CardDescription>
                  求職者が大切にしている価値観
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* トップ3の価値観 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                特に大切にしている価値観 TOP3
              </h3>
              <div className="space-y-3">
                {diagnosis.results.slice(0, 3).map((result, index) => (
                  result.score > 0 && (
                    <div key={result.valueId} className="flex items-center gap-3">
                      <Badge className={`
                        ${index === 0 ? 'bg-yellow-500 text-white' : ''}
                        ${index === 1 ? 'bg-gray-400 text-white' : ''}
                        ${index === 2 ? 'bg-orange-600 text-white' : ''}
                        text-lg font-bold px-3 py-1
                      `}>
                        {index + 1}位
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{result.label}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={(result.score / maxScore) * 100} className="h-2" />
                          <span className="text-sm text-gray-600">{result.score}回選択</span>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>

            <Separator />

            {/* すべての結果 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">詳細結果</h3>
              <div className="space-y-2">
                {diagnosis.results.map((result, index) => (
                  <div key={result.valueId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-500 w-8">{index + 1}位</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{result.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress 
                          value={result.score > 0 ? (result.score / maxScore) * 100 : 0} 
                          className="h-1.5" 
                        />
                        <span className="text-xs text-gray-500 w-12">{result.score}回</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* アドバイス */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">💡 活用方法</h3>
              <p className="text-sm text-blue-900">
                この診断結果を参考に、求職者に最適な求人を提案してください。
                特にTOP3の価値観に合致する職場環境や条件を重視した提案が効果的です。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
