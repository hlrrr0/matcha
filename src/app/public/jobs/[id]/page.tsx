import type { Metadata } from 'next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store as StoreType } from '@/types/store'
import PublicJobClient from './PublicJobClient'

interface PublicJobPageProps {
  params: Promise<{
    id: string
  }>
}

// 動的メタデータ生成
export async function generateMetadata({ params }: PublicJobPageProps): Promise<Metadata> {
  try {
    const resolvedParams = await params
    const jobDoc = await getDoc(doc(db, 'jobs', resolvedParams.id))
    
    if (!jobDoc.exists()) {
      return {
        title: '求人が見つかりません',
        description: 'お探しの求人情報が見つかりませんでした。',
        robots: {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        },
      }
    }

    const jobData = jobDoc.data() as Job
    
    // 公開中でない求人の場合
    if (jobData.status !== 'active') {
      return {
        title: '求人が見つかりません',
        description: 'お探しの求人情報が見つかりませんでした。',
        robots: {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        },
      }
    }

    let companyName = ''
    let storeNames: string[] = []

    // 関連企業の取得
    if (jobData.companyId && jobData.companyId.trim() !== '') {
      const companyDoc = await getDoc(doc(db, 'companies', jobData.companyId))
      if (companyDoc.exists()) {
        const companyData = companyDoc.data() as Company
        companyName = companyData.name || ''
      }
    }

    // 関連店舗の取得（複数対応）
    const storeIds = jobData.storeIds || (jobData.storeId ? [jobData.storeId] : [])
    const validStoreIds = storeIds.filter(id => id && id.trim() !== '')
    if (validStoreIds.length > 0) {
      for (const storeId of validStoreIds) {
        const storeDoc = await getDoc(doc(db, 'stores', storeId))
        if (storeDoc.exists()) {
          const storeData = storeDoc.data() as StoreType
          if (storeData.name) {
            storeNames.push(storeData.name)
          }
        }
      }
    }

    // タイトルの構築: "{企業名} - {店舗名} - {求人名}"
    const titleParts = []
    if (companyName) titleParts.push(companyName)
    if (storeNames.length > 0) titleParts.push(storeNames[0]) // 最初の店舗名のみ
    if (jobData.title) titleParts.push(jobData.title)
    
    const title = titleParts.length > 0 ? titleParts.join(' - ') : '求人情報'
    const storeNamesText = storeNames.length > 0 ? ` ${storeNames.join('、')}` : ''
    
    return {
      title,
      description: jobData.jobDescription || `${companyName}${storeNamesText}の求人情報です。`,
      robots: {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      },
      openGraph: {
        title,
        description: jobData.jobDescription || `${companyName}${storeNamesText}の求人情報です。`,
        type: 'website',
      },
    }
  } catch (error) {
    console.error('メタデータ生成エラー:', error)
    return {
      title: '求人情報',
      description: '求人情報をご覧いただけます。',
      robots: {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      },
    }
  }
}

export default function PublicJobPage({ params }: PublicJobPageProps) {
  return <PublicJobClient params={params} />
}