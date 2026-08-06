import type { RoundId } from './mockData'

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

export const INITIAL_FILTERS: FilterValues = {
  round: '3',
  search: '',
  status: ALL,
  riskType: ALL,
  classFilter: ALL,
}

/** 빈 결과가 "아직 없음"인지 "필터에 안 걸림"인지 — 문구가 갈린다(MG-07 isNarrowed와 같은 이유) */
export function isNarrowed(f: FilterValues): boolean {
  return f.search !== '' || f.status !== ALL || f.riskType !== ALL || f.classFilter !== ALL
}
