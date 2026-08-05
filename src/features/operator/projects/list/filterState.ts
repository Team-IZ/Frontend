import type { ProjectSort } from '../types'

/*
  목록 필터의 **값**. UI(`ProjectFilters.tsx`)와 파일을 가른 이유는 D20과 같다 —
  한 파일이 컴포넌트와 값을 같이 export하면 React Fast Refresh가 그 파일에 상태 보존
  핫리로드를 못 해준다. 필터를 만지는 동안 입력값이 매번 날아간다.

  값이 화면 쪽에 있는 이유 — 이 조건들은 **서버 쿼리로 나가는 것**이고 상세(OP-04)와는
  무관하다. 상세가 쓰는 계약은 `../types`에 있다.
*/

/** "전체" 선택지. 서버 쿼리에서는 이 값 대신 필드를 빼서 보낸다 */
export const ALL = 'ALL'

export type FilterValues = {
  search: string
  curriculumId: string
  status: string
  sort: ProjectSort
}

/** 기본값 — **정렬만 기본이 있다.** 오퍼레이터는 준비를 하는 사람이라 준비 필요 순이 먼저 */
export const INITIAL_FILTERS: FilterValues = {
  search: '',
  curriculumId: ALL,
  status: ALL,
  sort: 'PREP_FIRST',
}

/**
 * 목록을 좁히는 조건이 하나라도 걸려 있나. 빈 결과가 **"아직 없음"인지 "필터에 안
 * 걸림"인지**를 가르는 판정이라 문구가 갈린다.
 *
 * 정렬(`sort`)은 제외한다 — 순서를 바꾸는 것이지 줄이는 것이 아니다.
 */
export function isNarrowed(f: FilterValues): boolean {
  return f.search !== '' || f.curriculumId !== ALL || f.status !== ALL
}
