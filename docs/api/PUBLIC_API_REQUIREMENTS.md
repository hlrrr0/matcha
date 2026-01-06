# 求人情報API 要件定義書（改訂版）

## 1. 概要

Agentシステムの求人情報を外部の人材紹介会社の求人サイトに提供するためのREST APIを構築します。**リアルタイム性は不要**で、1日1回のデータ取得を想定し、リクエスト回数を最小限に抑える設計とします。

## 2. データ配信方式の選択

### 2.1 推奨方式：バルクエクスポートAPI（一括ダウンロード）

リクエスト回数を最小限にするため、全データを一括で取得できるエクスポートAPIを提供します。

#### エンドポイント
```
GET /api/public/jobs/export
```

#### 特徴
- **1日1回のリクエストで全求人データを取得**
- JSON形式で全データを返却
- クライアント側でキャッシュして使用

### 2.2 代替案：差分更新API

#### エンドポイント
```
GET /api/public/jobs/changes?since={timestamp}
```

#### 特徴
- 前回取得時からの変更分のみを取得
- 初回は全データ、2回目以降は差分のみ
- さらにリクエスト数を削減可能

## 3. API エンドポイント

### 3.1 全求人データエクスポート API（推奨）

#### エンドポイント
```
GET /api/public/jobs/export
```

#### 目的
公開中の全求人情報を一括で取得（1日1回の利用を想定）

#### リクエストパラメータ

| パラメータ名 | 型 | 必須 | 説明 | 例 |
|------------|-----|------|------|-----|
| format | string | No | 出力形式（json, csv）デフォルト: json | json |
| includeCompanies | boolean | No | 企業情報を含めるか デフォルト: true | true |
| includeStores | boolean | No | 店舗情報を含めるか デフォルト: true | true |
| limit | number | No | 取得件数の上限（最大50件）デフォルト: 50 | 50 |

#### レスポンス

**成功時 (200 OK)**
```json
{
  "success": true,
  "data": {
    "exportedAt": "2026-01-06T03:00:00.000Z",
    "totalCount": 150,
    "jobs": [
      {
        "id": "job123",
        "title": "寿司職人募集",
        "description": "築地で寿司職人を募集しています...",
        "employmentType": "正社員",
        "salary": {
          "min": 300000,
          "max": 500000,
          "type": "月給",
          "note": "経験・能力により優遇"
        },
        "workingHours": {
          "start": "10:00",
          "end": "22:00",
          "note": "シフト制"
        },
        "holidays": "週休2日制",
        "welfare": "社会保険完備、交通費支給",
        "selectionProcess": "書類選考 → 面接2回",
        "location": {
          "prefecture": "東京都",
          "city": "中央区",
          "address": "築地1-2-3",
          "nearestStation": "築地駅徒歩5分"
        },
        "company": {
          "id": "company456",
          "name": "築地寿司グループ",
          "industry": "飲食業",
          "description": "創業50年の老舗寿司チェーン",
          "website": "https://example.com"
        },
        "stores": [
          {
            "id": "store789",
            "name": "築地本店",
            "address": "東京都中央区築地1-2-3",
            "phoneNumber": "03-1234-5678",
            "latitude": 35.6654,
            "longitude": 139.7707
          }
        ],
        "qualifications": ["調理師免許歓迎", "未経験可"],
        "benefits": ["賄いあり", "制服貸与", "昇給あり"],
        "recruitmentCount": 3,
        "ageLimit": false,
        "ageLimitReason": null,
        "recommendedPoints": "未経験から一流の寿司職人を目指せる環境です",
        "publicUrl": "https://agent-system.com/public/jobs/job123",
        "status": "募集中",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-05T12:00:00.000Z"
      }
    ],
    "companies": [
      {
        "id": "company456",
        "name": "築地寿司グループ",
        "industry": "飲食業",
        "description": "創業50年の老舗寿司チェーン",
        "website": "https://example.com",
        "jobCount": 5
      }
    ],
    "stores": [
      {
        "id": "store789",
        "name": "築地本店",
        "companyId": "company456",
        "companyName": "築地寿司グループ",
        "address": "東京都中央区築地1-2-3",
        "latitude": 35.6654,
        "longitude": 139.7707,
        "jobCount": 2
      }
    ]
  }
}
```

