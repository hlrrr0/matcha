"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, ArrowLeft, CheckCircle, TrendingUp, Loader2 } from 'lucide-react'
import { saveDiagnosis, getLatestDiagnosis } from '@/lib/firestore/diagnosis'
import { DiagnosisAnswer } from '@/types/diagnosis'
import { toast } from 'sonner'

// 価値観の項目
const VALUES = [
  { id: 'salary', label: '給与' },
  { id: 'salaryGrowth', label: '給与の上がり幅' },
  { id: 'workingHours', label: '労働時間（拘束時間）' },
  { id: 'holidays', label: '休日数（年間休日）' },
  { id: 'nigiriTiming', label: 'にぎりまで任されるタイミング' },
  { id: 'seniorChefs', label: '先輩職人の数' },
  { id: 'priceRange', label: '店舗の価格帯（回転寿司／町鮨／高級オマカセ）' },
  { id: 'foreignCustomers', label: '外国人客の多さ' },
  { id: 'workEnvironment', label: '職場の雰囲気（怒号・パワハラ／建設的）' },
  { id: 'snsPr', label: 'SNS・PRへの積極性' }
]

// 診断質問（二択）- トレードオフ型質問で精度向上
const QUESTIONS = [
  // === Phase 1: トレードオフ型質問（より深い価値観を測定）===
  {
    id: 1,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'salary', label: '労働時間が長いが給与が高いお店' },
    optionB: { value: 'workingHours', label: '労働時間が短いが給与が低いお店' }
  },
  {
    id: 2,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'nigiriTiming', label: 'すぐに握りの経験ができるが客単価が低いお店' },
    optionB: { value: 'priceRange', label: '握るまで時間がかかるが客単価が高いオマカセのお店' }
  },
  {
    id: 3,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'holidays', label: '休日が多いが昇給が緩やかなお店' },
    optionB: { value: 'salaryGrowth', label: '休日が少ないが昇給が早いお店' }
  },
  {
    id: 4,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'seniorChefs', label: '先輩職人が多く教育が充実しているが給与は普通のお店' },
    optionB: { value: 'salary', label: '教育体制は普通だが給与が高いお店' }
  },
  {
    id: 5,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'workEnvironment', label: '給与は普通だが風通しが良く働きやすいお店' },
    optionB: { value: 'salary', label: '職場は厳しいが給与が高いお店' }
  },
  {
    id: 6,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'snsPr', label: '労働時間が長いがSNSで有名な華やかなお店' },
    optionB: { value: 'workingHours', label: 'ブランド力は普通だが労働時間が短いお店' }
  },
  {
    id: 7,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'foreignCustomers', label: '外国人客が多く国際的だが給与は普通のお店' },
    optionB: { value: 'salary', label: '日本人客中心だが給与が高いお店' }
  },
  {
    id: 8,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'nigiriTiming', label: '早く握りを任されるが先輩が少ないお店' },
    optionB: { value: 'seniorChefs', label: 'じっくり基礎から学べて先輩が多いお店' }
  },
  {
    id: 9,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'priceRange', label: '休日が少ないが高級オマカセで働けるお店' },
    optionB: { value: 'holidays', label: 'カジュアルな店だが休日が多いお店' }
  },
  {
    id: 10,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'salaryGrowth', label: '初任給は普通だが将来的に大きく昇給するお店' },
    optionB: { value: 'salary', label: '初任給は高いが昇給は緩やかなお店' }
  },
  
  // === Phase 2: 標準的な二択質問（基本的な優先順位）===
  {
    id: 11,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'salary', label: '今すぐ高い給与' },
    optionB: { value: 'salaryGrowth', label: '将来的な昇給' }
  },
  {
    id: 12,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'workingHours', label: '労働時間の短さ' },
    optionB: { value: 'holidays', label: '休日の多さ' }
  },
  {
    id: 13,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'nigiriTiming', label: 'スキル習得のスピード' },
    optionB: { value: 'seniorChefs', label: '教育体制の充実' }
  },
  {
    id: 14,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'priceRange', label: '高級店での経験' },
    optionB: { value: 'workEnvironment', label: '働きやすい環境' }
  },
  {
    id: 15,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'foreignCustomers', label: '国際的な経験' },
    optionB: { value: 'snsPr', label: 'ブランド力のある店' }
  },
  
  // === Phase 3: より複雑なトレードオフ（3要素の組み合わせ）===
  {
    id: 16,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'workEnvironment', label: '給与・休日は普通だが人間関係が良く風通しの良いお店' },
    optionB: { value: 'salary', label: '人間関係は厳しいが給与が高く待遇の良いお店' }
  },
  {
    id: 17,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'nigiriTiming', label: '給与は普通だが1年で握りを任されるお店' },
    optionB: { value: 'salary', label: '握るまで3年かかるが給与が高いお店' }
  },
  {
    id: 18,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'holidays', label: '完全週休2日だが給与の上がり幅は小さいお店' },
    optionB: { value: 'salaryGrowth', label: '月6日休みだが3年後には給与が1.5倍になるお店' }
  },
  {
    id: 19,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'snsPr', label: 'SNSで有名な華やかな店だが労働時間が長いお店' },
    optionB: { value: 'workingHours', label: '知名度は普通だが定時で帰れるお店' }
  },
  {
    id: 20,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'priceRange', label: 'ミシュラン星付きの超高級店だが休日が少ないお店' },
    optionB: { value: 'holidays', label: '普通の寿司店だが年間休日120日のお店' }
  },
  {
    id: 21,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'seniorChefs', label: 'ベテラン職人5人から学べるが給与は業界平均のお店' },
    optionB: { value: 'nigiriTiming', label: '先輩は少ないが半年で握りを任されるお店' }
  },
  {
    id: 22,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'foreignCustomers', label: '外国人客が8割で英語が飛び交うグローバルな店' },
    optionB: { value: 'workEnvironment', label: '日本人客中心で落ち着いた雰囲気の店' }
  },
  {
    id: 23,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'salaryGrowth', label: '初任給22万円だが5年後に40万円になるお店' },
    optionB: { value: 'salary', label: '初任給30万円だが5年後も35万円のお店' }
  },
  {
    id: 24,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'workEnvironment', label: '給与は普通だが怒号のない建設的な指導をするお店' },
    optionB: { value: 'priceRange', label: '厳しい指導だが超高級オマカセで一流の技術が学べるお店' }
  },
  {
    id: 25,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'snsPr', label: 'インスタフォロワー10万人の有名店だが給与は普通' },
    optionB: { value: 'holidays', label: '知名度は普通だが完全週休2日で年間休日125日のお店' }
  }
]

