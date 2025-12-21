#!/bin/bash

# Firebase認証ドメイン確認スクリプト

echo "=== Firebase Authentication Debug ==="
echo ""

echo "現在のVercelドメイン:"
vercel ls | head -3

echo ""
echo "Vercel環境変数:"
vercel env ls

echo ""
echo "Firebase Console直接リンク:"
echo "https://console.firebase.google.com/project/agent-system-23630/authentication/settings"

echo ""
echo "確認すべき項目:"
echo "1. Authorized domainsに以下が含まれているか:"
echo "   - agent-system-ten.vercel.app"
echo "   - agent-system-hlrrr0s-projects.vercel.app"
echo "   - localhost (開発用)"
echo ""
echo "2. Sign-in methodでGoogleが有効になっているか"
echo "3. OAuth redirect URIの設定が正しいか"

echo ""
echo "問題が続く場合は以下を試してください:"
echo "1. Firebase Consoleでドメインを再追加"
echo "2. ブラウザキャッシュをクリア"
echo "3. 15分程度待ってから再試行"