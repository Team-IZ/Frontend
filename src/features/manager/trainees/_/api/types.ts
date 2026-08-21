/*
  MG-05 교육생 명부 · MG-06 상세가 읽는 모양 — **화면 어휘다.** 서버 응답(28필드)을
  그대로 넘기면 표 셀 컴포넌트가 응답 구조를 알게 된다(integration-process §4-②).
*/

/** 계정 상태 — 서버 `AccountStatus`와 값이 같다 */
export type AccountStatus = 'ACTIVE' | 'INVITED' | 'INACTIVE'

/** 개념 도달 단계(0~4). null = 문항이 없거나 한 축도 답하지 않았다 — **0단이 아니다** */
export type ReachLevel = 0 | 1 | 2 | 3 | 4 | null

export type ConceptReach = {
  problemNo: number
  conceptName: string
  /** 코드에 근거가 없어 못 물은 문항. 화면은 해치 무늬로 그린다 */
  notGenerated: boolean
  level: ReachLevel
}

/**
 * 이번 회차 배지 한 칸 — **서버 `roundPrimaryStatusCode`를 그대로 옮긴다.**
 *
 * 목은 5종(단계 하락·지속 저점·우수·미응시·무효)이었는데 서버는 **2종이 더 있다**
 * (저기여 · 기여·이해도 괴리). 서버가 1층 응시상태 → 2층 위험유형 우선순위까지
 * 정해서 단일 코드로 주므로 **화면이 다시 고르지 않는다**(api-boundary §1-②).
 *
 * `ACE`(우수)만 이 축이 아니다 — 위험 코드가 없는 사람 중 그 차수가
 * `excellentAssessmentSequenceNos`에 있으면 우수다. 서버가 두 축을 나눈 이유가 있다:
 * 위험과 우수는 동시에 성립할 수 있고, 그때 배지 자리는 위험이 가져가야 한다.
 */
export type RoundBadgeKind =
  | 'NOT_ATTENDED'
  | 'SESSION_INCOMPLETE'
  | 'INVALID_ATTEMPT'
  | 'LOW_PARTICIPATION'
  | 'CONTRIBUTION_UNDERSTANDING_GAP'
  | 'STAGE_DECLINE'
  | 'PERSISTENT_LOW'
  | 'ACE'

export type TraineeRow = {
  id: string
  name: string
  email: string
  /** 반 배정 전이면 null */
  className: string | null
  accountStatus: AccountStatus
  /** 비활성 사유·시각. `INACTIVE`가 아니거나 사유가 안 남았으면 null */
  inactivated: { reason: string | null; at: string | null } | null

  /** 이번 회차 개념별 도달. 아직 응시 전이면 빈 배열 */
  reach: ConceptReach[]
  /**
   * `2단 이하` 칸의 분자. 답한 문항이 하나도 없으면 null(화면은 `—`)
   *
   * ⚠ **분모는 3이 아니다.** 사람마다 실제로 만들어진 문항 수가 다르다(실측: 같은
   * 회차에 2·3이 섞여 온다). 목이 `/3`을 박아 뒀던 자리다.
   */
  lowCount: number | null
  lowTotal: number
  badge: RoundBadgeKind | null
  /** 미응시·중단일 때만 있는 시각 — 우수 누적 칸에 사유 대신 그린다 */
  terminalAt: string | null
  ace: { count: number; rounds: number[] }
}

export type RoundOption = {
  assessmentRoundId: string
  /** 기수 안의 순번 — 화면의 `미프 3차`에서 3 */
  cohortRoundNo: number
  projectId: string
  label: string
}

/* ─────────────────────────── MG-06 교육생 상세 ─────────────────────────── */

export type DetailRound = {
  assessmentRoundId: string
  cohortRoundNo: number
  /** `미니프로젝트 3차 · 3차` */
  label: string
  /** 응시가 실제로 있었나 — 격자에 그릴지 정한다 */
  attended: boolean
  badge: RoundBadgeKind | null
  concepts: ConceptReach[]
}

