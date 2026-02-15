import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { Company } from '@/types/company'
import { Store } from '@/types/store'

/**
 * MATCHAからDominoへのデータエクスポートAPI
 * POST /api/domino/export
 * 
 * Query Parameters:
 * - type: 'companies' | 'stores' | 'all' (デフォルト: 'all')
 * - companyId: 特定企業のみをエクスポート（オプション）
 * - onlyWithDominoId: dominoIdが設定されているもののみ（デフォルト: false）
 * - dryRun: trueの場合は実際の送信をせずにプレビュー（デフォルト: false）
 */

interface DominoCompanyPayload {
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

interface DominoShopPayload {
  id: string
  name: string
  companyId: string
  hrCompanyId: string
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
 * CompanyをDomino形式に変換
 */
function convertCompanyToDominoFormat(company: Company): DominoCompanyPayload {
  // dominoIdがあればそれを使用、なければMATCHAのIDにプレフィックスを付与
  const dominoId = company.dominoId ? `domino_${company.dominoId}` : `matcha_${company.id}`
  
  // ステータスをDomino形式にマッピング（Dominoはactive/inactiveのみサポート）
  const mapStatusToDomino = (status: Company['status']): 'active' | 'inactive' => {
    // active, prospect, prospect_contacted, appointment は active としてマッピング
    if (status === 'active' || status === 'prospect' || status === 'prospect_contacted' || status === 'appointment') {
      return 'active'
    }
    // inactive, no_approach, suspended, paused は inactive としてマッピング
    return 'inactive'
  }
  
  return {
    id: dominoId,
    name: company.name,
    address: company.address,
    phone: company.phone,
    email: company.email,
    website: company.website,
    description: company.memo,
    size: company.size === 'startup' ? 'small' : company.size === 'enterprise' ? 'large' : company.size,
    status: mapStatusToDomino(company.status),
  }
}

/**
 * StoreをDomino形式に変換
 */
function convertStoreToDominoFormat(store: Store, company: Company): DominoShopPayload {
  // dominoIdがあればそれを使用、なければMATCHAのIDにプレフィックスを付与
  const dominoStoreId = store.dominoId ? `domino_${store.dominoId}` : `matcha_${store.id}`
  const dominoCompanyId = company.dominoId ? `domino_${company.dominoId}` : `matcha_${company.id}`
  
  return {
    id: dominoStoreId,
    name: store.name,
    companyId: dominoCompanyId,
    hrCompanyId: company.id, // MATCHAの企業ID
    address: store.address,
    phone: store.phone,
    instagramUrl: store.instagramUrl,
    tabelogUrl: store.tabelogUrl,
    manager: store.manager,
    openingHours: store.operatingHours,
    notes: store.notes,
    isActive: store.status === 'active',
  }
}

/**
 * DominoにPOSTリクエストを送信
 */
async function postToDomino(endpoint: string, data: any, dryRun: boolean = false): Promise<{ success: boolean; error?: string; data?: any }> {
  if (dryRun) {
    // ドライランモード：実際の送信をせずにデータを返す
    console.log(`[DRY RUN] Would send to ${endpoint}:`, JSON.stringify(data, null, 2))
    return { success: true, data }
  }

  // インポート用のURLを使用（環境変数で分離）
  const dominoApiUrl = process.env.DOMINO_IMPORT_API_URL || process.env.DOMINO_API_URL || 'https://sushi-domino.vercel.app/api'
  const apiKey = process.env.DOMINO_IMPORT_API_KEY || process.env.DOMINO_API_KEY || ''

  try {
    const fullUrl = `${dominoApiUrl}${endpoint}`
    console.log(`Sending to Domino: ${fullUrl}`)
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Domino API error [${response.status}]:`, errorText)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    const result = await response.json()
    return { success: true, data: result }
  } catch (error) {
    console.error('Domino API request failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const companyId = searchParams.get('companyId')
    const onlyWithDominoId = searchParams.get('onlyWithDominoId') === 'true'
    const dryRun = searchParams.get('dryRun') === 'true'

    const db = getAdminFirestore()
    const results = {
      companies: { total: 0, current: 0, exported: 0, failed: 0, errors: [] as string[], data: [] as any[] },
      stores: { total: 0, current: 0, exported: 0, failed: 0, errors: [] as string[], data: [] as any[] },
      dryRun,
    }

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

      console.log(`📤 企業エクスポート開始: 全${results.companies.total}件`)

      for (const doc of companiesSnapshot.docs) {
        results.companies.current++
        const company = { id: doc.id, ...doc.data() } as Company
        
        console.log(`📤 [${results.companies.current}/${results.companies.total}] ${company.name}`)
        
        const payload = convertCompanyToDominoFormat(company)

        if (dryRun) {
          results.companies.data.push({ company: company.name, payload })
        }

        const result = await postToDomino('/companies', payload, dryRun)
        if (result.success) {
          results.companies.exported++
          console.log(`✅ [${results.companies.current}/${results.companies.total}] ${company.name} - 成功`)
        } else {
          results.companies.failed++
          results.companies.errors.push(`${company.name}: ${result.error}`)
          console.log(`❌ [${results.companies.current}/${results.companies.total}] ${company.name} - 失敗`)
        }
      }
      
      console.log(`✨ 企業エクスポート完了: 成功${results.companies.exported}件 / 失敗${results.companies.failed}件`)
    }

    // 店舗データのエクスポート
    if (type === 'stores' || type === 'all') {
      let storesQuery = db.collection('stores')
      
      if (companyId) {
        // 特定企業の店舗のみ
        storesQuery = db.collection('stores').where('companyId', '==', companyId) as any
      }
      
      if (onlyWithDominoId) {
        storesQuery = storesQuery.where('dominoId', '!=', null) as any
      }

      const storesSnapshot = await storesQuery.get()
      
      // 食べログURLがある店舗のみカウント
      const validStores = storesSnapshot.docs.filter(doc => {
        const store = doc.data() as Store
        return store.tabelogUrl && store.tabelogUrl.trim() !== ''
      })
      
      results.stores.total = validStores.length

      console.log(`📤 店舗エクスポート開始: 全${results.stores.total}件`)

      // 企業情報を取得してマップ化
      const companyIds = [...new Set(validStores.map(doc => doc.data().companyId))]
      const companyMap = new Map<string, Company>()
      
      for (let i = 0; i < companyIds.length; i += 30) {
        const batch = companyIds.slice(i, i + 30)
        const companySnapshot = await db.collection('companies')
          .where('__name__', 'in', batch)
          .get()
        
        companySnapshot.docs.forEach(doc => {
          companyMap.set(doc.id, { id: doc.id, ...doc.data() } as Company)
        })
      }

      for (const doc of validStores) {
        results.stores.current++
        const store = { id: doc.id, ...doc.data() } as Store
        const company = companyMap.get(store.companyId)

        console.log(`📤 [${results.stores.current}/${results.stores.total}] ${store.name}`)

        if (!company) {
          results.stores.failed++
          results.stores.errors.push(`${store.name}: 企業情報が見つかりません`)
          console.log(`❌ [${results.stores.current}/${results.stores.total}] ${store.name} - 企業情報なし`)
          continue
        }

        // tabelogURLチェック（既にフィルタ済みだが念のため）
        if (!store.tabelogUrl || store.tabelogUrl.trim() === '') {
          results.stores.failed++
          results.stores.errors.push(`${store.name}: 食べログURLが設定されていません`)
          console.log(`❌ [${results.stores.current}/${results.stores.total}] ${store.name} - 食べログURLなし`)
          continue
        }

        const payload = convertStoreToDominoFormat(store, company)
        
        if (dryRun) {
          results.stores.data.push({ store: store.name, company: company.name, payload })
        }

        const result = await postToDomino('/shops', payload, dryRun)
        
        if (result.success) {
          results.stores.exported++
          console.log(`✅ [${results.stores.current}/${results.stores.total}] ${store.name} - 成功`)
        } else {
          results.stores.failed++
          results.stores.errors.push(`${store.name}: ${result.error}`)
          console.log(`❌ [${results.stores.current}/${results.stores.total}] ${store.name} - 失敗`)
        }
      }
      
      console.log(`✨ 店舗エクスポート完了: 成功${results.stores.exported}件 / 失敗${results.stores.failed}件`)
    }

    return NextResponse.json({
      success: true,
      message: dryRun ? 'ドライラン完了（実際の送信は行われていません）' : 'Dominoへのエクスポートが完了しました',
      results,
    })
  } catch (error) {
    console.error('Domino export error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'エクスポート中にエラーが発生しました',
      },
      { status: 500 }
    )
  }
}
