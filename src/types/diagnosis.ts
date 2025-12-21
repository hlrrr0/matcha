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
  topValues: string[] // TOP3の価値観ID
  completedAt: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}
