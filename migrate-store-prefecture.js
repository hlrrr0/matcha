// 既存店舗データに都道府県を追加するマイグレーションスクリプト
// 使用方法: node migrate-store-prefecture.js

require('dotenv').config({ path: '.env.local' })

const { initializeApp } = require('firebase/app')
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore')

// Firebaseの設定（環境変数から読み込み）
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

console.log('🔧 Firebase設定確認:')
console.log('  Project ID:', firebaseConfig.projectId)
console.log('  Auth Domain:', firebaseConfig.authDomain)
console.log('')

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const PREFECTURES = [
  '北海道',
  '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県',
  '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県',
  '沖縄県'
]

function extractPrefecture(address) {
  if (!address) return undefined
  
  for (const prefecture of PREFECTURES) {
    if (address.startsWith(prefecture)) {
      return prefecture
    }
    if (prefecture === '東京都' && address.startsWith('東京')) {
      return '東京都'
    }
    if (prefecture === '京都府' && address.startsWith('京都')) {
      return '京都府'
    }
    if (prefecture === '大阪府' && address.startsWith('大阪')) {
      return '大阪府'
    }
  }
  
  return undefined
}

async function migrateStorePrefectures() {
  try {
    console.log('🔄 店舗データの都道府県マイグレーション開始...')
    
    const storesRef = collection(db, 'stores')
    const snapshot = await getDocs(storesRef)
    
    console.log(`📊 対象店舗数: ${snapshot.size}件`)
    
    let updatedCount = 0
    let skippedCount = 0
    let errorCount = 0
    
    for (const storeDoc of snapshot.docs) {
      const storeData = storeDoc.data()
      const storeId = storeDoc.id
      
      try {
        // 既に都道府県がある場合はスキップ
        if (storeData.prefecture) {
          console.log(`⏭️  [${storeId}] ${storeData.name}: 都道府県既に設定済み (${storeData.prefecture})`)
          skippedCount++
          continue
        }
        
        // 住所から都道府県を抽出
        const prefecture = extractPrefecture(storeData.address)
        
        if (prefecture) {
          // 都道府県を更新
          await updateDoc(doc(db, 'stores', storeId), {
            prefecture: prefecture,
            updatedAt: new Date()
          })
          console.log(`✅ [${storeId}] ${storeData.name}: ${prefecture} を設定`)
          updatedCount++
        } else {
          console.log(`⚠️  [${storeId}] ${storeData.name}: 住所から都道府県を抽出できませんでした (${storeData.address})`)
          skippedCount++
        }
      } catch (error) {
        console.error(`❌ [${storeId}] ${storeData.name}: エラー`, error)
        errorCount++
      }
    }
    
    console.log('\n📈 マイグレーション完了')
    console.log(`  ✅ 更新: ${updatedCount}件`)
    console.log(`  ⏭️  スキップ: ${skippedCount}件`)
    console.log(`  ❌ エラー: ${errorCount}件`)
    
  } catch (error) {
    console.error('❌ マイグレーション失敗:', error)
  }
}

migrateStorePrefectures()
