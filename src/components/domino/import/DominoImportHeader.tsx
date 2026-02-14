'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function DominoImportHeader() {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <Link href="/companies">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Dominoからのインポート（管理者限定）</h1>
          <p className="text-muted-foreground">Dominoシステムから企業データを詳細設定で取得します</p>
        </div>
      </div>
    </div>
  )
}
