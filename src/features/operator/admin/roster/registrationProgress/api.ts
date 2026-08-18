import type { RegistrationProgress } from './types'
import { findTraineeRegistrationProgress } from '@/api/member/memberApi'

/*
  ★ 경계 — 컴포넌트 · 훅은 이 파일만 본다(`docs/dev/mock-first-screens.md` §3-4).
  이슈 263으로 목(`mockDb.ts`, 삭제됨)에서 실제 API로 바꿨다 — **시그니처는 그대로 두고
  몸통만 바꿨다**(같은 문서 §6-1). 지금 화면 · 훅이 이 시그니처에 맞춰져 있어 그대로 둔다.
*/

export type GetRegistrationProgressParams = {
  cohortId: string
  batchRequestId: string
}

/**
 * 배치 등록 진행 상태 한 번 조회. 폴링 훅(`useRegistrationProgress`)이 이 함수를
 * 간격을 두고 반복 호출한다.
 *
 * `GET /api/v0/cohorts/{cohortId}/trainees/registrations/{batchRequestId}` —
 * 생성 함수(`memberApi.ts`의 `findTraineeRegistrationProgress`)를 그대로 부른다.
 */
export function getRegistrationProgress({
  cohortId,
  batchRequestId,
}: GetRegistrationProgressParams): Promise<RegistrationProgress> {
  return findTraineeRegistrationProgress({ path: { cohortId, batchRequestId } })
}
