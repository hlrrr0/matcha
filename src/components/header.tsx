"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useAuth } from "@/contexts/AuthContext"
import { UserCheck, LogOut, User, ChevronDown, Menu, Search } from "lucide-react"
import SimpleTranslate from "@/components/SimpleTranslate"
import GlobalSearch from "@/components/GlobalSearch"

export default function Header() {
  const { user, logout, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // 公開ページではヘッダーを表示しない
  if (pathname?.startsWith('/public/')) {
    return null
  }

  // キーボードショートカット: ⌘+K (Mac) / Ctrl+K (Windows/Linux)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/auth/login')
      setIsOpen(false)
    } catch (error) {
      console.error('ログアウトエラー:', error)
    }
  }

  const handleLinkClick = () => {
    setIsOpen(false)
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* ロゴ */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <UserCheck className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">MATCHA</h1>
            </Link>
          </div>
          
          {/* デスクトップメニュー */}
          {user && (
            <nav className="hidden lg:flex items-center gap-4">
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
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1">
                      管理者
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/admin/users" className="w-full cursor-pointer">
                        ユーザー管理
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/domino/import" className="w-full cursor-pointer">
                        Domino連携
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/indeed" className="w-full cursor-pointer">
                        Indeed管理
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>
          )}

          {/* 右側のメニュー（デスクトップ） */}
          <div className="hidden lg:flex items-center gap-4">
            {/* 検索ボタン */}
            {user && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <Search className="h-4 w-4" />
                <span className="hidden xl:inline">検索</span>
                <kbd className="hidden xl:inline pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 inline-flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            )}
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

          {/* モバイルメニュー（ハンバーガー） */}
          <div className="lg:hidden flex items-center gap-2">
            {/* モバイル検索ボタン */}
            {user && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="p-2"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
            <SimpleTranslate />
            {user && (
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <UserCheck className="h-6 w-6 text-blue-600" />
                      <span>MATCHA</span>
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-2 mt-8 overflow-y-auto max-h-[calc(100vh-120px)]">
                    {/* ユーザー情報 */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg mb-4">
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-600">{user.displayName || user.email}</span>
                    </div>

                    {/* メニューリンク */}
                    <Link href="/companies" onClick={handleLinkClick}>
                      <Button variant="ghost" className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        企業
                      </Button>
                    </Link>
                    <Link href="/stores" onClick={handleLinkClick}>
                      <Button variant="ghost" className="w-full justify-start text-green-600 hover:text-green-700 hover:bg-green-50">
                        店舗
                      </Button>
                    </Link>
                    <Link href="/jobs" onClick={handleLinkClick}>
                      <Button variant="ghost" className="w-full justify-start text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                        求人
                      </Button>
                    </Link>
                    <Link href="/candidates" onClick={handleLinkClick}>
                      <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
                        求職者
                      </Button>
                    </Link>
                    <Link href="/progress" onClick={handleLinkClick}>
                      <Button variant="ghost" className="w-full justify-start text-orange-800 hover:text-orange-900 hover:bg-orange-50">
                        進捗管理
                      </Button>
                    </Link>

                    {/* 管理者メニュー */}
                    {isAdmin && (
                      <div className="border-t pt-4 mt-4">
                        <div className="text-sm font-semibold text-gray-600 px-4 mb-2">管理者メニュー</div>
                        <Link href="/admin/users" onClick={handleLinkClick}>
                          <Button variant="ghost" className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            ユーザー管理
                          </Button>
                        </Link>
                        <Link href="/domino/import" onClick={handleLinkClick}>
                          <Button variant="ghost" className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            Domino連携
                          </Button>
                        </Link>
                        <Link href="/admin/indeed" onClick={handleLinkClick}>
                          <Button variant="ghost" className="w-full justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                            Indeed管理
                          </Button>
                        </Link>
                      </div>
                    )}

                    {/* ログアウトボタン */}
                    <div className="border-t pt-4 mt-4">
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-4 w-4" />
                        ログアウト
                      </Button>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            )}
            {!user && (
              <Link href="/auth/login">
                <Button variant="default" size="sm">ログイン</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* グローバル検索ダイアログ */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}