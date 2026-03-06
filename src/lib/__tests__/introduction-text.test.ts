import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateIntroductionText } from '../introduction-text'

describe('generateIntroductionText', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-06'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('候補者名と年齢を含む紹介文を生成する', () => {
    const text = generateIntroductionText({
      companyName: '株式会社テスト',
      candidateName: '田中太郎',
      candidateDateOfBirth: '2000-05-15',
    })
    expect(text).toContain('田中太郎さん(25歳)')
    expect(text).toContain('書類データは別途お送りいたします')
  })

  it('誕生日前は年齢が1つ若くなる', () => {
    const text = generateIntroductionText({
      companyName: '株式会社テスト',
      candidateName: '佐藤花子',
      candidateDateOfBirth: '2000-06-01', // まだ誕生日前
    })
    expect(text).toContain('佐藤花子さん(25歳)')
  })

  it('誕生日後は正しい年齢になる', () => {
    const text = generateIntroductionText({
      companyName: '株式会社テスト',
      candidateName: '佐藤花子',
      candidateDateOfBirth: '2000-01-01', // 既に誕生日を過ぎた
    })
    expect(text).toContain('佐藤花子さん(26歳)')
  })

  it('生年月日がない場合は「不明」と表示する', () => {
    const text = generateIntroductionText({
      companyName: '株式会社テスト',
      candidateName: '匿名さん',
    })
    expect(text).toContain('匿名さんさん(不明歳)')
  })

  it('履歴書URLがある場合はURLを含める', () => {
    const text = generateIntroductionText({
      companyName: '株式会社テスト',
      candidateName: '田中',
      resumeUrl: 'https://example.com/resume.pdf',
    })
    expect(text).toContain('https://example.com/resume.pdf')
    expect(text).not.toContain('別途お送り')
  })

  it('先生コメントがある場合は含める', () => {
    const text = generateIntroductionText({
      companyName: '株式会社テスト',
      candidateName: '田中',
      teacherComment: '真面目な生徒です',
    })
    expect(text).toContain('先生からのコメント')
    expect(text).toContain('真面目な生徒です')
  })
})
