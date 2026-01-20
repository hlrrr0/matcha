import { Candidate } from '@/types/candidate'
import { createCandidate, updateCandidate, getCandidateByEmail } from '@/lib/firestore/candidates'

export interface ImportResult {
  success: number
  updated: number
  errors: string[]
}

/**
 * 日付文字列をYYYY-MM-DD形式に変換（タイムゾーンのずれを防ぐ）
 * @param dateStr 日付文字列（例: "2000-01-15", "2000/01/15", "2025-10"）
 * @returns YYYY-MM-DD形式の文字列
 */
const formatDateForStorage = (dateStr: string): string => {
  if (!dateStr) return dateStr
  
  // すでにYYYY-MM-DD形式の場合はそのまま返す
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // YYYY-MM形式（入学年月）の場合はそのまま返す
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // スラッシュ区切りをハイフン区切りに変換
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
    return dateStr.replace(/\//g, '-')
  }
  
  // YYYY/MM形式
  if (/^\d{4}\/\d{2}$/.test(dateStr)) {
    return dateStr.replace(/\//g, '-')
  }
  
  // その他の形式はそのまま返す
  return dateStr
}

export const importCandidatesFromCSV = async (csvText: string): Promise<ImportResult> => {
  const result: ImportResult = {
    success: 0,
    updated: 0,
    errors: []
  }

  try {
    // CSV解析 - 複数行にわたるフィールドに対応
    const lines = []
    let currentLine = ''
    let inQuotes = false
    
    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i]
      
      if (char === '"') {
        if (inQuotes && i + 1 < csvText.length && csvText[i + 1] === '"') {
          // エスケープされた引用符
          currentLine += '""'
          i++ // 次の引用符をスキップ
        } else {
          // 引用符の開始/終了
          inQuotes = !inQuotes
          currentLine += char
        }
      } else if (char === '\n' && !inQuotes) {
        // 行の終了（引用符内でない場合のみ）
        if (currentLine.trim()) {
          lines.push(currentLine.trim())
        }
        currentLine = ''
      } else if (char === '\r') {
        // キャリッジリターンは無視
        continue
      } else {
        currentLine += char
      }
    }
    
    // 最後の行を追加
    if (currentLine.trim()) {
      lines.push(currentLine.trim())
    }

    if (lines.length < 2) {
      result.errors.push('CSVファイルにデータがありません')
      return result
    }

    // ヘッダー行を解析
    const headers = parseCSVLine(lines[0])
    
    // データ行を処理
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i])
        
        // 空行をスキップ
        if (values.every(v => !v || v.trim() === '')) {
          continue
        }
        
        // ヘッダーと値をマッピング
        const row: Record<string, string> = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        
        // 必須フィールドのチェック
        if (!row['名前（姓）'] || !row['名前（名）']) {
          result.errors.push(`行 ${i + 1}: 名前（姓）と名前（名）は必須です`)
          continue
        }

        // ステータスの変換
        let status: Candidate['status'] = 'active'
        if (row['ステータス']) {
          const statusMap: Record<string, Candidate['status']> = {
            'アクティブ': 'active',
            '非アクティブ': 'inactive'
          }
          status = statusMap[row['ステータス']] || 'active'
        }

        // 校舎の変換
        let campus: Candidate['campus'] = ''
        if (row['入学校舎']) {
          const campusMap: Record<string, Candidate['campus']> = {
            '東京校': 'tokyo',
            '大阪校': 'osaka',
            '淡路校': 'awaji',
            '福岡校': 'fukuoka'
          }
          campus = campusMap[row['入学校舎']] || ''
        }

        // 求職者データを構築
        // 求職者データを構築（undefinedを含む）
        const rawCandidateData: any = {
          status,
          lastName: row['名前（姓）'].trim(),
          firstName: row['名前（名）'].trim(),
          lastNameKana: row['フリガナ（姓）']?.trim() || undefined,
          firstNameKana: row['フリガナ（名）']?.trim() || undefined,
          email: row['メールアドレス']?.trim() || undefined,
          phone: row['電話番号']?.trim() || undefined,
          dateOfBirth: row['生年月日']?.trim() ? formatDateForStorage(row['生年月日'].trim()) : undefined,
          enrollmentDate: row['入学年月']?.trim() ? formatDateForStorage(row['入学年月'].trim()) : undefined,
          campus,
          nearestStation: row['最寄り駅']?.trim() || undefined,
          cookingExperience: row['調理経験']?.trim() || undefined,
          jobSearchTiming: row['就職活動開始タイミング']?.trim() || undefined,
          graduationCareerPlan: row['卒業直後の希望進路']?.trim() || undefined,
          preferredArea: row['希望エリア']?.trim() || undefined,
          preferredWorkplace: row['希望する職場の雰囲気・条件']?.trim() || undefined,
          futureCareerVision: row['将来のキャリア像']?.trim() || undefined,
          questions: row['質問等']?.trim() || undefined,
          partTimeHope: row['アルバイト希望']?.trim() || undefined,
          applicationFormUrl: row['願書URL']?.trim() || undefined,
          resumeUrl: row['履歴書URL']?.trim() || undefined,
          teacherComment: row['先生からのコメント']?.trim() || undefined,
          personalityScore: row['人物スコア']?.trim() || undefined,
          skillScore: row['スキルスコア']?.trim() || undefined,
          interviewMemo: row['面談メモ']?.trim() || undefined,
        }

        // undefinedフィールドを除去（Firestoreはundefinedを許可しない）
        const candidateData: any = {}
        Object.keys(rawCandidateData).forEach(key => {
          if (rawCandidateData[key] !== undefined) {
            candidateData[key] = rawCandidateData[key]
          }
        })

        // メールアドレスをキーとして既存の求職者を検索
        let existingCandidate = null
        if (candidateData.email && candidateData.email.trim()) {
          // メールアドレスがある場合はメールアドレスで検索
          existingCandidate = await getCandidateByEmail(candidateData.email)
        }

        if (existingCandidate) {
          // メールアドレスが一致する既存の求職者を更新
          console.log(`🔄 更新: ${candidateData.lastName} ${candidateData.firstName} (${candidateData.email})`)
          await updateCandidate(existingCandidate.id, candidateData)
          result.updated++
        } else {
          // 新規作成
          console.log(`✨ 新規: ${candidateData.lastName} ${candidateData.firstName} (${candidateData.email || 'メールなし'})`)
          await createCandidate(candidateData)
          result.success++
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー'
        result.errors.push(`行 ${i + 1}: ${errorMessage}`)
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    result.errors.push(`CSV解析エラー: ${errorMessage}`)
  }

  return result
}

