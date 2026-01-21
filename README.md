# MATCHA - 人材紹介システム



**MATCHA**は、人材紹介会社向けの包括的な管理システムです。Dominoシステムとの連携により、企業データの自動取得・管理、求職者管理、マッチング機能を提供します。効率的な人材紹介業務を支援するNext.js製Webアプリケーションです。Dominoシステムとの連携により、企業データの自動取得と高精度なマッチングを実現します。



## 🏢 企業管理システム（完了済み）## 🚀 主な機能



### 主な機能### 📊 ダッシュボード

- **企業一覧・検索**: 登録企業の一覧表示、検索・フィルタリング機能- 求職者・企業・求人・成約数の統計表示

- **企業詳細管理**: 企業情報の詳細表示・編集・削除- 最近のマッチング活動の確認

- **新規企業追加**: フォームを使った新規企業の登録- システム全体の状況把握

- **Domino連携**: 外部システムからの企業データインポート

- **統計ダッシュボード**: 企業ステータス別の統計表示### 👥 求職者管理

- 求職者プロフィールの詳細管理

### 技術スタック- 職歴・学歴・スキル・資格の記録

- **フロントエンド**: Next.js 14, TypeScript, Tailwind CSS- 希望条件の設定と管理

- **UIコンポーネント**: shadcn/ui

- **データベース**: Firebase Firestore### 🏢 企業・求人管理

- **認証**: Firebase Authentication- Dominoシステムからの企業データ自動取得

- **外部API**: Domino システム連携- 求人情報の一元管理

- 企業とのコミュニケーション履歴

## 📁 プロジェクト構造

### 🎯 AIマッチング

```- 高度なアルゴリズムによる候補者と求人のマッチング

src/- マッチング理由の詳細表示

├── app/                     # Next.js App Router- マッチング進捗の追跡

│   ├── companies/          # 企業管理

│   │   ├── page.tsx        # 企業一覧## � Domino システム連携

### 設定手順

1. **環境変数の設定**
   
   `.env.local` ファイルにDomino API の接続情報を追加：
   
   ```bash
   # Domino System Integration
   NEXT_PUBLIC_DOMINO_API_URL=https://your-domino-system.com
   NEXT_PUBLIC_DOMINO_API_KEY=your_api_key_here
   ```

2. **接続テスト**
   
   管理者権限でログイン後、`/domino/import` にアクセスし「接続テスト」を実行

3. **データインポート**
   
   設定を調整して「Dominoから取得」ボタンでデータをインポート

### 利用可能な機能

- **企業データ自動取得**: Dominoシステムから企業情報を取得
- **増分同期**: 指定日時以降の更新データのみを取得
- **重複チェック**: Domino IDによる既存企業の自動更新
- **詳細設定**: ステータス・関連データ・件数制限の設定

### API エンドポイント

```typescript
// 企業データ取得
GET /api/external/companies?status=active&limit=100

// 増分同期
GET /api/external/sync?since=2024-01-01T00:00:00Z&type=companies

// 接続確認
GET /api/external/health
```

## �🛠️ 技術スタック

│   │   ├── new/            # 新規企業追加

│   │   └── [id]/           # 企業詳細・編集- **Frontend**: Next.js 14, TypeScript, Tailwind CSS

│   ├── domino/             # Domino連携- **UI Components**: shadcn/ui

│   │   └── import/         # データインポート- **Database**: Firebase Firestore

│   └── layout.tsx          # レイアウト- **Authentication**: Firebase Auth

├── components/             # UIコンポーネント- **External API**: Domino システム連携

│   └── ui/                 # shadcn/ui コンポーネント

├── lib/                    # ユーティリティ## 📋 セットアップ

│   ├── firebase.ts         # Firebase設定

│   ├── domino-client.ts    # Domino API クライアント### 前提条件

│   └── firestore/          # Firestore操作- Node.js 18.0 以降

└── types/                  # TypeScript型定義- npm または yarn

    ├── company.ts          # 企業関連型- Firebase プロジェクト

    ├── candidate.ts        # 求職者関連型

    ├── matching.ts         # マッチング関連型### インストール

    └── user.ts             # ユーザー関連型

```1. 依存関係のインストール

```bash

## 🚀 セットアップ手順npm install

```

### 1. 依存関係のインストール

```bash2. 環境変数の設定

npm install`.env.local` ファイルを作成し、Firebase設定とDomino API連携情報を設定

```

3. 開発サーバーの起動

### 2. 環境変数の設定```bash

`.env.local`ファイルを作成し、以下の設定を追加：npm run dev

```

```bash

# Firebase Configurationアプリケーションは [http://localhost:3000](http://localhost:3000) で利用できます。

NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here

NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com## 🚀 デプロイ

NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com```bash

NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789npm run build

NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456```



# Domino API Configuration## Deploy on Vercel

