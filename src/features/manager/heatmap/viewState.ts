import type { AttemptView, HeatmapLevel } from './_/api/types'

/*
  히트맵의 현재 드릴 상태(회차·계층·반·팀·응시 구분)를 세션 동안만 기억한다 —
  `interviews/filterState.ts`(MG04-6)와 같은 모듈 전역 패턴. 파일을 컴포넌트와
  가른 이유도 같다(React Fast Refresh, react/only-export-components).

  ⚠ 이걸 만든 이유는 필터 유지가 아니라 **뒤로가기 복귀**다(사용자 지시) — 팀원
  히트맵에서 교육생 이름을 클릭해 MG-06(교육생 상세)으로 갔다가 뒤로가기를 누르면
  `DetailHeader.tsx`가 `navigate(-1)`로 브라우저 히스토리를 되짚는데, 그때
  `/manager/heatmap`이 다시 마운트되면서 `useState` 기본값으로 리셋되면 "방금 보던
  그 팀원 화면"이 아니게 된다. 여기 저장해 두고 마운트 시 복원한다.

  ⚠ **빈 문자열이 「아직 안 정해졌다」의 값이다.** 회차·반·팀 id는 전부 서버가 주는
  UUID라 화면이 기본값을 지어낼 수 없다 — 목일 때는 `'1'`·`'A반'` 같은 상수를 박아
  뒀는데 실서버에서는 그런 값이 없다. 화면이 응답을 받은 뒤 첫 선택지로 채운다.
*/

export type HeatmapViewState = {
  /** `assessmentRoundId`. 비면 화면이 **서버가 준 마지막 회차**를 고른다 */
  round: string
  level: HeatmapLevel
  /** `CLASS` 계층에서는 안 쓴다. 그 아래에서는 서버가 필수로 요구한다 */
  classroomId: string
  teamId: string
  attemptView: AttemptView
}

export const INITIAL_VIEW: HeatmapViewState = {
  round: '',
  level: 'CLASS',
  classroomId: '',
  teamId: '',
  attemptView: 'INITIAL',
}

let sessionView: HeatmapViewState | null = null

export function getSessionView(): HeatmapViewState {
  return sessionView ?? INITIAL_VIEW
}

export function setSessionView(next: HeatmapViewState): void {
  sessionView = next
}
