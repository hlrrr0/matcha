import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

/**
 * Indeed 公式テンプレート形式 CSV エクスポート API
 * GET /api/indeed/export-indeed-csv
 * 
 * Indeed掲載なし（not_detected）の企業に紐づく active な求人を
 * Indeed求人CSVアップロード用のテンプレート形式で出力する
 * 
 * Query Parameters:
 *  - markExported: 'true' の場合、エクスポート済みフラグを立てる
 *  - companyIds: カンマ区切りの企業ID。指定した企業の求人のみをエクスポート
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const markExported = searchParams.get('markExported') === 'true'
    const companyIdsParam = searchParams.get('companyIds')

    const db = getAdminFirestore()

    let targetCompanyIds: string[] = []
    const targetCompanies = new Map<string, any>()

    // companyIdsが指定されている場合は、その企業を対象にする
    if (companyIdsParam) {
      const specifiedIds = companyIdsParam.split(',').filter(id => id.trim())
      
      if (specifiedIds.length === 0) {
        return NextResponse.json({
          success: true,
          message: '対象の企業がありません',
          count: 0,
        })
      }

      // 指定された企業を取得（30件ずつバッチ処理）
      for (let i = 0; i < specifiedIds.length; i += 30) {
        const batch = specifiedIds.slice(i, i + 30)
        const companiesSnapshot = await db.collection('companies')
          .where('__name__', 'in', batch)
          .get()
        
        companiesSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.status === 'active') {
            targetCompanies.set(doc.id, { id: doc.id, ...data })
          }
        })
      }

      targetCompanyIds = [...targetCompanies.keys()]
    } else {
      // companyIdsが指定されていない場合は、従来通りIndeed掲載なしの企業を対象にする
      const companiesSnapshot = await db.collection('companies')
        .where('status', '==', 'active')
        .get()

      for (const doc of companiesSnapshot.docs) {
        const data = doc.data()
        const status = data.indeedStatus
        // 掲載なし = detected === false かつ error なし、かつ公開状態
        if (status && status.detected === false && !status.error && data.isPublic !== false) {
          targetCompanies.set(doc.id, { id: doc.id, ...data })
        }
      }

      targetCompanyIds = [...targetCompanies.keys()]
    }

    if (targetCompanyIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: '対象の企業がありません',
        count: 0,
      })
    }

    // 2. 該当企業のactive求人を取得
    const allJobs: { id: string; data: any }[] = []

    for (let i = 0; i < targetCompanyIds.length; i += 30) {
      const batch = targetCompanyIds.slice(i, i + 30)
      const jobsSnapshot = await db.collection('jobs')
        .where('companyId', 'in', batch)
        .where('status', '==', 'active')
        .get()

      jobsSnapshot.docs.forEach(doc => {
        allJobs.push({ id: doc.id, data: doc.data() })
      })
    }

    if (allJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: '対象企業のアクティブ求人がありません',
        count: 0,
      })
    }

    // 3. 店舗情報を取得
    const storeIds = new Set<string>()
    allJobs.forEach(job => {
      if (job.data.storeId) storeIds.add(job.data.storeId)
      if (job.data.storeIds) {
        job.data.storeIds.forEach((sid: string) => storeIds.add(sid))
      }
    })

    const storeMap = new Map<string, any>()
    const storeIdArray = [...storeIds]
    for (let i = 0; i < storeIdArray.length; i += 30) {
      const batch = storeIdArray.slice(i, i + 30)
      const storesSnapshot = await db.collection('stores')
        .where('__name__', 'in', batch)
        .get()
      storesSnapshot.docs.forEach(doc => {
        storeMap.set(doc.id, doc.data())
      })
    }

    // 4. Indeed公式テンプレートヘッダー
    const headers = [
      'ステータス',
      '会社名',
      '職種名',
      '職業カテゴリー',
      '求人キャッチコピー',
      '勤務地（郵便番号）',
      '勤務地（都道府県・市区町村・町域）',
      '勤務地（丁目・番地・号）',
      '勤務地（建物名・階数）',
      '雇用形態',
      '有料職業紹介に該当',
      '給与形態',
      '給与（最低額）',
      '給与（最高額）',
      '給与（表示形式）',
      '固定残業代の有無',
      '固定残業代（最低額）',
      '固定残業代（最高額）',
      '固定残業代（支払い単位）',
      '固定残業代（時間）',
      '固定残業代（分）',
      '固定残業代（超過分の追加支払への同意）',
      '勤務形態',
      '平均所定労働時間',
      '平均所定労働時間（分）',
      '社会保険',
      '社会保険（適用されない理由）',
      '試用期間の有無',
      '試用期間（期間）',
      '試用期間（期間の単位）',
      '試用期間（試用期間中の労働条件）',
      '試用期間中の給与形態',
      '試用期間中の給与（最低額）',
      '試用期間中の給与（最高額）',
      '試用期間中の給与（表示形式）',
      '試用期間中の固定残業代の有無',
      '試用期間中の固定残業代（最低額）',
      '試用期間中の固定残業代（最高額）',
      '試用期間中の固定残業代（支払い単位）',
      '試用期間中の固定残業代（時間）',
      '試用期間中の固定残業代（分）',
      '試用期間中の固定残業代（超過分の追加支払への同意）',
      '試用期間中の平均所定労働時間',
      '試用期間中の平均所定労働時間（分）',
      '試用期間中のその他の条件',
      '募集要項（仕事内容）',
      '募集要項（アピールポイント）',
      '募集要項（求める人材）',
      '募集要項（勤務時間・曜日）',
      '募集要項（休暇・休日）',
      '募集要項（勤務地の補足）',
      '募集要項（アクセス）',
      '募集要項（給与の補足）',
      '募集要項（待遇・福利厚生）',
      '募集要項（その他）',
      '掲載画像',
      'タグ',
      'タグ',
      'タグ',
      '採用予定人数',
      '履歴書の有無',
      '応募者に関する情報',
      '応募者に関する情報',
      '応募者に関する情報',
      '応募用メールアドレス',
      '求人問い合わせ先電話番号（半角）',
      '審査用の質問',
      '自動アプローチ利用設定',
      '自動アプローチ条件設定',
      'ユーザー指定ID',
    ]

    // 5. 雇用形態マッピング
    const employmentTypeMap: Record<string, string> = {
      'full-time': '正社員',
      'part-time': 'アルバイト・パート',
      'contract': '契約社員',
      'temporary': '派遣社員',
      'intern': 'インターン',
      'freelance': '業務委託',
    }

    // 6. 給与情報パース用ヘルパー
    function parseSalary(salaryStr?: string): { type: string; min: string; max: string; display: string } {
      if (!salaryStr) return { type: '', min: '', max: '', display: '' }

      // 「月給 30万円〜35万円」のようなパターン（万円単位）
      const monthlyManMatch = salaryStr.match(/月給?\s*[¥￥]?([\d,.]+)\s*万.*?[〜~ー-]\s*[¥￥]?([\d,.]+)\s*万/i)
      if (monthlyManMatch) {
        return {
          type: '月給',
          min: Math.round(parseFloat(monthlyManMatch[1]) * 10000).toString(),
          max: Math.round(parseFloat(monthlyManMatch[2]) * 10000).toString(),
          display: '範囲で表示',
        }
      }

      // 「月給 250,000円〜350,000円」のようなパターン
      const monthlyMatch = salaryStr.match(/月給?\s*[¥￥]?([\d,]+).*?[〜~ー-][¥￥]?([\d,]+)/i)
      if (monthlyMatch) {
        return {
          type: '月給',
          min: monthlyMatch[1].replace(/,/g, ''),
          max: monthlyMatch[2].replace(/,/g, ''),
          display: '範囲で表示',
        }
      }

      // 「時給 1,200円〜1,500円」のようなパターン
      const hourlyMatch = salaryStr.match(/時給?\s*[¥￥]?([\d,]+).*?[〜~ー-][¥￥]?([\d,]+)/i)
      if (hourlyMatch) {
        return {
          type: '時給',
          min: hourlyMatch[1].replace(/,/g, ''),
          max: hourlyMatch[2].replace(/,/g, ''),
          display: '範囲で表示',
        }
      }

      // 「年収 300万円〜500万円」のようなパターン
      const annualMatch = salaryStr.match(/年[収俸]?\s*([\d,.]+)万.*?[〜~ー-]([\d,.]+)万/i)
      if (annualMatch) {
        return {
          type: '月給',
          min: Math.round(parseFloat(annualMatch[1]) * 10000 / 12).toString(),
          max: Math.round(parseFloat(annualMatch[2]) * 10000 / 12).toString(),
          display: '範囲で表示',
        }
      }

      // 単一金額パターン - 万円単位（月給 30万円）
      const singleMonthlyMan = salaryStr.match(/月給?\s*[¥￥]?([\d,.]+)\s*万/i)
      if (singleMonthlyMan) {
        const amount = Math.round(parseFloat(singleMonthlyMan[1]) * 10000).toString()
        return {
          type: '月給',
          min: amount,
          max: '',  // 固定額を表示の場合は最高額は空にする
          display: '固定額を表示',
        }
      }

      // 単一金額パターン（月給 250,000円）
      const singleMonthly = salaryStr.match(/月給?\s*[¥￥]?([\d,]+)/i)
      if (singleMonthly) {
        return {
          type: '月給',
          min: singleMonthly[1].replace(/,/g, ''),
          max: '',  // 固定額を表示の場合は最高額は空にする
          display: '固定額を表示',
        }
      }

      const singleHourly = salaryStr.match(/時給?\s*[¥￥]?([\d,]+)/i)
      if (singleHourly) {
        return {
          type: '時給',
          min: singleHourly[1].replace(/,/g, ''),
          max: '',  // 固定額を表示の場合は最高額は空にする
          display: '固定額を表示',
        }
      }

      return { type: '', min: '', max: '', display: '' }
    }

    // 7. 社会保険マッピング用ヘルパー
    function parseInsurance(insurance?: string): string {
      if (!insurance) return ''
      
      // 「社会保険完備」などの場合は、4つの保険をカンマ区切りで返す
      if (insurance.includes('完備') || insurance.includes('全て') || insurance.includes('すべて')) {
        return '健康保険,厚生年金,雇用保険,労災保険'
      }
      
      // 個別の保険名をIndeed形式にマッピング
      const insuranceMap: Record<string, string> = {
        '健康': '健康保険',
        '厚生': '厚生年金',
        '雇用': '雇用保険',
        '労災': '労災保険',
      }
      
      const result: string[] = []
      for (const [key, value] of Object.entries(insuranceMap)) {
        if (insurance.includes(key)) {
          result.push(value)
        }
      }
      
      return result.length > 0 ? result.join(',') : ''
    }

    // 8. 住所パース用ヘルパー
    function parseAddress(address?: string): { region: string; detail: string } {
      if (!address) return { region: '', detail: '' }

      // 都道府県 + 市区町村 + 町域 を分離
      const match = address.match(
        /^((?:東京都|北海道|(?:大阪|京都)府|.{2,3}県)\s*.+?[市区町村郡].+?[町村区丁])(.*)$/
      )
      if (match) {
        return { region: match[1].trim(), detail: match[2].trim() }
      }

      // より緩いパターン：都道府県 + 市区町村まで
      const simpleMatch = address.match(
        /^((?:東京都|北海道|(?:大阪|京都)府|.{2,3}県)\s*.+?(?:市|区|町|村|郡).*?)(\d.*)$/
      )
      if (simpleMatch) {
        return { region: simpleMatch[1].trim(), detail: simpleMatch[2].trim() }
      }

      return { region: address, detail: '' }
    }

    // 9. 試用期間パース
    function parseTrialPeriod(trial?: string): { has: string; period: string; unit: string } {
      if (!trial) return { has: '', period: '', unit: '' }
      const monthMatch = trial.match(/(\d+)\s*[ヶか月]/)
      if (monthMatch) {
        return { has: 'あり', period: monthMatch[1], unit: 'ヶ月' }
      }
      const dayMatch = trial.match(/(\d+)\s*日/)
      if (dayMatch) {
        return { has: 'あり', period: dayMatch[1], unit: '日' }
      }
      if (trial.includes('なし') || trial.includes('無')) {
        return { has: 'なし', period: '', unit: '' }
      }
      return { has: 'あり', period: '', unit: '' }
    }

    // 10. CSVデータ行を構築
    const rows: string[][] = []
    const exportedJobIds: string[] = []

    for (const job of allJobs) {
      const company = targetCompanies.get(job.data.companyId)
      if (!company) continue

      // 店舗情報を取得（最初の店舗を使用）
      const storeId = job.data.storeId || (job.data.storeIds?.[0])
      const store = storeId ? storeMap.get(storeId) : null

      // 勤務地の住所（店舗 → 企業の順で取得）
      const workAddress = store?.address || company.address || ''
      const { region, detail } = parseAddress(workAddress)

      // 雇用形態
      const empType = employmentTypeMap[job.data.employmentType] || job.data.employmentType || ''

      // 給与パース（未経験の給与を優先）
      const salaryStr = job.data.salaryInexperienced || job.data.salaryExperienced || ''
      const salary = parseSalary(salaryStr)

      // 試用期間
      const trial = parseTrialPeriod(job.data.trialPeriod)

      // 最寄り駅
      const access = store?.nearestStation || ''

      // 有料職業紹介
      const isPaidReferral = (company.contractType === 'paid_contracted' || company.contractType === 'paid_available') ? 'はい' : 'いいえ'

      const row = [
        '募集中',                                          // ステータス
        company.name || '',                                // 会社名
        job.data.title || '',                              // 職種名
        '和食シェフ/料理人',                               // 職業カテゴリー
        '',                                                // 求人キャッチコピー（手動設定が必要）
        '',                                                // 勤務地（郵便番号）
        region,                                            // 勤務地（都道府県・市区町村・町域）
        detail,                                            // 勤務地（丁目・番地・号）
        '',                                                // 勤務地（建物名・階数）
        empType,                                           // 雇用形態
        isPaidReferral,                                    // 有料職業紹介に該当
        salary.type,                                       // 給与形態
        salary.min,                                        // 給与（最低額）
        salary.max,                                        // 給与（最高額）
        salary.display,                                    // 給与（表示形式）
        'なし',                                            // 固定残業代の有無
        '',                                                // 固定残業代（最低額）
        '',                                                // 固定残業代（最高額）
        '',                                                // 固定残業代（支払い単位）
        '',                                                // 固定残業代（時間）
        '',                                                // 固定残業代（分）
        '',                                                // 固定残業代（超過分の追加支払への同意）
        'シフト制',                                        // 勤務形態
        '8',                                               // 平均所定労働時間
        '30',                                              // 平均所定労働時間（分）
        parseInsurance(job.data.insurance),                 // 社会保険
        '',                                                // 社会保険（適用されない理由）
        trial.has,                                         // 試用期間の有無
        trial.period,                                      // 試用期間（期間）
        trial.unit,                                        // 試用期間（期間の単位）
        trial.has === 'あり' ? '同条件' : '',        // 試用期間（試用期間中の労働条件）
        '',                                                // 試用期間中の給与形態
        '',                                                // 試用期間中の給与（最低額）
        '',                                                // 試用期間中の給与（最高額）
        '',                                                // 試用期間中の給与（表示形式）
        '',                                                // 試用期間中の固定残業代の有無
        '',                                                // 試用期間中の固定残業代（最低額）
        '',                                                // 試用期間中の固定残業代（最高額）
        '',                                                // 試用期間中の固定残業代（支払い単位）
        '',                                                // 試用期間中の固定残業代（時間）
        '',                                                // 試用期間中の固定残業代（分）
        '',                                                // 試用期間中の固定残業代（超過分の追加支払への同意）
        '',                                                // 試用期間中の平均所定労働時間
        '',                                                // 試用期間中の平均所定労働時間（分）
        '',                                                // 試用期間中のその他の条件
        cleanText(job.data.jobDescription),                // 募集要項（仕事内容）
        cleanText(job.data.recommendedPoints),             // 募集要項（アピールポイント）
        cleanText(job.data.requiredSkills),                // 募集要項（求める人材）
        cleanText(job.data.workingHours),                  // 募集要項（勤務時間・曜日）
        cleanText(job.data.holidays),                      // 募集要項（休暇・休日）
        '',                                                // 募集要項（勤務地の補足）
        access,                                            // 募集要項（アクセス）
        cleanText(buildSalaryNote(job.data)),               // 募集要項（給与の補足）
        cleanText(job.data.benefits),                      // 募集要項（待遇・福利厚生）
        cleanText(job.data.smokingPolicy ? `受動喫煙防止措置: ${job.data.smokingPolicy}` : ''), // 募集要項（その他）
        '',                                                // 掲載画像
        (job.data.tags || [])[0] || '',                    // タグ1
        (job.data.tags || [])[1] || '',                    // タグ2
        (job.data.tags || [])[2] || '',                    // タグ3
        '1',                                               // 採用予定人数（必須項目）
        '任意',                                            // 履歴書の有無
        '',                                                // 応募者に関する情報1
        '',                                                // 応募者に関する情報2
        '',                                                // 応募者に関する情報3
        'hiroki.imai@super-shift.co.jp',                   // 応募用メールアドレス（必須項目）
        '0345002222',                                      // 求人問い合わせ先電話番号
        '',                                                // 審査用の質問
        '',                                                // 自動アプローチ利用設定
        '',                                                // 自動アプローチ条件設定
        job.id,                                            // ユーザー指定ID（求人ID）
      ]

      rows.push(row)
      exportedJobIds.push(job.id)
    }

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'エクスポート対象の求人がありません',
        count: 0,
      })
    }

    // 11. エクスポート済みフラグを立てる
    if (markExported) {
      const batchWriter = db.batch()
      const now = new Date()

      for (const jobId of exportedJobIds) {
        const jobRef = db.collection('jobs').doc(jobId)
        batchWriter.update(jobRef, {
          'indeedControl.exported': true,
          'indeedControl.exportedAt': now,
          updatedAt: now,
        })
      }

      await batchWriter.commit()
    }

    // 12. CSV生成（BOM付きUTF-8）
    const BOM = '\uFEFF'
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="indeed_template_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Indeed テンプレートCSVエクスポートエラー:', error)
    return NextResponse.json(
      { success: false, error: 'CSVエクスポートに失敗しました' },
      { status: 500 }
    )
  }
}

/** テキストをCSV安全な形式に変換 */
function cleanText(text?: string): string {
  if (!text) return ''
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/** 給与補足情報を構築 */
function buildSalaryNote(job: any): string {
  const parts: string[] = []
  if (job.salaryInexperienced) {
    parts.push(`未経験: ${job.salaryInexperienced}`)
  }
  if (job.salaryExperienced) {
    parts.push(`経験者: ${job.salaryExperienced}`)
  }
  if (job.overtime) {
    parts.push(`時間外: ${job.overtime}`)
  }
  return parts.join('\n')
}
