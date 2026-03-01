// 求人・求職者の公開範囲制御サービス

import { Candidate } from '@/types/candidate'
import { Job } from '@/types/job'

/**
 * 求職者が特定の求人を閲覧可能か判定
 * 
 * @param candidate 求職者情報
 * @param job 求人情報
 * @returns 閲覧可能な場合はtrue
 */
export function canCandidateViewJob(
  candidate: Candidate,
  job: Job
): boolean {
  // 下書き・募集終了は閲覧不可（管理者のみ）
  if (job.status !== 'active') {
    return false
  }

  // 全体公開
  if (job.visibilityType === 'all') {
    return true
  }

  // 学校限定
  if (job.visibilityType === 'school_only') {
    return candidate.sourceType === 'inshokujin_univ'
  }

  // 個人用
  if (job.visibilityType === 'personal') {
    return false  // 個人用は求職者には表示されない（管理者のみ）
  }

  // デフォルトは閲覧不可
  return false
}

/**
 * 求職者向けに求人リストをフィルタリング
 * 
 * @param jobs 全求人リスト
 * @param candidate 求職者情報
 * @returns フィルタリング後の求人リスト
 */
export function filterJobsForCandidate(
  jobs: Job[],
  candidate: Candidate
): Job[] {
  return jobs.filter(job => canCandidateViewJob(candidate, job))
}

/**
 * 求人の公開範囲表示用ラベルを取得
 * 
 * @param job 求人情報
 * @returns 表示用ラベル
 */
export function getVisibilityLabel(job: Job): string {
  switch (job.visibilityType) {
    case 'all':
      return '全体公開'
    case 'school_only':
      return '🎓 飲食人大学限定'
    case 'personal':
      return '👤 個人用'
    default:
      return '非公開'
  }
}

/**
 * 求職者の出自表示用ラベルを取得
 * 
 * @param candidate 求職者情報
 * @returns 表示用ラベル（詳細情報含む）
 */
export function getCandidateSourceLabel(candidate: Candidate): string {
  const baseLabels = {
    inshokujin_univ: '飲食人大学',
    mid_career: '中途人材',
    referral: '紹介・リファラル',
    overseas: '海外人材'
  }
  
  const baseLabel = baseLabels[candidate.sourceType] || '不明'
  
  if (candidate.sourceDetail) {
    return `${baseLabel}（${candidate.sourceDetail}）`
  }
  
  return baseLabel
}
