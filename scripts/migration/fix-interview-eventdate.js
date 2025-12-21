/**
 * 既存の面接ステータスのタイムラインアイテムに eventDate を追加するスクリプト
 * 
 * 実行方法:
 * 1. Firebase Admin SDK の serviceAccountKey.json を用意
 * 2. node fix-interview-eventdate.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixInterviewEventDates() {
  try {
    console.log('🔍 マッチングデータを取得中...');
    
    const matchesSnapshot = await db.collection('matches').get();
    console.log(`📊 総マッチング数: ${matchesSnapshot.size}`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const doc of matchesSnapshot.docs) {
      const data = doc.data();
      const matchId = doc.id;
      
      // interviewDate が存在し、timeline が存在する場合のみ処理
      if (!data.interviewDate || !data.timeline || !Array.isArray(data.timeline)) {
        skippedCount++;
        continue;
      }
      
      let needsUpdate = false;
      const updatedTimeline = data.timeline.map(item => {
        // 面接ステータスで、eventDate が未設定の場合
        if (item.status === 'interview' && !item.eventDate) {
          console.log(`✏️  ${matchId}: 面接タイムラインに eventDate を追加 (${data.interviewDate.toDate().toISOString()})`);
          needsUpdate = true;
          return {
            ...item,
            eventDate: data.interviewDate // Firestore Timestamp をそのまま使用
          };
        }
        return item;
      });
      
      if (needsUpdate) {
        await db.collection('matches').doc(matchId).update({
          timeline: updatedTimeline
        });
        updatedCount++;
        console.log(`✅ ${matchId}: タイムライン更新完了`);
      } else {
        skippedCount++;
      }
    }
    
    console.log('\n📊 処理完了');
    console.log(`✅ 更新: ${updatedCount} 件`);
    console.log(`⏭️  スキップ: ${skippedCount} 件`);
    console.log(`📈 合計: ${matchesSnapshot.size} 件`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    process.exit();
  }
}

fixInterviewEventDates();
