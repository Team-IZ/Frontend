import type { RegistrationProgress } from './types'
import { pollMockProgress } from './mockDb'

/*
  ★ 경계 — 컴포넌트 · 훅은 이 파일만 본다. `mockDb`를 직접 열지 않는다
  (`docs/dev/mock-first-screens.md` §3-4). 연동 시 이 함수의 **시그니처는 그대로 두고
  몸통만 바꾼다**(같은 문서 §6-1) — 지금 화면 · 훅이 이 시그니처에 맞춰져 있다.
*/

export type GetRegistrationProgressParams = {
  cohortId: string
  batchRequestId: string
}

/**
 * 배치 등록 진행 상태 한 번 조회. 폴링 훅(`useRegistrationProgress`)이 이 함수를
 * 간격을 두고 반복 호출한다.
 *
 * ⚠ estimated 엔드포인트 — `GET /api/v0/cohorts/{cohortId}/trainees/registrations/
 * {batchRequestId}`(handoff 2026-08-16). 스펙이 아직 없어 생성 타입(`izClient`)을 못
 * 쓴다 — 실제 버전은 스펙이 온 뒤 `npm run api:pull`로 타입을 만들고 나서 채운다.
 * `cohortId`가 지금 목 로직엔 안 쓰이지만 실제 경로의 일부라 시그니처에는 남겨 둔다.
 */
export async function getRegistrationProgress({
  batchRequestId,
}: GetRegistrationProgressParams): Promise<RegistrationProgress> {
  // ===== Mock 버전 (현재 활성) =====
  return pollMockProgress(batchRequestId)
  // ===== 실제 버전 (스펙 도착 후 채운다) =====
  // return unwrap<RegistrationProgress>(
  //   izClient.GET('/api/v0/cohorts/{cohortId}/trainees/registrations/{batchRequestId}', {
  //     params: { path: { cohortId, batchRequestId } },
  //   }) as never,
  // )
}
