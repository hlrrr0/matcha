"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { UserCheck, LogOut, User } from "lucide-react"
import SimpleTranslate from "@/components/SimpleTranslate"

export default function Header() {
  const { user, logout, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // 公開ページではヘッダーを表示しない
  if (pathname?.startsWith('/public/')) {
    return null
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/auth/login')
    } catch (error) {
      console.error('ログアウトエラー:', error)
    }
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <UserCheck className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">RecruitPro</h1>
            </Link>
          </div>
          
          {user && (
            <nav className="flex items-center gap-4">
              <Link href="/companies">
                <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">企業</Button>
              </Link>
              <Link href="/stores">
                <Button variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50">店舗</Button>
              </Link>
              <Link href="/jobs">
                <Button variant="ghost" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50">求人</Button>
              </Link>
              <Link href="/candidates">
                <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">求職者</Button>
              </Link>
              <Link href="/progress">
                <Button variant="ghost" className="text-orange-800 hover:text-orange-900 hover:bg-orange-50">進捗管理</Button>
              </Link>
              <Link href="/domino/import">
                <Button variant="ghost">Domino連携</Button>
              </Link>
              {isAdmin && (
                <Link href="/admin/users">
                  <Button variant="ghost" className="text-blue-600">管理者</Button>
                </Link>
              )}
            </nav>
          )}

          <div className="flex items-center gap-4">
            <SimpleTranslate />
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{user.displayName || user.email}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  ログアウト
                </Button>
              </>
            ) : (
              <Link href="/auth/login">
                <Button variant="default">ログイン</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}