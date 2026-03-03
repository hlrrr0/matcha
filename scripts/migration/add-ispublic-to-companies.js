#!/usr/bin/env node

/**
 * 企業データにisPublicフィールドを追加するマイグレーションスクリプト
 * 
 * 使い方:
 *   node scripts/migration/add-ispublic-to-companies.js
 * 
 * 必要な環境変数:
 *   FIREBASE_SERVICE_ACCOUNT_PATH または serviceAccountKey.json
 */

const admin = require('firebase-admin')
const path = require('path')

// Firebase Admin初期化
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  path.join(__dirname, '../../serviceAccountKey.json')

if (!admin.apps.length) {
  const serviceAccount = require(serviceAccountPath)
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

const db = admin.firestore()

async function addIsPublicToCompanies() {
  try {
    console.log('🚀 企業データのisPublicフィールド追加を開始...')

    // 全企業を取得
    const companiesSnapshot = await db.collection('companies').get()
    
    if (companiesSnapshot.empty) {
      console.log('📭 企業データが見つかりませんでした')
      return
    }

    console.log(`📊 ${companiesSnapshot.size}件の企業データを確認中...`)

    let updatedCount = 0
    let skippedCount = 0
    let errorCount = 0

    const batch = db.batch()
    let batchCount = 0
    const BATCH_SIZE = 500

    for (const doc of companiesSnapshot.docs) {
      const data = doc.data()
      
      // isPublicフィールドが存在しない場合のみ追加
      if (data.isPublic === undefined) {
        batch.update(doc.ref, {
          isPublic: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        
        updatedCount++
        batchCount++
        
        console.log(`✅ [${doc.id}] ${data.name || '名称なし'} - isPublic: true を追加`)
        
        // バッチサイズに達したらコミット
        if (batchCount >= BATCH_SIZE) {
          await batch.commit()
          batchCount = 0
          console.log(`💾 ${updatedCount}件のバッチをコミットしました`)
        }
      } else {
        skippedCount++
        console.log(`⏭️  [${doc.id}] ${data.name || '名称なし'} - isPublic: ${data.isPublic} (スキップ)`)
      }
    }

    // 残りのバッチをコミット
    if (batchCount > 0) {
      await batch.commit()
      console.log(`💾 最後の${batchCount}件のバッチをコミットしました`)
    }

    console.log('\n✨ マイグレーション完了')
    console.log(`📊 統計:`)
    console.log(`   - 更新: ${updatedCount}件`)
    console.log(`   - スキップ: ${skippedCount}件`)
    console.log(`   - エラー: ${errorCount}件`)

  } catch (error) {
    console.error('❌ マイグレーションエラー:', error)
    throw error
  }
}

// スクリプト実行
addIsPublicToCompanies()
  .then(() => {
    console.log('🎉 スクリプトが正常に完了しました')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 スクリプトが失敗しました:', error)
    process.exit(1)
  })
