import { Company } from '@/types/company'

// Status labels
export const statusLabels: Record<Company['status'], string> = {
  active: 'アクティブ',
  inactive: '非アクティブ',
}

// Status colors
export const statusColors: Record<Company['status'], string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
}

// Size labels
export const sizeLabels: Record<Company['size'], string> = {
  startup: '個人店',
  small: '2~3店舗',
  medium: '4~20店舗',
  large: '21~99店舗',
  enterprise: '100店舗以上',
}

// Domino connection status
export const dominoStatusLabels = {
  all: 'すべて',
  connected: 'Domino連携済み',
  not_connected: 'Domino未連携',
}

// Company fields for completion rate calculation
export const companyFields = [
  'name', 'address', 'email', 'phone', 'website', 'logo',
  'feature1', 'feature2', 'feature3', 'careerPath', 
  'youngRecruitReason', 'consultantId', 'contractType'
] as const

// Default items per page
export const DEFAULT_ITEMS_PER_PAGE = 50

// Sort options
export const sortOptions = [
  { value: 'name', label: '企業名' },
  { value: 'updatedAt', label: '更新日' },
  { value: 'createdAt', label: '作成日' },
  { value: 'status', label: 'ステータス' }
] as const
