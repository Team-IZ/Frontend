/*
  MG-07 목록이 읽는 모양.

  **목 계약(`mockData.ts`)을 그대로 옮기지 않는다.** 대조표는
  `docs/dev/screens/mg-07-situations.md` §2에 있고, 버린 축이 셋이다 —
  `classes: ClassProgress[]`(반별 7지표) · `interviewCount` · `attendable`.
*/

/** 서버 값 그대로. 목은 `DONE`이었는데 서버가 `CLOSED`다 — 이름만 다르다 */
export type ProjectStatus = 'PLANNED' | 'RUNNING' | 'CLOSED'

/** `READINESS`(준비 필요 순, 기본) · `DUE_SOON`(마감 임박) · `START_DATE`(시작 이른 순) */
export type ProjectSort = 'READINESS' | 'DUE_SOON' | 'START_DATE'

/** 서버가 주는 두 종뿐이다 — 목의 「면담 N명」은 자리가 없다 */
export type ActionType = 'UNSUBMITTED_TEAMS' | 'ANALYSIS_FAILED_TEAMS'

export type ProjectAction = {
  classId: string
  /** 반 이름을 서버가 실어 준다 — 화면이 반 목록에서 다시 찾지 않는다 */
  className: string
  type: ActionType
  teamCount: number
}

/** 담당 반이 둘 이상일 때 **진행률이 가장 낮은 반**. 반이 하나면 `null`(스펙 명시) */
export type LaggingClass = {
  classId: string
  className: string
  assessedCount: number
  targetTraineeCount: number
}

export type ProjectProgress = {
  assessed: number
  target: number
  laggingClass: LaggingClass | null
}

export type ProjectRow = {
  id: string
  name: string
  status: ProjectStatus
  /** 파일명만 온다 — 버전이 없다(요청서 §5) */
  curricula: string[]
  /** 확정 전이면 **빈 배열**이다 — `null`이 아니라 길이로 가른다 */
  concepts: string[]
  conceptCandidateCount: number
  /** **날짜만**(`2026-08-03`) — 시각이 없다 */
  startDate: string | null
  /** 시각까지 온다(`2026-08-21T14:59:00Z`) */
  dueAt: string | null
  /**
   * 담당 반 진행. **`null`인 조건이 스펙에 적혀 있다** — 빅프로젝트거나(개인 커밋
   * 영역이라 반별 집계 대상이 아니다) `PLANNED`거나 아직 회차가 없을 때다.
   * 「모른다」와 「0명」이 다르므로 `?? 0`으로 메우지 않는다.
   */
  progress: ProjectProgress | null
  actions: ProjectAction[]
}

export type ProjectListView = {
  rows: ProjectRow[]
  /** **필터 적용 후** 개수 — `rows.length`와 같다 */
  total: number
  /** 상태별 개수 — **필터를 안 탄다.** 상태 칩이 자기 자신을 거르면 분포를 못 본다 */
  counts: Record<string, number>
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNED: '예정',
  RUNNING: '진행 중',
  CLOSED: '종료',
}

export const SORT_LABEL: Record<ProjectSort, string> = {
  READINESS: '준비 필요 순',
  DUE_SOON: '마감 임박 순',
  START_DATE: '시작 이른 순',
}
