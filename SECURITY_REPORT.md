# 🔐 セキュリティ診断レポート
**作成日**: 2026年1月11日  
**プロジェクト**: MATCHA（人材紹介プラットフォーム）  
**危険度**: 🔴 **高リスク（即時対応必要）**

---

## 📊 エグゼクティブサマリー

現在のシステムには**複数の重大なセキュリティ脆弱性**が存在し、以下のリスクが懸念されます:

- ✅ **個人情報漏洩リスク**: 求職者・企業情報が外部から直接アクセス可能
- ✅ **不正API利用**: AI生成APIが無制限に利用可能（高額課金リスク）
- ✅ **データベース侵害**: Firestore Rulesが未設定で全データアクセス可能
- ✅ **法的リスク**: 個人情報保護法・GDPR違反の可能性

**⚠️ 重要**: 本番環境で稼働している場合、**即座に対応が必要**です。

---

## 🚨 検出された脆弱性一覧

### **1. Firestore Security Rulesが未設定** 🔴🔴🔴
**危険度**: 致命的  
**影響範囲**: 全データベース（候補者・企業・求人情報）

#### 問題点
```javascript
// 現在、ブラウザコンソールから誰でも実行可能
firebase.firestore().collection('candidates').get()
// → 求職者の個人情報（氏名、年齢、連絡先、面接メモ等）全件取得

firebase.firestore().collection('companies').get()
// → 企業情報（担当者情報、契約内容等）全件取得

firebase.firestore().collection('matches').get()
// → マッチング状況（誰がどの企業に応募したか）全件取得
```

#### 攻撃シナリオ
1. 攻撃者がWebサイトを訪問
2. ブラウザのデベロッパーツールを開く
3. Consoleで上記コードを実行
4. **全データが無制限にダウンロード可能**

#### 影響
- **個人情報保護法違反** → 最大5000万円の罰金
- **GDPR違反** → 最大2000万ユーロの罰金（海外顧客がいる場合）
- **信用失墜** → 求職者・企業からの信頼喪失

#### 対策（実施済み）
✅ `firestore.rules` ファイルを作成し、以下のルールを実装:
- 認証済み＋承認済みユーザーのみデータアクセス可能
- API管理情報はフロントエンドから完全にブロック
- デフォルトはすべて拒否

**デプロイ方法**:
```bash
firebase deploy --only firestore:rules
```

---

### **2. APIエンドポイントに認証なし** 🔴🔴
**危険度**: 高  
**影響範囲**: AI生成API、ジオコーディング、食べログ取得

#### 脆弱なエンドポイント
| エンドポイント | 認証 | リスク |
|--------------|------|--------|
| `/api/ai/generate-job` | ❌ なし | Gemini API課金爆発 |
| `/api/ai/generate-company` | ❌ なし | Gemini API課金爆発 |
| `/api/geocode` | ❌ なし | Google Maps API消費 |
| `/api/tabelog/fetch` | ❌ なし | スクレイピング過負荷 |

#### 攻撃シナリオ
```bash
# 誰でも実行可能
for i in {1..1000}; do
  curl -X POST https://your-domain.com/api/ai/generate-job \
    -H "Content-Type: application/json" \
    -d '{"companyName":"テスト","storeNames":["店舗A"]}'
done

# 結果: Gemini APIに1000回リクエスト → 高額課金
```

#### 対策（実装済み）
✅ 認証ミドルウェア `src/lib/api/middleware.ts` を作成:
- `withAuth()`: 認証済みユーザーのみアクセス可能
- `withAdminAuth()`: 管理者のみアクセス可能
- `withRateLimit()`: IP + エンドポイントベースのレート制限

**適用方法**:
```typescript
// Before
export async function POST(request: NextRequest) { ... }

// After
export const POST = withAuth(async (request, { userId, userRole }) => {
  // 認証済みユーザーのみここに到達
  ...
})
```

---

### **3. Public Jobs Export APIのセキュリティ** 🟡
**危険度**: 中  
**影響範囲**: 求人データ

