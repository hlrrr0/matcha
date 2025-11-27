"use client"

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Candidate } from '@/types/candidate'
import { getCandidateByNameAndEmail } from '@/lib/firestore/candidates'
import { getUsers } from '@/lib/firestore/users'
import { User } from '@/types/user'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import CandidateForm, { CandidateFormData } from '@/components/candidates/CandidateForm'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

interface EditCandidatePageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditCandidatePage({ params }: EditCandidatePageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [candidateId, setCandidateId] = useState<string>('')
  const [users, setUsers] = useState<User[]>([])
  const [formData, setFormData] = useState<CandidateFormData>({
    status: 'active',
    lastName: '',
    firstName: '',
    lastNameKana: '',
    firstNameKana: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    enrollmentDate: '',
    campus: '',
    nearestStation: '',
    cookingExperience: '',
    jobSearchTiming: '',
    graduationCareerPlan: '',
    preferredArea: '',
    preferredWorkplace: '',
    futureCareerVision: '',
    questions: '',
    partTimeHope: '',
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

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params
      if (!resolvedParams.id || resolvedParams.id.trim() === '') {
        alert('無効な求職者IDです')
        window.location.href = '/candidates'
        return
      }
      setCandidateId(resolvedParams.id)
    }
    initializeParams()
  }, [params])

  useEffect(() => {
    if (!candidateId) return

    const fetchCandidate = async () => {
      try {
        const candidateDoc = await getDoc(doc(db, 'candidates', candidateId))
        if (candidateDoc.exists()) {
          const candidateData = candidateDoc.data() as Candidate
          
          // 日付フィールドをYYYY-MM-DD形式に変換
          const formatDateForInput = (dateValue: any): string => {
            if (!dateValue) return ''
            try {
              // Timestamp型の場合
              if (dateValue && typeof dateValue.toDate === 'function') {
                const date = dateValue.toDate()
                return date.toISOString().split('T')[0]
              }
              // Date型の場合
              if (dateValue instanceof Date) {
                return dateValue.toISOString().split('T')[0]
              }
              // 文字列の場合（YYYY-MM-DD形式ならそのまま、ISO形式なら変換）
              if (typeof dateValue === 'string') {
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                  return dateValue
                }
                const date = new Date(dateValue)
                if (!isNaN(date.getTime())) {
                  return date.toISOString().split('T')[0]
                }
              }
              return ''
            } catch (error) {
              console.error('日付変換エラー:', error)
              return ''
            }
          }
          
          setFormData({
            status: candidateData.status || 'active',
            lastName: candidateData.lastName || '',
            firstName: candidateData.firstName || '',
            lastNameKana: candidateData.lastNameKana || '',
            firstNameKana: candidateData.firstNameKana || '',
            email: candidateData.email || '',
            phone: candidateData.phone || '',
            dateOfBirth: formatDateForInput(candidateData.dateOfBirth),
            enrollmentDate: candidateData.enrollmentDate || '',
            campus: candidateData.campus || '',
            nearestStation: candidateData.nearestStation || '',
            cookingExperience: candidateData.cookingExperience || '',
            jobSearchTiming: candidateData.jobSearchTiming || '',
            graduationCareerPlan: candidateData.graduationCareerPlan || '',
            preferredArea: candidateData.preferredArea || '',
            preferredWorkplace: candidateData.preferredWorkplace || '',
            futureCareerVision: candidateData.futureCareerVision || '',
            questions: candidateData.questions || '',
            partTimeHope: candidateData.partTimeHope || '',
            applicationFormUrl: candidateData.applicationFormUrl || '',
            resumeUrl: candidateData.resumeUrl || '',
            teacherComment: candidateData.teacherComment || '',
            personalityScore: candidateData.personalityScore || '',
            skillScore: candidateData.skillScore || '',
            interviewMemo: candidateData.interviewMemo || '',
            assignedUserId: candidateData.assignedUserId || ''
          })
        } else {
          toast.error('求職者が見つかりません')
          router.push('/candidates')
        }
      } catch (error) {
        console.error('求職者データの取得に失敗しました:', error)
        toast.error('求職者データの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchCandidate()
  }, [candidateId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!candidateId) return
    setSaving(true)

    try {
      // 重複チェック: 名前とメールアドレスが一致する求職者が既に存在するか確認（自分自身を除く）
      const existingCandidate = await getCandidateByNameAndEmail(
        formData.lastName,
        formData.firstName,
        formData.email
      )

      if (existingCandidate && existingCandidate.id !== candidateId) {
        toast.error('同じ名前とメールアドレスの求職者が既に登録されています')
        setSaving(false)
        return
      }

      // undefinedや空文字列のフィールドを除外してデータを準備
      const updateData: any = {
        status: formData.status,
        lastName: formData.lastName,
        firstName: formData.firstName,
        updatedAt: new Date()
      }

      // 任意フィールドは値がある場合のみ含める
      if (formData.lastNameKana && formData.lastNameKana.trim()) {
        updateData.lastNameKana = formData.lastNameKana
      }
      if (formData.firstNameKana && formData.firstNameKana.trim()) {
        updateData.firstNameKana = formData.firstNameKana
      }
      if (formData.email && formData.email.trim()) {
        updateData.email = formData.email
      }
      if (formData.phone && formData.phone.trim()) {
        updateData.phone = formData.phone
      }
      if (formData.dateOfBirth && formData.dateOfBirth.trim()) {
        updateData.dateOfBirth = formData.dateOfBirth
      }
      if (formData.enrollmentDate && formData.enrollmentDate.trim()) {
        updateData.enrollmentDate = formData.enrollmentDate
      }
      if (formData.campus && formData.campus.trim()) {
        updateData.campus = formData.campus
      }
      if (formData.nearestStation && formData.nearestStation.trim()) {
        updateData.nearestStation = formData.nearestStation
      }
      if (formData.cookingExperience && formData.cookingExperience.trim()) {
        updateData.cookingExperience = formData.cookingExperience
      }
      if (formData.jobSearchTiming && formData.jobSearchTiming.trim()) {
        updateData.jobSearchTiming = formData.jobSearchTiming
      }
      if (formData.graduationCareerPlan && formData.graduationCareerPlan.trim()) {
        updateData.graduationCareerPlan = formData.graduationCareerPlan
      }
      if (formData.preferredArea && formData.preferredArea.trim()) {
        updateData.preferredArea = formData.preferredArea
      }
      if (formData.preferredWorkplace && formData.preferredWorkplace.trim()) {
        updateData.preferredWorkplace = formData.preferredWorkplace
      }
      if (formData.futureCareerVision && formData.futureCareerVision.trim()) {
        updateData.futureCareerVision = formData.futureCareerVision
      }
      if (formData.questions && formData.questions.trim()) {
        updateData.questions = formData.questions
      }
      if (formData.partTimeHope && formData.partTimeHope.trim()) {
        updateData.partTimeHope = formData.partTimeHope
      }
      if (formData.applicationFormUrl && formData.applicationFormUrl.trim()) {
        updateData.applicationFormUrl = formData.applicationFormUrl
      }
      if (formData.resumeUrl && formData.resumeUrl.trim()) {
        updateData.resumeUrl = formData.resumeUrl
      }
      if (formData.teacherComment && formData.teacherComment.trim()) {
        updateData.teacherComment = formData.teacherComment
      }
      if (formData.personalityScore && formData.personalityScore.trim()) {
        updateData.personalityScore = formData.personalityScore
      }
      if (formData.skillScore && formData.skillScore.trim()) {
        updateData.skillScore = formData.skillScore
      }
      if (formData.interviewMemo && formData.interviewMemo.trim()) {
        updateData.interviewMemo = formData.interviewMemo
      }
      if (formData.assignedUserId && formData.assignedUserId.trim()) {
        updateData.assignedUserId = formData.assignedUserId
      } else {
        // 空の場合は明示的に削除
        updateData.assignedUserId = ''
      }

      await updateDoc(doc(db, 'candidates', candidateId), updateData)
      toast.success('求職者情報を更新しました')
      router.push(`/candidates/${candidateId}`)
    } catch (error) {
      console.error('Error updating candidate:', error)
      toast.error('求職者情報の更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center">
          <div className="text-lg">読み込み中...</div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Link href={`/candidates/${candidateId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                求職者詳細に戻る
              </Button>
            </Link>
          </div>

          <CandidateForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            loading={saving}
            submitLabel="求職者情報を更新"
            title="求職者情報編集"
            description="求職者の情報を更新してください"
            users={users}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}