import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, enableNetwork, disableNetwork } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

const firebaseConfig = {
  apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key').trim(),
  authDomain: (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com').trim(),
  projectId: (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project').trim(),
  storageBucket: (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com').trim(),
  messagingSenderId: (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789').trim(),
  appId: (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:demo').trim()
}

// デバッグ用ログ（開発環境のみ）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🔥 Firebase Config:', {
    apiKey: firebaseConfig.apiKey ? '✅ Configured' : '❌ MISSING',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    currentDomain: window.location.origin
  })
}

// Firebase アプリを初期化（重複初期化を防ぐ）
let app
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
  if (typeof window !== 'undefined') {
    console.log('✅ Firebase app initialized')
  }
} else {
  app = getApps()[0]
}

// Firestore初期化（永続キャッシュを有効化）
let db
try {
  // ブラウザ環境で、まだ初期化されていない場合のみ永続キャッシュを有効化
  const existingFirestores = getApps().map(app => {
    try {
      return getFirestore(app)
    } catch {
      return null
    }
  }).filter(Boolean)

  if (typeof window !== 'undefined' && existingFirestores.length === 0) {
    // 永続キャッシュを有効にしてFirestoreを初期化
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    })
    console.log('✅ Firestore initialized with persistent cache')
  } else {
    // 既に初期化されているか、サーバーサイドの場合
    db = getFirestore(app)
    if (typeof window !== 'undefined') {
      console.log('✅ Firestore using existing instance')
    }
  }
} catch (error) {
  // 既に初期化されている場合やエラーが発生した場合はgetFirestoreを使用
  console.warn('⚠️ Firestore initialization warning:', error)
  db = getFirestore(app)
}
export { db }

// Authentication初期化
export const auth = getAuth(app)

// Storage初期化
export const storage = getStorage(app)

// 開発環境でエミュレーターを使用する場合（オプション）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // エミュレーター接続は一度だけ実行
  try {
    // Firestoreエミュレーター（ポート8080）
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
      connectFirestoreEmulator(db, 'localhost', 8080)
      connectAuthEmulator(auth, 'http://localhost:9099')
      connectStorageEmulator(storage, 'localhost', 9199)
      console.log('✅ Firebase emulators connected')
    }
  } catch (error) {
    // エミュレーターが既に接続されている場合はエラーを無視
    console.log('⚠️ Firebase emulators already connected or connection failed:', error)
  }
}

// ネットワーク接続の監視と自動再接続（ブラウザ環境のみ）
if (typeof window !== 'undefined') {
  let isOnline = navigator.onLine

  // オンライン/オフラインイベントの監視
  window.addEventListener('online', async () => {
    console.log('🌐 Network connection restored, enabling Firestore network...')
    try {
      await enableNetwork(db)
      console.log('✅ Firestore network enabled')
    } catch (error) {
      console.warn('⚠️ Failed to enable Firestore network:', error)
    }
    isOnline = true
  })

  window.addEventListener('offline', async () => {
    console.log('📡 Network connection lost, disabling Firestore network...')
    isOnline = false
    // オフライン時は明示的にdisableしない（自動でオフラインモードに移行する）
  })

  // 初期状態がオフラインの場合の警告
  if (!navigator.onLine) {
    console.warn('⚠️ Starting in offline mode - Firestore will sync when online')
  }
}

export default app