interface DiagnosisResult {
  [key: string]: number
}

interface Props {
  candidateId?: string
}

export default function CareerValuesDiagnosis({ candidateId }: Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<DiagnosisResult>({})
  const [detailedAnswers, setDetailedAnswers] = useState<DiagnosisAnswer[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasPreviousResult, setHasPreviousResult] = useState(false)

  // 既存の診断結果をチェック
  useEffect(() => {
    const checkPreviousResult = async () => {
      if (!candidateId) return
      
      try {
        const previousDiagnosis = await getLatestDiagnosis(candidateId)
        if (previousDiagnosis) {
          setHasPreviousResult(true)
        }
      } catch (error) {
        console.error('Error checking previous result:', error)
      }
    }
    
    checkPreviousResult()
  }, [candidateId])

  const handleAnswer = (valueId: string) => {
    const question = QUESTIONS[currentQuestion]
    
    // 詳細な回答を記録
    setDetailedAnswers(prev => [
      ...prev,
      {
        questionId: question.id,
        selectedValue: valueId
      }
    ])

    // スコアを加算
    setAnswers(prev => ({
      ...prev,
      [valueId]: (prev[valueId] || 0) + 1
    }))

    // 次の質問へ
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      // 診断完了
      completeDiagnosis(valueId)
    }
  }

  const completeDiagnosis = async (lastValueId: string) => {
    setIsComplete(true)

    // 最後の回答を含めた結果を計算
    const finalAnswers = {
      ...answers,
      [lastValueId]: (answers[lastValueId] || 0) + 1
    }

    const finalDetailedAnswers = [
      ...detailedAnswers,
      {
        questionId: QUESTIONS[currentQuestion].id,
        selectedValue: lastValueId
      }
    ]

    // 結果を保存（candidateIdがある場合のみ）
    if (candidateId) {
      setIsSaving(true)
      try {
        const results = VALUES.map(value => ({
          valueId: value.id,
          label: value.label,
          score: finalAnswers[value.id] || 0
        })).sort((a, b) => b.score - a.score)

        await saveDiagnosis(candidateId, finalDetailedAnswers, results)
        toast.success('診断結果を保存しました')
      } catch (error) {
        console.error('Error saving diagnosis:', error)
        toast.error('診断結果の保存に失敗しました')
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const handleRestart = () => {
    setCurrentQuestion(0)
    setAnswers({})
    setDetailedAnswers([])
    setIsComplete(false)
    setIsSaving(false)
  }

  // 結果を計算してソート
  const getSortedResults = () => {
    return VALUES.map(value => ({
      ...value,
      score: answers[value.id] || 0
    }))
      .sort((a, b) => b.score - a.score)
  }

  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100

  if (isComplete) {
    const results = getSortedResults()
    const maxScore = Math.max(...results.map(r => r.score))
    const topValues = results.filter(r => r.score === maxScore && r.score > 0)

    return (
      <Card className="border-green-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <CheckCircle className="h-6 w-6" />
                診断結果
              </CardTitle>
              <CardDescription>
                あなたが大切にしている価値観
              </CardDescription>
            </div>
            <Button
              onClick={handleRestart}
              variant="outline"
              size="sm"
            >
              もう一度診断する
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* トップ3の価値観 */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              あなたが特に大切にしている価値観 TOP3
            </h3>
            <div className="space-y-3">
              {results.slice(0, 3).map((result, index) => (
                result.score > 0 && (
                  <div key={result.id} className="flex items-center gap-3">
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

          {/* すべての結果 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">詳細結果</h3>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={result.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
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
            <h3 className="text-sm font-semibold text-blue-800 mb-2">💡 アドバイス</h3>
            <p className="text-sm text-blue-900">
              この結果を参考に、あなたに合った職場を探しましょう！
              担当者との面談時にこの結果を共有すると、より適切な求人を紹介してもらえます。
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const question = QUESTIONS[currentQuestion]

  return (
    <Card className="border-purple-100">
      <CardHeader>
        <CardTitle className="text-purple-800">
          キャリア価値観診断
        </CardTitle>
        <CardDescription>
          あなたが大切にしている価値観を診断します（全{QUESTIONS.length}問）
        </CardDescription>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              質問 {currentQuestion + 1} / {QUESTIONS.length}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 質問 */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
            {question.text}
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {/* 選択肢A */}
            <button
              onClick={() => handleAnswer(question.optionA.value)}
              className="p-6 bg-white rounded-lg border-2 border-purple-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="mb-2 bg-purple-100 text-purple-800">A</Badge>
                  <p className="font-medium text-gray-900 group-hover:text-purple-900">
                    {question.optionA.label}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600" />
              </div>
            </button>

            {/* 選択肢B */}
            <button
              onClick={() => handleAnswer(question.optionB.value)}
              className="p-6 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="mb-2 bg-blue-100 text-blue-800">B</Badge>
                  <p className="font-medium text-gray-900 group-hover:text-blue-900">
                    {question.optionB.label}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
              </div>
            </button>
          </div>
        </div>

        {/* 戻るボタン */}
        {currentQuestion > 0 && (
          <div className="flex justify-center">
            <Button
              onClick={handleBack}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              前の質問に戻る
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
