import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

/**
 * Indeed 掲載ステータス一覧取得 API
 * GET /api/indeed/status
 * 
 * Query Parameters:
 * - filter: 'all' | 'detected' | 'not_detected' | 'error' (default: 'all')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'

    const db = getAdminFirestore()
    let query = db.collection('companies').where('status', '==', 'active')

    const snapshot = await query.get()

    const companies = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name || '',
        normalizedName: data.normalizedName || '',
        indeedStatus: data.indeedStatus || null,
        status: data.status,
      }
    })

    // フィルタリング
    const filtered = companies.filter(company => {
      if (filter === 'all') return true
      if (filter === 'detected') return company.indeedStatus?.detected === true
      if (filter === 'not_detected') return company.indeedStatus?.detected === false
      if (filter === 'error') return !!company.indeedStatus?.error
      if (filter === 'unchecked') return !company.indeedStatus
      return true
    })

    // サマリー計算
    const summary = {
      total: companies.length,
      detected: companies.filter(c => c.indeedStatus?.detected === true).length,
      notDetected: companies.filter(c => c.indeedStatus?.detected === false).length,
      error: companies.filter(c => !!c.indeedStatus?.error).length,
      unchecked: companies.filter(c => !c.indeedStatus).length,
    }

    return NextResponse.json({
      success: true,
      summary,
      companies: filtered,
    })
  } catch (error) {
    console.error('Indeed ステータス取得エラー:', error)
    return NextResponse.json(
      { success: false, error: 'ステータス取得に失敗しました' },
      { status: 500 }
    )
  }
}
