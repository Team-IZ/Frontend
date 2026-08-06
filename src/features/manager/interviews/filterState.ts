import { ROUND_OPTIONS, type RoundId } from './mockData'

/*
  목록 필터의 값. UI(`components/InterviewFilters.tsx`)와 파일을 가른 이유는
  MG-07 filterState.ts(D20)와 같다 — 한 파일이 컴포넌트와 값을 같이 export하면
  React Fast Refresh가 그 파일에 상태 보존 핫리로드를 못 해준다
  (react/only-export-components).

  정렬 값이 없다 — 정의서 §3 "이미 급한 순으로 온다, 사용자가 고를 일이 아니다"라
  고정값이라 필터로 두지 않는다(`mockData.ts`의 `sortCases`가 갖는다).
*/

export const ALL = 'ALL'

export type FilterValues = {
  round: RoundId
  search: string
  /** 'ALL' | InterviewCaseStatus */
  status: string
  /** 'ALL' | CaseRisk['type'] */
  riskType: string
  /** 'ALL' | ClassName */
  classFilter: string
}

/**
 * 기본 회차 — **가장 마지막에 생성된 회차**(사용자 지시, `ROUND_OPTIONS` 끝값).
 * `'3'` 하드코딩이었던 걸 회차가 늘어도 안 깨지게 동적으로 바꿨다.
 */
export const DEFAULT_ROUND: RoundId = ROUND_OPTIONS[ROUND_OPTIONS.length - 1].value

export const INITIAL_FILTERS: FilterValues = {
  round: DEFAULT_ROUND,
  search: '',
  status: ALL,
  riskType: ALL,
  classFilter: ALL,
}

/** 빈 결과가 "아직 없음"인지 "필터에 안 걸림"인지 — 문구가 갈린다(MG-07 isNarrowed와 같은 이유) */
export function isNarrowed(f: FilterValues): boolean {
  return f.search !== '' || f.status !== ALL || f.riskType !== ALL || f.classFilter !== ALL
}

/**
 * 목록 필터를 세션 동안만 기억한다 — 브리프로 갔다가 `← 목록으로`로 돌아오면
 * 회차·검색·상태가 그대로 있어야 한다는 사용자 지시. 모듈 전역 변수라 **SPA 안
 * 화면 전환에서는 살아있고, 새로고침(F5)하면 모듈이 다시 로드되며 사라진다** —
 * 정확히 그 동작을 원한 것이라 `localStorage` 대신 이 방식을 썼다(그리고
 * `InterviewListScreen`은 필터 없는 URL 하나만 쓰므로 URL 쿼리에 실으면 새로고침
 * 에도 남아 요구와 어긋난다).
 */
let sessionFilters: FilterValues | null = null

export function getSessionFilters(): FilterValues {
  return sessionFilters ?? INITIAL_FILTERS
}

export function setSessionFilters(next: FilterValues): void {
  sessionFilters = next
}
