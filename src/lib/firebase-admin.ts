/**
 * Firebase Admin SDK
 * サーバーサイドでのみ使用する（APIルート、サーバーコンポーネント等）
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

let adminApp: App | undefined
let adminDb: Firestore | undefined

/**
 * Firebase Admin SDKを初期化
 * 環境変数から認証情報を読み込む
 */
export function initializeAdminApp() {
  if (adminApp) {
    return { app: adminApp, db: adminDb! }
  }

  try {
    // 既存のアプリがあればそれを使用
    if (getApps().length > 0) {
      adminApp = getApps()[0]
      adminDb = getFirestore(adminApp)
      return { app: adminApp, db: adminDb }
    }

    // 環境変数から認証情報を取得
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

    // ローカル開発環境: serviceAccountKey.jsonを使用
    if (process.env.NODE_ENV === 'development') {
      try {
        const serviceAccount = require('../../serviceAccountKey.json')
        adminApp = initializeApp({
          credential: cert(serviceAccount)
        })
        console.log('✅ Firebase Admin SDK initialized with serviceAccountKey.json')
      } catch (error) {
        console.warn('⚠️ serviceAccountKey.json not found, trying environment variables...')
      }
    }

    // 本番環境または環境変数が設定されている場合
    if (!adminApp && projectId && clientEmail && privateKey) {
      // 改行文字を正しく処理（Vercelの環境変数で\\nが文字列として入る場合があるため）
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n')

      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey
        })
      })
      console.log('✅ Firebase Admin SDK initialized with environment variables')
    }

    if (!adminApp) {
      throw new Error(
        'Firebase Admin SDK initialization failed. ' +
        'Please set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY ' +
        'environment variables, or place serviceAccountKey.json in the project root for local development.'
      )
    }

    adminDb = getFirestore(adminApp)
    return { app: adminApp, db: adminDb }
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization error:', error)
    throw error
  }
}

/**
 * Admin Firestoreインスタンスを取得
 */
export function getAdminDb(): Firestore {
  if (!adminDb) {
    const { db } = initializeAdminApp()
    return db
  }
  return adminDb
}

/**
 * Admin Firestoreインスタンスを取得（エイリアス）
 */
export function getAdminFirestore(): Firestore {
  return getAdminDb()
}

/**
 * Admin Appインスタンスを取得
 */
export function getAdminApp(): App {
  if (!adminApp) {
    const { app } = initializeAdminApp()
    return app
  }
  return adminApp
}

/**
 * Firebase ID Tokenを検証
 * @param token - 検証するトークン
 * @returns デコードされたトークン情報、または null
 */
export async function verifyIdToken(token: string) {
  try {
    const app = getAdminApp()
    const auth = getAuth(app)
    const decodedToken = await auth.verifyIdToken(token)
    
    // ユーザー情報を取得してroleを追加
    const db = getAdminDb()
    const userDoc = await db.collection('users').doc(decodedToken.uid).get()
    const userData = userDoc.data()
    
    return {
      ...decodedToken,
      role: userData?.role || 'user',
      isApproved: userData?.isApproved || false
    }
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}
