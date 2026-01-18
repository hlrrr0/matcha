"use client"

import GoogleTranslate from "@/components/GoogleTranslate"

interface PublicHeaderProps {
  title?: string
}

export default function PublicHeader({ title }: PublicHeaderProps) {
  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              {title || "求人情報"}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <GoogleTranslate />
          </div>
        </div>
      </div>
    </header>
  )
}