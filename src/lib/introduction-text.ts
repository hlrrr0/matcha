/**
 * 企業向けの紹介文を生成する
 */
export function generateIntroductionText(params: {
  companyName: string
  candidateName: string
  candidateDateOfBirth?: string
  resumeUrl?: string
  teacherComment?: string
  userName?: string
}): string {
  const { companyName, candidateName, candidateDateOfBirth, resumeUrl, teacherComment, userName } = params
  
  // 年齢を計算
  let age = '不明'
  if (candidateDateOfBirth) {
    try {
      const birthDate = new Date(candidateDateOfBirth)
      const today = new Date()
      let calculatedAge = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--
      }
      age = calculatedAge.toString()
    } catch (error) {
      console.error('年齢計算エラー:', error)
    }
  }
  
  const staffName = userName || '担当者'
  
  return `${companyName}
担当者様

飲食人大学の${staffName}です。
下記ご紹介させていただきたい生徒の書類データになります。
ご確認いただき、面接の設定などさせていただけますと幸いです。

━━━━━━━━━━━━━━━━━━━━━━━━

■ 候補者情報
${candidateName}さん(${age}歳)
${resumeUrl ? `▼書類データ\n${resumeUrl}` : '※書類データは別途お送りいたします'}

${teacherComment ? `■ 先生からのコメント\n${teacherComment}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━

何卒よろしくお願い申し上げます。`
}
