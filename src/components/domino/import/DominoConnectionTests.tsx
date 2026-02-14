'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Database } from 'lucide-react'

interface DominoConnectionTestsProps {
  useActualAPI: boolean
  onTestBasicAPI: () => void
  onTestStoreDataFields: () => void
  onTestAlternativeEndpoints: () => void
  onCheckEnvironmentVariables: () => void
  onTestDirectConnection: () => void
  onOpenAPIDirectly: () => void
}

export default function DominoConnectionTests({
  useActualAPI,
  onTestBasicAPI,
  onTestStoreDataFields,
  onTestAlternativeEndpoints,
  onCheckEnvironmentVariables,
  onTestDirectConnection,
  onOpenAPIDirectly
}: DominoConnectionTestsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Domino接続テスト
        </CardTitle>
        <CardDescription>
          まず、Dominoシステムとの接続を確認してください
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Dominoシステムとの接続状況を確認します。開発環境ではモックテストが実行されます。
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button 
              onClick={onTestBasicAPI}
              variant="outline"
              className="min-w-[140px] hover:bg-green-50 hover:border-green-300"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              🧪 基本APIテスト
            </Button>
            
            <Button 
              onClick={onTestStoreDataFields}
              variant="outline"
              className="min-w-[140px] hover:bg-purple-50 hover:border-purple-300"
            >
              <Database className="w-4 h-4 mr-2" />
              🏪 店舗データ確認
            </Button>
            
            <Button 
              onClick={onTestAlternativeEndpoints}
              variant="outline"
              className="min-w-[140px] hover:bg-indigo-50 hover:border-indigo-300"
            >
              <Database className="w-4 h-4 mr-2" />
              🔍 別エンドポイント
            </Button>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <Button 
              onClick={onCheckEnvironmentVariables}
              variant="outline"
              className="min-w-[140px] hover:bg-orange-50 hover:border-orange-300"
            >
              <Database className="w-4 h-4 mr-2" />
              環境変数確認
            </Button>
            
            <Button 
              onClick={onTestDirectConnection}
              variant="outline"
              className="min-w-[140px] hover:bg-blue-50 hover:border-blue-300"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              🔌 直接接続テスト
            </Button>
            
            <Button 
              onClick={onOpenAPIDirectly}
              variant="outline"
              className="min-w-[140px] hover:bg-green-50 hover:border-green-300"
            >
              <Database className="w-4 h-4 mr-2" />
              APIを直接確認
            </Button>
          </div>
          
          {useActualAPI && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm">
                <strong>接続先:</strong> {process.env.NEXT_PUBLIC_DOMINO_API_URL || 'https://sushi-domino.vercel.app/api/hr-export'}/companies
              </div>
              <div className="text-xs text-blue-600 mt-1">
                💡 「APIを直接確認」ボタンでブラウザから直接アクセスして、データが取得できるか確認できます
              </div>
              <div className="text-xs text-orange-600 mt-2">
                ⚠️ 認証エラーが発生する場合は、正しいAPIキーが設定されているか確認してください
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
