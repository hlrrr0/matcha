import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store as StoreType } from '@/types/store'
import { EMPLOYMENT_TYPE_COLORS, EMPLOYMENT_TYPE_LABELS } from './SushiCareerJobConstants'
import { ImageData } from './SushiCareerJobTypes'

// 日時をフォーマットする関数
export const formatDateTime = (dateValue: any): string => {
  if (!dateValue) return '未設定'
  
  try {
    let date: Date
    
    if (dateValue && typeof dateValue.toDate === 'function') {
      // Firestore Timestamp
      date = dateValue.toDate()
    } else if (dateValue instanceof Date) {
      // Date オブジェクト
      date = dateValue
    } else if (typeof dateValue === 'string') {
      // 文字列
      date = new Date(dateValue)
    } else {
      return '不正な日時'
    }
    
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch (error) {
    console.error('日時のフォーマットに失敗:', error)
    return '不正な日時'
  }
}

// 雇用形態のバッジカラーを取得
export const getEmploymentTypeBadgeColor = (type: Job['employmentType']): string => {
  if (!type) return 'bg-gray-100 text-gray-800'
  return EMPLOYMENT_TYPE_COLORS[type as keyof typeof EMPLOYMENT_TYPE_COLORS] || 'bg-gray-100 text-gray-800'
}

// 雇用形態のラベルを取得
export const getEmploymentTypeLabel = (type: Job['employmentType']): string => {
  if (!type) return '未設定'
  return EMPLOYMENT_TYPE_LABELS[type as keyof typeof EMPLOYMENT_TYPE_LABELS] || type
}

// 給与情報をフォーマット
export const formatSalary = (job: Job): string => {
  if (job.salaryExperienced) {
    return `給与（経験者）: ${job.salaryExperienced}`
  } else if (job.salaryInexperienced) {
    return `給与（未経験）: ${job.salaryInexperienced}`
  }
  return '給与: 要相談'
}

// 店舗の写真を取得する関数
export const getStoreImages = (store: StoreType | null): ImageData[] => {
  if (!store) return []
  
  const images: ImageData[] = []
  
  // 各写真フィールドをチェックして配列に追加
  if (store.ownerPhoto) images.push({ src: store.ownerPhoto, alt: '大将の写真' })
  if (store.interiorPhoto) images.push({ src: store.interiorPhoto, alt: '店内の写真' })
  if (store.photo1) images.push({ src: store.photo1, alt: '店舗写真1' })
  if (store.photo2) images.push({ src: store.photo2, alt: '店舗写真2' })
  if (store.photo3) images.push({ src: store.photo3, alt: '店舗写真3' })
  if (store.photo4) images.push({ src: store.photo4, alt: '店舗写真4' })
  if (store.photo5) images.push({ src: store.photo5, alt: '店舗写真5' })
  if (store.photo6) images.push({ src: store.photo6, alt: '店舗写真6' })
  if (store.photo7) images.push({ src: store.photo7, alt: '店舗写真7' })
  
  return images
}

// すべての写真（企業ロゴ + 店舗写真）を取得
export const getAllPhotos = (company: Company | null, store: StoreType): ImageData[] => {
  const allPhotos: ImageData[] = []
  
  // 企業ロゴ
  if (company?.logo) {
    allPhotos.push({ src: company.logo, alt: '企業ロゴ' })
  }
  
  // オーナー写真
  if (store.ownerPhoto) {
    allPhotos.push({ src: store.ownerPhoto, alt: 'オーナー写真' })
  }
  
  // 店内写真
  if (store.interiorPhoto) {
    allPhotos.push({ src: store.interiorPhoto, alt: '店内写真' })
  }
  
  // 素材写真 1-7
  if (store.photo1) allPhotos.push({ src: store.photo1, alt: '素材写真1' })
  if (store.photo2) allPhotos.push({ src: store.photo2, alt: '素材写真2' })
  if (store.photo3) allPhotos.push({ src: store.photo3, alt: '素材写真3' })
  if (store.photo4) allPhotos.push({ src: store.photo4, alt: '素材写真4' })
  if (store.photo5) allPhotos.push({ src: store.photo5, alt: '素材写真5' })
  if (store.photo6) allPhotos.push({ src: store.photo6, alt: '素材写真6' })
  if (store.photo7) allPhotos.push({ src: store.photo7, alt: '素材写真7' })
  
  return allPhotos
}
