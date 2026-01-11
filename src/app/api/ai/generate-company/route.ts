import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { companyName, address, website } = await request.json()

    if (!companyName) {
      return NextResponse.json(
        { error: '企業名は必須です' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEYが設定されていません' },
        { status: 500 }
      )
    }

    console.log('Gemini API呼び出し開始')
    console.log('企業名:', companyName)
    console.log('所在地:', address)
    console.log('公式HP:', website)
    console.log('APIキー設定:', apiKey ? 'OK (最初の10文字: ' + apiKey.substring(0, 10) + '...)' : 'NG')

    // プロンプトを作成
    const prompt = `
あなたは「寿司業界特化の企業情報作成アシスタント」です。
ユーザーが提示する会社名・店舗名・URLをもとに、以下の情報を調査・整理し、求人票に使える形にまとめてください。
可能な限り一次情報（公式サイト、信頼できる求人媒体、会社概要サイトなど）を参照してください。

【企業情報】
- 企業名: ${companyName}
${address ? `- 所在地: ${address}` : ''}
${website ? `- 公式HP: ${website}` : ''}

【出力形式】
以下のJSON形式で出力してください。各項目は具体的かつ魅力的な内容にしてください。

{
  "employeeCount": 従業員数（数値のみ、例：150）,
  "representative": "代表者名（例：田中 太郎）",
  "capital": 資本金（万円、数値のみ、例：5000）,
  "establishedYear": 設立年（西暦、数値のみ、例：2005）,
  "website": "公式ウェブサイトURL（例：https://example.com）",
  "feature1": "【30文字以内の見出し】\\n200文字以内で厚みのある表現。企業の最も魅力的な特徴を具体的に記載してください。",
  "feature2": "【30文字以内の見出し】\\n200文字以内で厚みのある表現。2番目の特徴を具体的に記載してください。",
  "feature3": "【30文字以内の見出し】\\n200文字以内で厚みのある表現。3番目の特徴を具体的に記載してください。",
  "hasHousingSupport": 寮・家賃保証の有無（true または false）,
  "hasIndependenceSupport": 独立支援の有無（true または false）,
  "independenceRecord": "独立実績（例：過去10年で20名以上が独立）",
  "fullTimeAgeGroup": "正社員年齢層（例：20代～40代が中心）",
  "careerPath": "目指せるキャリア（将来のキャリアパスを具体的に、例：店長→エリアマネージャー→海外店舗責任者、独立支援制度あり）",
  "youngRecruitReason": "若手の入社理由（若手が入社を決めた理由を3-5個、箇条書きで）：\\n・理由1\\n・理由2\\n・理由3\\n\\n※各理由は改行（\\\\n）で区切り、箇条書きには「・」を使用してください",
  "hasShokuninUnivRecord": 飲食人大学就職実績の有無（true または false）
}

注意事項：
- 寿司業界に特化した情報を優先してください
- 可能な限り一次情報を参照してください
- 会社特徴は【見出し】と本文を改行（\\n）で区切ってください
- 見出しは30文字以内、本文は200文字以内で記載してください
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
    let companyData
    try {
      companyData = JSON.parse(jsonText)
      console.log('JSONパース成功')
    } catch (parseError: any) {
      console.error('JSONパースエラー:', parseError.message)
      console.error('パースしようとしたテキスト（全文）:', jsonText)
      return NextResponse.json(
        { error: 'AIの出力をJSON形式に変換できませんでした。もう一度お試しください。' },
        { status: 500 }
      )
    }

    return NextResponse.json(companyData)

  } catch (error: any) {
    console.error('AI生成エラー:', error)
    return NextResponse.json(
      { error: error.message || 'AIによる企業情報生成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
