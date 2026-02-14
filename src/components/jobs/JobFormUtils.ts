import { Store } from '@/types/store'
import { STORE_SCALE_THRESHOLDS, PREFECTURE_ORDER } from './JobFormConstants'
import { JobCountByStore, StoresByPrefecture, TrainingPeriodMatch } from './JobFormTypes'

/**
 * Calculate store scale based on store count
 */
export const calculateStoreScale = (storeCount: number): 'small' | 'medium' | 'large' => {
  if (storeCount <= STORE_SCALE_THRESHOLDS.small) {
    return 'small'
  } else if (storeCount <= STORE_SCALE_THRESHOLDS.medium) {
    return 'medium'
  } else {
    return 'large'
  }
}

/**
 * Filter stores by search term
 */
export const filterStoresBySearch = (stores: Store[], searchTerm: string): Store[] => {
  if (!searchTerm.trim()) {
    return stores
  }

  const searchLower = searchTerm.toLowerCase()
  return stores.filter(store =>
    store.name?.toLowerCase().includes(searchLower) ||
    store.address?.toLowerCase().includes(searchLower) ||
    store.prefecture?.toLowerCase().includes(searchLower)
  )
}

/**
 * Sort stores by address (Japanese collation)
 */
export const sortStoresByAddress = (stores: Store[]): Store[] => {
  return [...stores].sort((a, b) => {
    const addressA = a.address || ''
    const addressB = b.address || ''
    return addressA.localeCompare(addressB, 'ja')
  })
}

/**
 * Get stores by company ID and apply filtering and sorting
 */
export const getCompanyStores = (
  stores: Store[],
  companyId: string,
  searchTerm: string
): Store[] => {
  let companyStores = stores.filter(store => store.companyId === companyId)
  companyStores = filterStoresBySearch(companyStores, searchTerm)
  companyStores = sortStoresByAddress(companyStores)
  return companyStores
}

/**
 * Group stores by prefecture, ordered geographically
 */
export const groupStoresByPrefecture = (stores: Store[]): StoresByPrefecture => {
  const grouped: StoresByPrefecture = {}

  stores.forEach(store => {
    const prefecture = store.prefecture || '都道府県未設定'
    if (!grouped[prefecture]) {
      grouped[prefecture] = []
    }
    grouped[prefecture].push(store)
  })

  // Sort by prefecture order
  const ordered: StoresByPrefecture = {}
  PREFECTURE_ORDER.forEach(prefecture => {
    if (grouped[prefecture]) {
      ordered[prefecture] = grouped[prefecture]
    }
  })

  return ordered
}

/**
 * Calculate job count by store
 */
export const calculateJobCountByStore = (jobs: any[]): JobCountByStore => {
  const countMap: JobCountByStore = {}

  jobs.forEach(job => {
    const storeIds = job.storeIds || (job.storeId ? [job.storeId] : [])
    storeIds.forEach((storeId: string) => {
      if (storeId) {
        countMap[storeId] = (countMap[storeId] || 0) + 1
      }
    })
  })

  return countMap
}

/**
 * Check if a prefecture is selected in formData
 */
export const isPrefectureSelected = (
  prefecture: string,
  storesByPrefecture: StoresByPrefecture,
  selectedStoreIds: string[]
): boolean => {
  const prefectureStores = storesByPrefecture[prefecture] || []
  const prefectureStoreIds = prefectureStores.map(s => s.id)
  return prefectureStoreIds.every(id => selectedStoreIds.includes(id))
}

/**
 * Check if a prefecture is partially selected
 */
export const isPrefecturePartiallySelected = (
  prefecture: string,
  storesByPrefecture: StoresByPrefecture,
  selectedStoreIds: string[]
): boolean => {
  const prefectureStores = storesByPrefecture[prefecture] || []
  const prefectureStoreIds = prefectureStores.map(s => s.id)
  const selectedCount = prefectureStoreIds.filter(id => selectedStoreIds.includes(id)).length
  return selectedCount > 0 && selectedCount < prefectureStoreIds.length
}

/**
 * Handle prefecture toggle (add/remove all stores in prefecture)
 */
export const handlePrefectureToggle = (
  prefecture: string,
  checked: boolean,
  storesByPrefecture: StoresByPrefecture,
  currentStoreIds: string[]
): string[] => {
  const prefectureStores = storesByPrefecture[prefecture] || []
  const prefectureStoreIds = prefectureStores.map(s => s.id)

  if (checked) {
    // Add all stores in prefecture (deduplicate)
    return [...new Set([...currentStoreIds, ...prefectureStoreIds])]
  } else {
    // Remove all stores in prefecture
    return currentStoreIds.filter(id => !prefectureStoreIds.includes(id))
  }
}

/**
 * Parse training period string to months
 */
export const parseTrainingPeriodToMonths = (periodString: string): number => {
  let months = 0

  if (periodString.includes('年')) {
    const yearMatch = periodString.match(/(\d+)年/)
    if (yearMatch) months = parseInt(yearMatch[1]) * 12
  } else if (periodString.includes('半年')) {
    months = 6
  } else if (periodString.includes('ヶ月') || periodString.includes('ヵ月') || periodString.includes('か月')) {
    const monthMatch = periodString.match(/(\d+)[ヶヵか]月/)
    if (monthMatch) months = parseInt(monthMatch[1])
  }

  return months
}

/**
 * Handle employment type multi-select
 */
export const toggleEmploymentType = (
  employmentType: string,
  checked: boolean,
  currentEmploymentTypes: string
): string => {
  const currentTypes = currentEmploymentTypes
    ? currentEmploymentTypes.split(',').map(t => t.trim())
    : []

  let updatedTypes: string[]
  if (checked) {
    updatedTypes = [...currentTypes, employmentType]
  } else {
    updatedTypes = currentTypes.filter(type => type !== employmentType)
  }

  return updatedTypes.join(', ')
}

/**
 * Check if employment type is selected
 */
export const isEmploymentTypeSelected = (
  employmentType: string,
  currentEmploymentTypes?: string
): boolean => {
  if (!currentEmploymentTypes) return false
  const currentTypes = currentEmploymentTypes.split(',').map(t => t.trim())
  return currentTypes.includes(employmentType)
}

/**
 * Set nested property in object
 */
export const setNestedProperty = (
  obj: any,
  path: string,
  value: any
): any => {
  const keys = path.split('.')
  const updated = { ...obj }
  let current: any = updated

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!current[key]) {
      current[key] = {}
    } else {
      current[key] = { ...current[key] }
    }
    current = current[key]
  }

  current[keys[keys.length - 1]] = value
  return updated
}

/**
 * Clean form data by removing undefined values
 */
export const cleanFormData = (data: any): any => {
  const cleaned = { ...data }
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key]
    }
  })
  return cleaned
}