// CSV行を解析する関数
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // エスケープされた引用符
        current += '"'
        i++ // 次の引用符をスキップ
      } else {
        // 引用符の開始/終了
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // フィールドの区切り
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  // 最後のフィールドを追加
  result.push(current)
  
  return result
}

// CSVテンプレートを生成
export const generateCandidatesCSVTemplate = (): string => {
  const headers = [
    'ステータス',
    '名前（姓）',
    '名前（名）',
    'フリガナ（姓）',
    'フリガナ（名）',
    'メールアドレス',
    '電話番号',
    '生年月日',
    '入学年月',
    '入学校舎',
    '最寄り駅',
    '調理経験',
    '就職活動開始タイミング',
    '卒業直後の希望進路',
    '希望エリア',
    '希望する職場の雰囲気・条件',
    '将来のキャリア像',
    '質問等',
    'アルバイト希望',
    '願書URL',
    '履歴書URL',
    '先生からのコメント',
    '人物スコア',
    'スキルスコア',
    '面談メモ'
  ]

  const exampleRow = [
    'アクティブ',
    '山田',
    '太郎',
    'ヤマダ',
    'タロウ',
    'yamada@example.com',
    '090-1234-5678',
    '2000-04-01',
    '2023-04',
    '東京校',
    'JR代々木駅',
    '家庭での調理経験あり',
    '2024年3月',
    '就職',
    '東京都内',
    '寿司職人として修行できる環境',
    '将来は独立開業を目指したい',
    '特になし',
    'アルバイト希望あり',
    'https://example.com/application.pdf',
    'https://example.com/resume.pdf',
    '真面目で熱心な生徒です',
    '85',
    '90',
    '意欲的で将来性がある'
  ]

  return `${headers.join(',')}\n${exampleRow.join(',')}`
}
