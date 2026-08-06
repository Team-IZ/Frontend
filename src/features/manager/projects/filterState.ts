import type { ProjectSort } from './mockData'

/*
  목록 필터의 값. UI(`components/ProjectFilters.tsx`)와 파일을 가른 이유는 OP-03
  filterState.ts(D20)와 같다 — 한 파일이 컴포넌트와 값을 같이 export하면 React Fast
  Refresh가 그 파일에 상태 보존 핫리로드를 못 해준다(react/only-export-components).
*/

export const ALL = 'ALL'

export type FilterValues = {
  search: string
  classFilter: string
  curriculum: string
  status: string
  sort: ProjectSort
}

/** 기본값 — 정렬만 기본이 있다. 매니저는 마감이 급한 회차부터 본다(OP-03과 같은 이유) */
export const INITIAL_FILTERS: FilterValues = {
  search: '',
  classFilter: ALL,
  curriculum: ALL,
  status: ALL,
  sort: 'DUE',
}

/** 빈 결과가 "아직 없음"인지 "필터에 안 걸림"인지 — 문구가 갈린다(OP-03 isNarrowed와 같은 이유) */
export function isNarrowed(f: FilterValues): boolean {
  return f.search !== '' || f.classFilter !== ALL || f.curriculum !== ALL || f.status !== ALL
}

/**
 * 목록 필터를 세션 동안만 기억한다 — 상세로 갔다가 "← 프로젝트"로 돌아오면
 * 검색·상태·반·교안·정렬이 그대로 있어야 한다(면담 MG-04 filterState.ts와 같은
 * 판단). 모듈 전역값이라 SPA 화면 전환에서는 살아있고 새로고침(F5)하면 사라진다
 * — `localStorage`를 안 쓰는 이유도 동일(그 동작을 원한 게 아니라서).
 */
let sessionFilters: FilterValues | null = null

export function getSessionFilters(): FilterValues {
  return sessionFilters ?? INITIAL_FILTERS
}

export function setSessionFilters(next: FilterValues): void {
  sessionFilters = next
}
