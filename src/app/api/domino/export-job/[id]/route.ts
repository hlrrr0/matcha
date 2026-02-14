import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

/**
 * エクスポートジョブの進捗を取得
 * GET /api/domino/export-job/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getAdminFirestore()
    
    const jobDoc = await db.collection('exportJobs').doc(id).get()
    
    if (!jobDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'ジョブが見つかりません' },
        { status: 404 }
      )
    }

    const jobData = jobDoc.data()
    
    return NextResponse.json({
      success: true,
      job: jobData,
    })
  } catch (error) {
    console.error('Failed to get job status:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'ジョブ情報の取得に失敗しました',
      },
      { status: 500 }
    )
  }
}
