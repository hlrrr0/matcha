/**
 * API エラー診断スクリプト
 * /api/companies エンドポイントのエラーを診断
 * 
 * 実行方法:
 * node diagnose-api-error.js <BASE_URL> [--skip-duplicate-check]
 * 
 * 例:
 * node diagnose-api-error.js https://agent-system-ten.vercel.app
 * node diagnose-api-error.js https://agent-system-ten.vercel.app --skip-duplicate-check
 * node diagnose-api-error.js http://localhost:3000
 * 
 * オプション:
 * --skip-duplicate-check: 重複チェックをスキップ（クォータ節約）
 */

// デフォルト認証情報（Domino連携用）
const DEFAULT_AUTH = {
  API_KEY: 'hr-system-api-key-2024',
  AUTH_TOKEN: 'hr-system-auth-token-2024'
}

// テスト用の企業データ
const TEST_COMPANY = {
  id: `test-${Date.now()}`, // ユニークなID
  name: '診断テスト株式会社',
  address: '東京都渋谷区テスト1-2-3',
  phone: '03-1234-5678',
  email: 'test@example.com',
  website: 'https://test-example.com',
  description: 'これはAPI診断用のテストデータです',
  businessType: ['小売業', 'サービス業'],
  industry: 'IT',
  size: 'medium',
  status: 'active'
}

async function diagnoseAPI(baseUrl, skipDuplicateCheck = false) {
  console.log('🔍 API エラー診断開始')
  console.log('='.repeat(60))
  console.log(`対象URL: ${baseUrl}/api/companies`)
  if (skipDuplicateCheck) {
    console.log('⚡ 重複チェックスキップモード（クォータ節約）')
  }
  console.log('='.repeat(60))
  console.log('')

  // 1. 認証情報の確認
  console.log('📋 ステップ1: 認証情報の確認')
  console.log(`- API Key: ${DEFAULT_AUTH.API_KEY}`)
  console.log(`- Auth Token: ${DEFAULT_AUTH.AUTH_TOKEN.substring(0, 10)}...`)
  console.log('')

  // 2. リクエストヘッダーの確認
  console.log('📋 ステップ2: リクエストヘッダー')
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': DEFAULT_AUTH.API_KEY,
    'Authorization': `Bearer ${DEFAULT_AUTH.AUTH_TOKEN}`
  }
  
  if (skipDuplicateCheck) {
    headers['X-Skip-Duplicate-Check'] = 'true'
  }
  
  console.log(JSON.stringify(headers, null, 2))
  console.log('')

  // 3. リクエストボディの確認
  console.log('📋 ステップ3: リクエストボディ')
  console.log(JSON.stringify(TEST_COMPANY, null, 2))
  console.log('')

  // 4. APIリクエストの実行
  console.log('📋 ステップ4: APIリクエスト実行')
  try {
    console.log('⏳ リクエスト送信中...')
    
    const response = await fetch(`${baseUrl}/api/companies`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(TEST_COMPANY)
    })

    console.log(`📊 HTTPステータス: ${response.status} ${response.statusText}`)
    console.log('')

    // 5. レスポンスヘッダーの確認
    console.log('📋 ステップ5: レスポンスヘッダー')
    const responseHeaders = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })
    console.log(JSON.stringify(responseHeaders, null, 2))
    console.log('')

    // 6. レスポンスボディの確認
    console.log('📋 ステップ6: レスポンスボディ')
    const responseText = await response.text()
    console.log('Raw response:')
    console.log(responseText)
    console.log('')

    try {
      const data = JSON.parse(responseText)
      console.log('Parsed JSON:')
      console.log(JSON.stringify(data, null, 2))
      console.log('')

      // 7. 結果の分析
      console.log('📋 ステップ7: 結果分析')
      console.log('='.repeat(60))
      
      if (response.ok && data.success) {
        console.log('✅ APIリクエスト成功!')
        console.log(`作成された企業ID: ${data.id}`)
      } else {
        console.log('❌ APIリクエスト失敗')
        console.log(`エラーコード: ${data.error}`)
        console.log(`エラーメッセージ: ${data.message}`)
        
        if (data.details) {
          console.log('エラー詳細:')
          console.log(JSON.stringify(data.details, null, 2))
        }

        // エラーの種類に応じた診断
        console.log('')
        console.log('🔍 推奨対応策:')
        
        if (response.status === 401) {
          console.log('- 認証エラーです。API KeyとAuth Tokenを確認してください')
          console.log('- Vercelの環境変数が正しく設定されているか確認してください')
        } else if (response.status === 500) {
          console.log('- サーバー内部エラーです')
          console.log('- Vercelのログを確認してください: https://vercel.com/dashboard')
          console.log('- Firebase Admin SDKの環境変数が正しく設定されているか確認してください:')
          console.log('  * FIREBASE_ADMIN_PROJECT_ID')
          console.log('  * FIREBASE_ADMIN_CLIENT_EMAIL')
          console.log('  * FIREBASE_ADMIN_PRIVATE_KEY')
        } else if (response.status === 409) {
          console.log('- 重複エラーです。既に同じ企業が登録されています')
        } else if (response.status === 400) {
          console.log('- バリデーションエラーです。リクエストデータを確認してください')
        }
      }

    } catch (parseError) {
      console.log('❌ JSONパースエラー')
      console.log('レスポンスが有効なJSONではありません')
      console.log('これはサーバーで予期しないエラーが発生した可能性があります')
    }

  } catch (error) {
    console.log('❌ ネットワークエラー')
    console.log(`エラー: ${error.message}`)
    console.log('')
    console.log('🔍 推奨対応策:')
    console.log('- URLが正しいか確認してください')
    console.log('- サーバーが起動しているか確認してください')
    console.log('- ネットワーク接続を確認してください')
  }

  console.log('')
  console.log('='.repeat(60))
  console.log('診断完了')
  console.log('='.repeat(60))
}

// コマンドライン引数からURLを取得
const args = process.argv.slice(2)
const baseUrl = args.find(arg => !arg.startsWith('--')) || 'http://localhost:3000'
const skipDuplicateCheck = args.includes('--skip-duplicate-check')

diagnoseAPI(baseUrl, skipDuplicateCheck)
  .then(() => {
    console.log('')
    console.log('💡 次のステップ:')
    console.log('1. Vercelのログを確認: https://vercel.com/dashboard')
    console.log('2. 環境変数を確認: Settings > Environment Variables')
    console.log('3. 必要に応じて再デプロイを実行')
  })
  .catch(error => {
    console.error('診断スクリプトエラー:', error)
    process.exit(1)
  })
