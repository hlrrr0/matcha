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
  jobTitle: string
  notes?: string
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
      throw new Error(error.error || 'メール送信に失敗しました')
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
