# 求職者認証システム設計

## 概要
求職者用のマイページアクセスには、管理画面とは**完全に独立した認証システム**を使用します。
**Firebase Authentication は一切使用しません**（管理画面との干渉を完全に防止）。

## 認証の分離理由

### 1. セキュリティ
- 求職者は管理画面（求職者管理、企業管理、マッチング管理など）にアクセスできない
- 管理画面のユーザー登録とは別のシステムで動作
- 権限の混在を防ぐ
- **Firebase Auth を使わないため、管理画面のセッションに一切影響しない**

### 2. ユーザー体験
- 求職者は簡単にマイページにアクセス可能
- 管理者用のアカウント登録は不要
- メール認証コードのみで完結

## 技術仕様

### 認証フロー

```
1. 求職者が /public/candidates/auth にアクセス
   ↓
2. メールアドレスを入力
   ↓
3. バックエンドAPI (/api/candidate-auth) で:
   - Firestoreの candidates コレクションでメールアドレスを検索
   - 見つかった場合、8桁の認証コードを生成
   - 認証コードをメールで送信（TODO: 実装）
   - 開発環境ではコードをレスポンスに含めて返す
   ↓
4. 求職者が認証コードを入力
   ↓
5. バックエンドAPIで認証コードを検証:
   - 有効期限（5分）をチェック
   - コードが一致すれば、求職者IDとメールアドレスを返す
   - ワンタイムトークン（使用後は削除）
   ↓
6. セッションストレージに認証情報を保存
   ↓
7. マイページ (/public/candidates/{id}/mypage) にリダイレクト
   ↓
8. マイページで:
   - セッションストレージの認証情報を検証
   - 有効期限（24時間）をチェック
   - URL の ID とセッションの ID が一致するかチェック
   - 全てOKなら求職者情報とマッチング情報を表示
```

### セッション管理

#### 保存データ（sessionStorage）
```typescript
{
  id: string,          // 求職者ID
  email: string,       // メールアドレス
  timestamp: number    // ログイン時刻（ミリ秒）
}
```

#### 有効期限
- **24時間**
- タイムスタンプから24時間経過したセッションは無効

#### ストレージ選択理由
- `sessionStorage`: ブラウザを閉じると自動的にクリア
- `localStorage` は使用しない（永続化は不要）

### 認証コード管理

#### バックエンド（API Route）
- **認証コード**: 8桁の英数字（大文字）
- **有効期限**: 5分
- **保存場所**: メモリ内Map（実運用ではRedisを推奨）
- **ワンタイムトークン**: 使用後は即座に削除

#### メール送信（TODO）
現在は開発環境のみ、レスポンスに認証コードを含めています。
本番環境では、Resend や SendGrid などでメール送信を実装してください。

```typescript
// /src/app/api/candidate-auth/route.ts で実装
// TODO: Resend でメール送信
await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: email,
  subject: '【求職者マイページ】認証コード',
  html: `<p>認証コード: <strong>${authCode}</strong></p>
         <p>このコードは5分間有効です。</p>`
})
```

### セキュリティチェック

マイページアクセス時に以下をチェック：

1. **セッション存在チェック**
   ```typescript
   const candidateAuth = sessionStorage.getItem('candidate_auth')
   if (!candidateAuth) { /* 認証ページへリダイレクト */ }
   ```

2. **有効期限チェック**
   ```typescript
   const sessionAge = Date.now() - authData.timestamp
   const maxAge = 24 * 60 * 60 * 1000 // 24時間
   if (sessionAge > maxAge) { /* 認証ページへリダイレクト */ }
   ```

3. **ID一致チェック**
   ```typescript
   if (authData.id !== params.id) { /* 認証ページへリダイレクト */ }
   ```

## Firebase設定

### 必要な設定
1. ~~Firebase Console で Google プロバイダーを有効化~~（不要）
2. ~~承認済みドメインに本番ドメインを追加~~（不要）
3. Firestore の candidates コレクションに email フィールドが必須

### Firebase Auth は使用しません

求職者認証では**Firebase Authentication を一切使用しない**ため、以下のメリットがあります：

- ✅ 管理画面の Firebase Auth セッションに干渉しない
- ✅ Google OAuth の設定が不要
- ✅ ポップアップブロックの問題がない
- ✅ シンプルで理解しやすい実装

