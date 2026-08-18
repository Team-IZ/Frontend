import type { getMyAssessmentRounds_Response } from '@/api/assessment/assessmentTypes'

/*
  TR-01 계약 — **서버 모양을 화면 어휘로 옮긴 것**(api-boundary §1-③).

  ## 상태 8종 union을 버렸다
  목일 때는 `RoundStatus` 8종 discriminated union이었다. 서버는 **44필드 플랫 +
  `representativeStatus`**로 주는데, **그쪽이 맞다** — 우리 8종으로는 "분석 실패인데
  마감도 지났다"처럼 두 사실이 겹치는 경우를 담을 수 없다. 서버는 대표 상태 하나와
  `warningCodes[]` 배열을 따로 줘서 그게 표현된다.

  그래서 이 파일은 **union을 다시 만들지 않는다.** 서버 값을 그대로 들고, 화면이
  분기에 쓰는 것만 추려 평평하게 옮긴다.

  ## 판정은 전부 서버가 한다
  `canSubmit`·`canResubmit`·`canViewReport`·`defaultActionCode`가 이미 계산돼서 온다.
  화면이 "마감 전인가 + 세션을 시작했나"를 다시 조합하면 그 규칙이 두 곳에 생긴다
  (api-boundary §2).
*/

type Server = getMyAssessmentRounds_Response
type ServerCurrent = Server['current']

/** 카드 배지 — 위에서부터 먼저 맞는 것 하나로 서버가 정한다 */
export type RoundStatus = NonNullable<ServerCurrent['representativeStatus']>

/** 기본 버튼. `NONE`이면 버튼이 없다 */
export type ActionCode = NonNullable<ServerCurrent['defaultActionCode']>

/** 경고 배지 — **배열이다.** 마감 지남 + 분석 실패가 동시에 올 수 있다 */
export type WarningCode = NonNullable<ServerCurrent['warningCodes']>[number]

/** 버튼을 못 누르는 이유. 없으면 null */
export type BlockedReason = NonNullable<ServerCurrent['actionUnavailableReasonCode']>

export type Membership = {
  /** 기수 미소속이면 전부 null이다(서버 명시) */
  cohortName: string | null
  className: string | null
}

/**
 * 지금 할 일 카드.
 *
 * **회차가 없어도 서버가 합성 카드를 만들어 준다**(`NO_ACTIVE_ROUND`) — 화면이
 * `currentRound === null`을 따로 다루지 않는다. 그 경우 식별·일정 필드가 전부
 * null이고 `status`만 의미를 갖는다.
 */
export type CurrentRound = {
  status: RoundStatus
  action: ActionCode
  /** 비어 있으면 경고 없음 */
  warnings: WarningCode[]
  /** 버튼이 비활성인 이유. null이면 누를 수 있다 */
  blockedReason: BlockedReason | null

  roundName: string | null
  /** `A반 3팀` — 반은 membership, 팀은 회차 스코프라 여기서 합친다 */
  classTeam: string | null
  /** 교안이 여럿일 수 있다. 없으면 빈 배열 */
  curriculumNames: string[]

  /** 제출 마감 */
  submissionDueAt: string | null
  /** 개인 응시 창 마감 — 카운트다운이 붙는 자리 */
  assessmentCloseAt: string | null
  submittedAt: string | null

  /**
   * 실제로 출제된 문제 수(0~3). 세션의 `problemTotal`과 같다.
   *
   * ⚠️ **`3`으로 가정하지 않는다** — 코드에 근거가 없는 개념은 문항이 안 만들어져
   * 세션에 나오지 않는다(스펙 명시). 세션이 열리기 전이면 `null`이다.
   */
  problemCount: number | null

  /** 다시 볼 개념 수. 0이면 다시 보기 대상이 아니다 */
  reviewPendingCount: number
  /** 리포트로 갈 수 있는가 — 서버가 공개 상태까지 보고 판정한다 */
  canViewReport: boolean
  reportId: string | null
}

export type UpcomingRound = {
  id: string
  roundName: string
  submissionDueAt: string
  /** `PLANNED` 회차는 응시 창이 아직 안 정해져 null일 수 있다(서버 명시) */
  assessmentOpenAt: string | null
  assessmentDueAt: string | null
}

export type PastRound = {
  id: string
  roundName: string
  status: RoundStatus
  /** 다시 보기를 마친 건수 */
  completedReviewCount: number
  reportId: string | null
  canViewReport: boolean
}

export type HomeView = {
  membership: Membership
  current: CurrentRound
  upcoming: UpcomingRound[]
  past: PastRound[]
}
