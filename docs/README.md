# ドキュメント一覧

このディレクトリには、MATCHA（人材紹介プラットフォーム）の各種ドキュメントが格納されています。

## 📁 ディレクトリ構成

### `/api` - API仕様書
- **[DOMINO_API_SPEC.md](./api/DOMINO_API_SPEC.md)** - Domino システムとの連携API仕様

### `/deployment` - デプロイメント関連
- **[VERCEL_DEPLOYMENT.md](./deployment/VERCEL_DEPLOYMENT.md)** - Vercelへのデプロイ手順
- **[VERCEL_ENV_SETUP.md](./deployment/VERCEL_ENV_SETUP.md)** - Vercel環境変数の設定

### `/features` - 機能仕様
- **[DIAGNOSIS_MATCHING_SPEC.md](./features/DIAGNOSIS_MATCHING_SPEC.md)** - キャリア価値観診断とマッチング機能の仕様
- **[GOOGLE_CALENDAR_INTEGRATION.md](./features/GOOGLE_CALENDAR_INTEGRATION.md)** - Googleカレンダー連携機能
- **[EMAIL_FEATURE.md](./features/EMAIL_FEATURE.md)** - メール機能の仕様

### `/setup` - セットアップガイド
- **[DOMINO_ENV_SETUP.md](./setup/DOMINO_ENV_SETUP.md)** - Domino連携の環境設定
- **[CANDIDATE_AUTH_EMAIL_SETUP.md](./setup/CANDIDATE_AUTH_EMAIL_SETUP.md)** - 求職者認証メール設定
- **[GOOGLE_AUTH_SETUP.md](./setup/GOOGLE_AUTH_SETUP.md)** - Google認証の設定
- **[FIREBASE_DOMAIN_FIX.md](./setup/FIREBASE_DOMAIN_FIX.md)** - Firebaseドメイン設定の修正
- **[FIREBASE_URGENT_FIX.md](./setup/FIREBASE_URGENT_FIX.md)** - Firebase緊急修正手順

### `/architecture` - アーキテクチャ設計
- **[CANDIDATE_AUTH_DESIGN.md](./architecture/CANDIDATE_AUTH_DESIGN.md)** - 求職者認証システムの設計

## 📄 ルートドキュメント
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - プロジェクト実装計画

## 🔍 ドキュメントの探し方

### 機能について知りたい
→ `/features` を参照

### 環境構築・セットアップをしたい
→ `/setup` を参照

### デプロイ方法を知りたい
→ `/deployment` を参照

### API仕様を確認したい
→ `/api` を参照

### システム設計を理解したい
→ `/architecture` を参照

## 📝 ドキュメント追加時のルール

1. 適切なカテゴリのフォルダに配置
2. ファイル名は大文字のスネークケース（例: `NEW_FEATURE.md`）
3. このREADMEに追加したドキュメントへのリンクを記載
4. 各ドキュメントには作成日・更新日を記載推奨

## 🔄 最終更新日
2025年12月21日
