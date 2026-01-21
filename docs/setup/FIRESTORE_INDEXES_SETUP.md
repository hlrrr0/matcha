# Firestore インデックス設定ガイド

## 📋 必要なインデックス

クォータ使用量を削減し、クエリのパフォーマンスを向上させるために、以下のインデックスを設定します。

## 🔧 Firebase Console での設定方法

### 方法1: firestore.indexes.json から一括デプロイ（推奨）

1. **Firebase CLI でログイン**
   ```bash
   firebase login --reauth
   ```

2. **インデックスをデプロイ**
   ```bash
   firebase deploy --only firestore:indexes --project agent-system-23630
   ```

3. **デプロイ完了を待つ**
   - インデックスの作成には数分かかります
   - Firebase Console で進捗を確認できます

### 方法2: Firebase Console から手動で作成

#### インデックス1: dominoId（単一フィールド）

1. [Firebase Console](https://console.firebase.google.com/project/agent-system-23630/firestore/indexes) にアクセス
2. **Indexes** タブを開く
3. **Create Index** をクリック
4. 以下を入力：
   - **Collection ID**: `companies`
   - **Fields**: 
     - Field: `dominoId`
     - Mode: `Ascending`
   - **Query scope**: `Collection`
5. **Create** をクリック

#### インデックス2: name（単一フィールド）

1. **Create Index** をクリック
2. 以下を入力：
   - **Collection ID**: `companies`
   - **Fields**: 
     - Field: `name`
     - Mode: `Ascending`
   - **Query scope**: `Collection`
3. **Create** をクリック

#### インデックス3: status + createdAt（複合インデックス）

1. **Create Index** をクリック
2. 以下を入力：
   - **Collection ID**: `companies`
   - **Fields**: 
     - Field: `status`, Mode: `Ascending`
     - **Add field** をクリック
     - Field: `createdAt`, Mode: `Descending`
   - **Query scope**: `Collection`
3. **Create** をクリック

### 方法3: エラーメッセージから自動作成

クエリ実行時にインデックスが必要な場合、Firestoreが自動的にインデックス作成リンクを提供します。

1. **エラーメッセージを確認**
   ```
   The query requires an index. You can create it here: 
   https://console.firebase.google.com/project/agent-system-23630/firestore/indexes?create_composite=...
   ```

2. **リンクをクリック**
   - 自動的に必要なインデックス設定が入力されます

3. **Create Index** をクリック

## 📊 設定済みインデックス一覧

現在の `firestore.indexes.json` には以下が定義されています：

### 1. dominoId インデックス
```json
{
  "collectionGroup": "companies",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "dominoId",
      "order": "ASCENDING"
    }
  ]
}
```

**用途**: Domino IDでの企業検索を高速化
```typescript
db.collection('companies').where('dominoId', '==', dominoId).get()
```

### 2. name インデックス
```json
{
  "collectionGroup": "companies",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "name",
      "order": "ASCENDING"
    }
  ]
}
```

**用途**: 企業名での検索を高速化
```typescript
db.collection('companies').where('name', '==', name).get()
```

### 3. status + createdAt 複合インデックス
```json
{
  "collectionGroup": "companies",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

**用途**: ステータスでフィルタリングして作成日時で並び替え
```typescript
db.collection('companies')
  .where('status', '==', 'active')
  .orderBy('createdAt', 'desc')
  .get()
```

## 🔍 インデックス作成状況の確認

### Firebase Console で確認

1. [Firestore Indexes](https://console.firebase.google.com/project/agent-system-23630/firestore/indexes) を開く
2. **Status** 列を確認：
   - ✅ **Enabled**: 作成完了、使用可能
   - ⏳ **Building**: 作成中（数分かかる場合があります）
   - ❌ **Error**: エラー発生

### CLI で確認

```bash
firebase firestore:indexes --project agent-system-23630
```

## ⚡ インデックスの効果

### Before（インデックスなし）
- クエリ時間: 500ms～数秒
- 読み取り回数: 多数（全ドキュメントスキャン）
- クォータ消費: 高い

### After（インデックスあり）
- クエリ時間: 50ms～200ms（約10倍高速）
- 読み取り回数: 最小限（インデックスで直接アクセス）
- クォータ消費: 低い

## 📈 追加で推奨されるインデックス

今後の機能拡張に備えて、以下のインデックスも検討してください：

### 求職者（candidates）コレクション

```json
{
  "collectionGroup": "candidates",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

### 求人（jobs）コレクション

```json
{
  "collectionGroup": "jobs",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "companyId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    }
  ]
}
```

### マッチング（matches）コレクション

```json
{
  "collectionGroup": "matches",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "candidateId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

## 🚨 注意事項

### インデックス作成の制限

- **最大インデックス数**: 200個/プロジェクト
- **複合インデックスのフィールド数**: 最大100個
- **インデックスエントリサイズ**: 最大1.5MB

### インデックス作成時間

- **小規模コレクション**（< 1,000ドキュメント）: 数分
- **中規模コレクション**（1,000～100,000）: 数分～数十分
- **大規模コレクション**（> 100,000）: 数時間

### コスト

- **インデックスストレージ**: 通常のドキュメントストレージとしてカウント
- **インデックス書き込み**: ドキュメント書き込み時に自動的にインデックスも更新（追加の書き込みカウントなし）

## ✅ チェックリスト

- [ ] Firebase CLI でログイン
- [ ] `firestore.indexes.json` を確認
- [ ] インデックスをデプロイ
- [ ] Firebase Console でステータス確認
- [ ] すべてのインデックスが **Enabled** になるまで待つ
- [ ] APIの動作確認
- [ ] クォータ使用量の減少を確認

## 🔗 関連リソース

- [Firestore Index Best Practices](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Index Limits](https://firebase.google.com/docs/firestore/quotas#indexes)
- [Query Optimization](https://firebase.google.com/docs/firestore/best-practices#queries)

---

**最終更新**: 2026年1月21日