DOMINO_API_URL=https://api.domino.example.com

DOMINO_API_KEY=your_domino_api_key_hereThe easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

```

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### 3. 開発サーバーの起動
```bash
npm run dev
```

アプリケーションが `http://localhost:3000` で利用可能になります。

### 4. ビルド
```bash
npm run build
```

## 📊 企業管理機能

### 企業一覧 (`/companies`)
- 企業の一覧表示
- ステータス・規模による絞り込み
- 企業名・メールアドレスでの検索
- 統計ダッシュボード（総数、アクティブ、見込み客、アポ数）
- Dominoからの簡易データ取得

### 企業詳細 (`/companies/[id]`)
- 企業情報の詳細表示
- 連絡先情報の表示
- 企業ステータスの表示
- 編集・削除のクイックアクション

### 企業追加・編集 (`/companies/new`, `/companies/[id]/edit`)
- 包括的な企業情報フォーム
- バリデーション機能
- 業態の複数選択対応
- ステータス管理

### Dominoインポート (`/domino/import`)
- Dominoシステムからの詳細データ取得
- インポート前のデータ確認・選択
- 既存企業の重複チェック
- 一括インポート機能

## 🗄️ データベース設計

### Company Collection
```typescript
interface Company {
  id: string
  name: string                    // 企業名
  industry?: string              // 業界
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  phone: string                  // 電話番号
  email: string                  // メールアドレス
  website: string                // ウェブサイト
  address: string                // 住所
  description: string            // 説明
  status: 'active' | 'inactive' | 'prospect' | 'prospect_contacted' | 'appointment' | 'no_approach'
  businessType?: string[]        // 業態
  dominoId?: string             // Domino連携ID
  createdAt: Date               // 作成日時
  updatedAt: Date               // 更新日時
}
```

## 🔗 API連携

### Domino システム
- 企業データの自動取得
- データ同期機能
- API認証対応

## 🎨 UI/UX特徴

- **レスポンシブデザイン**: モバイル・タブレット・デスクトップ対応
- **モダンUI**: shadcn/ui による統一感のあるデザイン
- **直感的操作**: ユーザーフレンドリーなインターフェース
- **リアルタイム更新**: Firebase による即座のデータ反映

## 📈 今後の開発予定

### 求職者管理システム
- 求職者情報の登録・管理
- スキル・経験の詳細管理
- 求職者検索・フィルタリング

### マッチングシステム
- 企業と求職者の自動マッチング
- マッチング精度の向上
- マッチング履歴の管理

### 分析・レポート機能
- 成約率の分析
- 業界別統計
- パフォーマンスダッシュボード

### コミュニケーション機能
- 企業・求職者との連絡履歴
- 面接スケジュール管理
- 通知システム

## 🛠️ 開発・貢献

プロジェクトへの貢献を歓迎します。

### 開発環境
- Node.js 18.0.0以上
- npm 9.0.0以上
- TypeScript 5.0以上

### コードスタイル
- ESLint設定に従ってください
- Prettier でコードフォーマットを統一
- TypeScript の型安全性を維持

## 📚 ドキュメント

詳細なドキュメントは [`/docs`](./docs) ディレクトリにあります。

- **[API仕様](./docs/api)** - Domino連携APIなどの仕様書
- **[デプロイメント](./docs/deployment)** - Vercelへのデプロイ手順
- **[機能仕様](./docs/features)** - 各機能の詳細仕様
- **[セットアップガイド](./docs/setup)** - 環境構築手順
- **[アーキテクチャ](./docs/architecture)** - システム設計ドキュメント
- **[トラブルシューティング](./docs/fixes)** - エラー対応ガイド

詳しくは [docs/README.md](./docs/README.md) をご覧ください。

### トラブルシューティング

API連携でエラーが発生した場合は、以下のドキュメントを参照してください：

- **[API エラー対応ガイド](./docs/fixes/API_ERROR_TROUBLESHOOTING.md)** - 500エラー等の対処方法

診断スクリプトでエラーを確認：
```bash
# 本番環境のAPI診断
node diagnose-api-error.js https://agent-system-ten.vercel.app

# ローカル環境のAPI診断
node diagnose-api-error.js http://localhost:3000
```

## 🔧 スクリプト

開発・運用で使用するスクリプトは [`/scripts`](./scripts) ディレクトリにあります。

- **[テスト](./scripts/testing)** - テスト用スクリプト
- **[マイグレーション](./scripts/migration)** - データ移行スクリプト
- **[デバッグ](./scripts/debug)** - 確認・デバッグ用スクリプト
- **[ユーティリティ](./scripts/utility)** - 汎用スクリプト

詳しくは [scripts/README.md](./scripts/README.md) をご覧ください。

---

**MATCHA** - 効率的な人材紹介業務をサポートする現代的なシステム