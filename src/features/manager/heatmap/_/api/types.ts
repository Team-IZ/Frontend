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

/*
  🔴 **다시 보기(`attemptView=REVIEW`)는 이 화면의 축이 아니다.**

  서버 파라미터에는 있고 기본값이 `INITIAL`이라 한때 토글로 그렸는데, 히트맵이
  답하는 질문은 「개인 문제인가, 반 문제인가」이고 그 판단은 **최초 성적으로만**
  한다(사용자 지시). 다시 보기는 개인이 스스로 여는 보충이라 반·팀 평균에 섞으면
  같은 격자가 두 가지 뜻을 갖게 된다.

  그래서 **파라미터를 아예 안 보낸다** — 서버 기본값이 `INITIAL`이다.
*/

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
  /**
   * 평균 도달(반·팀) 또는 그 사람의 도달(개인). 색 스케일이 이 값을 쓴다.
   *
   * ⚠ **`null`이 온다** — 결과가 하나도 없는 사람·팀도 행으로 오게 되면서
   * 생긴 모양이다(34차 R2·R3 회신 §1-3). 평균을 낼 표본이 없으면 값이 없다.
   * `isEmptyCell`이 걸러서 `toFixed`까지 안 가지만, **타입이 그 사실을
   * 말해야** 다음 사람이 `value`를 그냥 계산에 쓰지 않는다.
   */
  value: number | null
  status: string
  /** 이 셀 평균의 분모 */
  validCount: number
  notAttendedCount: number
  invalidCount: number
  interruptedCount: number
  /**
   * 명부에는 있는데 이 회차에 수행 자체가 없는 인원. **합계 행에만 온다**
   * (34차 R2 회신 §1-2). 0이면 명부와 격자가 완전히 맞는다는 뜻이다.
   *
   * `memberCount = valid + notAttended + invalid + interrupted + notInRound`
   */
  notInRoundCount?: number
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
  /** `PLANNED` · `OPEN` · `CLOSED` · `COMPLETED` — 기본 회차를 고르는 근거다(`currentRound`) */
  status: string
}
