"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogIn, AlertCircle } from 'lucide-react'
import { diagnoseProblem, testFirebaseConnection } from '@/lib/auth-diagnostics'

export default function LoginPage() {
  const router = useRouter()
  const { signInWithGoogle, userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // 診断情報をコンソールに出力
    diagnoseProblem()
    testFirebaseConnection()
  }, [])

  const handleGoogleSignIn = async () => {
    console.log('🔵 handleGoogleSignIn called')
    setLoading(true)
    setError('')

    try {
      console.log('🔵 Starting Google sign-in...')
      const result = await signInWithGoogle()
      console.log('🔵 Sign-in result:', result)
      
      if (result) {
        console.log('🔵 Google sign-in successful')
        // ログイン成功後、ユーザーの承認状態に応じてリダイレクト
        router.push('/')
      } else {
        console.log('🔵 Redirect sign-in initiated, waiting for result...')
        // リダイレクトの場合は結果待ち
        setError('Googleの認証ページに移動します。しばらくお待ちください...')
        setLoading(false) // リダイレクトのためローディングを解除
      }
    } catch (error: any) {
      console.error('🔴 Googleログインエラー:', error)
      console.error('🔴 Error code:', error.code)
      console.error('🔴 Error message:', error.message)
      
      if (error.code === 'auth/popup-closed-by-user') {
        setError('ログインがキャンセルされました')
      } else if (error.code === 'auth/popup-blocked') {
        setError('ポップアップがブロックされました。リダイレクト認証に切り替えます')
      } else if (error.code === 'auth/unauthorized-domain') {
        setError('このドメインは認証が許可されていません。管理者に連絡してください')
      } else if (error.code === 'auth/api-key-not-valid') {
        setError('Firebase設定エラーです。管理者に連絡してください')
      } else if (error.message?.includes('iframe')) {
        setError('認証方法を変更して再試行しています...')
      } else {
        setError(`ログインに失敗しました: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            MATCHA
          </h1>
          <p className="text-gray-600">
            Googleアカウントでログインしてください
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              ログイン
            </CardTitle>
            <CardDescription>
              管理者の承認を受けたアカウントのみアクセスできます
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? 'ログイン中...' : 'Googleでログイン'}
            </Button>

            <div className="mt-6 text-center">
              <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <strong>注意:</strong> 初回ログイン時は管理者の承認が必要です。<br />
                承認までしばらくお待ちください。
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}