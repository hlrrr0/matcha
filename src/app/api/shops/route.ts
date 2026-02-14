import { NextRequest } from 'next/server'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/api-auth'
import { createStore, findStoreByNameAndCompany } from '@/lib/firestore/stores-admin'
import { Store } from '@/types/store'

/**
 * Domino連携用店舗データ受信型定義
 */
interface DominoShopData {
  id: string
  name: string
  companyId: string
  hrCompanyId?: string // 人材紹介システム側の企業ID
  address?: string
  phone?: string
  instagramUrl?: string
  tabelogUrl?: string
  manager?: string
  openingHours?: string
  notes?: string
  isActive?: boolean
}

/**
 * DominoShopDataをStore型に変換
 */
function convertDominoDataToStore(data: DominoShopData): Omit<Store, 'id' | 'createdAt' | 'updatedAt'> {
  // Domino IDから 'domino_' プレフィックスを削除
  const cleanDominoId = data.id.startsWith('domino_') ? data.id.substring(7) : data.id
  const cleanDominoCompanyId = data.companyId.startsWith('domino_') ? data.companyId.substring(7) : data.companyId
  
  return {
    name: data.name,
    companyId: data.hrCompanyId || '', // 人材紹介システム側の企業IDを使用
    address: data.address || '',
    nearestStation: '', // Dominoデータにはないため空文字
    instagramUrl: data.instagramUrl,
    tabelogUrl: data.tabelogUrl,
    status: data.isActive !== false ? 'active' : 'inactive',
    // Domino連携用フィールド
    dominoId: cleanDominoId, // プレフィックスを削除したIDを保存
    dominoCompanyId: cleanDominoCompanyId, // Domino側の企業IDもプレフィックス削除
    importedAt: new Date(),
    phone: data.phone || '',
    manager: data.manager || '',
    operatingHours: data.openingHours || '',
    notes: data.notes || ''
  }
}

/**
 * リクエストデータのバリデーション
 */
function validateShopData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // 必須フィールドのチェック
  if (!data.id || typeof data.id !== 'string') {
    errors.push('id は必須です')
  }

  if (!data.name || typeof data.name !== 'string') {
    errors.push('name は必須です')
  }

  if (!data.companyId || typeof data.companyId !== 'string') {
    errors.push('companyId は必須です')
  }

  // オプションフィールドの型チェック
  if (data.hrCompanyId && typeof data.hrCompanyId !== 'string') {
    errors.push('hrCompanyId は文字列である必要があります')
  }

  if (data.address && typeof data.address !== 'string') {
    errors.push('address は文字列である必要があります')
  }

  if (data.phone && typeof data.phone !== 'string') {
    errors.push('phone は文字列である必要があります')
  }

  if (data.instagramUrl && typeof data.instagramUrl !== 'string') {
    errors.push('instagramUrl は文字列である必要があります')
  }

  if (data.tabelogUrl && typeof data.tabelogUrl !== 'string') {
    errors.push('tabelogUrl は文字列である必要があります')
  }

  if (data.manager && typeof data.manager !== 'string') {
    errors.push('manager は文字列である必要があります')
  }

  if (data.openingHours && typeof data.openingHours !== 'string') {
    errors.push('openingHours は文字列である必要があります')
  }

  if (data.notes && typeof data.notes !== 'string') {
    errors.push('notes は文字列である必要があります')
  }

  if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
    errors.push('isActive はブール値である必要があります')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * POST /api/shops
 * Dominoから店舗データを受信して作成
 */
async function handleShopCreation(request: NextRequest) {
  try {
    // リクエストボディの取得
    const body = await request.json()
    
    // バリデーション
    const validation = validateShopData(body)
    if (!validation.isValid) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'リクエストデータが無効です',
        400,
        { errors: validation.errors }
      )
    }

    const dominoData: DominoShopData = body

    // hrCompanyIdが指定されていない場合のチェック
    if (!dominoData.hrCompanyId) {
      return createErrorResponse(
        'MISSING_COMPANY_ID',
        'hrCompanyId が必要です。先に企業データを作成してください',
        400
      )
    }

    // TODO: Domino IDの重複チェック（既存の店舗データと比較）
    // TODO: hrCompanyId の存在チェック（参照する企業が存在するか確認）
    
    // Store型に変換
    const storeData = convertDominoDataToStore(dominoData)

    // Firestoreに保存
    const newStoreId = await createStore(storeData)

    // 成功レスポンス
    return createSuccessResponse(
      'Shop created successfully',
      { id: newStoreId },
      200
    )

  } catch (error) {
    console.error('Shop creation error:', error)

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
      '店舗データの作成中にエラーが発生しました',
      500
    )
  }
}

// withAuth でラップして認証を必須にする
export const POST = withAuth(handleShopCreation)