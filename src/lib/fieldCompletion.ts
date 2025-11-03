// Utility to compute completion rates for records
export type FieldSpec = { key: string; label: string }

function hasValue(value: any): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  // numbers and booleans are considered provided (including 0 and false)
  return true
}

// 各項目ごとの入力率を計算（旧関数）
export function computeFieldCompletion(records: any[], fields: FieldSpec[]) {
  const total = records.length
  return fields.map((f) => {
    const count = records.filter(r => hasValue(r?.[f.key])).length
    const percent = total === 0 ? 0 : Math.round((count / total) * 100)
    return { field: f.key, label: f.label, count, total, percent }
  })
}

// 各レコードごとの入力率を計算（新関数）
export function computeRecordCompletion(records: any[], fields: FieldSpec[], getRecordName: (record: any) => string) {
  return records.map((record) => {
    const filledCount = fields.filter(f => hasValue(record?.[f.key])).length
    const totalFields = fields.length
    const percent = totalFields === 0 ? 0 : Math.round((filledCount / totalFields) * 100)
    return {
      id: record.id,
      name: getRecordName(record),
      filledCount,
      totalFields,
      percent
    }
  }).sort((a, b) => b.percent - a.percent) // 入力率の高い順にソート
}
