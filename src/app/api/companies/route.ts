import { NextRequest } from 'next/server'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/api-auth'
import { createCompany } from '@/lib/firestore/companies'
import { Company } from '@/types/company'

/**
 * Domino連携用企業データ受信型定義
 */
interface DominoCompanyData {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  website?: string
  instagram?: string
  description?: string
  businessType?: string[]
  industry?: string
  size?: 'small' | 'medium' | 'large'
  status?: 'active' | 'inactive'
}

/**
 * DominoCompanyDataをCompany型に変換
 */
function convertDominoDataToCompany(data: DominoCompanyData): Omit<Company, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: data.name,
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
    website: data.website || '',
    memo: data.description || '', // descriptionをmemoフィールドにマッピング
    size: data.size === 'small' ? 'small' : data.size === 'large' ? 'large' : 'medium',
    status: data.status === 'active' ? 'active' : 'inactive',
    dominoId: data.id, // Domino側のIDを保存
    importedAt: new Date(), // Domino連携時刻を記録
    // その他のフィールドはデフォルト値
    employeeCount: undefined,
    establishedYear: undefined,
    capital: undefined,
    representative: '',
    isPublic: false
  }
}

/**
 * リクエストデータのバリデーション
 */
function validateCompanyData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // 必須フィールドのチェック
  if (!data.id || typeof data.id !== 'string') {
    errors.push('id は必須です')
  }

  if (!data.name || typeof data.name !== 'string') {
    errors.push('name は必須です')
  }

  // オプションフィールドの型チェック
  if (data.email && typeof data.email !== 'string') {
    errors.push('email は文字列である必要があります')
  }

  if (data.phone && typeof data.phone !== 'string') {
    errors.push('phone は文字列である必要があります')
  }

  if (data.address && typeof data.address !== 'string') {
    errors.push('address は文字列である必要があります')
  }

  if (data.website && typeof data.website !== 'string') {
    errors.push('website は文字列である必要があります')
  }

  if (data.size && !['small', 'medium', 'large'].includes(data.size)) {
    errors.push('size は small, medium, large のいずれかである必要があります')
  }

  if (data.status && !['active', 'inactive'].includes(data.status)) {
    errors.push('status は active, inactive のいずれかである必要があります')
  }

  if (data.businessType && !Array.isArray(data.businessType)) {
    errors.push('businessType は配列である必要があります')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * POST /api/companies
 * Dominoから企業データを受信して作成
 */
async function handleCompanyCreation(request: NextRequest) {
  try {
    // リクエストボディの取得
    const body = await request.json()
    
    // バリデーション
    const validation = validateCompanyData(body)
    if (!validation.isValid) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'リクエストデータが無効です',
        400,
        { errors: validation.errors }
      )
    }

    const dominoData: DominoCompanyData = body

    // Domino IDの重複チェック（既存の企業データと比較）
    // TODO: Firestore クエリで dominoId フィールドを検索する実装を追加
    
    // Company型に変換
    const companyData = convertDominoDataToCompany(dominoData)

    // Firestoreに保存
    const newCompanyId = await createCompany(companyData)

    // 成功レスポンス
    return createSuccessResponse(
      'Company created successfully',
      { id: newCompanyId },
      200
    )

  } catch (error) {
    console.error('Company creation error:', error)

    // エラーの種類に応じて適切なレスポンスを返す
    if (error instanceof SyntaxError) {
      return createErrorResponse(
        'INVALID_JSON',
        'リクエストボディが有効なJSONではありません',
        400
      )
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      '企業データの作成中にエラーが発生しました',
      500
    )
  }
}

// withAuth でラップして認証を必須にする
export const POST = withAuth(handleCompanyCreation)