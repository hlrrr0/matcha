import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api/auth'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { Job } from '@/types/job'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key')
    const client = await verifyApiKey(apiKey)
    
    if (!client) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Invalid API key' 
          } 
        },
        { status: 401 }
      )
    }

    // パラメータ取得
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'BAD_REQUEST', 
            message: 'Job ID is required' 
          } 
        },
        { status: 400 }
      )
    }

    // 求人データ取得
    const jobDoc = await getDoc(doc(db, 'jobs', id))
    
    if (!jobDoc.exists()) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Job not found' 
          } 
        },
        { status: 404 }
      )
    }

    const job = { id: jobDoc.id, ...jobDoc.data() } as Job

    // 企業の公開状態をチェック
    if (job.companyId) {
      const companyDoc = await getDoc(doc(db, 'companies', job.companyId))
      if (companyDoc.exists()) {
        const companyData = companyDoc.data()
        if (!companyData.isPublic) {
          return NextResponse.json(
            { success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } },
            { status: 404 }
          )
        }
      }
    }

    // 募集中の求人のみ公開
    if (job.status !== 'active') {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Job not found or not active' 
          } 
        },
        { status: 404 }
      )
    }

    // 公開用データ（簡易版）
    const publicJob = {
      id: job.id,
      title: job.title,
      description: job.jobDescription,
      employmentType: job.employmentType,
      status: job.status,
      updatedAt: typeof job.updatedAt === 'string' 
        ? job.updatedAt 
        : job.updatedAt instanceof Date 
          ? job.updatedAt.toISOString() 
          : new Date().toISOString()
    }

    return NextResponse.json(
      { success: true, data: publicJob },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600', // 10分キャッシュ
        }
      }
    )
  } catch (error: any) {
    console.error('Get job API error:', error)
    
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'An internal error occurred'
      : error.message
    
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_SERVER_ERROR', 
          message: errorMessage 
        } 
      },
      { status: 500 }
    )
  }
}
