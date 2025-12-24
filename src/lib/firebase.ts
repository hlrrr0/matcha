import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
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

// デバッグ用ログ（本番環境でも一時的に有効化）
if (typeof window !== 'undefined') {
  console.log('Firebase Config Debug:', {
    apiKey: firebaseConfig.apiKey ? '***CONFIGURED***' : 'MISSING',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    currentDomain: window.location.origin
  })
}

// Firebase アプリを初期化（重複初期化を防ぐ）
let app
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

// Firestore初期化
export const db = getFirestore(app)

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
    }
  } catch (error) {
    // エミュレーターが既に接続されている場合はエラーを無視
    console.log('Firebase emulators already connected')
  }
}

export default app