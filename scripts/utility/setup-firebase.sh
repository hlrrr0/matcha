#!/bin/bash

# Firebase Setup Script for Agent System
echo "🔥 Firebase Setup for Agent System"
echo "=================================="

echo ""
echo "📋 Firebase プロジェクト設定チェックリスト:"
echo ""
echo "□ 1. Firebase Console でプロジェクト作成完了"
echo "   https://console.firebase.google.com/"
echo ""
echo "□ 2. Webアプリの追加完了"
echo "   - プロジェクト概要 > ウェブアプリを追加"
echo ""
echo "□ 3. Firestore Database 有効化完了"
echo "   - Firestore Database > データベースを作成"
echo "   - ロケーション: asia-northeast1 (東京) 推奨"
echo ""
echo "□ 4. セキュリティルールの設定"
echo "   - テスト環境: テストモードで開始"
echo "   - 本番環境: 適切なセキュリティルール設定"
echo ""
echo "□ 5. 環境変数の設定完了"
echo "   - .env.local ファイルに実際のFirebase設定値を入力"
echo ""

echo "🔧 設定値の取得方法:"
echo "1. Firebase Console > プロジェクト設定（歯車アイコン）"
echo "2. 全般タブ > Firebase SDK snippet > 構成"
echo "3. 表示された設定値を .env.local にコピー"
echo ""

echo "📁 必要なFirestoreコレクション:"
echo "- companies (企業データ)"
echo "- stores (店舗データ)"
echo "- candidates (求職者データ)"
echo "- jobs (求人データ) - 今後実装予定"
echo "- applications (応募データ) - 今後実装予定"
echo ""

echo "🚀 セットアップ完了後:"
echo "npm run dev でアプリケーションを起動"
echo "ブラウザで http://localhost:3000 にアクセス"
echo ""

# 環境変数チェック
echo "🔍 現在の環境変数チェック:"
if [[ -f .env.local ]]; then
    echo "✅ .env.local ファイル存在"
    
    if grep -q "your_actual_" .env.local; then
        echo "⚠️  まだダミーの設定値が含まれています"
        echo "   Firebase Console から実際の値を取得して更新してください"
    else
        echo "✅ 設定値が更新されているようです"
    fi
else
    echo "❌ .env.local ファイルが見つかりません"
fi

echo ""
echo "📖 詳細なドキュメント:"
echo "https://firebase.google.com/docs/web/setup"