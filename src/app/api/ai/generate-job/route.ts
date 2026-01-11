import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { companyName, storeName, storeAddress, businessType } = await request.json()

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      console.error('GEMINI_API_KEY が設定されていません')
      return NextResponse.json(
        { error: 'Gemini APIキーが設定されていません' },
        { status: 500 }
      )
    }

    console.log('Gemini API呼び出し開始')
    console.log('企業名:', companyName)
    console.log('店舗名:', storeName)
    console.log('APIキー設定:', apiKey ? 'OK (最初の10文字: ' + apiKey.substring(0, 10) + '...)' : 'NG')

    // プロンプトを作成
    const prompt = `
あなたは飲食業界の求人情報作成の専門家です。
以下の情報を元に、魅力的で詳細な求人情報を作成してください。

【企業・店舗情報】
- 企業名: ${companyName}
- 店舗名: ${storeName}
- 所在地: ${storeAddress}
- 業種: ${businessType}

【重要】
- 職種は「寿司職人」または「キッチンスタッフ」のいずれかにしてください
- 業態が寿司店の場合は「寿司職人」、その他の飲食店の場合は「キッチンスタッフ」としてください

【出力形式】
以下のJSON形式で出力してください。各項目は具体的かつ魅力的な内容にしてください。

{
  "title": "職種名（「寿司職人」または「キッチンスタッフ」のいずれか）",
  "jobDescription": "職務内容（以下の形式で記載）：\\n\\n1-2行の魅力的な導入文を記載してください。\\n\\n・業務内容1\\n・業務内容2\\n・業務内容3\\n・業務内容4\\n\\n※導入文の後に改行を2つ入れ、業務内容は箇条書き（「・」使用）で記載してください",
  "requiredSkills": "求めるスキル（経験不問の場合もその旨を記載）",
  "trialPeriod": "試用期間（例：3ヶ月）",
  "workingHours": "勤務時間（例：10:00～23:00の間でシフト制）",
  "holidays": "休日・休暇（例：週休2日制、夏季休暇、年末年始休暇）",
  "overtime": "時間外労働（例：月平均10時間程度）",
  "salaryInexperienced": "給与（未経験）（例：月給25万円～）",
  "salaryExperienced": "給与（経験者）（例：月給30万円～）",
  "smokingPolicy": "受動喫煙防止措置（例：屋内禁煙）",
  "insurance": "加入保険（例：雇用保険、労災保険、健康保険、厚生年金）",
  "benefits": "待遇・福利厚生（例：交通費全額支給、まかない有り、制服貸与）",
  "selectionProcess": "選考プロセス（例：書類選考→面接1回→内定）",
  "recommendedPoints": "おすすめポイント（求職者にとって魅力的なポイントを3-5個、箇条書きで）：\\n・ポイント1\\n・ポイント2\\n・ポイント3\\n・ポイント4\\n\\n※各ポイントは改行（\\\\n）で区切り、箇条書きには「・」を使用してください",
  "consultantReview": "キャリア担当からの正直な感想（この求人の特徴や雰囲気を正直に記載）",
  "matchingData": {
    "workLifeBalance": {
      "monthlyScheduledHours": 月間拘束時間（数値のみ、例：200）,
      "monthlyActualWorkHours": 月間実働時間（数値のみ、例：176）,
      "averageOvertimeHours": 平均残業時間（数値のみ、例：20）,
      "weekendWorkFrequency": 休日出勤頻度（"none", "rare", "monthly", "weekly"のいずれか）,
      "holidaysPerMonth": 月間休日数（数値のみ、例：8）
    },
    "income": {
      "firstYearMin": 初年度想定年収・最低（万円、数値のみ、例：280）,
      "firstYearMax": 初年度想定年収・最高（万円、数値のみ、例：350）,
      "firstYearAverage": 初年度想定年収・平均（万円、数値のみ、例：315）,
      "thirdYearExpected": 3年目想定年収（万円、数値のみ、例：400）
    },
    "organization": {
      "teamSize": チームサイズ（人数、数値のみ、例：8）,
      "averageAge": 平均年齢（歳、数値のみ、例：32）,
      "storeScale": 店舗規模（"small", "medium", "large"のいずれか）
    },
    "industry": {
      "trainingPeriodMonths": 一人前になるまでの期間（月、数値のみ、例：24）,
      "hasIndependenceSupport": 独立支援制度（true または false）,
      "michelinStars": ミシュラン星数（数値のみ、0-3、例：0）
    }
  }
}

注意事項：
- 飲食業界の一般的な待遇を参考にしてください
- 具体的な数値を含めてください
- ポジティブで魅力的な表現を心がけてください
- 必ずJSON形式で出力してください
- JSON以外のテキストは含めないでください
`

    // Gemini APIを呼び出し
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Gemini API エラー:', errorData)
      console.error('ステータスコード:', response.status)
      console.error('ステータステキスト:', response.statusText)
      return NextResponse.json(
        { 
          error: `AI生成に失敗しました: ${errorData.error?.message || response.statusText}`,
          details: errorData
        },
        { status: 500 }
      )
    }

    const data = await response.json()
    console.log('Gemini API レスポンス:', JSON.stringify(data, null, 2))
    
    // レスポンスからテキストを取得
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!generatedText) {
      return NextResponse.json(
        { error: '生成されたテキストが空です' },
        { status: 500 }
      )
    }

    // JSONを抽出（コードブロックがある場合も対応）
    let jsonText = generatedText.trim()
    
    console.log('生成されたテキスト（最初の500文字）:', jsonText.substring(0, 500))
    
    // ```json ... ``` または ``` ... ``` で囲まれている場合は抽出
    if (jsonText.includes('```')) {
      console.log('コードブロックを検出しました')
      // まずバッククォートを全て削除してみる
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      console.log('バッククォート削除後（最初の200文字）:', jsonText.substring(0, 200))
    }
    
    // 念のため、{...}を抽出
    const jsonStart = jsonText.indexOf('{')
    const jsonEnd = jsonText.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
      jsonText = jsonText.substring(jsonStart, jsonEnd + 1)
      console.log('{}で抽出しました')
    }

    console.log('抽出されたJSON（最初の500文字）:', jsonText.substring(0, 500))

    // JSONをパース
    let jobData
    try {
      jobData = JSON.parse(jsonText)
      console.log('JSONパース成功')
    } catch (parseError: any) {
      console.error('JSONパースエラー:', parseError.message)
      console.error('パースしようとしたテキスト（全文）:', jsonText)
      console.error('テキスト長:', jsonText.length)
      return NextResponse.json(
        { 
          error: 'AIの出力をJSON形式に変換できませんでした。もう一度お試しください。',
          details: {
            parseError: parseError.message,
            textLength: jsonText.length,
            textPreview: jsonText.substring(0, 500)
          }
        },
        { status: 500 }
      )
    }

    return NextResponse.json(jobData)

  } catch (error: any) {
    console.error('AI生成エラー:', error)
    console.error('エラースタック:', error.stack)
    return NextResponse.json(
      { 
        error: error.message || 'AIによる求人情報生成中にエラーが発生しました',
        details: {
          stack: error.stack,
          name: error.name
        }
      },
      { status: 500 }
    )
  }
}