export type TraineeDetail = {
  id: string
  name: string
  email: string
  className: string | null
  cohortName: string
  accountStatus: AccountStatus
  /**
   * 헤더 위험 배지 — **가장 최근 응시 회차 하나**의 코드다(서버 판정).
   * 목은 위험 2종(단계 하락·지속 저점)만 그렸는데 서버는 응시상태까지 같은 축에 담는다.
   */
  riskCode: RoundBadgeKind | null
  /** 판정식 한 줄 — `2단 이하 0 → 2`. 위험이 없으면 null */
  riskWhy: string | null
  /** **차수 오름차순** — 화면이 위에서 아래로 그리는 순서와 같다 */
  rounds: DetailRound[]
}

/* ─────────────────────────── MG-06 타임라인 ─────────────────────────── */

export type TimelineKind = 'ASSESSMENT' | 'REPORT' | 'REVIEW' | 'REVIEW_CLOSED' | 'INTERVIEW'

export type TimelineProblem = {
  problemNo: number
  conceptName: string
  notGenerated: boolean
  level: ReachLevel
  /** 되짚어 물은 횟수 0~2 — 화면의 `자력` · `재진술 1회` */
  hintUsedCount: number | null
}

export type TimelineEvent = {
  id: string
  kind: TimelineKind
  at: string
  /** `07.12` */
  dateLabel: string

  /** ASSESSMENT 전용 */
  problems: TimelineProblem[]
  /** ASSESSMENT 전용 — 문항 전문을 여는 열쇠. 지금은 그 조회가 막혀 있다(`api.ts` 참고) */
  sessionId: string | null

  /** REPORT 전용 */
  reviewTargetCount: number | null

  /** REVIEW 전용 — 도달이 바뀐 문항 */
  reviewChanges: { conceptName: string; from: ReachLevel; to: ReachLevel; improved: boolean }[]
  /** REVIEW_CLOSED 전용 — 창이 닫힐 때까지 답하지 않은 문항 */
  missedConcepts: string[]

  /** INTERVIEW 전용. 기록 전이면 null */
  interview: {
    recorded: boolean
    cause: string | null
    note: string | null
    nextAction: string | null
    nextActionConfirmedAt: string | null
  } | null
}

export type TimelineGroup = {
  assessmentRoundId: string
  /** 「자세히」가 채점 근거를 부를 때 쓴다 — `projects/{projectId}/evaluations/{userId}` */
  projectId: string
  cohortRoundNo: number
  label: string
  /** 팀은 사람이 아니라 회차에 붙는다 — 프로젝트마다 재편성된다 */
  teamName: string | null
  /** `07.12 – 07.21`. 한쪽이라도 없으면 빈 문자열 */
  dateRange: string
  events: TimelineEvent[]
}

/* ──────────────────── MG-06 채점 근거(「자세히」) ──────────────────── */

/** 채점 근거 한 줄 — 축(L1~L4)별로 「무엇은 말했고 무엇은 못 했는지」 */
export type EvaluationStep = {
  axisCode: string
  stepNo: number
  passed: boolean
  helpCount: number
  /** 리포트 발행 전에는 null */
  note: string | null
}

export type EvaluationConcept = {
  conceptId: string
  concept: string
  displayOrder: number
  reachLevel: number
  /** **실제로 물은 단계만** 온다 — 앞에서 멈추면 뒤 단계는 배열에 없다 */
  steps: EvaluationStep[]
}

export type TraineeEvaluation = {
  /** 발행 전에는 `note`가 전부 null이다 — 화면이 그 사실을 말해야 한다 */
  reportPublished: boolean
  concepts: EvaluationConcept[]
}

/* ──────────────────── MG-06 리포트 라인(「리포트 발행」 펼치기) ──────────────────── */

