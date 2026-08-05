/*
  TR-01 계약 — 서버와 주고받는 모양(api-boundary.md 갈래③). 값이 바뀌면 여기부터 바뀐다.

  상태는 서버가 하나의 판정으로 내려준다(`status`). 화면이 제출/분석/응시 여부
  3개를 조합해 상태를 유추하지 않는다 — 그러면 그 판정 로직이 화면에 생기고
  (api-boundary.md §1 ②), 상태마다 필요한 필드가 달라 옵셔널 필드가 쌓인다.
  discriminated union으로 상태마다 필요한 값만 갖게 한다.

  8종 + `currentRound: null`(진행 중인 회차 없음) = 목업 9개 `.rpage`와 1:1.
  "재시험"이라는 이름을 쓰지 않는다 — 체크리스트 G1이 금지한 내부 용어이고
  목업·TR-03·TR-04 전부 "다시 보기"로 통일돼 있다(TR-01 정의서 §3·§5만 드리프트).
*/

export type RoundStatus =
  | 'NOT_SUBMITTED' // 미제출 (기한 내)
  | 'ANALYZING' // 제출 완료 · 분석 중
  | 'ANALYSIS_FAILED' // 분석 실패
  | 'READY_TO_VERIFY' // 응시 가능
  | 'VERIFY_DONE' // 응시 완료 · 리포트 대기
  | 'RETRY_AVAILABLE' // 다시 보기 대상
  | 'SUBMISSION_CLOSED' // 제출 마감 지남 → 미제출로 확정
  | 'VERIFICATION_CLOSED' // 응시 창 마감 → 미응시로 확정

export type RoundMeta = {
  roundLabel: string // "미프 3차"
  classTeam: string // "A반 3팀"
  curriculum: string // "AI_LLMOps"
}

export type CurrentRound = RoundMeta &
  (
    | { status: 'NOT_SUBMITTED'; submissionDueAt: string }
    | { status: 'ANALYZING' }
    | { status: 'ANALYSIS_FAILED'; submissionDueAt: string; failureReason: string }
    | { status: 'READY_TO_VERIFY'; verifyClosesAt: string }
    | { status: 'VERIFY_DONE'; verifiedAt: string; reportAfter: string }
    | {
        status: 'RETRY_AVAILABLE'
        retryDueAt: string
        retryConcepts: string[]
        reportRoundId: string
      }
    | { status: 'SUBMISSION_CLOSED'; submissionDueAt: string }
    | { status: 'VERIFICATION_CLOSED'; verifyClosedAt: string }
  )

export type UpcomingRound = {
  roundLabel: string // "미프 4차"
  scheduleLabel: string // "제출 07-21 · 이해도 확인 07-22~23"
}

export type PastRound = {
  id: string // TR-04 라우트 `?round=` 값
  roundLabel: string
  summary: string // "완료 · 다시 보기 1건 완료"
}

export type HomeView = {
  /** 진행 중인 회차가 없으면 null — "진행 중인 회차 없음" 상태 */
  currentRound: CurrentRound | null
  /** 회차가 없어도(none) 소속 표시에 쓴다 */
  scope: { cohort: string; classTeam: string }
  upcomingRound: UpcomingRound | null
  pastRounds: PastRound[]
}
