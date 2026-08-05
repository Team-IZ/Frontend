import type { SubmissionView } from './types'

/*
  ⚠️ Mock 전용 데이터 — 백엔드 연동 시 이 파일을 통째로 삭제하세요.
  마감·발행일은 now + 오프셋으로 만든다(trainee/home/mockDb.ts와 같은 이유).
*/

const HOUR = 3_600_000
const DAY = 86_400_000

const CONTENT = {
  repoUrl: 'github.com/team-a/miniproject-3',
  branch: 'main',
  lastCommit: { sha: 'a3f9c21', message: 'feat: HITL 재시도 상한 추가', at: '07-13 22:12' },
}

export function buildSubmissionFixture(
  status: SubmissionView['status'],
  now: number,
): SubmissionView {
  const roundLabel = '미프 3차'
  switch (status) {
    case 'DRAFT':
      return {
        status,
        roundLabel,
        submissionDueAt: new Date(now + DAY + 4 * HOUR).toISOString(),
      }
    case 'ANALYZING':
      return {
        status,
        roundLabel,
        submissionDueAt: new Date(now + DAY).toISOString(),
        submittedAt: new Date(now - 20 * 60_000).toISOString(),
        content: CONTENT,
      }
    case 'READY':
      return {
        status,
        roundLabel,
        submissionDueAt: new Date(now + DAY).toISOString(),
        analyzedAt: new Date(now - HOUR).toISOString(),
        verifyClosesAt: new Date(now + 23 * HOUR).toISOString(),
        content: CONTENT,
      }
    case 'LOCKED':
      return {
        status,
        roundLabel,
        submissionDueAt: new Date(now + DAY).toISOString(),
        analyzedAt: new Date(now - 2 * HOUR).toISOString(),
        content: CONTENT,
      }
    case 'ANALYSIS_FAILED':
      return {
        status,
        roundLabel,
        submissionDueAt: new Date(now + 4 * HOUR).toISOString(),
        content: CONTENT,
        failureReason: '저장소는 열렸지만 분석할 코드를 찾지 못했습니다.',
      }
    case 'SUBMISSION_CLOSED':
      return {
        status,
        roundLabel,
        submissionDueAt: new Date(now - 2 * HOUR).toISOString(),
      }
  }
}
