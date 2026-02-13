export const formatDateTime = (dateValue: string | Date | any | undefined) => {
  if (!dateValue) return '未設定'

  try {
    let date: Date

    // Firestoreのタイムスタンプオブジェクトの場合
    if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
      date = dateValue.toDate()
    }
    // Date オブジェクトの場合
    else if (dateValue instanceof Date) {
      date = dateValue
    }
    // 文字列の場合
    else if (typeof dateValue === 'string') {
      date = new Date(dateValue)
    }
    // secondsフィールドがある場合（Firestore Timestamp）
    else if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
      date = new Date(dateValue.seconds * 1000)
    }
    else {
      return '日時形式エラー'
    }

    if (isNaN(date.getTime())) return '無効な日時'

    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (error) {
    console.error('日時フォーマットエラー:', error, 'dateValue:', dateValue)
    return '日時エラー'
  }
}
