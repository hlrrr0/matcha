// キャリア価値観診断の質問データ

export const VALUES = [
  { id: 'salary', label: '給与' },
  { id: 'salaryGrowth', label: '給与の上がり幅' },
  { id: 'workingHours', label: '労働時間（拘束時間）' },
  { id: 'holidays', label: '休日数（年間休日）' },
  { id: 'nigiriTiming', label: 'にぎりまで任されるタイミング' },
  { id: 'seniorChefs', label: '先輩職人の数' },
  { id: 'priceRange', label: '店舗の価格帯（回転寿司／町鮨／高級オマカセ）' },
  { id: 'foreignCustomers', label: '外国人客の多さ' },
  { id: 'workEnvironment', label: '職場の雰囲気（怒号・パワハラ／建設的）' },
  { id: 'snsPr', label: 'SNS・PRへの積極性' }
]

export interface DiagnosisQuestion {
  id: number
  text: string
  optionA: { value: string; label: string }
  optionB: { value: string; label: string }
}

export const QUESTIONS: DiagnosisQuestion[] = [
  // === Phase 1: トレードオフ型質問（より深い価値観を測定）===
  {
    id: 1,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'salary', label: '労働時間が長いが給与が高いお店' },
    optionB: { value: 'workingHours', label: '労働時間が短いが給与が低いお店' }
  },
  {
    id: 2,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'nigiriTiming', label: '客単価が低く早く握れるが、給与は普通のお店' },
    optionB: { value: 'priceRange', label: '高級店で一流の技術が学べるが、握るまで時間がかかり若手は給与が低いお店' }
  },
  {
    id: 3,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'holidays', label: '休日が多いが昇給が緩やかなお店' },
    optionB: { value: 'salaryGrowth', label: '休日が少ないが昇給が早いお店' }
  },
  {
    id: 4,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'seniorChefs', label: '先輩職人が多く教育が充実しているが給与は普通のお店' },
    optionB: { value: 'salary', label: '教育体制は普通だが給与が高いお店' }
  },
  {
    id: 5,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'workEnvironment', label: '給与は普通だが風通しが良く働きやすいお店' },
    optionB: { value: 'salary', label: '職場は厳しいが給与が高いお店' }
  },
  {
    id: 6,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'snsPr', label: '労働時間が長いがSNSで有名な華やかなお店' },
    optionB: { value: 'workingHours', label: 'ブランド力は普通だが労働時間が短いお店' }
  },
  {
    id: 7,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'foreignCustomers', label: '外国人客が多く国際的だが給与は普通のお店' },
    optionB: { value: 'salary', label: '日本人客中心だが給与が高いお店' }
  },
  {
    id: 8,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'nigiriTiming', label: '早く握りを任されるが先輩が少ないお店' },
    optionB: { value: 'seniorChefs', label: 'じっくり基礎から学べて先輩が多いお店' }
  },
  {
    id: 9,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'priceRange', label: '高級オマカセ店で一流の技術を学べるが、若手のうちは休日が少なく給与も低いお店' },
    optionB: { value: 'holidays', label: '客単価は普通だが休日が多く、ワークライフバランスが取れるお店' }
  },
  {
    id: 10,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'salaryGrowth', label: '初任給は普通だが将来的に大きく昇給するお店' },
    optionB: { value: 'salary', label: '初任給は高いが昇給は緩やかなお店' }
  },
  
  // === Phase 2: 標準的な二択質問（基本的な優先順位）===
  {
    id: 11,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'salary', label: '今すぐ高い給与' },
    optionB: { value: 'salaryGrowth', label: '将来的な昇給' }
  },
  {
    id: 12,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'workingHours', label: '労働時間の短さ' },
    optionB: { value: 'holidays', label: '休日の多さ' }
  },
  {
    id: 13,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'nigiriTiming', label: 'スキル習得のスピード' },
    optionB: { value: 'seniorChefs', label: '教育体制の充実' }
  },
  {
    id: 14,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'priceRange', label: '高級店での経験' },
    optionB: { value: 'workEnvironment', label: '働きやすい環境' }
  },
  {
    id: 15,
    text: 'あなたはどちらを重視しますか？',
    optionA: { value: 'foreignCustomers', label: '国際的な経験' },
    optionB: { value: 'snsPr', label: 'ブランド力のある店' }
  },
  
  // === Phase 3: より複雑なトレードオフ（3要素の組み合わせ）===
  {
    id: 16,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'workEnvironment', label: '給与・休日は普通だが人間関係が良く風通しの良いお店' },
    optionB: { value: 'salary', label: '人間関係は厳しいが給与が高く待遇の良いお店' }
  },
  {
    id: 17,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'nigiriTiming', label: '客数が多い店で1年で握りを任され、たくさん魚に触れられるお店' },
    optionB: { value: 'priceRange', label: '高級店でじっくり基礎を学べるが、握るまで3年以上かかるお店' }
  },
  {
    id: 18,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'holidays', label: '完全週休2日だが給与の上がり幅は小さいお店' },
    optionB: { value: 'salaryGrowth', label: '月6日休みだが3年後には給与が1.5倍になるお店' }
  },
  {
    id: 19,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'snsPr', label: 'SNSで有名な華やかな店だが労働時間が長いお店' },
    optionB: { value: 'workingHours', label: '知名度は普通だが定時で帰れるお店' }
  },
  {
    id: 20,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'priceRange', label: 'ミシュラン星付きの超高級店だが、若手は休日が少なく給与も低いお店' },
    optionB: { value: 'holidays', label: '客単価は普通だが年間休日120日で働きやすいお店' }
  },
  {
    id: 21,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'seniorChefs', label: 'ベテラン職人5人から学べるが給与は業界平均のお店' },
    optionB: { value: 'nigiriTiming', label: '先輩は少ないが半年で握りを任されるお店' }
  },
  {
    id: 22,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'foreignCustomers', label: '外国人客が8割で英語が飛び交うグローバルな店' },
    optionB: { value: 'workEnvironment', label: '日本人客中心で落ち着いた雰囲気の店' }
  },
  {
    id: 23,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'salaryGrowth', label: '初任給22万円だが5年後に40万円になるお店' },
    optionB: { value: 'salary', label: '初任給30万円だが5年後も35万円のお店' }
  },
  {
    id: 24,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'workEnvironment', label: '客単価は普通だが怒号のない建設的な指導で働きやすいお店' },
    optionB: { value: 'priceRange', label: '超高級オマカセで一流の技術が学べるが、厳しい修行が必要なお店' }
  },
  {
    id: 25,
    text: 'どちらのお店で働きたいですか？',
    optionA: { value: 'snsPr', label: 'インスタフォロワー10万人の有名店だが給与は普通' },
    optionB: { value: 'holidays', label: '知名度は普通だが完全週休2日で年間休日125日のお店' }
  }
]

// 価値観IDからラベルを取得
export function getValueLabel(valueId: string): string {
  const value = VALUES.find(v => v.id === valueId)
  return value?.label || valueId
}

// 質問IDから質問データを取得
export function getQuestionById(questionId: number): DiagnosisQuestion | undefined {
  return QUESTIONS.find(q => q.id === questionId)
}
