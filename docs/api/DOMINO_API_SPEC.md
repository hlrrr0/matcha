# 人材紹介システム Domino連携API 仕様書

## 目次
1. [概要](#概要)
2. [認証](#認証)
3. [エンドポイント](#エンドポイント)
4. [データ型定義](#データ型定義)
5. [エラーハンドリング](#エラーハンドリング)
6. [テスト例](#テスト例)

## 概要

### 基本情報
- **ベースURL**: `https://your-hr-system.vercel.app/api`
- **プロトコル**: HTTPS
- **データ形式**: JSON
- **文字エンコーディング**: UTF-8
- **認証方式**: Bearer Token + API Key

### サポート対象
- 企業データの作成・同期
- 店舗データの作成・同期
- リアルタイムデータ連携

## 認証

### 必要な認証情報
```http
Content-Type: application/json
Authorization: Bearer {HR_SYSTEM_AUTH_TOKEN}
X-API-Key: {HR_SYSTEM_API_KEY}
```

### 認証トークン
- **API Key**: `hr-system-api-key-2024`
- **Bearer Token**: `hr-system-auth-token-2024`

## エンドポイント

### 1. 企業データ作成

#### `POST /api/companies`

**説明**: Dominoから企業データを受信してFirestoreに保存

**リクエストヘッダー**:
```http
Content-Type: application/json
Authorization: Bearer hr-system-auth-token-2024
X-API-Key: hr-system-api-key-2024
```

**リクエストボディ**:
```json
{
  "id": "domino_company_12345",
  "name": "株式会社寿司テック",
  "address": "東京都渋谷区渋谷1-1-1",
  "phone": "03-1234-5678",
  "email": "info@sushitech.co.jp",
  "website": "https://sushitech.co.jp",
  "instagram": "https://instagram.com/sushitech",
  "description": "革新的な寿司技術を提供する企業",
  "businessType": ["寿司", "日本料理"],
  "industry": "飲食業",
  "size": "medium",
  "status": "active"
}
```

**フィールド説明**:
- `id` (必須): Domino側の企業ID
- `name` (必須): 企業名
- `address` (オプション): 企業住所
- `phone` (オプション): 電話番号
- `email` (オプション): メールアドレス
- `website` (オプション): ウェブサイトURL
- `instagram` (オプション): Instagram URL
- `description` (オプション): 企業説明
- `businessType` (オプション): 事業種別の配列
- `industry` (オプション): 業界
- `size` (オプション): 企業規模 (`small`, `medium`, `large`)
- `status` (オプション): ステータス (`active`, `inactive`)

**成功レスポンス** (200):
```json
{
  "success": true,
  "id": "hr_company_67890",
  "message": "Company created successfully"
}
```

### 2. 店舗データ作成

#### `POST /api/shops`

**説明**: Dominoから店舗データを受信してFirestoreに保存

**リクエストボディ**:
```json
{
  "id": "domino_shop_12345",
  "name": "寿司テック 銀座店",
  "companyId": "domino_company_12345",
  "hrCompanyId": "hr_company_67890",
  "address": "東京都中央区銀座1-1-1",
  "phone": "03-2345-6789",
  "instagramUrl": "https://instagram.com/sushitech_ginza",
  "tabelogUrl": "https://tabelog.com/tokyo/restaurant/12345",
  "manager": "田中太郎",
  "openingHours": "11:00-22:00",
  "notes": "銀座の中心地にある人気店",
  "isActive": true
}
```

**フィールド説明**:
- `id` (必須): Domino側の店舗ID
- `name` (必須): 店舗名
- `companyId` (必須): Domino側の企業ID
- `hrCompanyId` (必須): 人材紹介システム側の企業ID
- `address` (オプション): 店舗住所
- `phone` (オプション): 電話番号
- `instagramUrl` (オプション): Instagram URL
- `tabelogUrl` (オプション): 食べログURL
- `manager` (オプション): 店長名
- `openingHours` (オプション): 営業時間
- `notes` (オプション): メモ・特記事項
- `isActive` (オプション): アクティブ状態 (デフォルト: true)

**成功レスポンス** (200):
```json
{
  "success": true,
  "id": "hr_shop_11111",
  "message": "Shop created successfully"
}
```

## データ型定義

### DominoCompanyData
```typescript
interface DominoCompanyData {
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
```

### DominoShopData
```typescript
interface DominoShopData {
  id: string
  name: string
  companyId: string
  hrCompanyId?: string
  address?: string
  phone?: string
  instagramUrl?: string
  tabelogUrl?: string
  manager?: string
  openingHours?: string
  notes?: string
  isActive?: boolean
}
```

## エラーハンドリング

### エラーレスポンス形式
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "エラーメッセージ",
  "details": {
    "field": "フィールド名",
    "code": "詳細コード"
  }
}
```

### HTTPステータスコード

| ステータス | 意味 | 例 |
|------------|------|-----|
| 200 | 成功 | データ作成成功 |
| 400 | リクエストエラー | 必須項目不足、形式エラー |
| 401 | 認証エラー | API Key無効、Bearer Token無効 |
| 409 | 重複エラー | 既存データと重複 |
| 500 | サーバーエラー | 内部処理エラー |

### エラーコード一覧

| エラーコード | 説明 |
|--------------|------|
| `AUTHENTICATION_ERROR` | 認証失敗 |
| `VALIDATION_ERROR` | バリデーションエラー |
| `INVALID_JSON` | 無効なJSON形式 |
| `DUPLICATE_DOMINO_ID` | Domino ID重複 |
| `DUPLICATE_COMPANY` | 企業名・ウェブサイト重複 |
| `MISSING_COMPANY_ID` | 企業ID不足 |
| `DUPLICATE_DATA` | データ重複 |
| `INTERNAL_ERROR` | 内部エラー |

### 重複チェック詳細

#### 企業データの重複チェック
API は以下の順序で重複をチェックします：

1. **Domino ID重複チェック**
   - 同一のDomino IDが既に存在する場合は登録を拒否
   - エラーコード: `DUPLICATE_DOMINO_ID`

2. **企業名・ウェブサイト重複チェック**
   - 企業名とウェブサイトの両方が既存データと完全一致する場合は登録を拒否
   - ウェブサイトが未指定の場合は企業名のみで重複判定
   - エラーコード: `DUPLICATE_COMPANY`

#### 重複エラーレスポンス例

**Domino ID重複の場合**:
```json
{
  "success": false,
  "error": "DUPLICATE_DOMINO_ID",
  "message": "Domino ID「domino_company_12345」は既に登録されています",
  "details": {
    "existingCompanyId": "hr_company_67890",
    "existingCompanyName": "既存の企業名"
  }
}
```

**企業名・ウェブサイト重複の場合**:
```json
{
  "success": false,
  "error": "DUPLICATE_COMPANY",
  "message": "企業名「株式会社テスト」とウェブサイト「https://test.com」が一致する企業が既に登録されています",
  "details": {
    "existingCompanyId": "hr_company_67890",
    "existingCompanyName": "株式会社テスト",
    "existingWebsite": "https://test.com",
    "dominoId": "domino_company_original"
  }
}
```

## テスト例

### 企業データ作成テスト

#### cURLでのテスト
```bash
curl -X POST https://your-hr-system.vercel.app/api/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hr-system-auth-token-2024" \
  -H "X-API-Key: hr-system-api-key-2024" \
  -d '{
    "id": "test_company_001",
    "name": "テスト企業株式会社",
    "address": "東京都渋谷区テスト1-1-1",
    "email": "test@example.com",
    "status": "active"
  }'
```

#### JavaScript/TypeScriptでのテスト
```typescript
const response = await fetch('https://your-hr-system.vercel.app/api/companies', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer hr-system-auth-token-2024',
    'X-API-Key': 'hr-system-api-key-2024'
  },
  body: JSON.stringify({
    id: 'test_company_001',
    name: 'テスト企業株式会社',
    address: '東京都渋谷区テスト1-1-1',
    email: 'test@example.com',
    status: 'active'
  })
})

const result = await response.json()
console.log(result)
```

### 店舗データ作成テスト

```bash
curl -X POST https://your-hr-system.vercel.app/api/shops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hr-system-auth-token-2024" \
  -H "X-API-Key: hr-system-api-key-2024" \
  -d '{
    "id": "test_shop_001",
    "name": "テスト店舗 銀座店",
    "companyId": "test_company_001",
    "hrCompanyId": "hr_company_123",
    "address": "東京都中央区銀座1-1-1",
    "manager": "テスト店長",
    "isActive": true
  }'
```

## 実装状況

### ✅ 完了項目
- [x] API認証ミドルウェア (`withAuth`)
- [x] 企業データ作成API (`POST /api/companies`)
- [x] 店舗データ作成API (`POST /api/shops`)
- [x] エラーハンドリング統一
- [x] 型定義とバリデーション
- [x] 環境変数設定ガイド

### 🔄 今後の拡張予定
- [ ] 企業データ更新API (`PUT /api/companies/{id}`)
- [ ] 店舗データ更新API (`PUT /api/shops/{id}`)
- [ ] データ削除API
- [ ] 一括インポートAPI
- [ ] Webhook受信エンドポイント
- [ ] ログ記録・監視機能

## サポート・連絡先

- **技術サポート**: GitHub Copilot
- **ドキュメント**: このAPI仕様書
- **問題報告**: [Issue Tracker]
- **緊急連絡**: [緊急連絡先]

---

**最終更新**: 2025年11月2日
**バージョン**: v1.0.0