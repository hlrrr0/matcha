# Agent System Public API 統合ガイド

外部プロジェクトからAgent Systemの求人データにアクセスするためのAPIドキュメントです。

## 📋 目次

1. [概要](#概要)
2. [認証](#認証)
3. [エンドポイント](#エンドポイント)
4. [データ型定義](#データ型定義)
5. [実装例](#実装例)
6. [エラーハンドリング](#エラーハンドリング)
7. [レート制限](#レート制限)
8. [ベストプラクティス](#ベストプラクティス)

---

## 概要

### Base URL
```
https://agent-system-ten.vercel.app
```

### 特徴
- ✅ RESTful API設計
- ✅ JSON形式のレスポンス
- ✅ APIキー認証
- ✅ レート制限（プランに応じて1日10〜200リクエスト）
- ✅ キャッシュ対応（効率的なデータ取得）

### 推奨される利用方法
- **1日1回の全データ取得**: 定期的なバッチ処理で全求人データを取得
- **ローカルキャッシュ**: 取得したデータをローカルDBに保存
- **差分更新**: 将来的に差分取得APIが利用可能になる予定

---

## 認証

### APIキーの取得

APIキーは別途提供されます。管理者に問い合わせてください。

### 認証方法

全てのリクエストに`X-API-Key`ヘッダーを付与します。

```http
GET /api/public/jobs/export
Host: agent-system-ten.vercel.app
X-API-Key: your-api-key-here
```

---

## エンドポイント

### 1. 全求人データのエクスポート

**エンドポイント**: `GET /api/public/jobs/export`

**説明**: 募集中の求人データを一括取得します（最大50件/リクエスト）

#### リクエストパラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `limit` | number | × | 50 | 取得件数（最大50） |
| `includeCompanies` | boolean | × | false | 企業情報を含める |
| `includeStores` | boolean | × | false | 店舗情報を含める |

#### リクエスト例

```bash
curl -X GET "https://agent-system-ten.vercel.app/api/public/jobs/export?limit=10&includeCompanies=true&includeStores=true" \
  -H "X-API-Key: your-api-key-here"
```

#### レスポンス例

```json
{
  "success": true,
  "data": {
    "exportedAt": "2026-01-06T12:00:00.000Z",
    "totalCount": 10,
    "jobs": [
      {
        "id": "job123",
        "title": "寿司職人（正社員）",
        "description": "調理、接客、寿司の握り",
        "employmentType": "正社員",
        "salary": {
          "type": "月給",
          "note": "月給28万（みなし残業代40時間込み）"
        },
        "workingHours": {
          "note": "平日：13:00〜23:00"
        },
        "holidays": "月8日 シフト制",
        "welfare": "交通費2万円迄支給...",
        "selectionProcess": "面接回数1回→内定",
        "location": {},
        "company": {
          "id": "company123",
          "name": "株式会社〇〇",
          "website": "https://example.com"
        },
        "stores": [
          {
            "id": "store123",
            "name": "〇〇店 大阪梅田店",
            "address": "大阪府梅田...",
            "latitude": 34.7005588,
            "longitude": 135.4957339
          }
        ],
        "qualifications": ["未経験歓迎！"],
        "benefits": ["交通費支給", "社会保険完備"],
        "ageLimit": true,
        "ageLimitReason": "年齢は一切気にしない",
        "recommendedPoints": "...",
        "publicUrl": "https://agent-system-ten.vercel.app/public/jobs/job123",
        "status": "active",
        "createdAt": "2026-01-06T10:00:00.000Z",
        "updatedAt": "2026-01-06T11:00:00.000Z"
      }
    ],
    "companies": [
      {
        "id": "company123",
        "name": "株式会社〇〇",
        "website": "https://example.com",
        "jobCount": 5
      }
    ],
    "stores": [
      {
        "id": "store123",
        "name": "〇〇店 大阪梅田店",
        "companyId": "company123",
        "companyName": "株式会社〇〇",
        "address": "大阪府梅田...",
        "latitude": 34.7005588,
        "longitude": 135.4957339,
        "jobCount": 2
      }
    ]
  }
}
```

---

### 2. 個別求人の取得

**エンドポイント**: `GET /api/public/jobs/{jobId}`

**説明**: 特定の求人の詳細情報を取得します

#### リクエスト例

```bash
curl -X GET "https://agent-system-ten.vercel.app/api/public/jobs/job123" \
  -H "X-API-Key: your-api-key-here"
```

#### レスポンス例

```json
{
  "success": true,
  "data": {
    "id": "job123",
    "title": "寿司職人（正社員）",
    "description": "調理、接客、寿司の握り",
    "employmentType": "正社員",
    "salary": {
      "type": "月給",
      "note": "月給28万（みなし残業代40時間込み）"
    },
    "company": {
      "id": "company123",
      "name": "株式会社〇〇",
      "website": "https://example.com"
    },
    "stores": [
      {
        "id": "store123",
        "name": "〇〇店 大阪梅田店",
        "address": "大阪府梅田...",
        "latitude": 34.7005588,
        "longitude": 135.4957339
      }
    ],
    "publicUrl": "https://agent-system-ten.vercel.app/public/jobs/job123",
    "status": "active",
    "createdAt": "2026-01-06T10:00:00.000Z",
    "updatedAt": "2026-01-06T11:00:00.000Z"
  }
}
```

---

## データ型定義

### TypeScript型定義

```typescript
// レスポンス型
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// エクスポートデータ型
interface ExportData {
  exportedAt: string        // ISO 8601形式のタイムスタンプ
  totalCount: number         // 取得した求人数
  jobs: PublicJob[]          // 求人データ配列
  companies?: CompanyData[]  // 企業データ配列（オプション）
  stores?: StoreData[]       // 店舗データ配列（オプション）
}

// 求人データ型
interface PublicJob {
  id: string
  title: string
  description: string
  employmentType: string     // "正社員" | "契約社員" | "アルバイト" | "業務委託"
  salary?: {
    min?: number
    max?: number
    type: string
    note?: string
  }
  workingHours?: {
    start?: string
    end?: string
    note?: string
  }
  holidays?: string
  welfare?: string
  selectionProcess?: string
  location?: {
    prefecture?: string
    city?: string
    address?: string
    nearestStation?: string
  }
  company: {
    id: string
    name: string
    industry?: string
    description?: string
    website?: string
  }
  stores: StoreInfo[]
  qualifications?: string[]
  benefits?: string[]
  recruitmentCount?: number
  ageLimit: boolean
  ageLimitReason?: string
  recommendedPoints?: string
  publicUrl: string          // 求人詳細ページのURL
  status: string             // "active" | "draft" | "closed"
  createdAt: string          // ISO 8601
  updatedAt: string          // ISO 8601
}

// 店舗情報型
interface StoreInfo {
  id: string
  name: string
  address?: string
  phoneNumber?: string
  latitude?: number
  longitude?: number
}

// 企業データ型
interface CompanyData {
  id: string
  name: string
  industry?: string
  description?: string
  website?: string
  jobCount: number           // この企業の求人数
}

// 店舗データ型
interface StoreData {
  id: string
  name: string
  companyId?: string
  companyName?: string
  address?: string
  latitude?: number
  longitude?: number
  jobCount: number           // この店舗の求人数
}
```

---

## 実装例

### JavaScript/Node.js

```javascript
// 基本的な実装例
async function fetchJobs(apiKey) {
  const response = await fetch(
    'https://agent-system-ten.vercel.app/api/public/jobs/export?limit=50&includeCompanies=true&includeStores=true',
    {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    }
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()
  
  if (!result.success) {
    throw new Error(result.error?.message || 'Unknown error')
  }

  return result.data
}

// 使用例
const apiKey = process.env.AGENT_SYSTEM_API_KEY
fetchJobs(apiKey)
  .then(data => {
    console.log(`取得した求人数: ${data.totalCount}`)
    console.log(`企業数: ${data.companies?.length || 0}`)
    console.log(`店舗数: ${data.stores?.length || 0}`)
    
    // 求人データを処理
    data.jobs.forEach(job => {
      console.log(`- ${job.title} (${job.company.name})`)
    })
  })
  .catch(error => {
    console.error('エラー:', error.message)
  })
```

### React/Next.js

```typescript
import { useState, useEffect } from 'react'

interface JobListProps {
  apiKey: string
}

export function JobList({ apiKey }: JobListProps) {
  const [jobs, setJobs] = useState<PublicJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadJobs() {
      try {
        const response = await fetch(
          '/api/proxy/jobs/export?limit=50',
          {
            headers: {
              'X-API-Key': apiKey
            }
          }
        )

        const result = await response.json()
        
        if (result.success) {
          setJobs(result.data.jobs)
        } else {
          setError(result.error?.message || 'Failed to load jobs')
        }
      } catch (err) {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }

    loadJobs()
  }, [apiKey])

  if (loading) return <div>読み込み中...</div>
  if (error) return <div>エラー: {error}</div>

  return (
    <div>
      <h1>求人一覧 ({jobs.length}件)</h1>
      {jobs.map(job => (
        <div key={job.id}>
          <h2>{job.title}</h2>
          <p>{job.company.name}</p>
          <p>{job.employmentType}</p>
          <a href={job.publicUrl} target="_blank" rel="noopener noreferrer">
            詳細を見る
          </a>
        </div>
      ))}
    </div>
  )
}
```

### Python

```python
import requests
import os

def fetch_jobs(api_key: str) -> dict:
    """求人データを取得"""
    url = "https://agent-system-ten.vercel.app/api/public/jobs/export"
    params = {
        "limit": 50,
        "includeCompanies": "true",
        "includeStores": "true"
    }
    headers = {
        "X-API-Key": api_key,
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()
    
    result = response.json()
    
    if not result.get("success"):
        raise Exception(result.get("error", {}).get("message", "Unknown error"))
    
    return result.get("data")

# 使用例
if __name__ == "__main__":
    api_key = os.environ.get("AGENT_SYSTEM_API_KEY")
    
    try:
        data = fetch_jobs(api_key)
        print(f"取得した求人数: {data['totalCount']}")
        
        for job in data["jobs"]:
            print(f"- {job['title']} ({job['company']['name']})")
            
    except Exception as e:
        print(f"エラー: {e}")
```

---

## エラーハンドリング

### エラーレスポンス形式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーの説明"
  }
}
```

### エラーコード一覧

| HTTPステータス | エラーコード | 説明 | 対処方法 |
|--------------|------------|------|---------|
| 401 | `UNAUTHORIZED` | APIキーが無効 | APIキーを確認してください |
| 429 | `TOO_MANY_REQUESTS` | レート制限超過 | 翌日まで待つか、プラン変更を検討 |
| 404 | `NOT_FOUND` | リソースが見つからない | URLやIDを確認してください |
| 500 | `INTERNAL_ERROR` | サーバーエラー | 時間をおいて再試行してください |

### エラーハンドリング例

```typescript
async function fetchJobsWithRetry(apiKey: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(
        'https://agent-system-ten.vercel.app/api/public/jobs/export',
        {
          headers: { 'X-API-Key': apiKey }
        }
      )

      const result = await response.json()

      if (response.status === 429) {
        console.log('レート制限に到達。翌日再試行してください。')
        throw new Error('RATE_LIMIT_EXCEEDED')
      }

      if (response.status === 401) {
        console.error('APIキーが無効です')
        throw new Error('INVALID_API_KEY')
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error?.message}`)
      }

      if (!result.success) {
        throw new Error(result.error?.message || 'Unknown error')
      }

      return result.data
      
    } catch (error) {
      if (i === maxRetries - 1) throw error
      
      // リトライ前に待機
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

---

## レート制限

### プラン別制限

| プラン | リクエスト数/日 | 推奨用途 |
|--------|----------------|---------|
| Free | 10 | 開発・テスト |
| Standard | 50 | 小規模サイト |
| Premium | 200 | 大規模サイト |

### レート制限の確認

レート制限に達すると、HTTPステータス`429 Too Many Requests`が返されます。

### 制限回避のベストプラクティス

1. **1日1回の取得**: 毎日深夜など決まった時刻に全データを取得
2. **ローカルキャッシュ**: 取得したデータをDBに保存し、そこから表示
3. **差分更新**: 将来的に差分取得APIを使用（予定）

```javascript
// 推奨: 1日1回の取得 + ローカルキャッシュ
const cron = require('node-cron')

// 毎日午前3時に実行
cron.schedule('0 3 * * *', async () => {
  console.log('求人データを更新中...')
  
  const data = await fetchJobs(apiKey)
  
  // ローカルDBに保存
  await saveToDatabase(data.jobs)
  
  console.log(`${data.totalCount}件の求人を更新しました`)
})
```

---

## ベストプラクティス

### 1. 環境変数でAPIキーを管理

```bash
# .env
AGENT_SYSTEM_API_KEY=your-api-key-here
AGENT_SYSTEM_API_URL=https://agent-system-ten.vercel.app
```

### 2. エラーハンドリングを実装

```typescript
try {
  const data = await fetchJobs(apiKey)
  // 正常処理
} catch (error) {
  // エラーログ
  console.error('Failed to fetch jobs:', error)
  // フォールバック処理
  // 例: キャッシュデータを使用
}
```

### 3. タイムアウトを設定

```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒

try {
  const response = await fetch(url, {
    signal: controller.signal,
    headers: { 'X-API-Key': apiKey }
  })
  // ...
} finally {
  clearTimeout(timeoutId)
}
```

### 4. データのバリデーション

```typescript
function validateJob(job: any): job is PublicJob {
  return (
    typeof job.id === 'string' &&
    typeof job.title === 'string' &&
    typeof job.company === 'object' &&
    Array.isArray(job.stores)
  )
}

const validJobs = data.jobs.filter(validateJob)
```

### 5. ページング処理（50件以上の場合）

```typescript
async function fetchAllJobs(apiKey: string): Promise<PublicJob[]> {
  const allJobs: PublicJob[] = []
  const limit = 50
  
  // 最初の取得で総数を確認
  const firstBatch = await fetchJobs(apiKey, limit)
  allJobs.push(...firstBatch.jobs)
  
  // 50件以上ある場合は複数回リクエスト
  // （現在は最大50件のため、将来の拡張に備えた実装例）
  const totalBatches = Math.ceil(firstBatch.totalCount / limit)
  
  for (let i = 1; i < totalBatches; i++) {
    // 現在は未実装（将来的にoffsetパラメータ追加予定）
    // const batch = await fetchJobs(apiKey, limit, i * limit)
    // allJobs.push(...batch.jobs)
  }
  
  return allJobs
}
```

---

## サポート

### 問い合わせ先

- **技術サポート**: 開発チームまでお問い合わせください
- **APIキー発行**: 管理者にご連絡ください
- **バグ報告**: GitHubのIssuesまで

### 変更履歴

- **2026-01-06**: 初版リリース
  - Export API実装
  - 個別取得API実装
  - 最大50件/リクエスト制限

---

## 付録

### キャッシュ戦略の例

```typescript
// Redis を使用したキャッシュ例
import Redis from 'ioredis'

const redis = new Redis()

async function getCachedJobs(apiKey: string) {
  // キャッシュを確認
  const cached = await redis.get('jobs:all')
  
  if (cached) {
    console.log('キャッシュからデータを取得')
    return JSON.parse(cached)
  }
  
  // APIから取得
  console.log('APIからデータを取得')
  const data = await fetchJobs(apiKey)
  
  // 6時間キャッシュ
  await redis.setex('jobs:all', 6 * 60 * 60, JSON.stringify(data))
  
  return data
}
```

### データベース保存の例

```typescript
// Prisma を使用した保存例
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function syncJobsToDatabase(apiKey: string) {
  const data = await fetchJobs(apiKey)
  
  for (const job of data.jobs) {
    await prisma.job.upsert({
      where: { externalId: job.id },
      update: {
        title: job.title,
        description: job.description,
        employmentType: job.employmentType,
        companyName: job.company.name,
        // ... その他のフィールド
        updatedAt: new Date()
      },
      create: {
        externalId: job.id,
        title: job.title,
        description: job.description,
        employmentType: job.employmentType,
        companyName: job.company.name,
        // ... その他のフィールド
      }
    })
  }
  
  console.log(`${data.totalCount}件の求人を同期しました`)
}
```

---

**Last Updated**: 2026-01-06  
**API Version**: 1.0.0  
**Document Version**: 1.0.0
