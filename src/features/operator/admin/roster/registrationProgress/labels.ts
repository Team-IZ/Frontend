import type { RegistrationBatchStatus } from './types'

/*
  상태값 → 화면 문구 · 배지 색. 서버 계약이 아니라 화면이 정한 표시 규칙이므로
  연동 뒤에도 남는다(`docs/dev/mock-first-screens.md` §3-1).

  #224는 `AddRosterDialog.tsx` 연결 전 단계라(이슈 "하지 않는 것") 지금 값은 실제
  사용자 노출 문구로 확정된 것이 아니다 — 연결할 때 팀장 확인 먼저(CLAUDE.md §7).
*/
export const REGISTRATION_BATCH_STATUS_LABEL: Record<RegistrationBatchStatus, string> = {
  WAITING: '대기',
  IN_PROGRESS: '발송 중',
  COMPLETED: '완료',
}

export const REGISTRATION_BATCH_STATUS_BADGE_VARIANT: Record<
  RegistrationBatchStatus,
  'neutral' | 'info' | 'success'
> = {
  WAITING: 'neutral',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
}
