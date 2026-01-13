// 企業データをクリアするスクリプト
require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "agent-system-23630.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "agent-system-23630",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "agent-system-23630.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "644508977654",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:644508977654:web:6e5fde7bcadc5b92a78b8f",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-TX7Q4JWV7M"
};

if (!firebaseConfig.apiKey) {
  console.error('❌ Error: NEXT_PUBLIC_FIREBASE_API_KEY environment variable is not set');
  console.error('Please create a .env.local file with your Firebase configuration');
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