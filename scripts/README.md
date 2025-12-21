# スクリプト一覧

このディレクトリには、開発・運用で使用する各種スクリプトが格納されています。

## 📁 ディレクトリ構成

### `/testing` - テスト用スクリプト
開発・動作確認のためのテストスクリプト

- **test-match-data.js** - マッチングデータのテスト
- **create-test-matches.js** - テストマッチングの作成
- **browser-test-guide.js** - ブラウザテストガイド

**実行方法:**
```bash
node scripts/testing/test-match-data.js
```

---

### `/migration` - データマイグレーション
データベーススキーマの変更・データ修正スクリプト

- **migrate-store-prefecture.js** - 店舗の都道府県データマイグレーション
- **fix-interview-eventdate.js** - 面接イベント日時の修正
- **fix-timeline-timestamps.js** - タイムラインタイムスタンプの修正

**実行方法:**
```bash
node scripts/migration/migrate-store-prefecture.js
```

⚠️ **注意**: マイグレーションスクリプトは本番環境で実行前に必ずバックアップを取ってください。

---

### `/debug` - デバッグ・確認用
データの状態確認やデバッグ用のスクリプト

- **check-user.js** - ユーザーデータの確認
- **check-companies.js** - 企業データの確認
- **check-candidate-progress.js** - 求職者進捗の確認
- **check-company-assigned-users.js** - 企業担当者の確認
- **debug-user-status.js** - ユーザーステータスのデバッグ
- **debug-firebase-auth.sh** - Firebase認証のデバッグ

**実行方法:**
```bash
node scripts/debug/check-user.js
# または
bash scripts/debug/debug-firebase-auth.sh
```

---

### `/utility` - ユーティリティ
セットアップやデータクリーンアップなどの汎用スクリプト

- **clear-companies.js** - 企業データのクリーンアップ
- **setup-firebase.sh** - Firebaseの初期セットアップ

**実行方法:**
```bash
node scripts/utility/clear-companies.js
# または
bash scripts/utility/setup-firebase.sh
```

---

## 🚀 スクリプトの使い方

### 基本的な実行方法

```bash
# Node.jsスクリプト
node scripts/[category]/[script-name].js

# シェルスクリプト
bash scripts/[category]/[script-name].sh
```

### 環境変数の設定

多くのスクリプトはFirebaseの環境変数が必要です：

```bash
# .env.local に以下を設定
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... 他のFirebase設定
```

---

## 📝 新規スクリプト追加時のルール

1. **適切なカテゴリに配置**
   - テスト → `/testing`
   - データ移行 → `/migration`
   - デバッグ → `/debug`
   - その他 → `/utility`

2. **ファイル命名規則**
   - ケバブケース（例: `check-user-data.js`）
   - 目的が明確な名前をつける

3. **コメントの追加**
   - スクリプトの先頭に目的と使用方法を記載
   - 例:
   ```javascript
   /**
    * ユーザーデータ確認スクリプト
    * 
    * 使用方法:
    *   node scripts/debug/check-user.js [userId]
    * 
    * 説明:
    *   指定したユーザーIDのデータを確認します
    */
   ```

4. **このREADMEに追記**
   - スクリプトを追加したら、該当カテゴリに説明を追加

---

## ⚠️ 注意事項

- **本番環境での実行**: 特にmigration/utilityスクリプトは本番環境で実行前に必ず内容を確認
- **バックアップ**: データ変更を伴うスクリプトは事前にバックアップを取る
- **テスト実行**: 本番実行前に開発環境でテストする
- **ログ確認**: 実行後はログを確認してエラーがないことを確認

---

## 🔄 最終更新日
2025年12月21日
