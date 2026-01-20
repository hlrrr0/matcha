// Google Drive API クライアント

/**
 * Google Drive フォルダーを作成
 * @param folderName フォルダー名
 * @param parentFolderId 親フォルダーID
 * @returns 作成されたフォルダーのURL
 */
export async function createGoogleDriveFolder(
  folderName: string,
  parentFolderId: string = '1XApyyRLBkLPypS8Nj9U26xvaMNI25G9l'
): Promise<string> {
  try {
    const response = await fetch('/api/google-drive/create-folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        folderName,
        parentFolderId,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'フォルダー作成に失敗しました')
    }

    const data = await response.json()
    return data.folderUrl
  } catch (error) {
    console.error('Google Drive フォルダー作成エラー:', error)
    throw error
  }
}

/**
 * 求職者用のフォルダー名を生成
 * @param enrollmentDate 入学年月 (例: "2025-10-01")
 * @param campus 校舎 (例: "fukuoka")
 * @param lastName 姓
 * @param firstName 名
 * @returns フォルダー名 (例: "25/10福岡_飯山美咲")
 */
export function generateCandidateFolderName(
  enrollmentDate: string | undefined,
  campus: string | undefined,
  lastName: string,
  firstName: string
): string {
  // 入学年月の処理
  let datePrefix = ''
  if (enrollmentDate) {
    const date = new Date(enrollmentDate)
    const year = date.getFullYear() % 100 // 下2桁
    const month = date.getMonth() + 1
    datePrefix = `${year}/${month.toString().padStart(2, '0')}`
  }

  // 校舎名の処理
  const campusLabels: Record<string, string> = {
    tokyo: '東京',
    osaka: '大阪',
    awaji: '淡路',
    fukuoka: '福岡',
    taiwan: '台湾',
  }
  const campusName = campus ? campusLabels[campus] || '' : ''

  // フォルダー名の組み立て
  const parts = []
  if (datePrefix) parts.push(datePrefix)
  if (campusName) parts.push(campusName)
  
  const prefix = parts.join('')
  const name = `${lastName}${firstName}`

  return prefix ? `${prefix}_${name}` : name
}
