"use client"

import { useState } from 'react'

interface ExpandableFeatureProps {
  text: string
}

export default function ExpandableFeature({ text }: ExpandableFeatureProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // テキストが3行を超えるかチェック（おおよそ）
  const needsExpansion = text.length > 150 || text.split('\n').length > 3

  return (
    <div
      onClick={() => needsExpansion && setIsExpanded(!isExpanded)}
      className={`bg-gray-50 p-3 rounded-lg ${needsExpansion ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
    >
      <p className={`text-sm text-gray-800 break-words whitespace-pre-wrap ${!isExpanded && needsExpansion ? 'line-clamp-3' : ''}`}>
        {text}
      </p>
      {needsExpansion && (
        <div className="text-sm text-blue-600 hover:text-blue-700 mt-2 font-medium">
          {isExpanded ? '閉じる' : '続きを読む'}
        </div>
      )}
    </div>
  )
}
