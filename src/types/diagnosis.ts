import { Timestamp } from 'firebase/firestore'

export interface DiagnosisAnswer {
  questionId: number
  selectedValue: string
}

export interface DiagnosisResult {
  valueId: string
  label: string
  score: number
}

export interface Diagnosis {
  id?: string
  candidateId: string
  answers: DiagnosisAnswer[]
  results: DiagnosisResult[]
  topValues: DiagnosisResult[] // TOP3の価値観（結果データ）
  completedAt: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}
