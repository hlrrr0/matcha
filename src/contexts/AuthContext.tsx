"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  User as FirebaseUser, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged,
  UserCredential,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User } from '@/types/user'

interface AuthContextType {
  user: FirebaseUser | null
  userProfile: User | null
  loading: boolean
  signInWithGoogle: () => Promise<UserCredential | void>
  logout: () => Promise<void>
  isApproved: boolean
  isAdmin: boolean
  isActive: boolean
  canAccess: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isInitialized = false
    
    // セッション永続性を設定（最初に実行）
    const initializePersistence = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence)
        console.log('✅ Auth永続性を設定しました（ローカルストレージ）')
      } catch (error) {
        console.error('❌ Auth永続性の設定に失敗:', error)
      }
    }
    
    initializePersistence()

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔄 認証状態変更:', firebaseUser ? `ログイン中: ${firebaseUser.email}` : 'ログアウト')
      setUser(firebaseUser)
      
      if (firebaseUser) {
        // トークンをリフレッシュ（期限切れを防ぐ）
        try {
          await firebaseUser.getIdToken(true) // force refresh
          console.log('✅ トークンをリフレッシュしました')
        } catch (error: any) {
          // ネットワークエラーは無視（次回の認証時に再試行される）
          if (error?.code === 'auth/network-request-failed') {
            console.warn('⚠️ ネットワーク接続エラー（トークンリフレッシュをスキップ）')
          } else {
            console.error('❌ トークンのリフレッシュに失敗:', error)
          }
        }
        
        // ユーザープロファイルを取得または作成
        await handleUserProfile(firebaseUser)
      } else {
        setUserProfile(null)
      }
      
      // 初期化完了
      if (!isInitialized) {
        isInitialized = true
        setLoading(false)
      }
    })

    // リダイレクト結果を処理
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result) {
          console.log('Redirect sign-in successful:', result.user)
        }
      } catch (error: any) {
        console.error('Redirect result error:', error)
        // リダイレクト結果のエラーは無視（iframe の問題が続く可能性があるため）
        // 実際の認証状態は onAuthStateChanged で確認される
      }
    }

    // 少し遅延させてからリダイレクト結果を確認
    const timeoutId = setTimeout(handleRedirectResult, 1000)
    
    // タブ間の認証状態を同期（別タブでログアウトした場合など）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('firebase:authUser:')) {
        console.log('🔄 別タブで認証状態が変更されました')
        // Firebaseが自動的に状態を同期するため、特別な処理は不要
        // onAuthStateChangedが自動的に発火します
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // トークンの定期リフレッシュ（50分ごと、トークンは1時間で期限切れ）
    const tokenRefreshInterval = setInterval(async () => {
      if (auth.currentUser) {
        try {
          await auth.currentUser.getIdToken(true)
          console.log('✅ トークンを定期リフレッシュしました')
        } catch (error) {
          console.error('❌ 定期トークンリフレッシュに失敗:', error)
        }
      }
    }, 50 * 60 * 1000) // 50分
    
    // 初期ロードタイムアウト（10秒後に強制的にローディング解除）
    const loadingTimeout = setTimeout(() => {
      if (!isInitialized) {
        console.warn('⚠️ 認証状態の初期化がタイムアウトしました')
        setLoading(false)
      }
    }, 10000)
    
    return () => {
      unsubscribe()
      clearTimeout(timeoutId)
      clearTimeout(loadingTimeout)
      clearInterval(tokenRefreshInterval)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const handleUserProfile = async (firebaseUser: FirebaseUser) => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as User
        setUserProfile(userData)
        
        // ログイン時刻を更新
        await updateDoc(userDocRef, {
          lastLoginAt: new Date().toISOString()
        })
      } else {
        // 新規ユーザーの場合、プロファイルを作成（承認待ち状態）
        let role: User['role'] = 'pending'
        
        // 開発環境では自動的に管理者権限を付与
        if (process.env.NODE_ENV === 'development' || 
            firebaseUser.email === 'hiroki.imai@super-shift.co.jp') {
          role = 'admin'
        }
        
        const newUserProfile: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || undefined,
          role,
          status: 'active',
          permissions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        await setDoc(userDocRef, newUserProfile)
        setUserProfile(newUserProfile)
      }
    } catch (error) {
      console.error('ユーザープロファイルの処理に失敗しました:', error)
    }
  }

  const signInWithGoogle = async (): Promise<UserCredential | void> => {
    try {
      // セッション永続性を設定（30日間ログイン状態を維持）
      await setPersistence(auth, browserLocalPersistence)
      
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      
      // カスタムパラメータを追加
      provider.setCustomParameters({
        prompt: 'select_account',
        hd: '' // ドメイン制限を解除
      })
      
      // 一時的に本番でもポップアップを試す
      if (typeof window !== 'undefined') {
        try {
          return await signInWithPopup(auth, provider)
        } catch (popupError: any) {
          console.warn('🟠 Popup failed, falling back to redirect:', popupError)
          await signInWithRedirect(auth, provider)
          return
        }
      }
    } catch (error: any) {
      console.error('🔴 signInWithGoogle error:', error)
      throw error
    }
  }

  const logout = async (): Promise<void> => {
    return signOut(auth)
  }

  const isApproved = userProfile?.role === 'user' || userProfile?.role === 'admin'
  const isAdmin = userProfile?.role === 'admin'
  const isActive = userProfile?.status === 'active'
  const canAccess = isApproved && isActive

  const value = {
    user,
    userProfile,
    loading,
    signInWithGoogle,
    logout,
    isApproved,
    isAdmin,
    isActive,
    canAccess
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}