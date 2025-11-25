// 住所から都道府県を抽出するユーティリティ

const PREFECTURES = [
  '北海道',
  '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県',
  '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県',
  '沖縄県'
]

/**
 * 住所から都道府県を抽出
 * @param address 住所
 * @returns 都道府県名、見つからない場合はundefined
 */
export function extractPrefecture(address: string | undefined): string | undefined {
  if (!address) return undefined
  
  // 住所の最初の都道府県を検索
  for (const prefecture of PREFECTURES) {
    if (address.startsWith(prefecture)) {
      return prefecture
    }
    // 「東京都」が「東京」と書かれている場合も対応
    if (prefecture === '東京都' && address.startsWith('東京')) {
      return '東京都'
    }
    if (prefecture === '京都府' && address.startsWith('京都')) {
      return '京都府'
    }
    if (prefecture === '大阪府' && address.startsWith('大阪')) {
      return '大阪府'
    }
  }
  
  return undefined
}

/**
 * 都道府県の略称を取得（表示用）
 * @param prefecture 都道府県名
 * @returns 略称（「県」「都」「府」を除いた名前）
 */
export function getPrefectureShort(prefecture: string | undefined): string | undefined {
  if (!prefecture) return undefined
  
  // 「〇〇県」→「〇〇」、「東京都」→「東京」、「京都府」→「京都」、「大阪府」→「大阪」、「北海道」→「北海道」
  if (prefecture === '北海道') return '北海道'
  return prefecture.replace(/[都道府県]$/, '')
}

/**
 * 店舗名に都道府県を付与（表示用）
 * @param storeName 店舗名
 * @param prefecture 都道府県名
 * @returns 「店舗名【都道府県】」形式、都道府県がない場合は店舗名のみ
 */
export function getStoreNameWithPrefecture(storeName: string, prefecture: string | undefined): string {
  if (!prefecture) return storeName
  const prefShort = getPrefectureShort(prefecture)
  return `${storeName}【${prefShort}】`
}

/**
 * 求人タイトルに都道府県を付与（表示用）
 * @param jobTitle 求人タイトル
 * @param prefecture 都道府県名
 * @returns 「求人タイトル【都道府県】」形式、都道府県がない場合はタイトルのみ
 */
export function getJobTitleWithPrefecture(jobTitle: string, prefecture: string | undefined): string {
  if (!prefecture) return jobTitle
  const prefShort = getPrefectureShort(prefecture)
  return `${jobTitle}【${prefShort}】`
}
