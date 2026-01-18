"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  Download,
  Building2,
  Store,
  Briefcase,
  TrendingUp,
  Calendar,
  Target,
  LogIn
} from "lucide-react"
import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"

interface DashboardStats {
  totalCompanies: number
  activeCompanies: number
  totalStores: number
  activeStores: number
  totalJobs: number
  activeJobs: number
  totalCandidates: number
  activeCandidates: number
}

export default function HomePage() {
  const { user, userProfile, loading: authLoading, isApproved } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    totalStores: 0,
    activeStores: 0,
    totalJobs: 0,
    activeJobs: 0,
    totalCandidates: 0,
    activeCandidates: 0
  })
  const [loading, setLoading] = useState(true)

  // デバッグ情報をコンソールに出力
  useEffect(() => {
    console.log('HomePage Debug:', {
      user: user ? { uid: user.uid, email: user.email } : null,
      userProfile,
      authLoading,
      isApproved
    })
  }, [user, userProfile, authLoading, isApproved])

  useEffect(() => {
    if (!user || authLoading || !isApproved) {
      setLoading(false)
      return
    }

    const fetchStats = async () => {
      try {
        // 企業統計
        const companiesSnapshot = await getDocs(collection(db, 'companies'))
        const companies = companiesSnapshot.docs.map(doc => doc.data())
        const activeCompanies = companies.filter(c => c.status === 'active').length

        // 店舗統計
        const storesSnapshot = await getDocs(collection(db, 'stores'))
        const stores = storesSnapshot.docs.map(doc => doc.data())
        const activeStores = stores.filter(s => s.status === 'active').length

        // 求人統計
        const jobsSnapshot = await getDocs(collection(db, 'jobs'))
        const jobs = jobsSnapshot.docs.map(doc => doc.data())
        const activeJobs = jobs.filter(j => j.status === 'active').length

        // 求職者統計（仮のデータ）
        const candidatesSnapshot = await getDocs(collection(db, 'candidates'))
        const candidates = candidatesSnapshot.docs.map(doc => doc.data())
        const activeCandidates = candidates.filter(c => c.status === 'active').length

        setStats({
          totalCompanies: companies.length,
          activeCompanies,
          totalStores: stores.length,
          activeStores,
          totalJobs: jobs.length,
          activeJobs,
          totalCandidates: candidates.length,
          activeCandidates
        })
      } catch (error) {
        console.error('統計情報の取得に失敗しました:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, authLoading, isApproved])

  // 認証中の表示
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    )
  }

  // ログイン済みだが承認待ちの状態
  if (user && !isApproved) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center">
              <Users className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-xl">承認待ちです</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              アカウントが管理者によって承認されるまでお待ちください。
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>ログイン中のアカウント:</strong><br />
                {user.email}
              </p>
            </div>
            <p className="text-sm text-gray-500">
              承認完了後、このページが自動的に更新されます。
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              ページを更新
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 未ログイン状態の表示
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <main className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-2xl w-full shadow-xl">
            <CardHeader className="text-center space-y-6 pb-8">
              {/* 可愛い犬の画像 */}
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop"
                    alt="かわいい犬"
                    className="rounded-full w-64 h-64 object-cover shadow-lg border-4 border-white"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white rounded-full p-3 shadow-lg">
                    <LogIn className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6 text-center">
              <div className="bg-blue-50 p-6 rounded-lg space-y-3">
                <p className="text-sm text-gray-600">
                  🐕 ダッシュボードにアクセスするには、ログインが必要です
                </p>
                <p className="text-sm text-gray-600">
                  企業管理・店舗管理・求人管理・求職者管理などの機能をご利用いただけます
                </p>
              </div>
              
              <div className="pt-4">
                <Link href="/auth/login">
                  <Button size="lg" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-lg py-6">
                    <LogIn className="h-5 w-5" />
                    Googleでログイン
                  </Button>
                </Link>
              </div>

              <div className="pt-6 border-t">
                <p className="text-xs text-gray-500">
                  &copy; 2024 MATCHA. All rights reserved.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* メインコンテンツ */}
      <main className="flex-1 space-y-8 p-8">
        {/* ダッシュボードヘッダー */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600">システム全体の概要と統計情報</p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">企業数</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stats.totalCompanies}
              </div>
              <p className="text-xs text-muted-foreground">
                活動中: {loading ? "..." : stats.activeCompanies}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">店舗数</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stats.totalStores}
              </div>
              <p className="text-xs text-muted-foreground">
                活動中: {loading ? "..." : stats.activeStores}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">求人数</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stats.totalJobs}
              </div>
              <p className="text-xs text-muted-foreground">
                公開中: {loading ? "..." : stats.activeJobs}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">求職者数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stats.totalCandidates}
              </div>
              <p className="text-xs text-muted-foreground">
                活動中: {loading ? "..." : stats.activeCandidates}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 最近の活動とクイックアクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* クイックアクション */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                クイックアクション
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Link href="/companies/new">
                  <Button variant="outline" className="w-full flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    企業追加
                  </Button>
                </Link>
                <Link href="/stores/new">
                  <Button variant="outline" className="w-full flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    店舗追加
                  </Button>
                </Link>
                <Link href="/jobs/new">
                  <Button variant="outline" className="w-full flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    求人追加
                  </Button>
                </Link>
                <Link href="/candidates/new">
                  <Button variant="outline" className="w-full flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    求職者追加
                  </Button>
                </Link>
              </div>
              <div className="pt-4 border-t">
                <Link href="/domino/import">
                  <Button className="w-full flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Dominoデータ取込
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* システム活動状況 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                システム活動状況
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">企業活動率</span>
                  <span className="text-sm font-medium">
                    {loading ? "..." : `${stats.totalCompanies > 0 ? Math.round((stats.activeCompanies / stats.totalCompanies) * 100) : 0}%`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">店舗活動率</span>
                  <span className="text-sm font-medium">
                    {loading ? "..." : `${stats.totalStores > 0 ? Math.round((stats.activeStores / stats.totalStores) * 100) : 0}%`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">求人公開率</span>
                  <span className="text-sm font-medium">
                    {loading ? "..." : `${stats.totalJobs > 0 ? Math.round((stats.activeJobs / stats.totalJobs) * 100) : 0}%`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">求職者活動率</span>
                  <span className="text-sm font-medium">
                    {loading ? "..." : `${stats.totalCandidates > 0 ? Math.round((stats.activeCandidates / stats.totalCandidates) * 100) : 0}%`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ヒーローセクション */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 rounded-lg">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              効率的な人材紹介システム
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              求職者と企業を最適にマッチング。Dominoシステムとの連携で、
              より精度の高い人材紹介を実現します。
            </p>
            <div className="flex gap-4 justify-center flex-col">
              <Link href="/companies">
                <Button size="lg" className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  企業管理
                </Button>
              </Link>
              <Link href="/stores">
                <Button size="lg" variant="outline" className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  店舗管理
                </Button>
              </Link>
              <Link href="/domino/import">
                <Button size="lg" variant="outline" className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Dominoから企業データ取得
                </Button>
              </Link>
            </div>
          </div>
        </section>


      </main>

      {/* フッター */}
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2024 MATCHA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
