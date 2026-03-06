import { describe, it, expect } from 'vitest'
import { computeFieldCompletion, computeRecordCompletion } from '../fieldCompletion'
import type { FieldSpec } from '../fieldCompletion'

const fields: FieldSpec[] = [
  { key: 'name', label: '名前' },
  { key: 'email', label: 'メール' },
  { key: 'phone', label: '電話' },
]

describe('computeFieldCompletion', () => {
  it('各フィールドの入力率を計算する', () => {
    const records = [
      { name: '田中', email: 'tanaka@test.com', phone: '' },
      { name: '佐藤', email: '', phone: '090-1234' },
      { name: '', email: 'suzuki@test.com', phone: '080-5678' },
    ]
    const result = computeFieldCompletion(records, fields)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ field: 'name', label: '名前', count: 2, total: 3, percent: 67 })
    expect(result[1]).toEqual({ field: 'email', label: 'メール', count: 2, total: 3, percent: 67 })
    expect(result[2]).toEqual({ field: 'phone', label: '電話', count: 2, total: 3, percent: 67 })
  })

  it('レコードが空の場合は0%を返す', () => {
    const result = computeFieldCompletion([], fields)
    expect(result.every(r => r.percent === 0)).toBe(true)
    expect(result.every(r => r.total === 0)).toBe(true)
  })

  it('全フィールドが埋まっている場合は100%を返す', () => {
    const records = [{ name: 'A', email: 'a@b.com', phone: '090' }]
    const result = computeFieldCompletion(records, fields)
    expect(result.every(r => r.percent === 100)).toBe(true)
  })

  it('null/undefined/空文字/空配列/空オブジェクトは未入力として扱う', () => {
    const records = [
      { name: null, email: undefined, phone: '' },
    ]
    const result = computeFieldCompletion(records, fields)
    expect(result.every(r => r.count === 0)).toBe(true)
  })

  it('0やfalseは入力済みとして扱う', () => {
    const numFields: FieldSpec[] = [
      { key: 'count', label: '数' },
      { key: 'active', label: '有効' },
    ]
    const records = [{ count: 0, active: false }]
    const result = computeFieldCompletion(records, numFields)
    expect(result.every(r => r.count === 1)).toBe(true)
  })
})

describe('computeRecordCompletion', () => {
  it('各レコードの入力率を計算して降順ソートする', () => {
    const records = [
      { id: '1', name: '田中', email: '', phone: '' },
      { id: '2', name: '佐藤', email: 'sato@test.com', phone: '090' },
      { id: '3', name: '鈴木', email: 'suzuki@test.com', phone: '' },
    ]
    const result = computeRecordCompletion(records, fields, r => r.name || r.id)

    expect(result[0].id).toBe('2')
    expect(result[0].percent).toBe(100)
    expect(result[1].id).toBe('3')
    expect(result[1].percent).toBe(67)
    expect(result[2].id).toBe('1')
    expect(result[2].percent).toBe(33)
  })

  it('フィールドが空の場合は0%を返す', () => {
    const records = [{ id: '1', name: 'A' }]
    const result = computeRecordCompletion(records, [], r => r.name)
    expect(result[0].percent).toBe(0)
  })
})
