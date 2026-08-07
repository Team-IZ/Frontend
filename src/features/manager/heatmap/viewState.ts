import {
  ROUND_OPTIONS,
  type ClassName,
  type HeatmapLevel,
  type RoundId,
  type SortMode,
} from './mockData'

/*
  히트맵의 현재 드릴 상태(회차·계층·반·팀·정렬·필터)를 세션 동안만 기억한다 —
  `interviews/filterState.ts`(MG04-6)와 같은 모듈 전역 패턴. 파일을 컴포넌트와
  가른 이유도 같다(React Fast Refresh, react/only-export-components).

  ⚠ 이걸 만든 이유는 필터 유지가 아니라 **뒤로가기 복귀**다(사용자 지시) — 개인
  히트맵에서 교육생 이름을 클릭해 MG-06(교육생 상세)으로 갔다가 뒤로가기를 누르면
  `DetailHeader.tsx`가 `navigate(-1)`로 브라우저 히스토리를 그대로 되짚는데, 그때
  `/manager/heatmap`이 다시 마운트되면서 `HeatmapScreen`의 `useState` 기본값(반별·
  1반)으로 리셋되면 "방금 보던 그 팀원 화면"이 아니게 된다. 여기 저장해 두고
  마운트 시 복원하면 뒤로가기가 실제로 "그 화면 그대로"가 된다.
*/

export type HeatmapViewState = {
  round: RoundId
  level: HeatmapLevel
  classFilter: ClassName
  teamFilter: string
  sort: SortMode
  problemOnly: boolean
  riskOnly: boolean
}

/*
  ⚠ `round`는 하드코딩 대신 `ROUND_OPTIONS`의 마지막 항목에서 뽑는다(사용자 지시,
  이번 라운드) — "새로고침·최초 진입 둘 다 항상 가장 최근에 만들어진 프로젝트가
  기본값"이어야 한다. `ROUND_OPTIONS`는 생성 순서대로 정렬돼 있으니 마지막이 곧
  최신이다. 새로고침도 이 모듈 자체가 다시 로드되며 `sessionView`가 `null`로
  리셋되니 최초 진입과 똑같이 `INITIAL_VIEW`를 타 같은 결과가 된다.

  이 값이 아직 결과가 없는 회차(PENDING)일 수도 있다 — 지금 데이터로는 4차가
  그렇다. 그때는 화면이 곧바로 "이 회차는 아직 결과가 없어요" 빈 상태를 보여주는
  게 맞다(실제로 가장 최근 프로젝트가 아직 안 끝났다는 뜻이니까) — 굳이 결과가
  있는 회차로 되돌려 보여주지 않는다.
*/
export const INITIAL_VIEW: HeatmapViewState = {
  round: ROUND_OPTIONS[ROUND_OPTIONS.length - 1].value,
  level: 'class',
  classFilter: 'A반',
  teamFilter: '',
  sort: 'DEFAULT',
  problemOnly: false,
  riskOnly: false,
}

let sessionView: HeatmapViewState | null = null

export function getSessionView(): HeatmapViewState {
  return sessionView ?? INITIAL_VIEW
}

export function setSessionView(next: HeatmapViewState): void {
  sessionView = next
}
