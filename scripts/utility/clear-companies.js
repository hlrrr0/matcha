// 企業データをクリアするスクリプト
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// 環境変数の検証
const requiredEnvVars = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingVars = requiredEnvVars.filter(key => !firebaseConfig[key]);

if (missingVars.length > 0) {
  console.error('❌ エラー: 以下のFirebase環境変数が設定されていません:');
  missingVars.forEach(varName => {
    // camelCaseをSNAKE_CASEに変換
    const envName = `NEXT_PUBLIC_FIREBASE_${varName.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '')}`;
    console.error(`   - ${envName}`);
  });
  console.error('\n.env.localファイルを確認してください。');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearCompanies() {
  try {
    console.log('🗑️ 企業データのクリア開始...');
    
    const companiesRef = collection(db, 'companies');
    const snapshot = await getDocs(companiesRef);
    
    console.log(`📊 ${snapshot.size}件の企業データが見つかりました`);
    
    let deletedCount = 0;
    for (const doc of snapshot.docs) {
      try {
        await deleteDoc(doc.ref);
        deletedCount++;
        console.log(`🗑️ 企業ID: ${doc.id} を削除しました`);
      } catch (error) {
        console.error(`❌ 企業ID: ${doc.id} の削除エラー:`, error);
      }
    }
    
    console.log(`✅ ${deletedCount}件の企業データを削除しました`);
    
  } catch (error) {
    console.error('❌ 企業データクリアエラー:', error);
  }
  
  process.exit(0);
}

clearCompanies();