**エラー時**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key"
  }
}
```

**レスポンスサイズ最適化**
- Gzip圧縮を有効化
- 不要なフィールドは除外可能（パラメータで制御）

### 3.2 差分更新API（オプション）

#### エンドポイント
```
GET /api/public/jobs/changes
```

#### 目的
前回取得時からの変更データのみを取得（リクエスト数をさらに削減）

#### リクエストパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| since | string | Yes | 前回取得時のタイムスタンプ（ISO 8601） |

#### レスポンス

```json
{
  "success": true,
  "data": {
    "exportedAt": "2026-01-06T03:00:00.000Z",
    "since": "2026-01-05T03:00:00.000Z",
    "changes": {
      "added": [...],
      "updated": [...],
      "deleted": ["job123", "job456"]
    },
    "hasMore": false
  }
}
```

### 3.3 求人詳細取得 API（個別参照用）

#### エンドポイント
```
GET /api/public/jobs/:id
```

#### 目的
特定の求人の最新情報を確認（エクスポート後の個別確認用）

#### 使用ケース
- ユーザーが求人詳細ページにアクセスした際のリアルタイム確認
- エクスポートデータと最新状態の差分確認

#### レスポンス

```json
{
  "success": true,
  "data": {
    "id": "job123",
    "title": "寿司職人募集",
    "description": "...",
    "status": "募集中",
    "updatedAt": "2026-01-06T10:30:00.000Z"
  }
}
```

## 4. データ更新スケジュール

### 4.1 クライアント側の推奨運用

```
毎日 AM 3:00: /api/public/jobs/export を実行
↓
取得したJSONデータをローカルDBに保存
↓
自社サイトはローカルDBから表示
↓
必要に応じて個別APIで最新情報を確認
```

### 4.2 サーバー側のキャッシュ戦略

```typescript
// 実装例
const CACHE_DURATION = 6 * 60 * 60 * 1000 // 6時間

// 毎日AM2:00にキャッシュを更新（cronジョブ）
// クライアントのリクエスト時はキャッシュから返却
```

## 5. 認証・セキュリティ

### 5.1 APIキー認証

#### 実装方法
```
Header: X-API-Key: {API_KEY}
```

#### Firestoreスキーマ
```typescript
// コレクション: apiKeys
{
  key: string, // UUID v4
  name: string, // "○○人材紹介サイト"
  clientName: string,
  isActive: boolean,
  plan: "free" | "standard" | "premium",
  
  // レート制限（1日単位）
  dailyLimit: number, // 10リクエスト/日（エクスポート用）
  requestCount: number, // 当日のリクエスト数
  lastResetDate: string, // YYYY-MM-DD
  
  // アクセス制御
  allowedOrigins: string[],
  allowedIPs?: string[],
  
  // 利用状況
  createdAt: Timestamp,
  lastUsedAt: Timestamp,
  totalRequests: number
}
```

### 5.2 レート制限（1日単位）

```typescript
// プランごとの制限
const RATE_LIMITS = {
  free: 10,      // 1日10リクエスト
  standard: 50,  // 1日50リクエスト
  premium: 200   // 1日200リクエスト
}
```

- 午前0時（JST）にリクエストカウントをリセット
- 制限超過: `429 Too Many Requests`

### 5.3 CORS設定

- 登録されたオリジンのみアクセス許可
- 未登録のオリジンからのアクセス: `403 Forbidden`

## 6. データフィルタリング条件

### 公開対象の求人
```typescript
const isPublicJob = (job: Job) => {
  return (
    job.status === '募集中' &&
    job.company?.status === 'active' &&
    job.stores?.every(store => store.status === 'active')
  )
}
```

### 取得件数制限
- **1リクエストあたり最大50件**
- 50件を超える場合は、複数回のリクエストが必要
- ページネーション機能は将来拡張で検討

### 非公開情報
以下は**絶対に含めない**:
- 担当コンサルタント情報（`consultantId`, `consultantName`）
- 内部メモ（`internalNotes`, `memo`）
- 応募者情報（`candidates`）
- マッチング情報（`matches`）
- 企業の内部管理情報（`dominoId`, `dominoSyncStatus`）
- 店舗の内部情報（`dominoStoreId`）

## 7. エラーコード一覧

| HTTPステータス | エラーコード | 説明 |
|--------------|------------|------|
| 400 | BAD_REQUEST | 不正なリクエストパラメータ |
| 401 | UNAUTHORIZED | APIキーが無効または未設定 |
| 403 | FORBIDDEN | アクセス権限なし（CORS違反等） |
| 404 | NOT_FOUND | リソースが見つからない |
| 429 | TOO_MANY_REQUESTS | レート制限超過 |
| 500 | INTERNAL_SERVER_ERROR | サーバー内部エラー |
| 503 | SERVICE_UNAVAILABLE | サービス一時停止中 |

## 8. 実装

### 8.1 ディレクトリ構成

```
src/app/api/public/
├── jobs/
│   ├── export/
│   │   └── route.ts          # 全データエクスポート
│   ├── changes/
│   │   └── route.ts          # 差分更新
│   └── [id]/
│       └── route.ts          # 個別取得
├── companies/
│   └── route.ts              # 企業一覧（オプション）
└── stores/
    └── route.ts              # 店舗一覧（オプション）

