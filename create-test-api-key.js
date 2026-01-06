/**
 * テスト用APIキーを作成するスクリプト
 * 
 * 実行方法:
 * 1. Firebase Consoleからサービスアカウントキーをダウンロード
 * 2. プロジェクトルートに serviceAccountKey.json として保存
 * 3. npm install firebase-admin uuid
 * 4. node create-test-api-key.js
 */

const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')

// サービスアカウントキーを読み込み
const serviceAccount = require('./serviceAccountKey.json')

// Firebase Admin SDKを初期化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

const db = admin.firestore()

async function createTestApiKey() {
  try {
    const apiKey = 'test-api-key-12345'
    const now = admin.firestore.Timestamp.now()
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    const apiKeyData = {
      key: apiKey,
      name: 'テスト用APIキー',
      clientName: 'Test Client',
      isActive: true,
      plan: 'standard',
      dailyLimit: 50,
      requestCount: 0,
      lastResetDate: today,
      allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
      createdAt: now,
      lastUsedAt: now,
      totalRequests: 0
    }

    // Firestoreに保存
    await db.collection('apiKeys').doc(apiKey).set(apiKeyData)

    console.log('✅ Test API key created successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`API Key: ${apiKey}`)
    console.log(`Name: ${apiKeyData.name}`)
    console.log(`Client: ${apiKeyData.clientName}`)
    console.log(`Plan: ${apiKeyData.plan}`)
    console.log(`Daily Limit: ${apiKeyData.dailyLimit}`)
    console.log(`Status: ${apiKeyData.isActive ? 'Active' : 'Inactive'}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n📝 You can now test the API with:')
    console.log(`curl -X GET "http://localhost:3000/api/public/jobs/export?limit=10" \\`)
    console.log(`  -H "X-API-Key: ${apiKey}"`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating test API key:', error)
    process.exit(1)
  }
}

createTestApiKey()