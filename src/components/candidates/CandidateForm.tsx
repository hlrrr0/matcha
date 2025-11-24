"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, RefreshCw } from 'lucide-react'
import { Candidate } from '@/types/candidate'

interface CandidateFormData {
  // 基本情報（必須）
  status: 'active' | 'inactive'
  lastName: string
  firstName: string
  
  // 基本情報（任意）
  lastNameKana: string
  firstNameKana: string
  email: string
  phone: string
  dateOfBirth: string
  enrollmentDate: string
  campus: 'tokyo' | 'osaka' | 'awaji' | 'fukuoka' | ''
  nearestStation: string
  cookingExperience: string
  
  // 希望
  jobSearchTiming: string
  graduationCareerPlan: string
  preferredArea: string
  preferredWorkplace: string
  futureCareerVision: string
  questions: string
  partTimeHope: string
  
  // inner情報
  applicationFormUrl: string
  resumeUrl: string
  teacherComment: string
  personalityScore: string
  skillScore: string
  interviewMemo: string
}

interface CandidateFormProps {
  formData: CandidateFormData
  setFormData: React.Dispatch<React.SetStateAction<CandidateFormData>>
  onSubmit: (e: React.FormEvent) => Promise<void>
  loading: boolean
  submitLabel: string
  title: string
  description: string
}

export default function CandidateForm({
  formData,
  setFormData,
  onSubmit,
  loading,
  submitLabel,
  title,
  description
}: CandidateFormProps) {
  const handleInputChange = (field: keyof CandidateFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-800">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lastName">
                姓 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="firstName">
                名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lastNameKana">姓（カナ）</Label>
              <Input
                id="lastNameKana"
                value={formData.lastNameKana}
                onChange={(e) => handleInputChange('lastNameKana', e.target.value)}
                placeholder="例: タナカ"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="firstNameKana">名（カナ）</Label>
              <Input
                id="firstNameKana"
                value={formData.firstNameKana}
                onChange={(e) => handleInputChange('firstNameKana', e.target.value)}
                placeholder="例: タロウ"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dateOfBirth">生年月日</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="enrollmentDate">入学年月</Label>
              <Input
                id="enrollmentDate"
                type="month"
                value={formData.enrollmentDate}
                onChange={(e) => handleInputChange('enrollmentDate', e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="campus">入学校舎</Label>
              <Select
                value={formData.campus}
                onValueChange={(value) => handleInputChange('campus', value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="校舎を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tokyo">東京校</SelectItem>
                  <SelectItem value="osaka">大阪校</SelectItem>
                  <SelectItem value="awaji">淡路校</SelectItem>
                  <SelectItem value="fukuoka">福岡校</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nearestStation">最寄り駅</Label>
              <Input
                id="nearestStation"
                value={formData.nearestStation}
                onChange={(e) => handleInputChange('nearestStation', e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="status">
                ステータス <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">アクティブ</SelectItem>
                  <SelectItem value="inactive">非アクティブ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="cookingExperience">調理経験</Label>
            <Textarea
              id="cookingExperience"
              value={formData.cookingExperience}
              onChange={(e) => handleInputChange('cookingExperience', e.target.value)}
              placeholder="調理経験やスキルについて記入してください"
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* 希望条件 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-800">希望条件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="jobSearchTiming">就職活動をスタートさせるタイミング</Label>
            <Input
              id="jobSearchTiming"
              value={formData.jobSearchTiming}
              onChange={(e) => handleInputChange('jobSearchTiming', e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="graduationCareerPlan">卒業&quot;直後&quot;の希望進路</Label>
            <Input
              id="graduationCareerPlan"
              value={formData.graduationCareerPlan}
              onChange={(e) => handleInputChange('graduationCareerPlan', e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="preferredArea">就職・開業希望エリア</Label>
            <Input
              id="preferredArea"
              value={formData.preferredArea}
              onChange={(e) => handleInputChange('preferredArea', e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="preferredWorkplace">就職・開業したいお店の雰囲気・条件</Label>
            <Textarea
              id="preferredWorkplace"
              value={formData.preferredWorkplace}
              onChange={(e) => handleInputChange('preferredWorkplace', e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="futureCareerVision">将来のキャリア像</Label>
            <Textarea
              id="futureCareerVision"
              value={formData.futureCareerVision}
              onChange={(e) => handleInputChange('futureCareerVision', e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="questions">キャリア担当への質問・要望</Label>
            <Textarea
              id="questions"
              value={formData.questions}
              onChange={(e) => handleInputChange('questions', e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="partTimeHope">在校中のアルバイト希望</Label>
            <Textarea
              id="partTimeHope"
              value={formData.partTimeHope}
              onChange={(e) => handleInputChange('partTimeHope', e.target.value)}
              disabled={loading}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* 内部管理情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-orange-800">内部管理情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="applicationFormUrl">願書URL</Label>
              <Input
                id="applicationFormUrl"
                type="url"
                value={formData.applicationFormUrl}
                onChange={(e) => handleInputChange('applicationFormUrl', e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="resumeUrl">履歴書URL</Label>
              <Input
                id="resumeUrl"
                type="url"
                value={formData.resumeUrl}
                onChange={(e) => handleInputChange('resumeUrl', e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="teacherComment">先生からのコメント</Label>
            <Textarea
              id="teacherComment"
              value={formData.teacherComment}
              onChange={(e) => handleInputChange('teacherComment', e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="personalityScore">スコア（人物）</Label>
              <Input
                id="personalityScore"
                value={formData.personalityScore}
                onChange={(e) => handleInputChange('personalityScore', e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="skillScore">スコア（スキル）</Label>
              <Input
                id="skillScore"
                value={formData.skillScore}
                onChange={(e) => handleInputChange('skillScore', e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="interviewMemo">面談メモ</Label>
            <Textarea
              id="interviewMemo"
              value={formData.interviewMemo}
              onChange={(e) => handleInputChange('interviewMemo', e.target.value)}
              disabled={loading}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* 送信ボタン */}
      <div className="flex justify-end gap-4">
        <Button
          type="submit"
          disabled={loading}
          className="min-w-[120px]"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export type { CandidateFormData }