src/lib/api/
├── auth.ts                   # APIキー認証
├── rateLimit.ts              # レート制限
└── jobExport.ts              # データエクスポート処理
```

### 8.2 エクスポートAPI実装例

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api/auth'
import { checkRateLimit } from '@/lib/api/rateLimit'
import { exportPublicJobs } from '@/lib/api/jobExport'

export async function GET(request: NextRequest) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key')
    const client = await verifyApiKey(apiKey)
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } },
        { status: 401 }
      )
    }

    // レート制限チェック（1日単位）
    const rateLimitOk = await checkRateLimit(client)
    
    if (!rateLimitOk) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'TOO_MANY_REQUESTS', 
            message: 'Daily rate limit exceeded. Please try again tomorrow.' 
          } 
        },
        { status: 429 }
      )
    }

    // パラメータ取得
    const { searchParams } = new URL(request.url)
    const includeCompanies = searchParams.get('includeCompanies') !== 'false'
    const includeStores = searchParams.get('includeStores') !== 'false'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 50) // 最大50件

    // データエクスポート（キャッシュから返却）
    const data = await exportPublicJobs({
      includeCompanies,
      includeStores,
      limit
    })

    // レスポンス（Gzip圧縮）
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip',
          'Cache-Control': 'public, max-age=21600', // 6時間キャッシュ
        }
      }
    )
  } catch (error: any) {
    console.error('Export API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } },
      { status: 500 }
    )
  }
}
```

### 8.3 データエクスポート処理

```typescript
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import NodeCache from 'node-cache'

// 6時間キャッシュ
const cache = new NodeCache({ stdTTL: 21600 })

export async function exportPublicJobs(options: {
  includeCompanies: boolean
  includeStores: boolean
  limit: number
}) {
  const cacheKey = `export:${options.includeCompanies}:${options.includeStores}:${options.limit}`
  
  // キャッシュチェック
  const cached = cache.get(cacheKey)
  if (cached) {
    return cached
  }

  // 募集中の求人を取得（最大50件に制限）
  const jobsRef = collection(db, 'jobs')
  const jobsQuery = query(
    jobsRef, 
    where('status', '==', '募集中'),
    limit(Math.min(options.limit, 50))
  )
  const jobsSnapshot = await getDocs(jobsQuery)

  const jobs = []
  const companyIds = new Set<string>()
  const storeIds = new Set<string>()

  for (const doc of jobsSnapshot.docs) {
    const job = doc.data()
    
    // 企業・店舗が有効かチェック
    const company = await getCompany(job.companyId)
    if (company?.status !== 'active') continue

    const stores = await getJobStores(job)
    if (stores.length === 0) continue
    if (stores.some(s => s.status !== 'active')) continue

    // 公開用データに変換
    const publicJob = {
      id: doc.id,
      title: job.title,
      description: job.description,
      employmentType: job.employmentType,
      salary: job.salary,
      workingHours: job.workingHours,
      holidays: job.holidays,
      welfare: job.welfare,
      selectionProcess: job.selectionProcess,
      location: job.location,
      company: {
        id: company.id,
        name: company.name,
        industry: company.industry,
        description: company.description,
        website: company.website
      },
      stores: stores.map(s => ({
        id: s.id,
        name: s.name,
        address: s.address,
        phoneNumber: s.phoneNumber,
        latitude: s.latitude,
        longitude: s.longitude
      })),
      qualifications: job.qualifications,
      benefits: job.benefits,
      recruitmentCount: job.recruitmentCount,
      ageLimit: job.ageLimit,
      ageLimitReason: job.ageLimitReason,
      recommendedPoints: job.recommendedPoints,
      publicUrl: `https://your-domain.com/public/jobs/${doc.id}`,
      status: job.status,
      createdAt: job.createdAt?.toDate().toISOString(),
      updatedAt: job.updatedAt?.toDate().toISOString()
    }

    jobs.push(publicJob)
    companyIds.add(job.companyId)
    stores.forEach(s => storeIds.add(s.id))
  }

  const result = {
    exportedAt: new Date().toISOString(),
    totalCount: jobs.length,
    jobs,
    companies: options.includeCompanies ? await getCompaniesData(Array.from(companyIds)) : undefined,
    stores: options.includeStores ? await getStoresData(Array.from(storeIds)) : undefined
  }

  // キャッシュに保存
  cache.set(cacheKey, result)

  return result
}
```

### 8.4 APIキー認証

```typescript
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore'

