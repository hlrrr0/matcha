import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

/**
 * 非同期エクスポートジョブを開始
 * POST /api/domino/export-job
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const companyId = searchParams.get('companyId')
    const onlyWithDominoId = searchParams.get('onlyWithDominoId') === 'true'

    const db = getAdminFirestore()
    
    // ジョブIDを生成
    const jobId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // ジョブステータスをFirestoreに保存
    await db.collection('exportJobs').doc(jobId).set({
      id: jobId,
      type,
      companyId: companyId || null,
      onlyWithDominoId,
      status: 'running',
      progress: {
        companies: { total: 0, exported: 0, failed: 0, errors: [] },
        stores: { total: 0, exported: 0, failed: 0, errors: [] },
      },
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // バックグラウンド処理を開始（非同期）
    executeExport(jobId, type, companyId, onlyWithDominoId).catch(error => {
      console.error('Export job error:', error)
      // エラーをジョブステータスに記録
      db.collection('exportJobs').doc(jobId).update({
        status: 'error',
        error: error.message,
        updatedAt: new Date().toISOString(),
      })
    })

    return NextResponse.json({
      success: true,
      jobId,
      message: 'エクスポートジョブを開始しました',
    })
  } catch (error) {
    console.error('Failed to start export job:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'ジョブの開始に失敗しました',
      },
      { status: 500 }
    )
  }
}

/**
 * バックグラウンドでエクスポートを実行
 */
async function executeExport(
  jobId: string,
  type: string,
  companyId: string | null,
  onlyWithDominoId: boolean
) {
  const db = getAdminFirestore()
  
  const results = {
    companies: { total: 0, exported: 0, failed: 0, errors: [] as string[] },
    stores: { total: 0, exported: 0, failed: 0, errors: [] as string[] },
  }

  try {
    // 企業データのエクスポート
    if (type === 'companies' || type === 'all') {
      let companiesQuery = db.collection('companies').where('status', '==', 'active')
      
      if (companyId) {
        companiesQuery = db.collection('companies').where('__name__', '==', companyId) as any
      }
      
      if (onlyWithDominoId) {
        companiesQuery = companiesQuery.where('dominoId', '!=', null) as any
      }

      const companiesSnapshot = await companiesQuery.get()
      results.companies.total = companiesSnapshot.size

      // 進捗更新
      await db.collection('exportJobs').doc(jobId).update({
        'progress.companies.total': results.companies.total,
        updatedAt: new Date().toISOString(),
      })

      for (const doc of companiesSnapshot.docs) {
        const company = { id: doc.id, ...doc.data() }
        
        // 企業データをDomino形式に変換して送信（実装は元のexport/route.tsを参照）
        const success = true // 仮実装
        
        if (success) {
          results.companies.exported++
        } else {
          results.companies.failed++
          results.companies.errors.push(`${company.name}: エラー`)
        }

        // 進捗を定期的に更新
        await db.collection('exportJobs').doc(jobId).update({
          'progress.companies.exported': results.companies.exported,
          'progress.companies.failed': results.companies.failed,
          updatedAt: new Date().toISOString(),
        })
      }
    }

    // 店舗データのエクスポート（同様の実装）
    if (type === 'stores' || type === 'all') {
      let storesQuery = db.collection('stores')
      
      if (companyId) {
        storesQuery = db.collection('stores').where('companyId', '==', companyId) as any
      }

      const storesSnapshot = await storesQuery.get()
      
      const validStores = storesSnapshot.docs.filter(doc => {
        const store = doc.data()
        return store.tabelogUrl && store.tabelogUrl.trim() !== ''
      })
      
      results.stores.total = validStores.length

      await db.collection('exportJobs').doc(jobId).update({
        'progress.stores.total': results.stores.total,
        updatedAt: new Date().toISOString(),
      })

      for (const doc of validStores) {
        const store = { id: doc.id, ...doc.data() }
        
        const success = true // 仮実装
        
        if (success) {
          results.stores.exported++
        } else {
          results.stores.failed++
          results.stores.errors.push(`${store.name}: エラー`)
        }

        await db.collection('exportJobs').doc(jobId).update({
          'progress.stores.exported': results.stores.exported,
          'progress.stores.failed': results.stores.failed,
          updatedAt: new Date().toISOString(),
        })
      }
    }

    // 完了
    await db.collection('exportJobs').doc(jobId).update({
      status: 'completed',
      progress: results,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Export execution error:', error)
    await db.collection('exportJobs').doc(jobId).update({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      progress: results,
      updatedAt: new Date().toISOString(),
    })
  }
}
