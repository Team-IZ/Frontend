import type { AccountStatus } from './_/api/types'

/*
  목록 필터의 값. UI(`TraineeListScreen.tsx`)와 파일을 가른 이유는 OP-03
  filterState.ts(D20)와 같다 — 한 파일이 컴포넌트와 값을 같이 export하면 React Fast
  Refresh가 그 파일에 상태 보존 핫리로드를 못 해준다(react/only-export-components).
*/

export const ALL = 'ALL'

/**
 * 정렬 — **서버가 가진 4종 그대로다**(`TraineeRosterSort`).
 *
 * 목에 있던 `반`·`2단 이하` 정렬은 없앴다. 서버에 없는 기준이라 화면이 정렬하면
 * **그 쪽 안에서만 맞는 정렬**이 되고(26명이 두 쪽으로 갈린다), 담당 반은 매니저마다
 * 하나뿐인 경우가 많아 반 정렬은 애초에 할 일이 없다. `위험`이 `2단 이하 많은 순`을
 * 대체한다 — 서버가 위험 유형까지 보고 정렬한다.
 */
export type TraineeSort = 'NAME' | 'RECENT_ENROLLED' | 'RISK' | 'EXCELLENCE'

export type FilterValues = {
  /** `null`이면 **서버가 「이번 회차」를 고른다**(첫 진입). 응답으로 실제 값이 돌아온다 */
  round: string | null
  search: string
  classFilter: string
  accountFilter: 'ALL' | AccountStatus
  sort: TraineeSort
  /** 0부터 시작 */
  page: number
}

export const INITIAL_FILTERS: FilterValues = {
  round: null,
  search: '',
  classFilter: ALL,
  accountFilter: 'ACTIVE',
  sort: 'NAME',
  page: 0,
}

/**
 * 목록 필터를 세션 동안만 기억한다 — 상세로 갔다가 목록으로 돌아오면 회차·검색·반·
 * 계정·정렬이 그대로 있어야 한다(면담 MG-04와 같은 지시). 모듈 전역값이라 SPA 화면
 * 전환에서는 살아있고 새로고침(F5)하면 사라진다.
 *
 * 면담과 달리 **회차를 바꿔도 다른 필터는 초기화하지 않는다** — 면담은 회차마다
 * 케이스 구성 자체가 달라지지만, 교육생 명부는 회차를 바꿔도 모집단이 그대로고
 * 그 회차의 도달·응시 열만 바뀐다. 검색·반·계정 필터를 지울 이유가 없다.
 */
let sessionFilters: FilterValues | null = null

export function getSessionFilters(): FilterValues {
  return sessionFilters ?? INITIAL_FILTERS
}

export function setSessionFilters(next: FilterValues): void {
  sessionFilters = next
}
