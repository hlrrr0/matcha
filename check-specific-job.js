const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyD6pa5Qi9vumPncVNhc3fr3IzC9TON_YsA",
  authDomain: "agent-system-23630.firebaseapp.com",
  projectId: "agent-system-23630",
  storageBucket: "agent-system-23630.firebasestorage.app",
  messagingSenderId: "543575360817",
  appId: "1:543575360817:web:dea8b4496f3814b2061c10"
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
