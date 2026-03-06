import { describe, it, expect } from 'vitest'
import { VALUES, QUESTIONS, getValueLabel, getQuestionById } from '../diagnosis-questions'

describe('diagnosis-questions', () => {
  describe('VALUES', () => {
    it('10個の価値観が定義されている', () => {
      expect(VALUES).toHaveLength(10)
    })

    it('全てidとlabelを持つ', () => {
      VALUES.forEach(v => {
        expect(v.id).toBeTruthy()
        expect(v.label).toBeTruthy()
      })
    })
  })

  describe('QUESTIONS', () => {
    it('25問定義されている', () => {
      expect(QUESTIONS).toHaveLength(25)
    })

    it('IDが1から25まで連番', () => {
      QUESTIONS.forEach((q, i) => {
        expect(q.id).toBe(i + 1)
      })
    })

    it('全ての選択肢のvalueがVALUESに存在する', () => {
      const validIds = new Set(VALUES.map(v => v.id))
      QUESTIONS.forEach(q => {
        expect(validIds.has(q.optionA.value)).toBe(true)
        expect(validIds.has(q.optionB.value)).toBe(true)
      })
    })

    it('同じ質問のoptionAとoptionBは異なるvalueを持つ', () => {
      QUESTIONS.forEach(q => {
        expect(q.optionA.value).not.toBe(q.optionB.value)
      })
    })
  })

  describe('getValueLabel', () => {
    it('存在するIDのラベルを返す', () => {
      expect(getValueLabel('salary')).toBe('給与')
      expect(getValueLabel('holidays')).toBe('休日数（年間休日）')
    })

    it('存在しないIDはそのまま返す', () => {
      expect(getValueLabel('unknown')).toBe('unknown')
    })
  })

  describe('getQuestionById', () => {
    it('存在するIDの質問を返す', () => {
      const q = getQuestionById(1)
      expect(q).toBeDefined()
      expect(q!.id).toBe(1)
    })

    it('存在しないIDはundefinedを返す', () => {
      expect(getQuestionById(999)).toBeUndefined()
    })
  })
})