export async function verifyApiKey(apiKey: string | null) {
  if (!apiKey) return null

  const apiKeyDoc = await getDoc(doc(db, 'apiKeys', apiKey))
  
  if (!apiKeyDoc.exists()) return null

  const data = apiKeyDoc.data()
  
  if (!data.isActive) return null

  // 最終使用日時を更新
  await updateDoc(doc(db, 'apiKeys', apiKey), {
    lastUsedAt: serverTimestamp(),
    totalRequests: increment(1)
  })

  return data
}
```

### 8.5 レート制限（1日単位）

```typescript
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

const RATE_LIMITS = {
  free: 10,
  standard: 50,
  premium: 200
}

export async function checkRateLimit(client: any): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const apiKeyRef = doc(db, 'apiKeys', client.key)
  const apiKeyDoc = await getDoc(apiKeyRef)
  const data = apiKeyDoc.data()

  // 日付が変わったらリセット
  if (data.lastResetDate !== today) {
    await updateDoc(apiKeyRef, {
      requestCount: 1,
      lastResetDate: today,
      lastUsedAt: serverTimestamp()
    })
    return true
  }

  // レート制限チェック
  const limit = RATE_LIMITS[client.plan] || RATE_LIMITS.free
  
  if (data.requestCount >= limit) {
    return false
  }

  // カウント増加
  await updateDoc(apiKeyRef, {
    requestCount: data.requestCount + 1,
    lastUsedAt: serverTimestamp()
  })

  return true
}
```

## 9. クライアント側の実装例

```typescript
// クライアント側（人材紹介サイト）の実装例

// 1日1回、AM3:00に実行（cronジョブ）
async function syncJobsFromAgent() {
  try {
    const response = await fetch('https://agent-system.com/api/public/jobs/export', {
      headers: {
        'X-API-Key': process.env.AGENT_API_KEY
      }
    })

    const { data } = await response.json()

    // ローカルDBに保存
    await saveToLocalDB(data.jobs)
    await saveCompaniesToLocalDB(data.companies)
    await saveStoresToLocalDB(data.stores)

    console.log(`✅ Synced ${data.totalCount} jobs at ${data.exportedAt}`)
  } catch (error) {
    console.error('❌ Sync failed:', error)
  }
}

// サイトはローカルDBから表示
async function getJobs() {
  return await fetchFromLocalDB('jobs')
}
```

## 10. 管理画面（APIキー管理）

### 10.1 必要な機能

- APIキーの発行・削除
- クライアント情報の登録
- プラン設定（free/standard/premium）
- レート制限の設定
- 利用状況の確認（リクエスト数、最終使用日時）
- アクセスログの表示

### 10.2 画面構成

```
/admin/api-keys
├── 一覧画面
│   ├── APIキー一覧テーブル
│   ├── 新規発行ボタン
│   └── 利用状況サマリー
├── 詳細画面
│   ├── クライアント情報
│   ├── APIキー（マスク表示）
│   ├── 利用統計グラフ
│   └── アクセスログ
└── 発行画面
    ├── クライアント名入力
    ├── プラン選択
    ├── 許可オリジン設定
    └── 発行ボタン
