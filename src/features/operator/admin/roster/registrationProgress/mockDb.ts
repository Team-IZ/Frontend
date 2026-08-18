// ⚠️ Mock 전용 데이터 — 백엔드 연동 시 이 파일을 통째로 삭제하세요.

import type { RegistrationProgress } from './types'

/** 배치 하나가 나눠 보내는 인원 단위 — handoff 2026-08-16 "100명 단위 배치" 실측값 */
const BATCH_SIZE = 100

/**
 * 배치 하나를 처리하는 데 걸리는 것으로 치는 시간(ms).
 *
 * ⚠ estimated — 실제 처리 속도는 미확인이다. 프리뷰(`RosterProgressPreview`)에서
 * 눈으로 진행이 보이도록 임의로 잡은 값 — 스펙에 실제 처리 속도가 나오면 의미 없어지는
 * 값이라 실제 연동 시 이 파일째 지워진다.
 */
const MS_PER_BATCH = 1500

type MockBatchState = {
  total: number
  /** 이 배치가 처음 폴링된 실제 시각(ms) — 이때부터 시간이 얼마나 지났는지로 진행률을 잰다 */
  startedAtMs: number
}

/**
 * `batchRequestId`별 시작 시각. **진행 인원 수 자체는 저장하지 않는다** — 아래 참고.
 */
const stateByBatch = new Map<string, MockBatchState>()

/**
 * 이 배치가 처음 폴링되는 순간의 총 인원.
 *
 * ⚠ 실제 총 인원은 등록 응답(`registerTrainees_Response.registeredCount`)에서 와야
 * 하지만, #224는 `AddRosterDialog.tsx`에 아직 안 붙어 있어(이슈 범위 밖) 그 값을
 * 받을 자리가 없다. 대신 `batchRequestId`에 심은 숫자를 총 인원으로 읽는다 —
 * 프리뷰가 "8명"·"450명" 같은 시나리오를 아이디만으로 고를 수 있게 하려는 목적이다.
 * 숫자가 없으면 8명으로 기본값을 둔다.
 */
function seed(batchRequestId: string): MockBatchState {
  const match = /(\d+)/.exec(batchRequestId)
  const total = match ? Math.max(1, Number(match[1])) : 8
  return { total, startedAtMs: Date.now() }
}

/**
 * 폴링 한 번.
 *
 * ⚠ **호출 횟수가 아니라 실제 경과 시간으로 진행률을 계산한다 — 처음엔 "부를 때마다
 * `BATCH_SIZE`만큼 더 보낸 것으로 친다"로 짰다가 실측으로 걸린 버그를 고친 것이다.**
 *
 * React StrictMode(dev 전용, `main.tsx`)는 effect를 마운트 시 두 번 부른다 — 첫 번째
 * 호출은 곧바로 정리되고 버려지지만, **그 호출이 이미 이 함수를 한 번 부른 뒤였다.**
 * 예전 코드는 "부르면 진행이 는다"였기 때문에, 버려지는 첫 번째 호출도 진행을 한 단계
 * 옮겨 버렸다 — 그 결과가 실제로 컴포넌트 응답에 실리는 것은 두 번째(살아남는) 호출의
 * 결과라, 마운트 한 번에 진행이 두 단계씩 튀는 것으로 실측됐다(100 → 300).
 *
 * **진짜 원인은 이 함수가 GET인데 쓰기(WRITE)처럼 굴었던 것이다.** 실제 백엔드의
 * 상태 조회는 몇 번을 물어봐도 상태를 안 바꾼다(멱등) — 배치는 폴링과 무관하게 뒤에서
 * 계속 처리되고, 폴링은 그 스냅샷을 읽기만 한다. 그래서 여기서도 **시작 시각만
 * 기록해 두고, 부를 때마다 그 시각부터 지금까지의 시간으로 진행률을 다시 계산한다**
 * — 같은 순간에 몇 번을 불러도(StrictMode든 재시도든) 항상 같은 값이 나온다.
 *
 * ⚠ **이 설계에서는 폴링을 멈춰도 "시간"은 계속 흐른다** — 언마운트해 있던 10초
 * 뒤에 다시 보면 그 10초만큼 진행돼 있는 게 정상이다(실제 백엔드가 그렇다). "언마운트
 * 중엔 요청 자체가 안 나가는지"를 보려면 진행 인원 숫자가 아니라 아래 `console.warn`
 * 로그가 그 구간에 찍히는지로 확인해야 한다.
 */
export function pollMockProgress(batchRequestId: string): RegistrationProgress {
  // console.warn — 이 프로젝트 oxlint 규칙(no-console)이 warn·error만 허용한다.
  // 폴링이 실제로 몇 번·언제 불렸는지 눈으로 확인하기 위한 dev 전용 로그 —
  // mockDb.ts 전체가 연동 시 삭제되므로 같이 없어진다.
  console.warn('[registrationProgress mock] poll', batchRequestId, new Date().toISOString())

  const state = stateByBatch.get(batchRequestId) ?? seed(batchRequestId)
  stateByBatch.set(batchRequestId, state)

  const elapsedMs = Date.now() - state.startedAtMs
  const batchesElapsed = Math.floor(elapsedMs / MS_PER_BATCH)
  const sent = Math.min(state.total, batchesElapsed * BATCH_SIZE)
  const status: RegistrationProgress['status'] =
    sent === 0 ? 'WAITING' : sent >= state.total ? 'COMPLETED' : 'IN_PROGRESS'

  return { batchRequestId, status, total: state.total, sent, failed: 0 }
}
