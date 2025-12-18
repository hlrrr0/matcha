"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { ArrowLeft, Send, ClipboardList } from 'lucide-react'
import { Candidate } from '@/types/candidate'

interface CandidateSurveyProps {
  params: Promise<{
    id: string
  }>
}

export default function CandidateSurveyPage({ params }: CandidateSurveyProps) {
  const router = useRouter()
  const [candidateId, setCandidateId] = useState<string>('')
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nearestStation: '',
    cookingExperience: '',
    cookingExperienceOther: '',
    jobSearchTiming: '',
    partTimeHope: '',
    graduationCareerPlan: [] as string[],
    graduationCareerPlanOther: '',
    preferredArea: '',
    preferredWorkplace: '',
    futureCareerVision: ''
  })

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params
      setCandidateId(resolvedParams.id)
    }
    initializeParams()
  }, [params])

  useEffect(() => {
    if (!candidateId) return
    checkAuthAndLoadCandidate()
  }, [candidateId])

  const checkAuthAndLoadCandidate = async () => {
    try {
      // セッション認証チェック
      const candidateAuth = sessionStorage.getItem('candidate_auth')
      if (!candidateAuth) {
        toast.error('ログインが必要です')
        router.push('/public/candidates/auth')
        return
      }

      const authData = JSON.parse(candidateAuth)
      
      // セッションの有効期限チェック（24時間）
      const sessionAge = Date.now() - authData.timestamp
      const maxAge = 24 * 60 * 60 * 1000
      
      if (sessionAge > maxAge) {
        toast.error('セッションの有効期限が切れました。再度ログインしてください')
        sessionStorage.removeItem('candidate_auth')
        router.push('/public/candidates/auth')
        return
      }

      // URLのIDとセッションのIDが一致するかチェック
      if (authData.id !== candidateId) {
        toast.error('アクセス権限がありません')
        router.push('/public/candidates/auth')
        return
      }

      // 既にアンケート回答済みかチェック
      const surveysQuery = query(
        collection(db, 'surveys'),
        where('candidateId', '==', candidateId)
      )
      const surveysSnapshot = await getDocs(surveysQuery)
      
      if (!surveysSnapshot.empty) {
        toast.info('既にアンケートに回答済みです')
        router.push(`/public/candidates/${candidateId}/mypage`)
        return
      }

      // 候補者情報を取得
      const candidateDoc = await getDoc(doc(db, 'candidates', candidateId))
      
      if (!candidateDoc.exists()) {
        toast.error('求職者情報が見つかりません')
        router.push('/public/candidates/auth')
        return
      }

      const candidateData = { id: candidateDoc.id, ...candidateDoc.data() } as Candidate
      setCandidate(candidateData)
      
      // 候補者の既存情報でフォームを初期化
      setFormData(prev => ({
        ...prev,
        nearestStation: candidateData.nearestStation || '',
        cookingExperience: candidateData.cookingExperience || '',
        jobSearchTiming: candidateData.jobSearchTiming || '',
        partTimeHope: candidateData.partTimeHope || '',
        preferredArea: candidateData.preferredArea || '',
        preferredWorkplace: candidateData.preferredWorkplace || '',
        futureCareerVision: candidateData.futureCareerVision || ''
      }))
    } catch (error) {
      console.error('認証エラー:', error)
      toast.error('データの読み込みに失敗しました')
      router.push('/public/candidates/auth')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCareerPlanChange = (value: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        graduationCareerPlan: [...prev.graduationCareerPlan, value]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        graduationCareerPlan: prev.graduationCareerPlan.filter(v => v !== value)
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setSubmitting(true)

    try {
      // 調理経験の文字列作成
      let cookingExperience = formData.cookingExperience
      if (formData.cookingExperience === 'その他' && formData.cookingExperienceOther) {
        cookingExperience = `その他: ${formData.cookingExperienceOther}`
      }

      // 卒業直後の希望進路の文字列作成
      let graduationCareerPlan = formData.graduationCareerPlan.join(', ')
      if (formData.graduationCareerPlan.includes('その他') && formData.graduationCareerPlanOther) {
        graduationCareerPlan += ` (その他: ${formData.graduationCareerPlanOther})`
      }

      await addDoc(collection(db, 'surveys'), {
        candidateId,
        candidateName: `${candidate?.lastName} ${candidate?.firstName}`,
        candidateEmail: candidate?.email,
        enrollmentDate: candidate?.enrollmentDate,
        campus: candidate?.campus,
        dateOfBirth: candidate?.dateOfBirth,
        nearestStation: formData.nearestStation,
        cookingExperience: cookingExperience,
        jobSearchTiming: formData.jobSearchTiming,
        partTimeHope: formData.partTimeHope,
        graduationCareerPlan: graduationCareerPlan,
        preferredArea: formData.preferredArea,
        preferredWorkplace: formData.preferredWorkplace,
        futureCareerVision: formData.futureCareerVision,
        submittedAt: new Date(),
        createdAt: new Date(),
      })

      toast.success('アンケートを送信しました。ご協力ありがとうございました！')
      router.push(`/public/candidates/${candidateId}/mypage`)
    } catch (error) {
      console.error('アンケート送信エラー:', error)
      toast.error('アンケートの送信に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <Button
          variant="outline"
          onClick={() => router.push(`/public/candidates/${candidateId}/mypage`)}
          className="mb-6 bg-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          マイページに戻る
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ClipboardList className="h-6 w-6" />
              就職活動アンケート
            </CardTitle>
            <CardDescription>
              就職活動のサポートのため、以下の質問にご回答ください。
            </CardDescription>
            <p className="text-sm text-gray-700 mt-2">
              {candidate?.lastName} {candidate?.firstName} 様
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 6. 最寄駅 */}
              <div>
                <Label htmlFor="nearestStation">1. 最寄駅</Label>
                <Input
                  id="nearestStation"
                  placeholder="例: 渋谷駅"
                  value={formData.nearestStation}
                  onChange={(e) => handleChange('nearestStation', e.target.value)}
                  className="mt-2"
                />
              </div>

              {/* 7. 調理経験 */}
              <div>
                <Label htmlFor="cookingExperience">2. 調理経験</Label>
                <Select
                  value={formData.cookingExperience}
                  onValueChange={(value) => handleChange('cookingExperience', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="調理経験を選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ほぼ未経験">ほぼ未経験</SelectItem>
                    <SelectItem value="趣味や家庭料理程度">趣味や家庭料理程度</SelectItem>
                    <SelectItem value="アルバイトのキッチン経験あり">アルバイトのキッチン経験あり</SelectItem>
                    <SelectItem value="正社員（料理人）として勤務経験あり">正社員（料理人）として勤務経験あり</SelectItem>
                    <SelectItem value="その他">その他</SelectItem>
                  </SelectContent>
                </Select>
                {formData.cookingExperience === 'その他' && (
                  <Input
                    placeholder="その他の調理経験を入力してください"
                    value={formData.cookingExperienceOther}
                    onChange={(e) => handleChange('cookingExperienceOther', e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              {/* 8. 就職活動をスタートさせるタイミング */}
              <div>
                <Label htmlFor="jobSearchTiming">3. 就職活動をスタートさせるタイミング</Label>
                <Select
                  value={formData.jobSearchTiming}
                  onValueChange={(value) => handleChange('jobSearchTiming', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="タイミングを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="通例通り2ヶ月目下旬">通例通り2ヶ月目下旬</SelectItem>
                    <SelectItem value="少し早めにスタートさせたい">少し早めにスタートさせたい</SelectItem>
                    <SelectItem value="就職するか悩んでおり、卒業するまで検討したい">就職するか悩んでおり、卒業するまで検討したい</SelectItem>
                    <SelectItem value="相談したい">相談したい</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 9. 在校中のアルバイト希望について */}
              <div>
                <Label htmlFor="partTimeHope">4. 在校中のアルバイト希望について</Label>
                <Select
                  value={formData.partTimeHope}
                  onValueChange={(value) => handleChange('partTimeHope', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="アルバイト希望を選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="在校中にアルバイトをしたい">在校中にアルバイトをしたい</SelectItem>
                    <SelectItem value="在校中にアルバイトはしない">在校中にアルバイトはしない</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 10. 卒業直後の希望進路 */}
              <div>
                <Label>5. 卒業直後の希望進路（現時点で当てはまるもの全て選択してください）</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="career1"
                      checked={formData.graduationCareerPlan.includes('国内就職')}
                      onCheckedChange={(checked) => handleCareerPlanChange('国内就職', checked as boolean)}
                    />
                    <Label htmlFor="career1" className="font-normal cursor-pointer">国内就職</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="career2"
                      checked={formData.graduationCareerPlan.includes('国内開業')}
                      onCheckedChange={(checked) => handleCareerPlanChange('国内開業', checked as boolean)}
                    />
                    <Label htmlFor="career2" className="font-normal cursor-pointer">国内開業</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="career3"
                      checked={formData.graduationCareerPlan.includes('海外就職')}
                      onCheckedChange={(checked) => handleCareerPlanChange('海外就職', checked as boolean)}
                    />
                    <Label htmlFor="career3" className="font-normal cursor-pointer">海外就職</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="career4"
                      checked={formData.graduationCareerPlan.includes('海外開業')}
                      onCheckedChange={(checked) => handleCareerPlanChange('海外開業', checked as boolean)}
                    />
                    <Label htmlFor="career4" className="font-normal cursor-pointer">海外開業</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="career5"
                      checked={formData.graduationCareerPlan.includes('その他')}
                      onCheckedChange={(checked) => handleCareerPlanChange('その他', checked as boolean)}
                    />
                    <Label htmlFor="career5" className="font-normal cursor-pointer">その他</Label>
                  </div>
                </div>
                {formData.graduationCareerPlan.includes('その他') && (
                  <Input
                    placeholder="その他の進路を入力してください"
                    value={formData.graduationCareerPlanOther}
                    onChange={(e) => handleChange('graduationCareerPlanOther', e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              {/* 11. 就職・開業希望エリア */}
              <div>
                <Label htmlFor="preferredArea">6. 就職・開業希望エリア</Label>
                <Textarea
                  id="preferredArea"
                  placeholder="例: 東京都内、関西圏、海外など"
                  value={formData.preferredArea}
                  onChange={(e) => handleChange('preferredArea', e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>

              {/* 12. 就職・開業したいお店の雰囲気・条件 */}
              <div>
                <Label htmlFor="preferredWorkplace">7. 就職・開業したいお店の雰囲気・条件</Label>
                <Textarea
                  id="preferredWorkplace"
                  placeholder="例: アットホームな雰囲気、高級志向、カジュアルな雰囲気など"
                  value={formData.preferredWorkplace}
                  onChange={(e) => handleChange('preferredWorkplace', e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>

              {/* 13. 現時点で考えうる将来のキャリア像 */}
              <div>
                <Label htmlFor="futureCareerVision">8. 現時点で考えうる将来のキャリア像を教えてください</Label>
                <Textarea
                  id="futureCareerVision"
                  placeholder="例: 5年後には店長になりたい、10年後に独立開業したいなど"
                  value={formData.futureCareerVision}
                  onChange={(e) => handleChange('futureCareerVision', e.target.value)}
                  rows={5}
                  className="mt-2"
                />
              </div>

              {/* 送信ボタン */}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/public/candidates/${candidateId}/mypage`)}
                  disabled={submitting}
                  className="bg-white"
                >
                  キャンセル
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    '送信中...'
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      アンケートを送信
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
