# Firestore クォータ超過エラー対応ガイド

## 🔴 発生しているエラー

```
Error: 8 RESOURCE_EXHAUSTED: Quota exceeded.
```

## 📋 エラーの原因

Firestoreの読み取り/書き込みクォータ（1日あたりの制限）を超過しています。

### Firebase無料プラン（Spark Plan）の制限

- **読み取り**: 50,000回/日
- **書き込み**: 20,000回/日
- **削除**: 20,000回/日
- **ストレージ**: 1GB
- **ネットワーク下り**: 10GB/月

## 🔍 現在の使用状況を確認

### 1. Firebase Console でクォータ確認

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクト `agent-system-23630` を選択
3. **Firestore Database** を開く
4. **Usage** タブをクリック
5. 本日の読み取り/書き込み数を確認

### 2. クォータリセット時刻

- クォータは **UTCの0時（日本時間 午前9時）** にリセットされます
- 現在のクォータ使用状況と、リセットまでの残り時間を確認

## 🛠️ 対応方法

### 方法1: 課金プランにアップグレード（推奨・即座に解決）

**Blaze Plan（従量課金プラン）** にアップグレードすることで、制限を大幅に拡大できます。

#### 料金

- **無料枠**: 読み取り 50,000回/日、書き込み 20,000回/日
- **追加料金**: 
  - 読み取り: $0.06 / 100,000回
  - 書き込み: $0.18 / 100,000回
  - 削除: $0.02 / 100,000回

#### アップグレード手順

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクト `agent-system-23630` を選択
3. 左下の **Upgrade** ボタンをクリック
4. **Blaze Plan** を選択
5. クレジットカード情報を登録
6. **購入** をクリック

**💡 ポイント**: 
- 無料枠は残ります（50,000回/日までは無料）
- 超過分のみ課金されます
- 予算アラートを設定できます

#### 予算アラートの設定

1. Firebase Console → **プロジェクト設定** → **使用状況と請求**
2. **予算アラートを設定** をクリック
3. 月額予算を設定（例: $10）
4. アラートのしきい値を設定（例: 50%, 90%, 100%）
5. 通知先メールアドレスを設定

### 方法2: クォータリセットを待つ（一時的な対応）

**日本時間 午前9時（UTC 0時）** まで待つと、クォータがリセットされます。

#### この間の対応

1. **APIアクセスを一時停止**
   - Dominoシステムからのデータ取得を停止
   - ユーザーアクセスを制限

2. **メンテナンスページを表示**
   - ユーザーに状況を説明

### 方法3: クエリを最適化（長期的な対応）

クォータ使用量を削減するための最適化を実施します。

#### 3-1. インデックスの作成

Firestoreのクエリに必要なインデックスを作成することで、読み取り回数を削減できます。

```bash
# firestore.indexes.json を確認
cat firestore.indexes.json
```

現在のインデックス設定を確認し、不足しているインデックスを追加します。

#### 3-2. キャッシュの実装

頻繁にアクセスされるデータをキャッシュすることで、Firestoreへのアクセスを削減します。

**実装例**:

```typescript
// lib/cache.ts
const cache = new Map<string, { data: any; expiresAt: number }>()

export function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T
  }
  return null
}

export function setCache<T>(key: string, data: T, ttlMinutes: number = 5) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMinutes * 60 * 1000
  })
}
```

#### 3-3. バッチ処理の最適化

複数のドキュメントを一度に処理する場合、バッチ処理を使用します。

```typescript
// 非効率（複数回の読み取り）
for (const id of ids) {
  const doc = await db.collection('companies').doc(id).get()
  // 処理
}

// 効率的（1回の読み取り）
const snapshot = await db.collection('companies')
  .where(FieldPath.documentId(), 'in', ids)
  .get()
```

#### 3-4. 不要なクエリの削除

- 重複チェックのクエリを最適化
- limit() を適切に使用
- 必要なフィールドのみを取得（select()）

## 🚨 緊急対応（今すぐ実施）

### ステップ1: 使用状況の確認

```bash
# Firebase Console で確認
open https://console.firebase.google.com/project/agent-system-23630/firestore/usage
```

### ステップ2: Blaze Plan にアップグレード

**推奨**: 本番環境で継続的に使用する場合、Blaze Planへのアップグレードが必要です。

1. Firebase Console → Upgrade → Blaze Plan
2. 予算アラートを $10/月 に設定
3. アップグレード完了後、数分待つ

### ステップ3: API動作確認

```bash
# アップグレード後、APIをテスト
node diagnose-api-error.js https://agent-system-ten.vercel.app
```

成功すると:
```
✅ APIリクエスト成功!
作成された企業ID: xxxxx
```

## 📈 クォータ監視の設定

### Firebase Console でアラート設定

1. **Cloud Console** にアクセス
   ```bash
   open https://console.cloud.google.com/firestore/quotas?project=agent-system-23630
   ```

2. **クォータ** タブを開く

3. **アラートポリシー** を作成
   - 読み取り: 40,000回/日（80%）で警告
   - 書き込み: 16,000回/日（80%）で警告

### メール通知の設定

クォータが80%に達したら通知を受け取るように設定します。

## 🔍 クォータ使用量の削減施策

### 即座に実施可能な対策

1. **重複チェックの最適化**
   - Domino IDでインデックスを作成
   - 複合インデックスを使用

2. **キャッシュの実装**
   - 企業データを5分間キャッシュ
   - ユーザー情報を5分間キャッシュ（既に実装済み）

3. **クエリのlimit追加**
   - すべてのクエリに適切なlimitを設定
   - ページネーションの実装

### 長期的な対策

1. **Firestore のセキュリティルールの最適化**
   - 不要な読み取りを防ぐ
   - クライアントサイドのクエリを制限

2. **Cloud Functions の活用**
   - バッチ処理をCloud Functionsで実行
   - スケジューリングによる自動実行

3. **データ構造の最適化**
   - 非正規化によるクエリ削減
   - サブコレクションの活用

## 📚 関連ドキュメント

- [Firebase Pricing](https://firebase.google.com/pricing)
- [Firestore Quotas and Limits](https://cloud.google.com/firestore/quotas)
- [Best Practices for Firestore](https://firebase.google.com/docs/firestore/best-practices)

## ✅ チェックリスト

- [ ] Firebase Console で使用状況を確認
- [ ] Blaze Plan にアップグレード
- [ ] 予算アラートを設定（$10/月）
- [ ] クォータアラートを設定（80%）
- [ ] APIの動作確認
- [ ] インデックスの最適化
- [ ] キャッシュの実装
- [ ] クエリの最適化

## 💰 コスト試算

### 現在の使用状況から試算

仮に1日に以下のアクセスがあると仮定：
- 読み取り: 100,000回/日
- 書き込み: 5,000回/日

**月額コスト**:
```
読み取り超過分: (100,000 - 50,000) × 30日 = 1,500,000回
コスト: 1,500,000 / 100,000 × $0.06 = $0.90

書き込み超過分: なし（無料枠内）

合計: 約 $0.90/月 (約 140円/月)
```

**💡 ポイント**: 無料枠を少し超える程度の使用であれば、月額数百円程度で収まります。

---

**最終更新**: 2026年1月21日
**優先度**: 🔴 緊急
