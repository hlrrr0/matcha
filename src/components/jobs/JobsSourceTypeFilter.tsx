'use client'

import { useRouter } from 'next/navigation'
import { visibilityTypeLabels } from '@/types/job'

interface JobsSourceTypeFilterProps {
  sourceTypeFilter: string
  getSourceTypeCount: (sourceType: string) => number
}

export function JobsSourceTypeFilter({
  sourceTypeFilter,
  getSourceTypeCount,
}: JobsSourceTypeFilterProps) {
  const router = useRouter()

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set('sourceType', value)
    params.set('page', '1')
    router.push(`?${params.toString()}`)
  }

  const tabs = [
    { value: 'all', label: 'すべて' },
    { value: 'all_public', label: visibilityTypeLabels.all },
    { value: 'school_only', label: visibilityTypeLabels.school_only },
    { value: 'personal', label: visibilityTypeLabels.personal },
  ]

  return (
    <div className="mb-4 flex gap-2 border-b border-gray-200">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => handleTabChange(tab.value)}
          className={`px-6 py-3 font-medium transition-colors ${
            sourceTypeFilter === tab.value
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {tab.label} ({getSourceTypeCount(tab.value)})
        </button>
      ))}
    </div>
  )
}
