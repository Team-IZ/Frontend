/*
  MG-02 히트맵이 읽는 모양 — **화면 어휘다.**

  목 계약과 갈린 것이 셋이다(integration-process §3).

  ① 이름까지 같다 — 계층 3단·집단 미달(⚠)·도달 5단 스케일
  ② 서버가 낫다 — 목은 개인 셀을 `levels[3]` 고정 배열로 뒀는데 서버는 `cells[]`이고
     **셀마다 무효·미응시·중단 인원을 따로 센다.** 반 평균에서 「누가 빠졌나」를
     화면이 다시 셀 필요가 없다
  ③ 목이 지어냈다 — `sort`(기본/낮은 순)·`problemOnly`·`riskOnly` 세 필터.
     서버에 그 파라미터가 없다(§api.ts 참고)
*/

/** 계층 — 서버 값 그대로. 목은 소문자였다(`class`·`team`·`person`) */
export type HeatmapLevel = 'CLASS' | 'TEAM' | 'TRAINEE'

/** 최초 응시 / 다시 보기 — 목에 없던 축이다 */
export type AttemptView = 'INITIAL' | 'REVIEW'

export type HeatmapConcept = {
  problemNo: number
  teachesId: string
  /** 격자 **열 이름** */
  conceptName: string
  /** 집단 미달 — 열 머리에 ⚠. 판정 집단은 계층마다 다르다(서버가 정한다) */
  groupShortfall: boolean
}

export type HeatmapCell = {
  problemNo: number
  /** 평균 도달(반·팀) 또는 그 사람의 도달(개인). 색 스케일이 이 값을 쓴다 */
  value: number
  status: string
  /** 이 셀 평균의 분모 */
  validCount: number
  notAttendedCount: number
  invalidCount: number
  interruptedCount: number
  /** 반 행에만 온다 */
  groupShortfall: boolean
}

export type HeatmapRow = {
  /** 합계 행에는 없다 */
  rowId: string | null
  rowName: string | null
  /** 개인 행에는 없다(인원 개념이 아니다) */
  memberCount: number | null
  cells: HeatmapCell[]
}

export type HeatmapView = {
  level: HeatmapLevel
  attemptView: AttemptView
  /** 지금 보고 있는 반·팀. `CLASS` 계층에는 없다 */
  scope: {
    classroomId: string
    classroomName: string
    teamId: string | null
    teamName: string | null
  } | null
  concepts: HeatmapConcept[]
  /** 합계 행. 집계 대상 셀이 하나도 없으면 없다 */
  summary: HeatmapRow | null
  rows: HeatmapRow[]
  /** 드릴다운 선택지 — `CLASS` 계층에서는 비어 온다(그때는 `rows`가 곧 반 목록이다) */
  navigation: {
    classrooms: { classroomId: string; classroomName: string; memberCount: number }[]
    teams: { teamId: string; teamName: string; memberCount: number }[]
  }
  /** 집계 시각. 셀이 하나도 없으면 없다 */
  asOfAt: string | null
}

/**
 * 반·팀 선택지 한 줄 — `navigation`에서 오기도 하고 `rows[]`에서 오기도 한다.
 *
 * 🔴 **`navigation`은 지금 계층보다 위의 선택지만 준다**(하드닝 실측). `CLASS`에서는
 * 통째로 비어 오고, 그 계층의 반 목록은 `rows[]`에 있다(`rowId`가 곧 `classroomId`).
 * 두 출처가 같은 모양이라 화면이 한 타입으로 다룬다.
 */
export type ScopeOption = {
  id: string
  name: string
  /** 개인 행에는 없다 */
  memberCount: number | null
}

/** 회차 선택지 — 명부 응답의 `rounds[]`를 그대로 쓴다(히트맵 전용 조회가 없다) */
export type RoundOption = {
  assessmentRoundId: string
  projectId: string
  label: string
}
