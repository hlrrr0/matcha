import { Job } from '@/types/job'
import { createJob, updateJob, findJobByTitleAndCompany } from '@/lib/firestore/jobs'

export interface ImportResult {
  success: number
  updated: number
  errors: string[]
}

export const importJobsFromCSV = async (csvText: string): Promise<ImportResult> => {
  const result: ImportResult = {
    success: 0,
    updated: 0,
    errors: []
  }

  try {
    // 改良されたCSV解析（複数行フィールドに対応）
    const rows = parseCSVText(csvText)
    if (rows.length < 2) {
      result.errors.push('CSVファイルにデータが含まれていません')
      return result
    }

    // 日本語ヘッダーから英語フィールド名へのマッピング
    const headerMapping: Record<string, string> = {
      '求人ID': 'id',                                     // ID
      '求人タイトル': 'title',
      '企業ID': 'companyId',
      'ステータス': 'status',
      '店舗ID': 'storeId',
      '業態': 'businessType',
      '雇用形態': 'employmentType',
      '試用期間': 'trialPeriod',
      '勤務時間': 'workingHours',
      '休日・休暇': 'holidays',
      '時間外労働': 'overtime',
      '給与（未経験）': 'salaryInexperienced',
      '給与（経験者）': 'salaryExperienced',
      '求めるスキル': 'requiredSkills',
      '職務内容': 'jobDescription',
      '受動喫煙防止措置': 'smokingPolicy',
      '加入保険': 'insurance',
      '待遇・福利厚生': 'benefits',
      '選考プロセス': 'selectionProcess',
      'キャリア担当からの感想': 'consultantReview',
      '作成者ID': 'createdBy'
    }

    // ヘッダー行を取得（日本語と英語の両方に対応）
    const originalHeaders = rows[0].map((h: string) => h.trim().replace(/"/g, ''))
    const headers = originalHeaders.map((header: string) => headerMapping[header] || header)
    
    console.log('📊 CSV解析結果:', {
      totalRows: rows.length,
      headerCount: headers.length,
      originalHeaders,
      mappedHeaders: headers
    })
    
    // 必須フィールドの確認（英語フィールド名で）
    const requiredFields = ['title', 'companyId', 'status']
    const missingFields = requiredFields.filter(field => !headers.includes(field))
    if (missingFields.length > 0) {
      // 日本語フィールド名で逆マッピングしてエラーメッセージを表示
      const jpFieldMapping = Object.fromEntries(Object.entries(headerMapping).map(([jp, en]) => [en, jp]))
      const missingJpFields = missingFields.map(field => jpFieldMapping[field] || field)
      result.errors.push(`必須フィールドが不足しています: ${missingJpFields.join(', ')}`)
      return result
    }

    // データ行を処理
    for (let i = 1; i < rows.length; i++) {
      try {
        const values = rows[i]
        if (values.length !== headers.length) {
          console.log(`❌ 行${i + 1}のフィールド数不一致:`, {
            expected: headers.length,
            actual: values.length,
            headers: headers,
            values: values
          })
          result.errors.push(`行${i + 1}: フィールド数が一致しません (ヘッダー${headers.length}個、データ${values.length}個)`)
          continue
        }

        // データオブジェクトを作成
        const rowData: Record<string, string> = {}
        headers.forEach((header: string, index: number) => {
          rowData[header] = values[index] || ''
        })

        // バリデーション
        if (!rowData.title?.trim()) {
          result.errors.push(`行${i + 1}: 求人タイトルが必要です`)
          continue
        }

        if (!rowData.companyId?.trim()) {
          result.errors.push(`行${i + 1}: 企業IDが必要です`)
          continue
        }

        // ステータスの正規化（published/paused -> active にマッピング）
        let normalizedStatus = rowData.status?.toLowerCase().trim()
        if (normalizedStatus === 'published' || normalizedStatus === 'paused') {
          normalizedStatus = 'active'
        }
        
        if (!['draft', 'active', 'closed'].includes(normalizedStatus)) {
          result.errors.push(`行${i + 1}: ステータスが無効です (draft/active/closed)。published/pausedはactiveとして扱われます`)
          continue
        }

        // Job オブジェクトを作成
        const jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'> = {
          title: rowData.title.trim(),
          companyId: rowData.companyId.trim(),
          status: (normalizedStatus as 'draft' | 'active' | 'closed') || 'draft',
          // 公開設定（デフォルト: すべて公開）
          visibilityType: 'all',
          // オプションフィールド
          storeId: rowData.storeId?.trim(),
          businessType: rowData.businessType?.trim(),
          employmentType: rowData.employmentType?.trim(),
          trialPeriod: rowData.trialPeriod?.trim(),
          workingHours: rowData.workingHours?.trim(),
          holidays: rowData.holidays?.trim(),
          overtime: rowData.overtime?.trim(),
          salaryInexperienced: rowData.salaryInexperienced?.trim(),
          salaryExperienced: rowData.salaryExperienced?.trim(),
          requiredSkills: rowData.requiredSkills?.trim(),
          jobDescription: rowData.jobDescription?.trim(),
          smokingPolicy: rowData.smokingPolicy?.trim(),
          insurance: rowData.insurance?.trim(),
          benefits: rowData.benefits?.trim(),
          selectionProcess: rowData.selectionProcess?.trim(),
          consultantReview: rowData.consultantReview?.trim(),
          createdBy: rowData.createdBy?.trim()
        }

        // ID-based更新チェック（IDが提供されている場合）
        if (rowData.id?.trim()) {
          const { getJobById } = await import('@/lib/firestore/jobs')
          const existingJob = await getJobById(rowData.id.trim())
          
          if (existingJob) {
            // IDによる既存求人更新
            await updateJob(existingJob.id, jobData)
            result.updated++
            console.log(`✅ 行${i + 1}: ID「${rowData.id}」の求人「${jobData.title}」を更新しました`)
          } else {
            result.errors.push(`行${i + 1}: 指定されたID「${rowData.id}」の求人が見つかりません`)
            continue
          }
        } else {
          // 重複チェック：求人タイトル、企業ID、店舗ID（任意）の組み合わせで既存求人を検索
          const existingJob = await findJobByTitleAndCompany(
            jobData.title, 
            jobData.companyId,
            jobData.storeId
          )

          if (existingJob) {
            // 既存求人が見つかった場合は更新
            await updateJob(existingJob.id, jobData)
            result.updated++
            console.log(`✅ 行${i + 1}: 既存求人「${jobData.title}」を更新しました`)
          } else {
            // 新規求人として作成
            await createJob(jobData)
            result.success++
            console.log(`✨ 行${i + 1}: 新規求人「${jobData.title}」を作成しました`)
          }
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー'
        result.errors.push(`行${i + 1}: ${errorMessage}`)
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    result.errors.push(`CSV解析エラー: ${errorMessage}`)
  }

  return result
}

// RFC 4180準拠のCSVパーサー（複数行フィールドに対応）
const parseCSVText = (csvText: string): string[][] => {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // エスケープされたクォート
        currentField += '"'
        i++ // 次の文字をスキップ
      } else {
        // クォートの開始/終了
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // フィールドの区切り
      currentRow.push(currentField.trim())
      currentField = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // 行の終了（クォート内でない場合のみ）
      if (char === '\r' && nextChar === '\n') {
        i++ // CRLFの場合、LFもスキップ
      }
      
      // 現在のフィールドを追加して行を完了
      currentRow.push(currentField.trim())
      currentField = ''
      
      // 空行でない場合のみ追加
      if (currentRow.length > 0 && currentRow.some(field => field !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
    } else {
      currentField += char
    }
  }
  
  // 最後のフィールドと行を追加
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.length > 0 && currentRow.some(field => field !== '')) {
      rows.push(currentRow)
    }
  }
  
  return rows
}

// CSV行をパースするヘルパー関数（後方互換性のため保持）
const parseCSVLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされたクォート
        current += '"'
        i++ // 次の文字をスキップ
      } else {
        // クォートの開始/終了
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // フィールドの区切り
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  // 最後のフィールドを追加
  result.push(current.trim())
  
  return result
}

// CSVテンプレートを生成する関数
export const generateJobsCSVTemplate = (): string => {
  // 日本語ヘッダーと対応する英語フィールド名のマッピング
  const headerMapping = [
    { jp: '求人ID', en: 'id' },                          // ID（更新時のみ使用）
    { jp: '求人タイトル', en: 'title' },                  // 必須
    { jp: '企業ID', en: 'companyId' },                    // 必須
    { jp: 'ステータス', en: 'status' },                   // 必須: draft/active/closed
    { jp: '店舗ID', en: 'storeId' },
    { jp: '業態', en: 'businessType' },
    { jp: '雇用形態', en: 'employmentType' },
    { jp: '試用期間', en: 'trialPeriod' },
    { jp: '勤務時間', en: 'workingHours' },
    { jp: '休日・休暇', en: 'holidays' },
    { jp: '時間外労働', en: 'overtime' },
    { jp: '給与（未経験）', en: 'salaryInexperienced' },
    { jp: '給与（経験者）', en: 'salaryExperienced' },
    { jp: '求めるスキル', en: 'requiredSkills' },
    { jp: '職務内容', en: 'jobDescription' },
    { jp: '受動喫煙防止措置', en: 'smokingPolicy' },
    { jp: '加入保険', en: 'insurance' },
    { jp: '待遇・福利厚生', en: 'benefits' },
    { jp: '選考プロセス', en: 'selectionProcess' },
    { jp: 'キャリア担当からの感想', en: 'consultantReview' },
    { jp: '作成者ID', en: 'createdBy' }
  ]

  // 日本語ヘッダー行を生成
  const jpHeaders = headerMapping.map(item => item.jp)
  
  // サンプルデータ（日本語ヘッダーに対応）
  const sampleData = [
    '',                                                 // 求人ID（新規作成時は空、更新時は既存ID）
    'ホールスタッフ・ウェイター',                          // 求人タイトル
    'comp_abc123def456',                                // 企業ID（実際の企業IDを入力）
    'active',                                           // ステータス（draft/active/closed）
    'store_xyz789abc012',                               // 店舗ID（任意、店舗がある場合）
    'イタリアンレストラン',                             // 業態
    'full-time',                                        // 雇用形態
    '3ヶ月間',                                          // 試用期間
    '10:00-22:00（実働8時間・休憩1時間）',              // 勤務時間
    '週休2日制（シフト制）',                            // 休日・休暇
    '月平均20時間程度',                                  // 時間外労働
    '月給220,000円～250,000円',                         // 給与（未経験）
    '月給250,000円～300,000円',                         // 給与（経験者）
    '接客経験・料理に関する知識があれば尚良い',          // 求めるスキル
    'お客様への接客対応、オーダー受け、料理・ドリンクの提供、会計業務、清掃業務', // 職務内容
    '全面禁煙（屋外に喫煙スペースあり）',                // 受動喫煙防止措置
    '雇用保険・労災保険・健康保険・厚生年金',            // 加入保険
    '交通費全額支給・制服貸与・まかない無料・昇給年1回', // 待遇・福利厚生
    '書類選考→面接（1回）→内定',                       // 選考プロセス
    'アットホームで成長できる環境。料理を学びたい方にオススメです。', // キャリア担当からの感想
    'consultant-001'                                    // 作成者ID
  ]

  // CSV形式で返す（日本語ヘッダー + サンプルデータ）
  return jpHeaders.join(',') + '\n' + sampleData.map(value => 
    value.includes(',') || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value
  ).join(',')
}