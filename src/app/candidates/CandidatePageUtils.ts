import { Candidate } from '@/types/candidate'
import { CandidateWithProgress, SortBy, SortOrder } from './CandidatePageTypes'
import { STATUS_PRIORITY } from './CandidatePageConstants'

// 年齢を計算するヘルパー関数
export const calculateAge = (dateOfBirth: string): number | null => {
  if (!dateOfBirth) return null
  
  const birthDate = new Date(dateOfBirth)
  const today = new Date()
  
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  // まだ誕生日が来ていない場合は1歳引く
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

// 求職者区分ごとの件数を計算
export const getSourceTypeCount = (sourceType: string, candidates: Candidate[]): number => {
  if (sourceType === 'all') return candidates.length
  return candidates.filter(c => c.sourceType === sourceType).length
}

// フィルタを適用
export const applyFilters = (
  candidatesWithProgress: CandidateWithProgress[],
  candidates: Candidate[],
  filters: {
    searchTerm: string
    statusFilter: string
    campusFilter: string
    sourceTypeFilter: string
    enrollmentMonthFilter: string
    sortBy: SortBy
    sortOrder: SortOrder
    currentPage: number
    itemsPerPage: number
  }
): { filtered: CandidateWithProgress[]; totalItems: number; paginated: CandidateWithProgress[] } => {
  let filtered = candidatesWithProgress.length > 0 ? candidatesWithProgress : candidates

  // ステータスフィルタ
  if (filters.statusFilter !== 'all') {
    filtered = filtered.filter(candidate => candidate.status === filters.statusFilter)
  }

  // 求職者区分フィルタ
  if (filters.sourceTypeFilter !== 'all') {
    filtered = filtered.filter(candidate => candidate.sourceType === filters.sourceTypeFilter)
  }

  // 校舎フィルタ
  if (filters.campusFilter !== 'all') {
    filtered = filtered.filter(candidate => candidate.campus === filters.campusFilter)
  }

  // 入学年月フィルタ
  if (filters.enrollmentMonthFilter !== 'all') {
    filtered = filtered.filter(candidate => 
      candidate.enrollmentDate && candidate.enrollmentDate.startsWith(filters.enrollmentMonthFilter)
    )
  }

  // 検索フィルタ
  if (filters.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase()
    filtered = filtered.filter(candidate =>
      `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(searchLower) ||
      `${candidate.firstNameKana} ${candidate.lastNameKana}`.toLowerCase().includes(searchLower) ||
      candidate.email?.toLowerCase().includes(searchLower) ||
      candidate.phone?.toLowerCase().includes(searchLower)
    )
  }

  // ソート処理
  filtered = sorted(filtered, filters.sortBy, filters.sortOrder)

  const totalItems = filtered.length
  
  // ページネーション適用
  const startIndex = (filters.currentPage - 1) * filters.itemsPerPage
  const endIndex = startIndex + filters.itemsPerPage
  const paginated = filtered.slice(startIndex, endIndex)

  return { filtered, totalItems, paginated }
}

// ソート処理
export const sorted = (
  candidates: CandidateWithProgress[],
  sortBy: SortBy,
  sortOrder: SortOrder
): CandidateWithProgress[] => {
  const sorted = [...candidates].sort((a, b) => {
    let compareResult = 0

    switch (sortBy) {
      case 'name':
        compareResult = `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'ja')
        break
      case 'campus':
        // 校舎でソート（校舎 → 入学年月の順）
        const campusA = a.campus || ''
        const campusB = b.campus || ''
        compareResult = campusA.localeCompare(campusB)
        // 校舎が同じ場合は入学年月でソート
        if (compareResult === 0) {
          const enrollA = a.enrollmentDate || ''
          const enrollB = b.enrollmentDate || ''
          compareResult = enrollA.localeCompare(enrollB)
        }
        break
      case 'enrollmentDate':
        // 入学年月でソート（入学年月 → 校舎の順）
        const enrollA = a.enrollmentDate || ''
        const enrollB = b.enrollmentDate || ''
        compareResult = enrollA.localeCompare(enrollB)
        // 入学年月が同じ場合は校舎でソート
        if (compareResult === 0) {
          const campusA2 = a.campus || ''
          const campusB2 = b.campus || ''
          compareResult = campusA2.localeCompare(campusB2)
        }
        break
      case 'status':
        compareResult = (a.status || '').localeCompare(b.status || '')
        break
      case 'updatedAt':
        const timeA = new Date(a.updatedAt).getTime()
        const timeB = new Date(b.updatedAt).getTime()
        compareResult = timeA - timeB
        break
      case 'createdAt':
        const createA = new Date(a.createdAt).getTime()
        const createB = new Date(b.createdAt).getTime()
        compareResult = createA - createB
        break
    }

    return sortOrder === 'asc' ? compareResult : -compareResult
  })

  return sorted
}

// 入学年月のユニーク値を抽出
export const extractUniqueEnrollmentMonths = (candidates: Candidate[]): string[] => {
  if (candidates.length === 0) return []
  
  const months = candidates
    .filter(c => c.enrollmentDate)
    .map(c => c.enrollmentDate!.substring(0, 7)) // YYYY-MM形式
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort((a, b) => b.localeCompare(a)) // 降順（新しい順）
  
  return months
}

// 進捗カウントバッジの色をGetする
export const getProgressCountColor = (count: number | undefined): string => {
  if (count === undefined) return 'text-gray-400 border-gray-300'
  if (count === 0) return 'text-gray-500 border-gray-300'
  if (count >= 5) return 'bg-red-100 text-red-800 border-red-200'
  if (count >= 3) return 'bg-orange-100 text-orange-800 border-orange-200'
  if (count >= 1) return 'bg-green-100 text-green-800 border-green-200'
  return 'text-gray-500 border-gray-300'
}
