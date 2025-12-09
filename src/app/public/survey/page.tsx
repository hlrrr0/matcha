"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ClipboardList, Send } from 'lucide-react'
import { createCandidate } from '@/lib/firestore/candidates'
import { toast } from 'sonner'

export default function CandidateSurveyPage() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    enrollmentDate: '',
    campus: '',
    lastName: '',
    firstName: '',
    lastNameKana: '',
    firstNameKana: '',
    dateOfBirth: '',
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

    // 必須項目チェック
    if (!formData.enrollmentDate || !formData.campus || !formData.lastName || 
        !formData.firstName || !formData.dateOfBirth) {
      toast.error('必須項目を入力してください')
      return
    }

    setLoading(true)

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

      const candidateData = {
        status: 'active' as const,
        lastName: formData.lastName,
        firstName: formData.firstName,
        lastNameKana: formData.lastNameKana,
        firstNameKana: formData.firstNameKana,
        dateOfBirth: formData.dateOfBirth,
        enrollmentDate: formData.enrollmentDate,
        campus: formData.campus as 'tokyo' | 'osaka' | 'awaji' | 'fukuoka' | undefined,
        nearestStation: formData.nearestStation,
        cookingExperience: cookingExperience,
        jobSearchTiming: formData.jobSearchTiming,
        partTimeHope: formData.partTimeHope,
        graduationCareerPlan: graduationCareerPlan,
        preferredArea: formData.preferredArea,
        preferredWorkplace: formData.preferredWorkplace,
        futureCareerVision: formData.futureCareerVision,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await createCandidate(candidateData)
      toast.success('アンケートを送信しました。ありがとうございました！')
      
      // フォームをリセット
      setFormData({
        enrollmentDate: '',
        campus: '',
        lastName: '',
        firstName: '',
        lastNameKana: '',
        firstNameKana: '',
        dateOfBirth: '',
        nearestStation: '',
        cookingExperience: '',
        cookingExperienceOther: '',
        jobSearchTiming: '',
        partTimeHope: '',
        graduationCareerPlan: [],
        graduationCareerPlanOther: '',
        preferredArea: '',
        preferredWorkplace: '',
        futureCareerVision: ''
      })
    } catch (error) {
      console.error('アンケート送信エラー:', error)
      toast.error('送信に失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ClipboardList className="h-6 w-6" />
              求職者アンケート
            </CardTitle>
            <CardDescription>
              就職活動のサポートのため、以下の質問にご回答ください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. 入学式の日付 */}
              <div>
                <Label htmlFor="enrollmentDate">
                  1. 入学式の日付 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="enrollmentDate"
                  type="date"
                  value={formData.enrollmentDate}
                  onChange={(e) => handleChange('enrollmentDate', e.target.value)}
                  required
                  className="mt-2"
                />
              </div>

              {/* 2. コース */}
              <div>
                <Label htmlFor="campus">
                  2. コース <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.campus}
                  onValueChange={(value) => handleChange('campus', value)}
                  required
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="コースを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tokyo">寿司マイスター専科 東京校</SelectItem>
                    <SelectItem value="osaka">寿司マイスター専科 大阪校</SelectItem>
                    <SelectItem value="awaji">寿司マイスター専科 淡路島校</SelectItem>
                    <SelectItem value="fukuoka">寿司マイスター専科 福岡校</SelectItem>
                    <SelectItem value="chinese">中華マイスター専科</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 3. 名前（漢字フルネーム） */}
              <div>
                <Label>
                  3. 名前（漢字フルネーム） <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Input
                      placeholder="姓"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="名"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 4. ふりがな（ひらがなフルネーム） */}
              <div>
                <Label>4. ふりがな（ひらがなフルネーム）</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Input
                      placeholder="せい"
                      value={formData.lastNameKana}
                      onChange={(e) => handleChange('lastNameKana', e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="めい"
                      value={formData.firstNameKana}
                      onChange={(e) => handleChange('firstNameKana', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 5. 生年月日 */}
              <div>
                <Label htmlFor="dateOfBirth">
                  5. 生年月日 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  required
                  className="mt-2"
                />
              </div>

              {/* 6. 最寄駅 */}
              <div>
                <Label htmlFor="nearestStation">6. 最寄駅</Label>
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
                <Label htmlFor="cookingExperience">7. 調理経験</Label>
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
                <Label htmlFor="jobSearchTiming">8. 就職活動をスタートさせるタイミング</Label>
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
                <Label htmlFor="partTimeHope">9. 在校中のアルバイト希望について</Label>
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
                <Label>10. 卒業直後の希望進路（現時点で当てはまるもの全て選択してください）</Label>
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
                <Label htmlFor="preferredArea">11. 就職・開業希望エリア</Label>
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
                <Label htmlFor="preferredWorkplace">12. 就職・開業したいお店の雰囲気・条件</Label>
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
                <Label htmlFor="futureCareerVision">13. 現時点で考えうる将来のキャリア像を教えてください</Label>
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
              <div className="flex justify-center pt-4">
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="w-full md:w-auto"
                >
                  {loading ? (
                    <>送信中...</>
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
