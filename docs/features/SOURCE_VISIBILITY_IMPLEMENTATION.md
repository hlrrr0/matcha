# 求職者・求人の出自管理・公開範囲制御機能 実装完了

## 📋 実装概要

飲食人大学の在校生・卒業生に加えて、中途人材の紹介も行えるよう、データベースを統一したまま論理的に区別できる機能を実装しました。

## ✅ 実装完了項目

### 1. 型定義の拡張

#### Candidate型 ([src/types/candidate.ts](../src/types/candidate.ts))
```typescript
export interface Candidate {
  // 新規追加
  sourceType: 'inshokujin_univ' | 'mid_career' | 'referral' | 'overseas'
  sourceDetail?: string  // 学校名・紹介元など
  
  // 既存フィールド...
}

export const sourceTypeLabels = {
  inshokujin_univ: '飲食人大学',
  mid_career: '中途人材',
  referral: '紹介・リファラル',
  overseas: '海外人材'
}
```

#### Job型 ([src/types/job.ts](../src/types/job.ts))
```typescript
export interface Job {
  // 新規追加
  visibilityType: 'all' | 'school_only' | 'specific_sources'
  allowedSources?: string[]  // specific_sourcesの場合に使用
  
  // 既存フィールド...
}

export const visibilityTypeLabels = {
  'all': '全体公開',
  'school_only': '学校限定',
  'specific_sources': '指定ソース'
}
```

### 2. サービス層の追加

新規ファイル: [src/lib/services/visibility.ts](../src/lib/services/visibility.ts)

公開範囲制御のロジックを提供:
- `canCandidateViewJob(candidate, job)`: 求職者が求人を閲覧可能か判定
- `filterJobsForCandidate(jobs, candidate)`: 求職者向けに求人リストをフィルタリング
- `getVisibilityLabel(job)`: 公開範囲の表示用ラベル取得
- `getCandidateSourceLabel(candidate)`: 求職者の出自表示用ラベル取得

### 3. Firestore変換関数の更新

既存データとの互換性を保つため、デフォルト値を設定:
- 候補者: `sourceType = 'inshokujin_univ'` (既存データは飲食人大学として扱う)
- 求人: `visibilityType = 'all'` (既存データは全体公開として扱う)

### 4. 管理画面の更新

#### 求職者管理
- **一覧画面** ([src/app/candidates/page.tsx](../src/app/candidates/page.tsx))
  - 求職者区分フィルタを追加
  - テーブルに「求職者区分」列を追加
  - sourceDetailの表示

- **編集/新規作成画面** ([src/components/candidates/CandidateForm.tsx](../src/components/candidates/CandidateForm.tsx))
  - 求職者区分選択フィールド
  - 詳細（学校名・紹介元など）入力フィールド

#### 求人管理
- **一覧画面** ([src/app/jobs/page.tsx](../src/app/jobs/page.tsx))
  - テーブルに「公開範囲」列を追加
  - 公開範囲のバッジ表示

- **編集/新規作成画面** ([src/components/jobs/JobForm.tsx](../src/components/jobs/JobForm.tsx))
  - 公開範囲選択フィールド（全体公開/学校限定/指定ソース）
  - 指定ソース選択時のチェックボックス表示

### 5. マイグレーションスクリプト

[scripts/migration/add-source-visibility-fields.js](../scripts/migration/add-source-visibility-fields.js)

既存データに新しいフィールドのデフォルト値を設定します。

## 🚀 次のステップ

### 1. マイグレーションの実行

```bash
# マイグレーションスクリプトを実行
node scripts/migration/add-source-visibility-fields.js
```

実行内容:
- 既存の全候補者に `sourceType: 'inshokujin_univ'` を設定
- 既存の全求人に `visibilityType: 'all'` を設定

### 2. 動作確認

#### 候補者管理の確認
1. `/candidates` にアクセス
2. 求職者区分フィルタで絞り込みが動作するか確認
3. 新規候補者を作成し、sourceTypeとsourceDetailが保存されるか確認
4. 既存候補者を編集し、sourceTypeが「飲食人大学」になっているか確認

#### 求人管理の確認
1. `/jobs` にアクセス
2. 公開範囲列が表示されているか確認
3. 新規求人を作成し、公開範囲設定が動作するか確認
4. 公開範囲を「学校限定」「指定ソース」に設定してテスト

### 3. 公開API（求職者向け）への適用（オプション）

求職者が閲覧する公開ページで公開範囲制御を適用する場合:

```typescript
// src/app/public/jobs/[id]/page.tsx など
import { canCandidateViewJob } from '@/lib/services/visibility'

// 求職者認証から取得したcandidate情報を使用
if (!canCandidateViewJob(candidate, job)) {
  return <div>この求人は閲覧できません</div>
}
```

## 📊 データ構造の例

### 飲食人大学の求職者
```json
{
  "sourceType": "inshokujin_univ",
  "sourceDetail": "東京校 2024年入学",
  "status": "active",
  "lastName": "山田",
  "firstName": "太郎"
}
```

### 中途人材の求職者
```json
{
  "sourceType": "mid_career",
  "sourceDetail": "人材紹介会社A経由",
  "status": "active",
  "lastName": "佐藤",
  "firstName": "花子"
}
```

### 学校限定の求人
```json
{
  "visibilityType": "school_only",
  "allowedSources": null,
  "title": "和食料理人（学校限定）",
  "status": "active"
}
```

### 指定ソースの求人
```json
{
  "visibilityType": "specific_sources",
  "allowedSources": ["mid_career", "referral"],
  "title": "ソムリエ（経験者限定）",
  "status": "active"
}
```

## 🎯 設計の利点

### ✅ DBは統一
- 単一の `candidates` / `jobs` コレクション
- 既存のクエリやインデックスはそのまま使用可能

### ✅ 論理的に区別
- `sourceType` で求職者の出自を管理
- `visibilityType` で求人の公開範囲を制御

### ✅ 拡張性
- 新しいsourceType（例: 海外人材、他スクール）の追加が容易
- 新しいvisibilityTypeの追加も可能

### ✅ 既存データとの互換性
- デフォルト値により既存データも正常に動作
- 段階的な移行が可能

## ⚠️ 注意事項

1. **Firestoreのセキュリティルール**
   - 現在のルールではアプリケーション層で制御を実施
   - より厳密な制御が必要な場合はルールの更新を検討

2. **CSV一括登録**
   - CSV登録機能を使用する場合は、sourceTypeカラムを追加する必要があります

3. **既存のマッチング**
   - 既存のマッチングデータには影響しません
   - 新規マッチング作成時から公開範囲制御が適用されます

## 📝 運用ルール

1. **飲食人大学生**: 必ず `sourceType = 'inshokujin_univ'`
2. **中途採用**: `sourceType = 'mid_career'`
3. **卒業後も**: sourceTypeは変更しない（出自として保持）
4. **学校限定求人**: `visibilityType = 'school_only'`
5. **全体公開求人**: `visibilityType = 'all'` （デフォルト）

## 🔄 今後の拡張案

- 求職者のマイページで表示される求人を自動フィルタリング
- 求人検索APIでの公開範囲制御
- 統計レポートでの区分別集計
- Slack通知での区分表示
- メール通知での区分ごとのテンプレート

---

実装者: GitHub Copilot  
実装日: 2026年2月10日
