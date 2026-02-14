import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

/**
 * Indeed ステータス手動更新 API
 * PUT /api/indeed/update
 * 
 * Body:
 * - companyId: string (必須)
 * - indeedUrl: string | null (更新するURL、nullで削除)
 * - detected: boolean (掲載あり/なし)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, indeedUrl, detected } = body

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId は必須です' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()
    const companyRef = db.collection('companies').doc(companyId)
    const companyDoc = await companyRef.get()

    if (!companyDoc.exists) {
      return NextResponse.json(
        { success: false, error: '企業が見つかりません' },
        { status: 404 }
      )
    }

    // indeedStatus を更新
    const now = new Date().toISOString()
    const currentData = companyDoc.data()
    const currentStatus = currentData?.indeedStatus || {}

    const updatedStatus = {
      ...currentStatus,
      detected: detected !== undefined ? detected : (indeedUrl ? true : false),
      indeedUrl: indeedUrl || null,
      lastCheckedAt: now,
      detectedBy: indeedUrl ? (currentStatus.detectedBy || 'external') : null,
      error: null,  // 手動更新時はエラーをクリア
    }

    await companyRef.update({
      indeedStatus: updatedStatus,
    })

    return NextResponse.json({
      success: true,
      message: 'Indeed ステータスを更新しました',
      indeedStatus: updatedStatus,
    })
  } catch (error) {
    console.error('Indeed ステータス更新エラー:', error)
    return NextResponse.json(
      { success: false, error: 'ステータス更新に失敗しました' },
      { status: 500 }
    )
  }
}
