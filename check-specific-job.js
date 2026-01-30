require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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

const jobId = 'v3rN8sF5hQN3wOXtwtw2';

(async () => {
  try {
    console.log(`\n=== 求人ID: ${jobId} のデータ確認 ===\n`);
    
    const jobDoc = await getDoc(doc(db, 'jobs', jobId));
    
    if (!jobDoc.exists()) {
      console.log('❌ 求人データが存在しません');
      process.exit(1);
    }
    
    const data = jobDoc.data();
    console.log('✅ 求人データが存在します\n');
    console.log(`タイトル: ${data.title || '(なし)'}`);
    console.log(`ステータス: ${data.status || '(未設定)'}`);
    console.log(`企業ID: ${data.companyId || '(なし)'}`);
    console.log(`店舗ID(単一): ${data.storeId || '(なし)'}`);
    console.log(`店舗IDs(複数): ${data.storeIds ? data.storeIds.join(', ') : '(なし)'}`);
    console.log(`雇用形態: ${data.employmentType || '(なし)'}`);
    console.log(`\n--- 主要フィールド ---`);
    console.log(JSON.stringify({
      title: data.title,
      status: data.status,
      companyId: data.companyId,
      storeId: data.storeId,
      storeIds: data.storeIds,
      employmentType: data.employmentType,
      jobDescription: data.jobDescription
    }, null, 2));
    
    // 関連企業の確認
    if (data.companyId) {
      console.log(`\n=== 関連企業の確認 ===`);
      const companyDoc = await getDoc(doc(db, 'companies', data.companyId));
      if (companyDoc.exists()) {
        const companyData = companyDoc.data();
        console.log(`✅ 企業名: ${companyData.name || '(なし)'}`);
      } else {
        console.log(`❌ 企業データが見つかりません (ID: ${data.companyId})`);
      }
    }
    
    // 関連店舗の確認
    const storeIds = data.storeIds || (data.storeId ? [data.storeId] : []);
    if (storeIds.length > 0) {
      console.log(`\n=== 関連店舗の確認 ===`);
      for (const storeId of storeIds) {
        const storeDoc = await getDoc(doc(db, 'stores', storeId));
        if (storeDoc.exists()) {
          const storeData = storeDoc.data();
          console.log(`✅ 店舗名: ${storeData.name || '(なし)'} (ID: ${storeId})`);
        } else {
          console.log(`❌ 店舗データが見つかりません (ID: ${storeId})`);
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
