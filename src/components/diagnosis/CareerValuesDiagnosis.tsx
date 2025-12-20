"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, ArrowLeft, CheckCircle, TrendingUp } from 'lucide-react'

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

// 診断質問（二択）- 質問数を増やして精度向上
const QUESTIONS = [
  // 給与 vs その他の価値観
  {
    id: 1,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'salary', label: '今すぐ高い給与がもらえる' },
    optionB: { value: 'salaryGrowth', label: '将来的に大きく給与が上がる' }
  },
  {
    id: 2,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'workingHours', label: '労働時間が短い（早く帰れる）' },
    optionB: { value: 'holidays', label: '休日が多い（年間休日が多い）' }
  },
  {
    id: 3,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'nigiriTiming', label: '早くにぎりを任せてもらえる' },
    optionB: { value: 'seniorChefs', label: '先輩職人が多く学べる環境' }
  },
  {
    id: 4,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'priceRange', label: '高級店で働きたい' },
    optionB: { value: 'salary', label: '給与が高い店で働きたい' }
  },
  {
    id: 5,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'foreignCustomers', label: '外国人客が多い国際的な環境' },
    optionB: { value: 'workEnvironment', label: '風通しの良い職場環境' }
  },
  {
    id: 6,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'snsPr', label: 'SNSで発信できる華やかな店' },
    optionB: { value: 'priceRange', label: '伝統的な高級オマカセ店' }
  },
  {
    id: 7,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'salary', label: '給与重視' },
    optionB: { value: 'workEnvironment', label: '働きやすさ重視' }
  },
  {
    id: 8,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'nigiriTiming', label: 'スキル習得のスピード' },
    optionB: { value: 'holidays', label: 'ワークライフバランス' }
  },
  {
    id: 9,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'seniorChefs', label: '教育体制が充実' },
    optionB: { value: 'salaryGrowth', label: '将来の昇給が見込める' }
  },
  {
    id: 10,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'workingHours', label: '残業が少ない' },
    optionB: { value: 'snsPr', label: 'ブランド力のある店' }
  },
  // 追加の質問でさらに精度向上
  {
    id: 11,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'salary', label: '固定給が高い' },
    optionB: { value: 'holidays', label: '完全週休2日制' }
  },
  {
    id: 12,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'nigiriTiming', label: '早期に独立できる技術' },
    optionB: { value: 'seniorChefs', label: 'じっくり基礎から学べる' }
  },
  {
    id: 13,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'workEnvironment', label: '厳しくても成長できる環境' },
    optionB: { value: 'workingHours', label: 'プライベートの時間' }
  },
  {
    id: 14,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'foreignCustomers', label: 'グローバルな経験' },
    optionB: { value: 'priceRange', label: '一流店での経験' }
  },
  {
    id: 15,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'salaryGrowth', label: '昇進・昇格のチャンス' },
    optionB: { value: 'snsPr', label: '知名度のある店で働く' }
  },
  {
    id: 16,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'workEnvironment', label: 'チームワークを重視' },
    optionB: { value: 'salary', label: '実力主義で給与に反映' }
  },
  {
    id: 17,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'holidays', label: '長期休暇が取れる' },
    optionB: { value: 'salaryGrowth', label: '頑張った分だけ給与アップ' }
  },
  {
    id: 18,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'nigiriTiming', label: '責任ある仕事を早く任される' },
    optionB: { value: 'workingHours', label: '無理のない勤務時間' }
  },
  {
    id: 19,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'priceRange', label: '高級食材を扱う店' },
    optionB: { value: 'seniorChefs', label: 'ベテランから学べる' }
  },
  {
    id: 20,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'snsPr', label: '注目される店で働く' },
    optionB: { value: 'foreignCustomers', label: '多様な文化に触れる' }
  }
]

interface DiagnosisResult {
  [key: string]: number
}

export default function CareerValuesDiagnosis() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<DiagnosisResult>({})
  const [isComplete, setIsComplete] = useState(false)

  const handleAnswer = (valueId: string) => {
    // スコアを加算
    setAnswers(prev => ({
      ...prev,
      [valueId]: (prev[valueId] || 0) + 1
    }))

    // 次の質問へ
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      setIsComplete(true)
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
    setIsComplete(false)
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
