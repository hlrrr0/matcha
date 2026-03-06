import { describe, it, expect } from 'vitest'
import {
  extractPrefecture,
  getPrefectureShort,
  getStoreNameWithPrefecture,
  getJobTitleWithPrefecture,
} from '../prefecture'

describe('extractPrefecture', () => {
  it('正式な都道府県名で始まる住所から抽出できる', () => {
    expect(extractPrefecture('東京都渋谷区1-1')).toBe('東京都')
    expect(extractPrefecture('大阪府大阪市北区')).toBe('大阪府')
    expect(extractPrefecture('京都府京都市中京区')).toBe('京都府')
    expect(extractPrefecture('北海道札幌市')).toBe('北海道')
    expect(extractPrefecture('神奈川県横浜市')).toBe('神奈川県')
    expect(extractPrefecture('沖縄県那覇市')).toBe('沖縄県')
  })

  it('「都」「府」を省略した住所でも抽出できる', () => {
    expect(extractPrefecture('東京渋谷区')).toBe('東京都')
    expect(extractPrefecture('大阪市北区')).toBe('大阪府')
    expect(extractPrefecture('京都市中京区')).toBe('京都府')
  })

  it('undefinedや空文字の場合はundefinedを返す', () => {
    expect(extractPrefecture(undefined)).toBeUndefined()
    expect(extractPrefecture('')).toBeUndefined()
  })

  it('都道府県名が含まれない住所はundefinedを返す', () => {
    expect(extractPrefecture('渋谷区1-1')).toBeUndefined()
    expect(extractPrefecture('ABC Street')).toBeUndefined()
  })
})

describe('getPrefectureShort', () => {
  it('県を除去した略称を返す', () => {
    expect(getPrefectureShort('神奈川県')).toBe('神奈川')
    expect(getPrefectureShort('沖縄県')).toBe('沖縄')
  })

  it('都・府を除去した略称を返す', () => {
    expect(getPrefectureShort('東京都')).toBe('東京')
    expect(getPrefectureShort('大阪府')).toBe('大阪')
    expect(getPrefectureShort('京都府')).toBe('京都')
  })

  it('北海道はそのまま返す', () => {
    expect(getPrefectureShort('北海道')).toBe('北海道')
  })

  it('undefinedの場合はundefinedを返す', () => {
    expect(getPrefectureShort(undefined)).toBeUndefined()
  })
})

describe('getStoreNameWithPrefecture', () => {
  it('都道府県付きの店舗名を返す', () => {
    expect(getStoreNameWithPrefecture('すし匠', '東京都')).toBe('すし匠【東京】')
    expect(getStoreNameWithPrefecture('鮨処', '北海道')).toBe('鮨処【北海道】')
  })

  it('都道府県がない場合は店舗名のみ返す', () => {
    expect(getStoreNameWithPrefecture('すし匠', undefined)).toBe('すし匠')
  })
})

describe('getJobTitleWithPrefecture', () => {
  it('都道府県付きの求人タイトルを返す', () => {
    expect(getJobTitleWithPrefecture('寿司職人募集', '大阪府')).toBe('寿司職人募集【大阪】')
  })

  it('都道府県がない場合はタイトルのみ返す', () => {
    expect(getJobTitleWithPrefecture('寿司職人募集', undefined)).toBe('寿司職人募集')
  })
})
