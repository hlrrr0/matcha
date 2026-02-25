/**
 * 企業へ求職者の応募情報をメール送信する
 */
export async function sendCandidateApplicationEmail(params: {
  companyEmail: string
  companyName: string
  candidateName: string
  candidatePhone?: string
  candidateEmail?: string
  candidateResume?: string
  candidateAge?: string
  jobTitle: string
  notes?: string
  matchId?: string
  candidateId?: string
  jobId?: string
  companyId?: string
  sentBy?: string
  cc?: string[]  // CCメールアドレス（企業ccEmails + 担当者）
  editedSubject?: string  // プレビューで編集された件名
  editedBody?: string     // プレビューで編集された本文
  from?: string           // 送信元メールアドレス（担当者メール）
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/send-candidate-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('APIエラーレスポンス:', error)
      const errorMessage = error.details ? `${error.error}: ${error.details}` : error.error
      throw new Error(errorMessage || 'メール送信に失敗しました')
    }

    return { success: true }
  } catch (error) {
    console.error('メール送信エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'メール送信に失敗しました',
    }
  }
}
