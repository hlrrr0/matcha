"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { TrendingUp, Eye, CheckCircle, AlertCircle, ArrowUp, ArrowDown, Minus, Plus } from 'lucide-react'
import { Diagnosis } from '@/types/diagnosis'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props {
  diagnosisHistory: Diagnosis[]
  showRetakeButton?: boolean
  candidateId?: string
}

export default function DiagnosisHistoryComparison({ diagnosisHistory, showRetakeButton = false, candidateId }: Props) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>(
    diagnosisHistory.length > 0 && diagnosisHistory[0].id ? [diagnosisHistory[0].id] : []
  )
  const [showComparison, setShowComparison] = useState(false)

  if (diagnosisHistory.length === 0) {
    return null
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(selectedId => selectedId !== id)
      } else {
        // 最大2つまで選択可能
        if (prev.length >= 2) {
          return [...prev.slice(1), id]
        }
        return [...prev, id]
      }
    })
  }

  const selectedDiagnoses = diagnosisHistory.filter(d => d.id && selectedIds.includes(d.id))

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-'
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch (error) {
      return '-'
    }
  }

  // 2つの診断結果を比較
  const compareResults = () => {
    if (selectedDiagnoses.length !== 2) return null

    const [first, second] = selectedDiagnoses
    const comparison = first.results.map((firstResult, index) => {
      const secondResult = second.results.find(r => r.valueId === firstResult.valueId)
      const diff = secondResult ? secondResult.score - firstResult.score : 0
      
      return {
        valueId: firstResult.valueId,
        label: firstResult.label,
        firstScore: firstResult.score,
        secondScore: secondResult?.score || 0,
        diff,
        status: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
      }
    })

    return comparison
  }

  return (
    <Card className="border-purple-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-purple-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              キャリア価値観診断結果
            </CardTitle>
            <CardDescription>
              {diagnosisHistory.length}回の診断履歴
              {selectedIds.length === 2 && ' • 2つ選択して比較できます'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {showRetakeButton && candidateId && (
              <Button
                onClick={() => router.push(`/public/candidates/${candidateId}/diagnosis`)}
                variant="outline"
                size="sm"
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <Plus className="h-4 w-4 mr-1" />
                再診断
              </Button>
            )}
            {selectedIds.length === 2 && (
              <Button
                onClick={() => setShowComparison(!showComparison)}
                variant="outline"
                size="sm"
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                {showComparison ? '一覧に戻る' : '比較する'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!showComparison ? (
          // 診断履歴一覧
          <div className="space-y-4">
            {diagnosisHistory.map((diagnosis, historyIndex) => {
              const isSelected = diagnosis.id && selectedIds.includes(diagnosis.id)
              const maxScore = Math.max(...diagnosis.results.map(r => r.score))

              return (
                <div 
                  key={diagnosis.id} 
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isSelected 
                      ? 'border-purple-300 bg-purple-50' 
                      : 'border-gray-200 bg-white hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Checkbox
                      checked={!!isSelected}
                      onCheckedChange={() => diagnosis.id && toggleSelection(diagnosis.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={historyIndex === 0 ? 'default' : 'outline'}>
                            {historyIndex === 0 ? '最新' : `${historyIndex + 1}回目`}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {formatDate(diagnosis.completedAt)}
                          </span>
                        </div>
                        <Link href={`/admin/diagnosis/${diagnosis.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-purple-600 hover:bg-purple-50"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            詳細
                          </Button>
                        </Link>
                      </div>

                      {/* TOP3 */}
                      <div className="bg-white p-3 rounded border border-purple-100">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">TOP3</h4>
                        <div className="space-y-1.5">
                          {diagnosis.results.slice(0, 3).map((result, index) => (
                            <div key={result.valueId} className="flex items-center gap-2">
                              <Badge className={`
                                ${index === 0 ? 'bg-yellow-500 text-white' : ''}
                                ${index === 1 ? 'bg-gray-400 text-white' : ''}
                                ${index === 2 ? 'bg-orange-600 text-white' : ''}
                                text-xs px-2 py-0.5
                              `}>
                                {index + 1}
                              </Badge>
                              <span className="text-xs font-medium flex-1">{result.label}</span>
                              <span className="text-xs text-gray-500">{result.score}回</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {diagnosisHistory.length === 1 && (
              <div className="text-center text-sm text-gray-500 py-4">
                複数回診断を受けると、結果の変化を比較できます
              </div>
            )}
          </div>
        ) : (
          // 比較表示
          <div className="space-y-4">
            {/* 比較ヘッダー */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">比較対象</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-purple-600 font-medium mb-1">
                  {formatDate(selectedDiagnoses[0].completedAt)}
                </div>
                <Badge variant="outline" className="text-xs">1回目</Badge>
              </div>
              <div className="text-center">
                <div className="text-xs text-purple-600 font-medium mb-1">
                  {formatDate(selectedDiagnoses[1].completedAt)}
                </div>
                <Badge variant="outline" className="text-xs">2回目</Badge>
              </div>
            </div>

            {/* 比較結果 */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">価値観スコアの変化</h3>
              {compareResults()?.map((item, index) => (
                <div 
                  key={item.valueId} 
                  className={`grid grid-cols-3 gap-4 p-3 rounded-lg border ${
                    item.status === 'up' ? 'bg-green-50 border-green-200' :
                    item.status === 'down' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{index + 1}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-mono">{item.firstScore}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-mono">{item.secondScore}</span>
                    {item.status === 'up' && (
                      <div className="flex items-center text-green-600">
                        <ArrowUp className="h-3 w-3" />
                        <span className="text-xs font-medium">+{item.diff}</span>
                      </div>
                    )}
                    {item.status === 'down' && (
                      <div className="flex items-center text-red-600">
                        <ArrowDown className="h-3 w-3" />
                        <span className="text-xs font-medium">{item.diff}</span>
                      </div>
                    )}
                    {item.status === 'same' && (
                      <Minus className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 一致・差分のサマリー */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <ArrowUp className="h-4 w-4 text-green-600" />
                    <span className="text-lg font-bold text-green-600">
                      {compareResults()?.filter(r => r.status === 'up').length}
                    </span>
                  </div>
                  <div className="text-xs text-green-700">スコア上昇</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-lg font-bold text-blue-600">
                      {compareResults()?.filter(r => r.status === 'same').length}
                    </span>
                  </div>
                  <div className="text-xs text-blue-700">変化なし</div>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <ArrowDown className="h-4 w-4 text-red-600" />
                    <span className="text-lg font-bold text-red-600">
                      {compareResults()?.filter(r => r.status === 'down').length}
                    </span>
                  </div>
                  <div className="text-xs text-red-700">スコア減少</div>
                </CardContent>
              </Card>
            </div>

            {/* 解釈のヒント */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
              <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                比較結果の見方
              </h4>
              <ul className="text-xs text-blue-900 space-y-1">
                <li>• スコアが上昇した項目は、より重視するようになった価値観です</li>
                <li>• スコアが減少した項目は、優先度が下がった価値観です</li>
                <li>• 変化のない項目は、一貫して重視している価値観です</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
