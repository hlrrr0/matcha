/**
 * API認証ミドルウェア
 * 内部APIエンドポイントを保護
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'

export interface AuthenticatedRequest extends NextRequest {
  userId?: string
  userRole?: string
}

/**
 * Firebase ID Tokenを検証
 * Authorization: Bearer <token>ヘッダーから取得
 */
export async function authenticateRequest(request: NextRequest): Promise<{
  authenticated: boolean
  userId?: string
  userRole?: string
  error?: string
}> {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        error: 'Authorization header missing or invalid'
      }
    }
    
    const token = authHeader.substring(7) // "Bearer "を除去
    
    // Firebase Admin SDKでトークン検証
    const decodedToken = await verifyIdToken(token)
    
    if (!decodedToken) {
      return {
        authenticated: false,
        error: 'Invalid token'
      }
    }
    
    return {
      authenticated: true,
      userId: decodedToken.uid,
      userRole: decodedToken.role || 'user'
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      authenticated: false,
      error: 'Authentication failed'
    }
  }
}

/**
 * 認証必須のAPIハンドラーをラップ
 */
export function withAuth(
  handler: (request: NextRequest, context: { userId: string; userRole: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const auth = await authenticateRequest(request)
    
    if (!auth.authenticated) {
      console.error('❌ Authentication failed:', auth.error)
      console.error('Request headers:', {
        authorization: request.headers.get('authorization') ? 'Present' : 'Missing',
        contentType: request.headers.get('content-type')
      })
      return NextResponse.json(
        { error: 'Unauthorized', message: auth.error },
        { status: 401 }
      )
    }
    
    return handler(request, {
      userId: auth.userId!,
      userRole: auth.userRole!
    })
  }
}

/**
 * 管理者権限必須のAPIハンドラーをラップ
 */
export function withAdminAuth(
  handler: (request: NextRequest, context: { userId: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const auth = await authenticateRequest(request)
    
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: auth.error },
        { status: 401 }
      )
    }
    
    if (auth.userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      )
    }
    
    return handler(request, {
      userId: auth.userId!
    })
  }
}

/**
 * レート制限チェック
 * IP + エンドポイントベース
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  request: NextRequest,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1分
): { allowed: boolean; remaining: number } {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown'
  const endpoint = new URL(request.url).pathname
  const key = `${ip}:${endpoint}`
  
  const now = Date.now()
  const record = rateLimitMap.get(key)
  
  // リセット時刻を過ぎている場合は初期化
  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + windowMs
    })
    return { allowed: true, remaining: maxRequests - 1 }
  }
  
  // リミット超過チェック
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }
  
  // カウントアップ
  record.count++
  rateLimitMap.set(key, record)
  
  return { allowed: true, remaining: maxRequests - record.count }
}

/**
 * レート制限付きAPIハンドラーをラップ
 */
export function withRateLimit<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  maxRequests: number = 10,
  windowMs: number = 60000
) {
  return async (request: NextRequest, ...args: T) => {
    const rateLimit = checkRateLimit(request, maxRequests, windowMs)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.'
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': '0'
          }
        }
      )
    }
    
    const response = await handler(request, ...args)
    
    // レート制限情報をヘッダーに追加
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    
    return response
  }
}
