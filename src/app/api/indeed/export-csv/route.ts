import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

/**
 * Indeed 出稿可能な求人の CSV エクスポート API
 * GET /api/indeed/export-csv
 * 
 * フィルタ条件:
 *  - 企業 status == 'active'
 *  - indeedControl.canPost == true
 *  - indeedControl.exported == false (未エクスポートのみ)
 * 
 * Query Parameters:
 *  - markExported: 'true' の場合、エクスポート済みフラグを立てる
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const markExported = searchParams.get('markExported') === 'true'

    const db = getAdminFirestore()

    // Indeed出稿可能かつ未エクスポートの求人を取得
    const jobsSnapshot = await db.collection('jobs')
      .where('indeedControl.canPost', '==', true)
      .where('indeedControl.exported', '==', false)
      .get()

    if (jobsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'エクスポート対象の求人がありません',
        count: 0,
      })
    }

    // 企業情報を取得（アクティブのみ）
    const companyIds = [...new Set(jobsSnapshot.docs.map(doc => doc.data().companyId))]
    const companyMap = new Map<string, any>()

    // Firestore の in クエリは30件制限なのでバッチ処理
    for (let i = 0; i < companyIds.length; i += 30) {
      const batch = companyIds.slice(i, i + 30)
      const companySnapshot = await db.collection('companies')
        .where('__name__', 'in', batch)
        .get()
      
      companySnapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.status === 'active') {
          companyMap.set(doc.id, data)
        }
      })
    }

    // CSVヘッダー
    const headers = [
      '求人ID',
      '企業名',
      '店舗名',
      '職種',
      '雇用形態',
      '給与下限',
      '給与上限',
      '勤務地',
      '仕事内容',
      '応募資格',
      '勤務時間',
      'Indeed掲載判定',
    ]

    const rows: string[][] = []

    for (const doc of jobsSnapshot.docs) {
      const job = doc.data()
      const company = companyMap.get(job.companyId)

      // アクティブ企業のみ
      if (!company) continue

      const row = [
        doc.id,
        company.name || '',
        job.storeName || '',
        job.jobTitle || '',
        job.employmentType || '',
        job.salaryMin?.toString() || '',
        job.salaryMax?.toString() || '',
        job.workLocation || '',
        (job.jobDescription || '').replace(/[\r\n]+/g, ' '),
        (job.requirements || '').replace(/[\r\n]+/g, ' '),
        job.workingHours || '',
        'canPost',
      ]

      rows.push(row)
    }

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'アクティブ企業のエクスポート対象求人がありません',
        count: 0,
      })
    }

    // エクスポート済みフラグを立てる
    if (markExported) {
      const batch = db.batch()
      const now = new Date()

      for (const doc of jobsSnapshot.docs) {
        const job = doc.data()
        if (companyMap.has(job.companyId)) {
          batch.update(doc.ref, {
            'indeedControl.exported': true,
            'indeedControl.exportedAt': now,
            updatedAt: now,
          })
        }
      }

      await batch.commit()
    }

    // CSV生成
    const BOM = '\uFEFF'
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="indeed_jobs_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Indeed CSVエクスポートエラー:', error)
    return NextResponse.json(
      { success: false, error: 'CSVエクスポートに失敗しました' },
      { status: 500 }
    )
  }
}
