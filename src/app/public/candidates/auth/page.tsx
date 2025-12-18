"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Mail, Key } from 'lucide-react'
import { toast } from 'sonner'

export default function CandidateAuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [loading, setLoading] = useState(false)
  const [debugCode, setDebugCode] = useState<string>('')

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/candidate-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '認証コードの送信に失敗しました')
      }

      toast.success('認証コードをメールアドレスに送信しました')
      
      // 開発環境のみコードを表示
      if (data.authCode) {
        setDebugCode(data.authCode)
        toast.success(`開発用コード: ${data.authCode}`)
      }
      
      setStep('code')
    } catch (error: any) {
      console.error('認証コード送信エラー:', error)
      toast.error(error.message || '認証コードの送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/candidate-auth?code=${authCode}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '認証に失敗しました')
      }

      // セッションストレージに認証情報を保存
      sessionStorage.setItem('candidate_auth', JSON.stringify({
        id: data.candidateId,
        email: data.email,
        timestamp: Date.now()
      }))

      // マイページへリダイレクト
      router.push(`/public/candidates/${data.candidateId}/mypage`)
      toast.success('ログインしました')
    } catch (error: any) {
      console.error('認証エラー:', error)
      toast.error(error.message || 'ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-blue-900">求職者マイページ</CardTitle>
          <CardDescription>
            {step === 'email' 
              ? '登録しているメールアドレスを入力してください' 
              : '送信された認証コードを入力してください'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 mb-2 font-medium">
                  ログイン方法
                </p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>求職者情報に登録されているメールアドレスを入力</li>
                  <li>送信された認証コード（6桁）を入力</li>
                  <li>このログインは管理画面とは別のものです</li>
                </ul>
              </div>

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full"
              >
                {loading ? '送信中...' : '認証コードを送信'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="authCode">認証コード</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="authCode"
                    type="text"
                    placeholder="ABC123"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                    className="pl-10 text-center text-lg tracking-wider font-mono"
                    maxLength={8}
                    required
                  />
                </div>
                <p className="text-sm text-gray-600">
                  {email} にコードを送信しました
                </p>
                {debugCode && (
                  <p className="text-sm text-green-600 font-mono">
                    開発用コード: {debugCode}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep('email')
                    setAuthCode('')
                    setDebugCode('')
                  }}
                  className="flex-1"
                >
                  戻る
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !authCode}
                  className="flex-1"
                >
                  {loading ? 'ログイン中...' : 'ログイン'}
                </Button>
              </div>
            </form>
          )}

          <div className="text-center">
            <p className="text-xs text-gray-500">
              ログインすることで、あなたの紹介求人情報を確認できます
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
