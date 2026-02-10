import type { Metadata } from 'next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store as StoreType } from '@/types/store'
import SushiCareerJobClient from './SushiCareerJobClient'

interface SushiCareerJobPageProps {
  params: Promise<{
    id: string
  }>
}

// 動的メタデータ生成
export async function generateMetadata({ params }: SushiCareerJobPageProps): Promise<Metadata> {
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
    let storePrefectures: string[] = []
    if (validStoreIds.length > 0) {
      for (const storeId of validStoreIds) {
        const storeDoc = await getDoc(doc(db, 'stores', storeId))
        if (storeDoc.exists()) {
          const storeData = storeDoc.data() as StoreType
          if (storeData.name) {
            storeNames.push(storeData.name)
          }
          if (storeData.prefecture && !storePrefectures.includes(storeData.prefecture)) {
            storePrefectures.push(storeData.prefecture)
          }
        }
      }
    }

    // タイトルの構築: "{店舗名}-{職種名}"
    const storeName = storeNames.length > 0 ? storeNames[0] : companyName
    const jobTitle = jobData.title || '求人'
    const title = storeName ? `${storeName}-${jobTitle}` : jobTitle
    
    // ディスクリプションの構築
    const generateDescription = () => {
      // エリア情報
      const area = storePrefectures.length > 0 
        ? `${storePrefectures.join('・')}エリア` 
        : (storeNames.length > 0 ? `${storeNames[0]}` : '')
      
      // 雇用形態
      const employmentTypeMap: Record<string, string> = {
        'full-time': '正社員',
        'part-time': 'アルバイト・パート',
        'contract': '契約社員',
        'temporary': '派遣社員',
        'other': '業務委託'
      }
      const employmentText = jobData.employmentType ? employmentTypeMap[jobData.employmentType] || '' : ''
      
      // 給与情報（未経験・経験者の両方を考慮）
      let salaryText = ''
      if (jobData.salaryInexperienced && jobData.salaryExperienced) {
        salaryText = `月給${jobData.salaryInexperienced}～${jobData.salaryExperienced}`
      } else if (jobData.salaryInexperienced) {
        salaryText = `月給${jobData.salaryInexperienced}`
      } else if (jobData.salaryExperienced) {
        salaryText = `月給${jobData.salaryExperienced}`
      }
      
      // 経験条件（requiredSkillsから判断）
      const experienceText = jobData.requiredSkills && jobData.requiredSkills.includes('経験') && !jobData.requiredSkills.includes('未経験')
        ? '経験者優遇' 
        : '未経験歓迎'
      
      // ディスクリプションパターン（王道）
      if (area && employmentText) {
        return `${jobTitle}の求人情報｜${area}の${companyName || ''}で${employmentText}募集。${experienceText}。${salaryText ? `${salaryText}。` : ''}仕事内容、給与、待遇を詳しく掲載中。`
      }
      
      // カジュアルパターン（エリアない場合）
      if (companyName) {
        return `【${jobTitle}募集】${companyName}${storeNames[0] ? `の${storeNames[0]}` : ''}で勤務。${experienceText}・${employmentText}。${salaryText ? `${salaryText}。` : ''}給与・休日・福利厚生を求人ページで確認。`
      }
      
      // フォールバック
      return `${jobTitle}の求人情報。${experienceText}。${employmentText}の募集です。詳細は求人ページをご覧ください。`
    }
    
    const description = generateDescription()

    return {
      title,
      description: description,
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
        description: description,
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

export default function SushiCareerJobPage({ params }: SushiCareerJobPageProps) {
  return <SushiCareerJobClient params={params} />
}
