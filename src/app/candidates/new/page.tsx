"use client"

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import CandidateForm, { CandidateFormData } from '@/components/candidates/CandidateForm'
import { ArrowLeft } from 'lucide-react'
import { createCandidate, getCandidateByNameAndEmail } from '@/lib/firestore/candidates'
import { getUsers } from '@/lib/firestore/users'
import { User } from '@/types/user'
import { toast } from 'sonner'

export default function NewCandidatePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [formData, setFormData] = useState<CandidateFormData>({
    // 出自管理
    sourceType: 'inshokujin_univ',
    sourceDetail: '',
    
    // 基本情報（必須）
    status: 'active',
    lastName: '',
    firstName: '',
    
    // 基本情報（任意）
    lastNameKana: '',
    firstNameKana: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    enrollmentDate: '',
    campus: '',
    nearestStation: '',
    cookingExperience: '',
    
    // 希望
    jobSearchTiming: '',
    graduationCareerPlan: '',
    preferredArea: '',
    preferredWorkplace: '',
    futureCareerVision: '',
    questions: '',
    partTimeHope: '',
    
    // inner情報
    applicationFormUrl: '',
    resumeUrl: '',
    teacherComment: '',
    personalityScore: '',
    skillScore: '',
    interviewMemo: '',
    assignedUserId: ''
  })

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await getUsers()
        setUsers(usersData)
      } catch (error) {
        console.error('ユーザー取得エラー:', error)
      }
    }
    loadUsers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.lastName || !formData.firstName) {
      toast.error('姓名は必須項目です')
      return
    }

    try {
      setLoading(true)

      // 重複チェック: 名前とメールアドレスが一致する求職者が既に存在するか確認
      const existingCandidate = await getCandidateByNameAndEmail(
        formData.lastName,
        formData.firstName,
        formData.email
      )

      if (existingCandidate) {
        toast.error('同じ名前とメールアドレスの求職者が既に登録されています')
        setLoading(false)
        return
      }

      // undefinedや空文字列のフィールドを除外してデータを準備
      const candidateData: any = {
        sourceType: formData.sourceType,
        status: formData.status,
        lastName: formData.lastName,
        firstName: formData.firstName
      }

      // sourceDetailは任意フィールド
      if (formData.sourceDetail && formData.sourceDetail.trim()) {
        candidateData.sourceDetail = formData.sourceDetail
      }

      // 任意フィールドは値がある場合のみ含める
      if (formData.lastNameKana && formData.lastNameKana.trim()) {
        candidateData.lastNameKana = formData.lastNameKana
      }
      if (formData.firstNameKana && formData.firstNameKana.trim()) {
        candidateData.firstNameKana = formData.firstNameKana
      }
      if (formData.email && formData.email.trim()) {
        candidateData.email = formData.email
      }
      if (formData.phone && formData.phone.trim()) {
        candidateData.phone = formData.phone
      }
      if (formData.dateOfBirth && formData.dateOfBirth.trim()) {
        candidateData.dateOfBirth = formData.dateOfBirth
      }
      if (formData.enrollmentDate && formData.enrollmentDate.trim()) {
        candidateData.enrollmentDate = formData.enrollmentDate
      }
      if (formData.campus && formData.campus.trim()) {
        candidateData.campus = formData.campus
      }
      if (formData.nearestStation && formData.nearestStation.trim()) {
        candidateData.nearestStation = formData.nearestStation
      }
      if (formData.cookingExperience && formData.cookingExperience.trim()) {
        candidateData.cookingExperience = formData.cookingExperience
      }
      if (formData.jobSearchTiming && formData.jobSearchTiming.trim()) {
        candidateData.jobSearchTiming = formData.jobSearchTiming
      }
      if (formData.graduationCareerPlan && formData.graduationCareerPlan.trim()) {
        candidateData.graduationCareerPlan = formData.graduationCareerPlan
      }
      if (formData.preferredArea && formData.preferredArea.trim()) {
        candidateData.preferredArea = formData.preferredArea
      }
      if (formData.preferredWorkplace && formData.preferredWorkplace.trim()) {
        candidateData.preferredWorkplace = formData.preferredWorkplace
      }
      if (formData.futureCareerVision && formData.futureCareerVision.trim()) {
        candidateData.futureCareerVision = formData.futureCareerVision
      }
      if (formData.questions && formData.questions.trim()) {
        candidateData.questions = formData.questions
      }
      if (formData.partTimeHope && formData.partTimeHope.trim()) {
        candidateData.partTimeHope = formData.partTimeHope
      }
      if (formData.applicationFormUrl && formData.applicationFormUrl.trim()) {
        candidateData.applicationFormUrl = formData.applicationFormUrl
      }
      if (formData.resumeUrl && formData.resumeUrl.trim()) {
        candidateData.resumeUrl = formData.resumeUrl
      }
      if (formData.teacherComment && formData.teacherComment.trim()) {
        candidateData.teacherComment = formData.teacherComment
      }
      if (formData.personalityScore && formData.personalityScore.trim()) {
        candidateData.personalityScore = formData.personalityScore
      }
      if (formData.skillScore && formData.skillScore.trim()) {
        candidateData.skillScore = formData.skillScore
      }
      if (formData.interviewMemo && formData.interviewMemo.trim()) {
        candidateData.interviewMemo = formData.interviewMemo
      }
      if (formData.assignedUserId && formData.assignedUserId.trim()) {
        candidateData.assignedUserId = formData.assignedUserId
      }

      const newId = await createCandidate(candidateData)
      toast.success('求職者を作成しました')
      router.push(`/candidates/${newId}`)
    } catch (error) {
      console.error('Error creating candidate:', error)
      toast.error('求職者の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Link href="/candidates">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                求職者一覧に戻る
              </Button>
            </Link>
          </div>

          <CandidateForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            loading={loading}
            submitLabel="求職者を作成"
            title="新規求職者登録"
            description="新しい求職者の情報を入力してください"
            users={users}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}