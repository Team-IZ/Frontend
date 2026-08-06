import { ROUND_OPTIONS, type AccountStatus, type RoundId } from './mockData'

/*
  목록 필터의 값. UI(`TraineeListScreen.tsx`)와 파일을 가른 이유는 OP-03
  filterState.ts(D20)와 같다 — 한 파일이 컴포넌트와 값을 같이 export하면 React Fast
  Refresh가 그 파일에 상태 보존 핫리로드를 못 해준다(react/only-export-components).
*/

export const ALL = 'ALL'

export type TraineeSort = 'NAME' | 'CLASS' | 'ACE_COUNT' | 'LOW_COUNT'

export type FilterValues = {
  round: RoundId
  search: string
  classFilter: string
  accountFilter: 'ALL' | AccountStatus
  sort: TraineeSort
}

/**
 * 기본 회차 — **가장 마지막에 생성된 회차**(면담 MG-04와 같은 지시, `ROUND_OPTIONS`
 * 끝값). 회차가 늘어도 안 깨지게 동적으로 둔다.
 */
export const DEFAULT_ROUND: RoundId = ROUND_OPTIONS[ROUND_OPTIONS.length - 1].value

export const INITIAL_FILTERS: FilterValues = {
  round: DEFAULT_ROUND,
  search: '',
  classFilter: ALL,
  accountFilter: 'ACTIVE',
  sort: 'NAME',
}

/**
 * 목록 필터를 세션 동안만 기억한다 — 상세로 갔다가 목록으로 돌아오면 회차·검색·반·
 * 계정·정렬이 그대로 있어야 한다(면담 MG-04와 같은 지시). 모듈 전역값이라 SPA 화면
 * 전환에서는 살아있고 새로고침(F5)하면 사라진다.
 *
 * 면담과 달리 **회차를 바꿔도 다른 필터는 초기화하지 않는다** — 면담은 회차마다
 * 케이스 구성 자체가 달라지지만, 교육생 명부는 회차를 바꿔도 모집단(21명)이 그대로고
 * 그 회차의 도달·응시 열만 바뀐다. 검색·반·계정 필터를 지울 이유가 없다.
 */
let sessionFilters: FilterValues | null = null

export function getSessionFilters(): FilterValues {
  return sessionFilters ?? INITIAL_FILTERS
}

export function setSessionFilters(next: FilterValues): void {
  sessionFilters = next
}