#### 現在の保護
✅ `X-API-Key`ヘッダーでの認証  
✅ 1日あたりのレート制限  
✅ 出力データの一部マスキング（企業名・電話番号等は未出力）

#### 残存リスク
- APIキーが漏洩した場合、**全求人データが流出**
- レート制限が甘い場合、短時間で大量取得可能

#### 追加推奨対策
1. **APIキーのローテーション機能**: 定期的に自動更新
2. **IPホワイトリスト**: 特定のIPアドレスからのみアクセス許可
3. **監視アラート**: 異常なアクセスパターンを検出

```typescript
// 実装例（追加推奨）
match /apiKeys/{keyId} {
  allow read, write: if false; // すでに実装済み
}

// 追加: IPホワイトリストチェック
export async function verifyApiKey(apiKey: string, clientIP: string) {
  const keyDoc = await db.collection('apiKeys').doc(apiKey).get()
  const data = keyDoc.data()
  
  // IPホワイトリストチェック
  if (data.allowedIPs && !data.allowedIPs.includes(clientIP)) {
    return null
  }
  
  return data
}
```

---

### **4. エラーメッセージで内部情報漏洩** 🟡
**危険度**: 中  
**影響範囲**: 全API

#### 問題点
```typescript
// 本番環境でも詳細エラーが出力される
catch (error: any) {
  return NextResponse.json(
    { 
      error: '生成エラー',
      details: {
        message: error.message,        // ❌ 内部エラー露出
        stack: error.stack,            // ❌ スタックトレース露出
        parseError: parseError.message // ❌ パース詳細露出
      }
    },
    { status: 500 }
  )
}
```

#### 対策
```typescript
// 本番環境では詳細を隠蔽
catch (error: any) {
  console.error('Internal error:', error) // サーバーログのみ
  
  return NextResponse.json(
    { 
      error: '処理中にエラーが発生しました',
      // 本番環境では詳細を返さない
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          message: error.message,
          stack: error.stack
        }
      })
    },
    { status: 500 }
  )
}
```

---

### **5. CORS設定が未確認** 🟡
**危険度**: 中  
**影響範囲**: 全API

#### 確認事項
現在、CORS設定が明示的に行われていない可能性があります。

#### 推奨設定
```typescript
// next.config.ts に追加
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? 'https://your-domain.com'  // 本番: 自ドメインのみ
              : '*'                        // 開発: すべて許可
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-API-Key'
          }
        ]
      }
    ]
  }
}
```

---

### **6. 環境変数がログ出力** 🟠
**危険度**: 低  
**影響範囲**: サーバーログ

#### 問題点
```typescript
console.log('- API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing')
```

#### 対策
```typescript
// 環境変数の値そのものは絶対にログ出力しない
console.log('- API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set (length: ' + process.env.NEXT_PUBLIC_FIREBASE_API_KEY.length + ')' : '❌ Missing')
```

---

## ✅ 実施済み対策

### 1. Firestore Security Rules作成 ✅
- **ファイル**: `firestore.rules`
- **内容**: 認証＋承認ベースのアクセス制御
- **デプロイ**: `firebase deploy --only firestore:rules` で反映

### 2. API認証ミドルウェア作成 ✅
- **ファイル**: `src/lib/api/middleware.ts`
- **機能**:
  - `withAuth()`: Firebase ID Token検証
  - `withAdminAuth()`: 管理者権限チェック
  - `withRateLimit()`: IP + エンドポイントベースのレート制限

### 3. Firebase Admin SDKにトークン検証機能追加 ✅
- **ファイル**: `src/lib/firebase-admin.ts`
- **関数**: `verifyIdToken(token: string)`

---

## 🔧 今後の実装が必要な対策

### Priority 1: 各APIエンドポイントに認証を適用 🔴
**期限**: 即時  
**工数**: 2-3時間