/*
  교육생 TR-04(`features/trainee/report/_/api/types.ts`)와 **모양이 같다** — 서버가
  같은 `TraineeReportsResponse`를 준다(39차 회신). 그래도 여기 따로 두는 이유는
  레이어 린트가 features 간 교차 import를 막기 때문이다(decision-log D33 · SA-03과
  같은 사정) — 계약은 같아도 타입은 각 feature가 자기 것을 갖는다.

  ⚠ **여기는 잠금이 없다.** 교육생 쪽은 `isRetryTarget`인데 다시 보기 전이면
  `explanation`·`qa`가 빠지지만, 매니저에게는 서버가 그 잠금을 걸지 않는다(스펙) —
  지도하려면 학생이 뭐라고 답했는지를 봐야 하기 때문이다.
*/
export type ManagedReportConcept =
  | { asked: false; name: string }
  | {
      asked: true
      name: string
      reachedLevel: 0 | 1 | 2 | 3 | 4
      said: string
      isRetryTarget: boolean
      curriculumRef: { chapter: string; pages: string; title: string } | null
      explanation: string[] | null
      qa: { questionLabel: string; question: string; answer: string }[] | null
    }

/*
  🔴 **「불러오지 못했습니다」 한 줄로 뭉개지 않는다.** 실제로 있었던 상황 —
  타임라인에 `REPORT`(리포트 발행) 이벤트가 있는 회차인데도 `reportsById`가 그 회차를
  아직 `PENDING_PUBLISH`로 준 적이 있다(노지우 6차, 실측). 조회 자체가 실패한 것과
  회차가 아직 리포트를 안 가진 것은 다른 사건이라 화면이 구분해 말해야 한다 —
  `status`를 그대로 들고 있다가 서버 문서(`RoundReportResponse.status` 표)의 말을
  그대로 쓴다.
*/
export type ManagedRoundReport =
  | {
      status: 'PUBLISHED'
      concepts: ManagedReportConcept[]
      missingConceptCount: number
      retryState: 'NONE' | 'PENDING' | 'DONE'
    }
  /*
    ⚠ **이 유니온은 스키마 파생이 아니라 손으로 적은 것이다** — 서버가 상태를 늘려도
    컴파일러가 안 잡아 준다. 늘면 여기와 `Timeline.tsx`의 `REPORT_STATUS_REASON`을
    **같이** 고쳐야 한다(그쪽은 `Record`라 키가 빠지면 컴파일이 잡는다).

    `ANALYSIS_FAILED`는 2026-08-21에 늘었다 — 분석이 실패해 리포트를 만들 근거 자체가
    없는 경우이고, 기다리면 되는 `IN_PROGRESS`와 반대다.

    `IN_PROGRESS`가 2026-08-20에 그렇게 늘었다 — 백엔드가 응시 미완료(제출·분석·세션
    준비/진행 중)를 `PENDING_PUBLISH`로 잘못 내려보내던 것을 갈라낸 값이다.
  */
  | {
      status:
        | 'PENDING_PUBLISH'
        | 'IN_PROGRESS'
        | 'ANALYSIS_FAILED'
        | 'NOT_STARTED'
        | 'NOT_ATTEMPTED'
        | 'VOID_ATTEMPT'
        | 'STOPPED'
    }
  /** 회차 id가 `reportsById`에 아예 없다 — 정상 스펙엔 없는 경우라 방어적으로만 둔다 */
  | { status: 'NOT_FOUND' }

export type RosterView = {
  rows: TraineeRow[]
  /** 필터 적용 후 전체 인원 — 페이저의 분모 */
  total: number
  totalPages: number
  /** 필터를 적용하지 않은 담당 범위 인원 — 빈 결과 문구가 인용하는 값 */
  scopeTotal: number
  /**
   * 계정 상태별 인원 — **`scopeTotal`과 같은 모집단이고 필터를 안 탄다.**
   * 셋을 더하면 `scopeTotal`이다(30차 R7로 신설).
   */
  accountCounts: { active: number; invited: number; inactive: number }
  rounds: RoundOption[]
  /** **서버가 실제로 조회에 쓴 회차.** 첫 진입에 드롭다운을 이 값으로 맞춘다 */
  roundId: string | null
  /**
   * **이 행들이 몇 쪽인가** — 푸터의 `21–26`을 세는 데 쓴다.
   *
   * 화면이 들고 있는 `page`로 세면 안 된다. 조건을 바꾼 직후에는 `page`가 벌써 새 값인데
   * `rows`는 아직 옛 쪽이라 **「26명 중 21–40」처럼 실재하지 않는 범위**가 5초쯤 뜬다
   * (실측). 행과 같은 응답에서 세면 그 틈이 없다.
   */
  page: number
}
