const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkDiagnosis() {
  try {
    const candidateId = 'OWmaBZDkIez5u2iqNQIl';
    console.log('📋 求職者ID:', candidateId);
    console.log('');
    
    // 候補者情報を取得
    const candidateDoc = await db.collection('candidates').doc(candidateId).get();
    if (candidateDoc.exists) {
      const candidate = candidateDoc.data();
      console.log('👤 求職者名:', candidate.lastName, candidate.firstName);
    } else {
      console.log('❌ 求職者が見つかりません');
      return;
    }
    console.log('');
    
    // 診断結果を取得
    const diagnosisSnapshot = await db.collection('diagnoses')
      .where('candidateId', '==', candidateId)
      .orderBy('completedAt', 'desc')
      .get();
    
    if (diagnosisSnapshot.empty) {
      console.log('❌ この求職者の診断結果は保存されていません');
    } else {
      console.log('✅ 診断結果が見つかりました:', diagnosisSnapshot.size, '件');
      console.log('');
      
      diagnosisSnapshot.forEach((doc, index) => {
        const diagnosis = doc.data();
        console.log(`--- 診断 ${index + 1} ---`);
        console.log('診断ID:', doc.id);
        console.log('完了日:', diagnosis.completedAt?.toDate().toLocaleString('ja-JP'));
        console.log('回答数:', diagnosis.answers?.length || 0);
        console.log('結果数:', diagnosis.results?.length || 0);
        
        if (diagnosis.topValues && diagnosis.topValues.length > 0) {
          console.log('');
          console.log('TOP3の価値観:');
          diagnosis.topValues.slice(0, 3).forEach((value, i) => {
            console.log(`  ${i + 1}位: ${value.label} (スコア: ${value.score})`);
          });
        }
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

checkDiagnosis().then(() => process.exit(0));
