import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

/**
 * Indeed 手動チェックトリガー API
 * POST /api/indeed/trigger
 * 
 * Cloud Run の Indeed チェッカーを手動トリガーする。
 * 単体企業チェックまたは全企業チェックに対応。
 * 
 * Request Body:
 *  - companyId?: string  (指定時は単体チェック)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { companyId } = body

    const cloudRunUrl = process.env.INDEED_CHECKER_URL

    if (!cloudRunUrl) {
      return NextResponse.json(
        { success: false, error: 'Cloud Run が未デプロイです。INDEED_CHECKER_URL 環境変数を設定してください。' },
        { status: 503 }
      )
    }

    if (companyId) {
      // 単体チェック
      const db = getAdminFirestore()
      const companyDoc = await db.collection('companies').doc(companyId).get()

      if (!companyDoc.exists) {
        return NextResponse.json(
          { success: false, error: '指定された企業が見つかりません' },
          { status: 404 }
        )
      }

      const companyData = companyDoc.data()

      const response = await fetch(`${cloudRunUrl}/check-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          companyName: companyData?.name || '',
        }),
      })

      const result = await response.json()

      return NextResponse.json({
        success: true,
        message: `企業「${companyData?.name}」のIndeedチェックを実行しました`,
        result,
      })
    } else {
      // 全企業チェック（非同期）
      // Cloud Runのタイムアウトが長いので、バックグラウンドで実行
      fetch(`${cloudRunUrl}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(err => {
        console.error('Cloud Run呼び出しエラー:', err)
      })

      return NextResponse.json({
        success: true,
        message: '全企業のIndeedチェックを開始しました。完了まで数分かかります。',
      })
    }
  } catch (error) {
    console.error('Indeed トリガーエラー:', error)
    return NextResponse.json(
      { success: false, error: 'トリガー実行に失敗しました' },
      { status: 500 }
    )
  }
}
