import { NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'

export async function GET() {
  try {
    // Firebase Admin SDKの初期化状態をチェック
    const app = getAdminApp()
    
    const envCheck = {
      hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      nodeEnv: process.env.NODE_ENV,
      appInitialized: !!app
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Firebase Admin SDK is initialized',
      environment: envCheck
    })
  } catch (error) {
    console.error('Admin check error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        environment: {
          hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
          hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
          nodeEnv: process.env.NODE_ENV
        }
      },
      { status: 500 }
    )
  }
}
