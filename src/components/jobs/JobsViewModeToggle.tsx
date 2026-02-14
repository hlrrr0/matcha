'use client'

import { List, Map } from 'lucide-react'

interface JobsViewModeToggleProps {
  viewMode: 'list' | 'map'
  onViewModeChange: (mode: 'list' | 'map') => void
}

export function JobsViewModeToggle({
  viewMode,
  onViewModeChange,
}: JobsViewModeToggleProps) {
  return (
    <div className="mb-6 flex gap-2 border-b border-gray-200">
      <button
        onClick={() => onViewModeChange('list')}
        className={`px-6 py-3 font-medium transition-colors ${
          viewMode === 'list'
            ? 'border-b-2 border-purple-500 text-purple-600'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <List className="h-4 w-4 inline mr-2" />
        リスト表示
      </button>
      <button
        onClick={() => onViewModeChange('map')}
        className={`px-6 py-3 font-medium transition-colors ${
          viewMode === 'map'
            ? 'border-b-2 border-purple-500 text-purple-600'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Map className="h-4 w-4 inline mr-2" />
        マップ表示
      </button>
    </div>
  )
}
