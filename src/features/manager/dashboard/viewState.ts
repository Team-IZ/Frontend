import { ROUND_OPTIONS, type RoundId } from './mockData'

/*
  대시보드의 현재 회차 select를 세션 동안만 기억한다 — `heatmap/viewState.ts`와
  같은 패턴, 같은 이유(사용자 지시).

  ⚠ 이걸 만든 이유는 필터 유지가 아니라 **뒤로가기 복귀**다 — [브리프 열기]로
  면담 화면에 갔다가(`InterviewBriefScreen`이 나가는 길에 전부 `navigate(-1)`을
  쓴다) 뒤로가기를 누르면 `DashboardScreen`이 다시 마운트되며 `useState` 기본값
  (가장 최근 프로젝트)으로 리셋된다 — 그러면 "방금 보던 그 회차"가 아니게
  된다. 여기 저장해 두고 마운트 시 복원하면 뒤로가기가 실제로 "그 회차 그대로"가
  된다. [체크]는 화면 이동이 없어 원래도 리셋될 일이 없지만, 같은 회차 상태를
  다루니 여기서 같이 관리한다.
*/

export type DashboardViewState = {
  round: RoundId
}

/*
  ⚠ round는 하드코딩 대신 `ROUND_OPTIONS`의 마지막 항목에서 뽑는다(사용자
  지시) — "기본값은 가장 최근에 생성된 프로젝트". `ROUND_OPTIONS`는 생성
  순서대로 정렬돼 있으니 마지막이 곧 최신이다(`heatmap/viewState.ts`와 같은
  규약). 새로고침도 이 모듈 자체가 다시 로드되며 `sessionView`가 `null`로
  리셋되니 최초 진입과 똑같이 `INITIAL_VIEW`를 탄다.

  이 값이 아직 시나리오가 없는 회차일 수도 있다 — 지금 데이터로는 미프 4차가
  그렇다(`mockData.ts`의 `getInbox` 참고, 미프 3차만 실제 데이터가 있다). 그때는
  화면이 곧바로 "진행 중인 프로젝트가 없습니다" 빈 상태를 보여주는 게 맞다(실제로
  가장 최근 프로젝트가 아직 시작 전이라는 뜻이니까) — 굳이 데이터가 있는 회차로
  되돌려 보여주지 않는다(heatmap과 같은 원칙).
*/
export const INITIAL_VIEW: DashboardViewState = {
  round: ROUND_OPTIONS[ROUND_OPTIONS.length - 1].value,
}

let sessionView: DashboardViewState | null = null

export function getSessionView(): DashboardViewState {
  return sessionView ?? INITIAL_VIEW
}

export function setSessionView(next: DashboardViewState): void {
  sessionView = next
}
