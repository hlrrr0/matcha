/**
 * タイムラインのタイムスタンプを修正するスクリプト
 * 
 * 問題: すべてのタイムラインアイテムが同じタイムスタンプを持っている
 * 解決: 各タイムラインアイテムに一意のタイムスタンプを付与（1秒ずつ増加）
 */

const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin SDK の初期化
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixTimelineTimestamps() {
  try {
    console.log('🔍 タイムラインのタイムスタンプ修正を開始します...\n');

    // すべてのマッチングを取得
    const matchesSnapshot = await db.collection('matches').get();
    console.log(`📊 対象マッチング数: ${matchesSnapshot.size} 件\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const matchDoc of matchesSnapshot.docs) {
      const matchId = matchDoc.id;
      const matchData = matchDoc.data();

      if (!matchData.timeline || !Array.isArray(matchData.timeline) || matchData.timeline.length === 0) {
        console.log(`⏭️  ${matchId}: タイムラインなし（スキップ）`);
        skippedCount++;
        continue;
      }

      // すべてのタイムスタンプが同じかチェック
      const timestamps = matchData.timeline.map(item => {
        const ts = item.timestamp;
        return ts && ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
      });

      const uniqueTimestamps = new Set(timestamps);
      
      if (uniqueTimestamps.size === matchData.timeline.length) {
        console.log(`✅ ${matchId}: すでに一意のタイムスタンプあり（スキップ）`);
        skippedCount++;
        continue;
      }

      console.log(`🔧 ${matchId}: タイムスタンプを修正中...`);
      console.log(`   タイムライン数: ${matchData.timeline.length}, 一意のタイムスタンプ数: ${uniqueTimestamps.size}`);

      // 最初のタイムスタンプを基準として、それぞれ1秒ずつ増やす
      const baseTimestamp = Math.min(...timestamps);
      const updatedTimeline = matchData.timeline.map((item, index) => {
        const newTimestamp = new Date(baseTimestamp + (index * 1000)); // 1秒ずつ増加
        
        return {
          ...item,
          timestamp: admin.firestore.Timestamp.fromDate(newTimestamp)
        };
      });

      // Firestoreを更新
      await matchDoc.ref.update({
        timeline: updatedTimeline,
        updatedAt: admin.firestore.Timestamp.now()
      });

      console.log(`   ✅ 修正完了`);
      console.log(`   修正前: ${new Date(timestamps[0]).toISOString()}`);
      console.log(`   修正後: ${updatedTimeline.map(t => new Date(t.timestamp.toMillis()).toISOString()).join(', ')}\n`);
      
      fixedCount++;
    }

    console.log('\n📊 修正完了');
    console.log(`   修正済み: ${fixedCount} 件`);
    console.log(`   スキップ: ${skippedCount} 件`);
    console.log(`   合計: ${matchesSnapshot.size} 件`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  }
}

// スクリプト実行
fixTimelineTimestamps()
  .then(() => {
    console.log('\n✅ すべての処理が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラーで終了しました:', error);
    process.exit(1);
  });
