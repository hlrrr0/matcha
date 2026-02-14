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
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const markExported = searchParams.get('markExported') === 'true'

    const db = getAdminFirestore()

    // 1. Indeed掲載なしの企業を取得
    const companiesSnapshot = await db.collection('companies')
      .where('status', '==', 'active')
      .get()

    const notDetectedCompanies = new Map<string, any>()
    for (const doc of companiesSnapshot.docs) {
      const data = doc.data()
      const status = data.indeedStatus
      // 掲載なし = detected === false かつ error なし、かつ公開状態
      if (status && status.detected === false && !status.error && data.isPublic !== false) {
        notDetectedCompanies.set(doc.id, { id: doc.id, ...data })
      }
    }

    if (notDetectedCompanies.size === 0) {
      return NextResponse.json({
        success: true,
        message: 'Indeed掲載なしの企業がありません',
        count: 0,
      })
    }

    // 2. 該当企業のactive求人を取得
    const companyIds = [...notDetectedCompanies.keys()]
    const allJobs: { id: string; data: any }[] = []

    for (let i = 0; i < companyIds.length; i += 30) {
      const batch = companyIds.slice(i, i + 30)
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
        message: 'Indeed掲載なし企業のアクティブ求人がありません',
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
      '採用予定人数',
      '履歴書の有無',
      '応募者に関する情報',
      '応募用メールアドレス',
      '求人問い合わせ先電話番号（半角）',
      '審査用の質問',
      '自動アプローチ利用設定',
      '自動アプローチ条件設定',
      'ユーザー指定ID',
      '求人ID（編集不可）',
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

      // 「月給 250,000円〜350,000円」のようなパターン
      const monthlyMatch = salaryStr.match(/月給?\s*[¥￥]?([\d,]+).*?[〜~ー-]([\d,]+)/i)
      if (monthlyMatch) {
        return {
          type: '月給',
          min: monthlyMatch[1].replace(/,/g, ''),
          max: monthlyMatch[2].replace(/,/g, ''),
          display: '範囲で表示',
        }
      }

      // 「時給 1,200円〜1,500円」のようなパターン
      const hourlyMatch = salaryStr.match(/時給?\s*[¥￥]?([\d,]+).*?[〜~ー-]([\d,]+)/i)
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

      // 単一金額パターン（月給 250,000円）
      const singleMonthly = salaryStr.match(/月給?\s*[¥￥]?([\d,]+)/i)
      if (singleMonthly) {
        return {
          type: '月給',
          min: singleMonthly[1].replace(/,/g, ''),
          max: singleMonthly[1].replace(/,/g, ''),
          display: '固定額で表示',
        }
      }

      const singleHourly = salaryStr.match(/時給?\s*[¥￥]?([\d,]+)/i)
      if (singleHourly) {
        return {
          type: '時給',
          min: singleHourly[1].replace(/,/g, ''),
          max: singleHourly[1].replace(/,/g, ''),
          display: '固定額で表示',
        }
      }

      return { type: '', min: '', max: '', display: '' }
    }

    // 7. 住所パース用ヘルパー
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

    // 8. 試用期間パース
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

    // 9. CSVデータ行を構築
    const rows: string[][] = []
    const exportedJobIds: string[] = []

    for (const job of allJobs) {
      const company = notDetectedCompanies.get(job.data.companyId)
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
        '',                                                // 職業カテゴリー（手動設定が必要）
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
        '',                                                // 固定残業代の有無
        '',                                                // 固定残業代（最低額）
        '',                                                // 固定残業代（最高額）
        '',                                                // 固定残業代（支払い単位）
        '',                                                // 固定残業代（時間）
        '',                                                // 固定残業代（分）
        '',                                                // 固定残業代（超過分の追加支払への同意）
        '',                                                // 勤務形態
        '',                                                // 平均所定労働時間
        '',                                                // 平均所定労働時間（分）
        job.data.insurance || '',                           // 社会保険
        '',                                                // 社会保険（適用されない理由）
        trial.has,                                         // 試用期間の有無
        trial.period,                                      // 試用期間（期間）
        trial.unit,                                        // 試用期間（期間の単位）
        '',                                                // 試用期間（試用期間中の労働条件）
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
        (job.data.tags || []).join('、'),                   // タグ
        '',                                                // 採用予定人数
        '任意',                                            // 履歴書の有無
        '',                                                // 応募者に関する情報
        company.email || '',                               // 応募用メールアドレス
        company.phone || store?.phone || '',               // 求人問い合わせ先電話番号
        '',                                                // 審査用の質問
        '',                                                // 自動アプローチ利用設定
        '',                                                // 自動アプローチ条件設定
        job.id,                                            // ユーザー指定ID（求人ID）
        '',                                                // 求人ID（編集不可）
        '',                                                // 自動アプローチ利用設定（重複）
        '',                                                // 自動アプローチ条件設定（重複）
        '',                                                // ユーザー指定ID（重複）
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

    // 10. エクスポート済みフラグを立てる
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

    // 11. CSV生成（BOM付きUTF-8）
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
