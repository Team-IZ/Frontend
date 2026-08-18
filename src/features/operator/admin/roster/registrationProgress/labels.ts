import type { RegistrationBatchStatus } from './types'

/*
  상태값 → 화면 문구 · 배지 색. 서버 계약이 아니라 화면이 정한 표시 규칙이므로
  연동 뒤에도 남는다(`docs/dev/mock-first-screens.md` §3-1).

  이슈 263에서 목 3단계(`WAITING`/`IN_PROGRESS`/`COMPLETED`)를 실제 상태값
  (`RUNNING`/`PARTIAL`/`SUCCEEDED`)으로 바꿨다.

  ⚠ 새 사용자 노출 문구다 — 최종 확정은 팀장 확인 뒤로 남는다(CLAUDE.md §7).
*/
export const REGISTRATION_BATCH_STATUS_LABEL: Record<RegistrationBatchStatus, string> = {
  RUNNING: '발송 중',
  PARTIAL: '일부 실패',
  SUCCEEDED: '완료',
}

export const REGISTRATION_BATCH_STATUS_BADGE_VARIANT: Record<
  RegistrationBatchStatus,
  'neutral' | 'info' | 'success' | 'warning'
> = {
  RUNNING: 'info',
  PARTIAL: 'warning',
  SUCCEEDED: 'success',
}
