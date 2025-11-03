"use client"

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building2 } from 'lucide-react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Company } from '@/types/company'
import CompanyForm from '@/components/companies/CompanyForm'
import { toast } from 'sonner'

interface EditCompanyPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditCompanyPage({ params }: EditCompanyPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companyId, setCompanyId] = useState<string>('')
  const [company, setCompany] = useState<Partial<Company>>({})

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params
      setCompanyId(resolvedParams.id)
    }
    initializeParams()
  }, [params])

  useEffect(() => {
    if (!companyId) return

    const fetchCompany = async () => {
      try {
        const companyDoc = await getDoc(doc(db, 'companies', companyId))
        if (companyDoc.exists()) {
          const companyData = companyDoc.data() as Company
          setCompany(companyData)
        } else {
          toast.error('企業が見つかりません')
          router.push('/companies')
        }
      } catch (error) {
        console.error('企業データの取得に失敗しました:', error)
        toast.error('企業データの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchCompany()
  }, [companyId, router])

  const handleSubmit = async (formData: Partial<Company>) => {
    setSaving(true)
    
    try {
      const updateData = {
        ...formData,
        updatedAt: new Date().toISOString()
      }
      
      await updateDoc(doc(db, 'companies', companyId), updateData)
      toast.success('企業情報が正常に更新されました')
      router.push(`/companies/${companyId}`)
    } catch (error) {
      console.error('Error updating company:', error)
      toast.error('企業情報の更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center">
          <div className="text-lg">読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <Link href={`/companies/${companyId}`}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          企業詳細に戻る
        </Button>
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              企業情報編集
            </h1>
            <p className="text-gray-600 mt-2">
              {company.name}の情報を編集します
            </p>
          </div>
        </div>
      </div>

      <CompanyForm 
        initialData={company}
        onSubmit={handleSubmit}
        isEdit={true}
        loading={saving}
      />
    </div>
  )
}
