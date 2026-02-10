#!/usr/bin/env node

/**
 * マイグレーションスクリプト: sourceType & visibilityType フィールドの追加
 * 
 * 既存の求職者と求人にデフォルト値を設定します:
 * - Candidate: sourceType = 'inshokujin_univ' (飲食人大学)
 * - Job: visibilityType = 'all' (全体公開)
 * 
 * 実行方法:
 * node scripts/migration/add-source-visibility-fields.js
 */

const admin = require('firebase-admin')
const path = require('path')

// Firebase Admin SDKの初期化
try {
  const serviceAccount = require(path.join(__dirname, '../../serviceAccountKey.json'))
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
} catch (error) {
  console.error('❌ Firebase Admin SDKの初期化に失敗しました:', error.message)
  console.error('serviceAccountKey.jsonファイルがプロジェクトルートに配置されていることを確認してください')
  process.exit(1)
}

const db = admin.firestore()

/**
 * 候補者コレクションの更新
 */
async function migrateCandidates() {
  console.log('\n📊 Candidates コレクションを更新中...')
  
  const candidatesRef = db.collection('candidates')
  const snapshot = await candidatesRef.get()
  
  if (snapshot.empty) {
    console.log('  ℹ️  候補者データが見つかりませんでした')
    return { total: 0, updated: 0, skipped: 0 }
  }
  
  let updated = 0
  let skipped = 0
  const batch = db.batch()
  let batchCount = 0
  
  for (const doc of snapshot.docs) {
    const data = doc.data()
    
    // 既にsourceTypeが設定されている場合はスキップ
    if (data.sourceType) {
      skipped++
      continue
    }
    
    // デフォルト値を設定
    batch.update(doc.ref, {
      sourceType: 'inshokujin_univ',
      sourceDetail: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    
    updated++
    batchCount++
    
    // Firestoreのバッチ制限は500件
    if (batchCount >= 500) {
      await batch.commit()
      console.log(`  ✅ ${updated}件の候補者を更新しました`)
      batchCount = 0
    }
  }
  
  // 残りをコミット
  if (batchCount > 0) {
    await batch.commit()
  }
  
  console.log(`\n  📈 候補者の更新完了:`)
  console.log(`     - 総数: ${snapshot.size}`)
  console.log(`     - 更新: ${updated}`)
  console.log(`     - スキップ: ${skipped}`)
  
  return { total: snapshot.size, updated, skipped }
}

/**
 * 求人コレクションの更新
 */
async function migrateJobs() {
  console.log('\n📊 Jobs コレクションを更新中...')
  
  const jobsRef = db.collection('jobs')
  const snapshot = await jobsRef.get()
  
  if (snapshot.empty) {
    console.log('  ℹ️  求人データが見つかりませんでした')
    return { total: 0, updated: 0, skipped: 0 }
  }
  
  let updated = 0
  let skipped = 0
  const batch = db.batch()
  let batchCount = 0
  
  for (const doc of snapshot.docs) {
    const data = doc.data()
    
    // 既にvisibilityTypeが設定されている場合はスキップ
    if (data.visibilityType) {
      skipped++
      continue
    }
    
    // デフォルト値を設定
    batch.update(doc.ref, {
      visibilityType: 'all',
      allowedSources: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    
    updated++
    batchCount++
    
    // Firestoreのバッチ制限は500件
    if (batchCount >= 500) {
      await batch.commit()
      console.log(`  ✅ ${updated}件の求人を更新しました`)
      batchCount = 0
    }
  }
  
  // 残りをコミット
  if (batchCount > 0) {
    await batch.commit()
  }
  
  console.log(`\n  📈 求人の更新完了:`)
  console.log(`     - 総数: ${snapshot.size}`)
  console.log(`     - 更新: ${updated}`)
  console.log(`     - スキップ: ${skipped}`)
  
  return { total: snapshot.size, updated, skipped }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 マイグレーション開始: sourceType & visibilityType フィールドの追加')
  console.log('=' .repeat(80))
  
  try {
    // 候補者の更新
    const candidatesResult = await migrateCandidates()
    
    // 求人の更新
    const jobsResult = await migrateJobs()
    
    // 結果サマリー
    console.log('\n' + '='.repeat(80))
    console.log('✅ マイグレーション完了！')
    console.log('\n📊 更新サマリー:')
    console.log(`   候補者: ${candidatesResult.updated}/${candidatesResult.total}件を更新`)
    console.log(`   求人: ${jobsResult.updated}/${jobsResult.total}件を更新`)
    console.log('=' .repeat(80))
    
  } catch (error) {
    console.error('\n❌ マイグレーションエラー:', error)
    process.exit(1)
  } finally {
    // Firebaseアプリを終了
    await admin.app().delete()
  }
}

// スクリプト実行
main()