#### 対象エンドポイント
- `/api/ai/generate-job/route.ts`
- `/api/ai/generate-company/route.ts`
- `/api/geocode/route.ts`
- `/api/tabelog/fetch/route.ts`

#### 実装方法
```typescript
// Before
export async function POST(request: NextRequest) {
  // 処理
}

// After
import { withAuth, withRateLimit } from '@/lib/api/middleware'

export const POST = withAuth(
  withRateLimit(
    async (request, { userId, userRole }) => {
      // 認証済みユーザーのみここに到達
      // レート制限も適用済み
    },
    20, // 20リクエスト
    60000 // 1分間
  )
)
```

---

### Priority 2: Firestore Rulesをデプロイ 🔴
**期限**: 即時  
**工数**: 5分

```bash
# Firebase CLIをインストール（未インストールの場合）
npm install -g firebase-tools

# ログイン
firebase login

# プロジェクトを選択
firebase use --add

# Firestoreルールをデプロイ
firebase deploy --only firestore:rules
```

---

### Priority 3: CORS設定を追加 🟡
**期限**: 1週間以内  
**工数**: 30分

`next.config.ts` に上記のCORS設定を追加。

---

### Priority 4: エラーハンドリング改善 🟡
**期限**: 1週間以内  
**工数**: 2-3時間

全APIエンドポイントのエラーハンドリングを見直し、本番環境では詳細を隠蔽。

---

### Priority 5: 監視・アラート設定 🟢
**期限**: 2週間以内  
**工数**: 1日

- **Vercel Analytics**: 異常なトラフィックパターンを検出
- **Firebase Monitoring**: Firestore読み書きの異常を検出
- **Slack通知**: セキュリティイベント発生時にアラート

---

## 📋 セキュリティチェックリスト

| # | 対策 | 状態 | 期限 |
|---|------|------|------|
| 1 | Firestore Security Rules作成 | ✅ 完了 | - |
| 2 | Firestore Rulesデプロイ | ⏳ 未実施 | **即時** |
| 3 | API認証ミドルウェア作成 | ✅ 完了 | - |
| 4 | AI生成APIに認証適用 | ⏳ 未実施 | **即時** |
| 5 | ジオコーディングAPIに認証適用 | ⏳ 未実施 | **即時** |
| 6 | 食べログAPIに認証適用 | ⏳ 未実施 | **即時** |
| 7 | CORS設定追加 | ⏳ 未実施 | 1週間 |
| 8 | エラーハンドリング改善 | ⏳ 未実施 | 1週間 |
| 9 | Public API IPホワイトリスト | ⏳ 未実施 | 2週間 |
| 10 | 監視・アラート設定 | ⏳ 未実施 | 2週間 |

---

## 🎯 推奨アクションプラン

### **今日中に実施**
1. ✅ Firestore Rulesをデプロイ（5分）
   ```bash
   firebase deploy --only firestore:rules
   ```

2. ✅ AI生成APIに認証を追加（1時間）
   - `/api/ai/generate-job/route.ts`
   - `/api/ai/generate-company/route.ts`

3. ✅ 本番環境で動作確認（30分）

### **今週中に実施**
4. ジオコーディング・食べログAPIに認証追加（1時間）
5. CORS設定追加（30分）
6. エラーハンドリング改善（3時間）

### **2週間以内に実施**
7. Public API IPホワイトリスト実装（半日）
8. 監視・アラート設定（1日）
9. セキュリティドキュメント作成（半日）

---

## 📞 サポート

セキュリティに関するご質問やサポートが必要な場合:
- Firebase Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- Next.js API Routes: https://nextjs.org/docs/api-routes/introduction
- Vercel Security: https://vercel.com/docs/security

---

**⚠️ 重要な注意事項**:
- 本番環境で稼働中の場合、**Firestore Rulesのデプロイは必ず実施**してください
- API認証の追加は、**既存のフロントエンドコードの修正も必要**です
- セキュリティ対策は**継続的な改善が必要**です

**最終更新**: 2026年1月11日
