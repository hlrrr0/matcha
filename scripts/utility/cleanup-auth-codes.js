#!/usr/bin/env node

/**
 * 期限切れの認証コードをクリーンアップするスクリプト
 * 
 * 使用方法:
 *   node scripts/utility/cleanup-auth-codes.js
 * 
 * または cron で定期実行:
 *   0 * * * * cd /path/to/project && node scripts/utility/cleanup-auth-codes.js
 */

const admin = require('firebase-admin')
const path = require('path')

// Firebase Admin SDK の初期化
const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json')

try {
  const serviceAccount = require(serviceAccountPath)
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    })
  }
} catch (error) {
  console.error('❌ Firebase Admin SDK の初期化に失敗しました')
  console.error('serviceAccountKey.json ファイルが見つかりません')
  console.error('パス:', serviceAccountPath)
  process.exit(1)
}

const db = admin.firestore()

async function cleanupExpiredAuthCodes() {
  try {
    console.log('🧹 期限切れ認証コードのクリーンアップを開始...')
    
    const now = admin.firestore.Timestamp.now()
    const snapshot = await db.collection('authCodes')
      .where('expiresAt', '<', now)
      .get()
    
    if (snapshot.empty) {
      console.log('✅ クリーンアップが必要な認証コードはありません')
      return
    }
    
    console.log(`📋 ${snapshot.size}件の期限切れ認証コードを削除します...`)
    
    const batch = db.batch()
    snapshot.docs.forEach(doc => {
      const data = doc.data()
      console.log(`  - コード: ${data.code} (有効期限: ${data.expiresAt.toDate().toLocaleString('ja-JP')})`)
      batch.delete(doc.ref)
    })
    
    await batch.commit()
    
    console.log(`✅ ${snapshot.size}件の認証コードを削除しました`)
    
  } catch (error) {
    console.error('❌ クリーンアップ中にエラーが発生しました:', error)
    throw error
  }
}

// 統計情報を表示
async function showStats() {
  try {
    const allCodesSnapshot = await db.collection('authCodes').get()
    const now = Date.now()
    
    let validCount = 0
    let expiredCount = 0
    
    allCodesSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const expiresAt = data.expiresAt.toMillis()
      
      if (now < expiresAt) {
        validCount++
      } else {
        expiredCount++
      }
    })
    
    console.log('\n📊 認証コード統計:')
    console.log(`  - 全体: ${allCodesSnapshot.size}件`)
    console.log(`  - 有効: ${validCount}件`)
    console.log(`  - 期限切れ: ${expiredCount}件`)
    
  } catch (error) {
    console.error('統計情報の取得に失敗しました:', error)
  }
}

// メイン処理
async function main() {
  try {
    await showStats()
    await cleanupExpiredAuthCodes()
    await showStats()
    
    console.log('\n✅ クリーンアップ完了')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error)
    process.exit(1)
  }
}

main()
