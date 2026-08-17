/*
  MG-03 면담 목록 · MG-04 브리프가 읽는 모양.

  **목이 지은 이름이 거의 그대로 왔다** — 상태 3종(`PLANNED`·`DONE`·`EXCLUDED`)도,
  위험 유형(`INVALID`·`LOW_PERSISTENT`·`DECLINE`)도 글자까지 같다. 요청서로 그 이름을
  제안했기 때문이다(integration-process §3-①). 그래서 배지·필터·정렬 분기가 통째로 산다.

  갈린 것은 **판정 근거**다. 목은 `{ type, lowCount, streak }`처럼 숫자를 나눠 두고
  화면이 `2단 이하 3 · 2회 연속`을 조립했는데, **서버는 그 문장을 통째로 준다**
  (`riskSummary`). 서버 쪽이 맞다 — 같은 규칙이 두 곳에 생기지 않는다.
*/

export type CaseStatus = 'PLANNED' | 'DONE' | 'EXCLUDED'

/**
 * 위험 유형 — 서버 `riskType` 그대로. **목이 지은 네 값이 그대로 왔다.**
 *
 * `OBSERVE`(관찰)는 1차 회차 전용이다 — 비교할 직전 회차가 없어 하락을 판정할 수 없다.
 * 스펙 표에 네 값이 다 적혀 있지만 타입은 문자열로 열어 둔다: 유형이 늘어도 배지가
 * 코드를 그대로 그리고 죽지 않는다.
 */
export type RiskType = 'INVALID' | 'LOW_PERSISTENT' | 'DECLINE' | (string & {})

/** 브리프 상태 — **[브리프 생성] / [브리프 열기] 버튼 문구가 여기서 갈린다** */
export type BriefState = 'NONE' | 'FAILED' | 'DRAFT' | 'CONFIRMED'

export type InterviewCase = {
  caseId: string
  traineeId: string
  name: string
  classId: string
  className: string
  status: CaseStatus
  riskType: RiskType
  /** 판정 근거 한 줄 — **서버가 만든 문장을 그대로 그린다** */
  riskSummary: string
  briefState: BriefState
  /**
   * 무효 확인(`PATCH /assessment-attempts/{id}/validity`)에 쓸 수행 ID.
   * 그 오퍼레이션이 아직 `사용 불가`라 지금은 쓰지 않는다(`api.ts` 참고).
   */
  attemptId: string
  voidConfirmed: boolean
  /** 아직 무효 확인 전 — `[브리프 열기]` 대신 `[무효 확인]`이 먼저 와야 한다 */
  voidReviewPending: boolean
  /** `EXCLUDED`일 때만 */
  excludedAt: string | null
  excludedBy: string | null
  /** `DONE`일 때만 */
  interviewedAt: string | null
  /** 지난 면담에서 정한 `다음에 할 것`. 없으면 null */
  nextAction: string | null
}

export type RoundOption = {
  assessmentRoundId: string
  label: string
  /** `OPEN`이면 아직 이해도 확인이 안 끝나 위험 판정 자체가 없다 */
  status: string
}

export type InterviewListView = {
  items: InterviewCase[]
  /** 필터 적용 후 건수 */
  total: number
  /** **필터와 무관한 회차 전체 기준** — 필터 옵션에 개수를 실을 때 쓴다 */
  counts: Record<string, number>
  riskCounts: Record<string, number>
  /** 반 필터 선택지 — 이 매니저의 담당 반 전부. 매니저마다 달라서 서버가 준다 */
  classes: { classId: string; className: string }[]
  /** 담당 밖 회차 ID를 넣으면 null */
  round: { assessmentRoundId: string; label: string; status: string } | null
}

/* ─────────────────────────── MG-04 브리프 ─────────────────────────── */

export type BriefItem = {
  itemId: string
  /** 매니저가 그대로 읽는 구어체 질문 */
  questionText: string
  /** 매니저만 보는 근거 — 어떤 데이터에서 나온 질문인가 */
  questionRationale: string
  suggestedOrder: number
}

export type Brief = {
  caseId: string
  traineeId: string
  name: string
  className: string
  riskType: RiskType
  riskSummary: string
  /** 무효 응시 브리프 — **여는 말과 질문이 통째로 다르다** */
  isVoid: boolean
  firstInterview: boolean
  briefState: BriefState
  /** AI가 생성한 여는 말. ①칸에 그대로 표시한다 */
  openingRemark: string
  /** AI가 생성한 질문 4~8개. **고르는 UI가 없다 — 전부 그린다** */
  items: BriefItem[]
  /** 지난 면담에서 정한 것. 없으면 ①칸의 ⚠ 줄이 통째로 빠진다 */
  priorInterview: { interviewedAt: string | null; nextAction: string | null } | null
  /** 저장된 매니저 입력. 처음 여는 브리프는 null */
  savedRecord: { causes: string[]; why: string | null; nextAction: string | null } | null
  /**
   * ⚠ **서버가 아직 빈 배열만 준다**(스펙에 「미구현」 명시) — 교안 위치·반 문제
   * 판정이 DB 회신 대기다. 화면은 이 칸을 통째로 접는다.
   */
  concepts: { name: string; curriculumRef: string; groupIssueClassLabel: string }[]
  /** 「시스템이 본 것」 — **무효 응시 브리프에서만** 채워진다 */
  voidEvidence: Record<string, unknown> | null
}

/**
 * 원인 분류 7종 — **목이 지은 값이 그대로 왔다**(저장 요청 `causes[]`).
 *
 * ⚠ **조치(라우팅 목적지)는 서버가 안 받는다.** 스펙이 *"원인에서 파생되는 조치는
 * 보내지 않습니다 — 화면이 계산합니다"* 라고 명시한다. 그래서 목의 `destinationsFor`
 * 표는 지우지 않고 그대로 화면에 남는다 — 이건 서버 판정이 아니라 안내 문구다.
 */
export type CauseKey =
  | 'CONCEPT_GAP'
  | 'OUT_OF_SCOPE'
  | 'TIME_SHORTAGE'
  | 'EXPRESSION'
  | 'DIFFICULTY_UP'
  | 'TEAM_DEPENDENCE'
  | 'CONDITION'

export const CAUSE_OPTIONS: { key: CauseKey; label: string }[] = [
  { key: 'CONCEPT_GAP', label: '개념 이해 부족' },
  { key: 'OUT_OF_SCOPE', label: '담당 범위 밖' },
  { key: 'TIME_SHORTAGE', label: '구현 시간 부족' },
  { key: 'EXPRESSION', label: '설명·표현 어려움' },
  { key: 'DIFFICULTY_UP', label: '난이도 상승' },
  { key: 'TEAM_DEPENDENCE', label: '팀 의존' },
  { key: 'CONDITION', label: '컨디션·심리' },
]
