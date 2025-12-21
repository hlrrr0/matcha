# 認証コードシステムの修正

## 問題
本番環境（Vercel）でマイページの認証が失敗する問題が発生していました。

### 原因
- 認証コードをメモリ内（Map）に保存していた
- サーバーレス環境では：
  - サーバーが再起動されるとメモリがクリアされる
  - 複数のインスタンスが動くため、コード生成と検証が異なるインスタンスで実行される可能性がある

## 解決策
認証コードの保存先をメモリからFirestoreに変更しました。

### 変更内容

**`/src/app/api/candidate-auth/route.ts`**
- 認証コードを`authCodes` Firestoreコレクションに保存
- POST（コード生成）: `addDoc`でFirestoreに保存
- GET（コード検証）: Firestoreからクエリして検証、使用後は`deleteDoc`で削除

### Firestoreデータ構造

```
authCodes (コレクション)
└── [ドキュメントID] (自動生成)
    ├── code: "12345678" (8桁の認証コード)
    ├── email: "user@example.com"
    ├── candidateId: "ABC123"
    ├── expiresAt: Timestamp (5分後)
    └── createdAt: Timestamp
```

### 必要なFirebaseインデックス

Firebaseコンソールで以下のインデックスを作成してください：

**コレクション:** `authCodes`
**フィールド:**
- `code` (昇順)

または、エラーメッセージに表示されるリンクから自動作成できます。

### メリット
✅ サーバーレス環境でも動作
✅ サーバー再起動の影響を受けない
✅ 複数インスタンス間で共有可能
✅ 永続化されるため信頼性が高い

### セキュリティ考慮事項
- 認証コードは使用後すぐに削除（ワンタイムトークン）
- 5分間の有効期限付き
- 期限切れコードは検証時に自動削除

### クリーンアップ（推奨）

古い認証コードを定期的に削除するため、以下のいずれかを実装することを推奨：

1. **Cloud Functions for Firebase**（推奨）
   ```javascript
   exports.cleanupExpiredAuthCodes = functions.pubsub
     .schedule('every 1 hours')
     .onRun(async (context) => {
       const now = admin.firestore.Timestamp.now()
       const snapshot = await db.collection('authCodes')
         .where('expiresAt', '<', now)
         .get()
       
       const batch = db.batch()
       snapshot.docs.forEach(doc => batch.delete(doc.ref))
       await batch.commit()
       
       console.log(`Deleted ${snapshot.size} expired auth codes`)
     })
   ```

2. **手動削除スクリプト**（scripts/cleanup-auth-codes.js）
   - 定期的に実行してクリーンアップ

## デプロイ手順

1. コードをデプロイ
2. Firebaseコンソールでインデックスを確認/作成
3. 本番環境でテスト：
   - メール送信 → 認証コード受信
   - コード入力 → マイページアクセス
4. 正常動作を確認

## トラブルシューティング

### エラー: "The query requires an index"
→ Firebaseコンソールでインデックスを作成してください

### 認証コードが届かない
→ RESEND_API_KEY環境変数を確認してください

### 認証コードが無効
→ 5分以内に使用してください
→ コードは1回のみ使用可能です
