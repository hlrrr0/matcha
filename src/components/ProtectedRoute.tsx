"use client"

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Clock, UserX } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
}

export default function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, userProfile, loading, isApproved, isAdmin, canAccess, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // loadingがfalseになり、かつuserがnullの場合のみリダイレクト
    // ただし、初期マウント時は少し待機する
    if (!loading && !user) {
      console.warn('⚠️ 認証されていないユーザー - ログインページへリダイレクト')
      const timeoutId = setTimeout(() => {
        // 再度チェック（AuthContextの初期化を待つ）
        if (!user) {
          router.push('/auth/login')
        }
      }, 500) // 500ms待機してから再チェック
      
      return () => clearTimeout(timeoutId)
    }
  }, [user, loading, router])

  // 定期的に認証状態をチェック（5分ごと）
  useEffect(() => {
    if (!user) return

    const checkAuthStatus = setInterval(() => {
      if (!user) {
        console.warn('⚠️ 認証セッションが切れました - ログインページへリダイレクト')
        router.push('/auth/login')
      }
    }, 5 * 60 * 1000) // 5分

    return () => clearInterval(checkAuthStatus)
  }, [user, router])

  // loadingが完了するまで待機
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    )
  }

  // loading完了後もuserがnullの場合は何も表示しない（リダイレクト処理中）
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">リダイレクト中...</p>
        </div>
      </div>
    )
  }

  // 管理者のみのページで管理者でない場合
  if (adminOnly && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-800">アクセス権限がありません</CardTitle>
            <CardDescription>
              このページは管理者のみがアクセスできます
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              asChild
              variant="outline"
              className="w-full"
            >
              <Link href="/">
                ホームに戻る
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // アクセス権限がない場合（非アクティブまたは非承認）
  if (!canAccess) {
    // 承認待ちの場合
    if (userProfile?.role === 'pending') {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <CardTitle className="text-yellow-800">承認待ち</CardTitle>
              <CardDescription>
                アカウントの承認待ちです。管理者による承認をお待ちください。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600 text-center">
                <p>登録されたメールアドレス:</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={logout}
                  variant="outline"
                  className="flex-1"
                >
                  ログアウト
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  更新
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // 拒否された場合
    if (userProfile?.role === 'rejected') {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-red-800">アクセス拒否</CardTitle>
              <CardDescription>
                このアカウントのアクセスは拒否されました。詳細については管理者にお問い合わせください。
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={logout}
                variant="outline"
                className="w-full"
              >
                ログアウト
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    // 非アクティブユーザーの場合
    if (userProfile?.status === 'inactive') {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <UserX className="h-6 w-6 text-gray-600" />
              </div>
              <CardTitle className="text-gray-800">アカウント非アクティブ</CardTitle>
              <CardDescription>
                このアカウントは現在非アクティブ状態です。詳細については管理者にお問い合わせください。
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={logout}
                variant="outline"
                className="w-full"
              >
                ログアウト
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    // その他の場合
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Clock className="h-6 w-6 text-gray-600" />
            </div>
            <CardTitle>アクセス許可が必要です</CardTitle>
            <CardDescription>
              システムにアクセスするには管理者の承認が必要です
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={logout}
              variant="outline"
              className="w-full"
            >
              ログアウト
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 承認済みかつアクティブなユーザーのみコンテンツを表示
  if (canAccess) {
    return <>{children}</>
  }

  // アクセス不可の場合は適切なエラーメッセージを表示
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-red-800">アクセス拒否</CardTitle>
          <CardDescription>
            アカウントの状態により、システムにアクセスできません。詳細については管理者にお問い合わせください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 text-center">
            <p>ユーザー状態: {userProfile?.role || 'unknown'} / {userProfile?.status || 'unknown'}</p>
          </div>
          <Button 
            onClick={logout}
            variant="outline"
            className="w-full"
          >
            ログアウト
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}