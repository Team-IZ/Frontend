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

/*
  ─── 조건은 주소가 갖는다 ──────────────────────────────────────
  `useState`에 두면 **상세를 갔다 뒤로 오는 순간 전부 초기화된다**(op-03-situations §2-6).
  좁혀 놓고 회차 하나를 열어 본 뒤 돌아오는 것이 이 화면의 주 동선인데, 그때마다 조건이
  사라져 사용자는 목록이 갱신된 줄 안다. 새로고침·링크 공유도 같은 이유로 따라온다
  (스코프를 URL에 두는 것과 같은 근거 — async-states §5).

  **기본값은 주소에 안 쓴다.** `?status=ALL&sort=PREP_FIRST`처럼 아무것도 안 고른 상태가
  주소에 남으면 "무엇을 골랐나"를 주소에서 읽을 수 없다.
*/

/** 주소 → 필터 값. 없는 키는 기본값이다 */
export function fromSearchParams(sp: URLSearchParams): FilterValues {
  const sort = sp.get('sort')
  return {
    search: sp.get('q') ?? '',
    curriculumId: sp.get('curriculum') ?? ALL,
    status: sp.get('status') ?? ALL,
    sort: (sort as ProjectSort) || INITIAL_FILTERS.sort,
  }
}

/** 필터 값 → 주소. 기본값인 키는 뺀다 */
export function toSearchParams(f: FilterValues): URLSearchParams {
  const sp = new URLSearchParams()
  if (f.search) sp.set('q', f.search)
  if (f.curriculumId !== ALL) sp.set('curriculum', f.curriculumId)
  if (f.status !== ALL) sp.set('status', f.status)
  if (f.sort !== INITIAL_FILTERS.sort) sp.set('sort', f.sort)
  return sp
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