### Firestore セキュリティルール（推奨）

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 管理画面用の認証（既存）
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    
    match /candidates/{candidateId} {
      allow read, write: if request.auth != null; // 管理画面からのアクセス
    }
    
    match /companies/{companyId} {
      allow read, write: if request.auth != null; // 管理画面からのアクセス
    }
    
    match /matches/{matchId} {
      allow read, write: if request.auth != null; // 管理画面からのアクセス
    }
    
    // 注意: 求職者マイページは Firebase Auth を使わないため、
    // 現在は認証なしでアクセス可能（セッション管理のみ）
    // より厳密なセキュリティが必要な場合は、
    // Cloud Functions で認証トークンを発行する方式に変更を推奨
  }
}
```

## 管理画面との違い

| 項目 | 管理画面 | 求職者マイページ |
|-----|---------|----------------|
| 認証方法 | Firebase Authentication（メールアドレス＋パスワード） | メール認証コード |
| ユーザー登録 | 必要（/auth/register） | 不要 |
| Firebase Auth | 使用する | **使用しない**（完全分離） |
| アクセス範囲 | 全データの閲覧・編集 | 自分のマッチング情報のみ閲覧 |
| セッション | Firebase Auth の永続セッション | 24時間のセッションストレージ |
| ログアウト | Firebase signOut() | sessionStorage.clear() |
| 認証コード | なし | 5分間有効のワンタイムコード |

### ファイル構成

### 認証関連
- `/src/app/public/candidates/auth/page.tsx` - 認証ページ（メール＋認証コード入力）
- `/src/app/api/candidate-auth/route.ts` - 認証API（コード生成・検証）
- `/src/app/public/candidates/[id]/mypage/page.tsx` - マイページ

### 認証フロー
1. **認証ページ** でメールアドレスを入力
2. **API Route** で認証コードを生成・メール送信
3. 求職者が認証コードを入力
4. **API Route** でコードを検証
5. セッションストレージに認証情報を保存
6. **マイページ** でセッション検証

## 今後の改善案

### より厳密なセキュリティが必要な場合

現在の実装は**クライアント側のセッション管理のみ**です。
より厳密なセキュリティが必要な場合、以下の改善を推奨：

1. **Cloud Functions で認証トークン発行**
   ```typescript
   // Google認証後、Cloud Functionsで独自のJWTトークンを発行
   const response = await fetch('/api/candidate-auth', {
     method: 'POST',
     body: JSON.stringify({ email, googleToken })
   })
   const { token } = await response.json()
   sessionStorage.setItem('candidate_token', token)
   ```

2. **API ルートで トークン検証**
   ```typescript
   // マイページデータ取得時にトークンを検証
   const token = sessionStorage.getItem('candidate_token')
   const response = await fetch(`/api/candidates/${id}`, {
     headers: { 'Authorization': `Bearer ${token}` }
   })
   ```

3. **Firestore セキュリティルールでトークン検証**
   ```javascript
   match /candidates/{candidateId} {
     allow read: if request.auth != null || 
                    isValidCandidateToken(request, candidateId);
   }
   ```

ただし、現在の要件（求職者が自分のマッチング情報を閲覧するのみ）では、
**セッションストレージベースの認証で十分**と判断しています。

## トラブルシューティング

### 「ログインが必要です」と表示される
- セッションの有効期限（24時間）が切れている
- ブラウザを閉じてセッションストレージがクリアされた
- 再度 `/public/candidates/auth` でログインしてください

### 「アクセス権限がありません」と表示される
- URL の求職者IDとログインした求職者IDが異なる
- 正しいURLにアクセスしているか確認してください

### 管理画面にログインできない
- 求職者認証とは別のシステムです
- 管理画面は `/auth/login` からアクセスしてください
- 管理者用のアカウント（メールアドレス＋パスワード）が必要です

## まとめ

この認証システムは：
- ✅ 管理画面と完全に独立
- ✅ 求職者は簡単にアクセス可能
- ✅ セキュリティは適度に確保
- ✅ Firebase Authの影響を受けない
- ✅ 24時間のセッション有効期限

必要に応じて、Cloud Functions を使ったより厳密な認証に移行可能です。
