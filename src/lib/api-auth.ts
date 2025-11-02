import { NextRequest } from 'next/server'

/**
 * API認証ミドルウェア
 * Bearer TokenとAPI Keyによる二重認証を実装
 */

export interface AuthResult {
  isValid: boolean
  error?: string
  source?: 'domino' | 'external'
}

/**
 * Domino連携用の認証情報
 */
const DOMINO_API_CREDENTIALS = {
  // Dominoから人材紹介システムへのアクセス用
  API_KEY: process.env.HR_SYSTEM_API_KEY || 'hr-system-api-key-2024',
  AUTH_TOKEN: process.env.HR_SYSTEM_AUTH_TOKEN || 'hr-system-auth-token-2024',
  
  // Dominoとの連携で使用される識別子
  DOMINO_SOURCE_IDENTIFIER: 'domino-hr-integration'
}

/**
 * リクエストの認証を検証
 * @param request Next.js Request object
 * @returns 認証結果
 */
export async function validateAPIAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // ヘッダーから認証情報を取得
    const authHeader = request.headers.get('authorization')
    const apiKey = request.headers.get('x-api-key')
    const contentType = request.headers.get('content-type')

    // Content-Typeチェック
    if (!contentType || !contentType.includes('application/json')) {
      return {
        isValid: false,
        error: 'Content-Type must be application/json'
      }
    }

    // API Keyチェック
    if (!apiKey) {
      return {
        isValid: false,
        error: 'X-API-Key header is required'
      }
    }

    if (apiKey !== DOMINO_API_CREDENTIALS.API_KEY) {
      return {
        isValid: false,
        error: 'Invalid API Key'
      }
    }

    // Bearer Tokenチェック
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isValid: false,
        error: 'Authorization header with Bearer token is required'
      }
    }

    const token = authHeader.substring(7) // 'Bearer ' を除去
    if (token !== DOMINO_API_CREDENTIALS.AUTH_TOKEN) {
      return {
        isValid: false,
        error: 'Invalid Bearer token'
      }
    }

    // 認証成功
    return {
      isValid: true,
      source: 'domino'
    }

  } catch (error) {
    console.error('Authentication error:', error)
    return {
      isValid: false,
      error: 'Authentication validation failed'
    }
  }
}

/**
 * API認証を必要とするエンドポイント用のラッパー関数
 * @param handler APIハンドラー関数
 * @returns 認証付きハンドラー
 */
export function withAuth(
  handler: (request: NextRequest, auth: AuthResult) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    // 認証チェック
    const authResult = await validateAPIAuth(request)
    
    if (!authResult.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: authResult.error || 'Authentication failed'
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // 認証成功時はハンドラーを実行
    return handler(request, authResult)
  }
}

/**
 * APIレスポンス用の共通エラー形式
 */
export interface APIErrorResponse {
  success: false
  error: string
  message: string
  details?: Record<string, any>
}

/**
 * APIレスポンス用の共通成功形式
 */
export interface APISuccessResponse {
  success: true
  id?: string
  message: string
  data?: Record<string, any>
}

/**
 * 標準化されたエラーレスポンスを生成
 */
export function createErrorResponse(
  error: string,
  message: string,
  status: number = 400,
  details?: Record<string, any>
): Response {
  const response: APIErrorResponse = {
    success: false,
    error,
    message,
    ...(details && { details })
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

/**
 * 標準化された成功レスポンスを生成
 */
export function createSuccessResponse(
  message: string,
  data?: Record<string, any>,
  status: number = 200
): Response {
  const response: APISuccessResponse = {
    success: true,
    message,
    ...(data && { ...data })
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}