/**
 * メールテンプレート生成関数
 */

/**
 * 候補者応募メールの本文を生成
 */
export function generateCandidateApplicationEmailBody(params: {
  companyName: string
  jobTitle: string
  candidateName: string
  candidatePhone?: string
  candidateEmail?: string
  candidateResume?: string
  notes?: string
  candidateAge?: string
}): string {
  return `
${params.companyName} 御中

いつもお世話になっております。
${params.candidateResume || ''}

${params.notes ? `■ 備考\n${params.notes}\n` : ''}
ご確認の上、次のステップへお進みください。
ご不明な点がございましたら、お気軽にお問い合わせください。

何卒よろしくお願い申し上げます。
`
}

/**
 * 候補者応募メールの件名を生成
 */
export function generateCandidateApplicationEmailSubject(params: {
  candidateName: string
  jobTitle: string
}): string {
  return `【候補者のご紹介】${params.candidateName}様の応募について（Super Shift）`
}