```

## 11. 実装スケジュール

### Phase 1: コア機能（1週間）
- [x] 要件定義
- [ ] エクスポートAPI実装
- [ ] APIキー認証実装
- [ ] レート制限実装（1日単位）

### Phase 2: 追加機能（1週間）
- [ ] 差分更新API実装
- [ ] 個別取得API実装
- [ ] キャッシュ機能実装

### Phase 3: 管理機能（1週間）
- [ ] APIキー管理画面
- [ ] 利用状況ダッシュボード
- [ ] アクセスログ機能

### Phase 4: テスト・最適化（1週間）
- [ ] 単体テスト
- [ ] 負荷テスト（大量データ）
- [ ] キャッシュ最適化
- [ ] ドキュメント作成

## 12. モニタリング

### 12.1 監視項目
- 1日のAPIリクエスト数
- レスポンスタイム
- エラー率
- キャッシュヒット率
- データサイズ
- クライアントごとの利用状況

### 12.2 アラート条件
- エラー率 > 5%
- レスポンスタイム > 3秒
- データサイズ > 10MB（最適化が必要）
- 特定のAPIキーの異常なリクエスト数

## 13. コスト試算

### リクエスト数の削減効果

**従来方式（リアルタイムAPI）**
```
100クライアント × 1時間ごと × 24時間 = 2,400リクエスト/日
```

**新方式（1日1回エクスポート）**
```
100クライアント × 1回/日 = 100リクエスト/日
```

**削減率: 96%**

### Firebase コスト試算

- Firestore読み取り: 約100回/日（APIキー認証）
- Cloud Functions実行: 約100回/日
- データ転送: 約100回 × 5MB = 500MB/日

**月間コスト（100クライアント想定）**
- Firestore: 約$1
- Cloud Functions: 約$2
- データ転送: 約$1
- **合計: 約$4/月**

## 14. セキュリティ考慮事項

### 14.1 データ保護
- APIキーはUUID v4形式で生成
- APIキーはハッシュ化して保存（検討）
- 個人情報は一切含めない
- 内部管理情報は完全に除外

### 14.2 アクセス制御
- CORS設定で許可オリジンのみアクセス可能
- IPアドレス制限（オプション）
- レート制限で過度なアクセスを防止

### 14.3 監査ログ
- すべてのAPIアクセスをログに記録
- 異常なアクセスパターンを検知
- 定期的なログレビュー

## 15. ドキュメント

### 15.1 提供ドキュメント
- [ ] API仕様書（OpenAPI 3.0形式）
- [ ] 実装サンプルコード（JavaScript/TypeScript）
- [ ] 利用規約
- [ ] プライバシーポリシー
- [ ] FAQ

### 15.2 OpenAPI仕様書（抜粋）

```yaml
openapi: 3.0.0
info:
  title: Agent System Public API
  version: 1.0.0
  description: 求人情報エクスポートAPI

servers:
  - url: https://agent-system.com/api/public
    description: 本番環境

security:
  - ApiKeyAuth: []

paths:
  /jobs/export:
    get:
      summary: 全求人データエクスポート
      description: 公開中の全求人情報を一括取得（最大50件）
      parameters:
        - name: includeCompanies
          in: query
          schema:
            type: boolean
            default: true
        - name: includeStores
          in: query
          schema:
            type: boolean
            default: true
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 50
            default: 50
          description: 取得件数の上限（最大50件）
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExportResponse'
        '401':
          description: 認証エラー
        '429':
          description: レート制限超過

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
  
  schemas:
    ExportResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          $ref: '#/components/schemas/ExportData'
    
    ExportData:
      type: object
      properties:
        exportedAt:
          type: string
          format: date-time
        totalCount:
          type: integer
        jobs:
          type: array
          items:
            $ref: '#/components/schemas/Job'
```

## 16. 今後の拡張案

### 16.1 機能追加案
- [ ] Webhook通知機能（求人更新時にプッシュ通知）
- [ ] GraphQL API対応
- [ ] 応募者データの連携API
- [ ] リアルタイムストリーミング（WebSocket）

### 16.2 パフォーマンス改善案
- [ ] CDN配信の導入
- [ ] Redis キャッシュの活用
- [ ] データベース最適化（インデックス追加）
- [ ] 部分エクスポート機能（都道府県別など）

---

**作成日**: 2026年1月6日  
**最終更新**: 2026年1月6日  
**バージョン**: 1.0  
**作成者**: Agent System開発チーム
