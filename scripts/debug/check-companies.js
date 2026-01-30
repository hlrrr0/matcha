// 不整合データをクリーンアップするスクリプト
require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCompanyData() {
  try {
    console.log('🔍 企業データの整合性チェック開始...');
    
    const companiesRef = collection(db, 'companies');
    const snapshot = await getDocs(companiesRef);
    
    console.log(`📊 総企業数: ${snapshot.size}`);
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      try {
        // 個別に企業データを再取得して存在確認
        const docRef = doc(db, 'companies', docSnapshot.id);
        const recheck = await getDoc(docRef);
        
        if (recheck.exists()) {
          const data = recheck.data();
          console.log(`✅ 有効: ${docSnapshot.id} - ${data.name || 'Unknown'}`);
          validCount++;
        } else {
          console.log(`❌ 無効: ${docSnapshot.id} - データが存在しません`);
          invalidCount++;
        }
      } catch (error) {
        console.error(`❌ チェックエラー ${docSnapshot.id}:`, error);
        invalidCount++;
      }
    }
    
    console.log(`📋 チェック完了: 有効 ${validCount}件, 無効 ${invalidCount}件`);
    
  } catch (error) {
    console.error('❌ 整合性チェックエラー:', error);
  }
  
  process.exit(0);
}

checkCompanyData();