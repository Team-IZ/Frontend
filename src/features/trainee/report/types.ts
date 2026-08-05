/*
  TR-04 계약(api-boundary.md 갈래③). `trainee/session/types.ts`의 `LadderLevel`을
  import하지 않는다 — features 간 교차 import 금지 규칙(oxlintrc)이 여기도 걸린다.
  숫자 하나짜리 타입이라 로컬 복제가 싸다.

  발행 상태는 `PUBLISHED` 하나뿐이고, 그 안에서 `retryState`(NONE/PENDING/DONE)가
  갈린다 — 목업의 `locked`·`after`·`clear` 3페이지는 서로 다른 라운드 상태가 아니라
  **같은 발행 화면의 변형**이다(정의서 재검증 발견 #3).
*/

export type LadderLevel = 1 | 2 | 3 | 4

export type CurriculumRef = { chapter: string; pages: string; title: string }

export type QaEntry = { questionLabel: string; question: string; answer: string }

export type ConceptReport = {
  name: string
  level: LadderLevel
  said: string
  isRetryTarget: boolean
  curriculumRef?: CurriculumRef
  qa: QaEntry[]
  /** `isRetryTarget`일 때만 존재 — 막힌 이유 상세 해설. 잠금 여부는 retryState가 결정한다 */
  explain?: string[]
  /** retryState가 DONE일 때만 — 처음/다시 나란히 */
  comparedReach?: { before: LadderLevel; after: LadderLevel }
}

export type RoundListItem = {
  id: string
  label: string
  /** 아직 안 한 다시 보기가 있다 — 레일에 점으로 표시(선택 여부와 무관) */
  hasPendingRetry: boolean
}

type RoundBase = { id: string; label: string }

export type PublishedReport = RoundBase & {
  status: 'PUBLISHED'
  publishedAt: string
  curriculum: string
  concepts: ConceptReport[]
  retryState: 'NONE' | 'PENDING' | 'DONE'
  retryDueAt?: string // PENDING
  retryCompletedAt?: string // DONE
}

export type RoundReport =
  | PublishedReport
  | (RoundBase & { status: 'PENDING_PUBLISH'; publishAfter: string })
  | (RoundBase & { status: 'PENDING_VISIBILITY' })
  | (RoundBase & { status: 'NOT_ATTEMPTED' })
  | (RoundBase & { status: 'VOID_ATTEMPT' })
  | (RoundBase & { status: 'STOPPED' })

export type ReportsData = {
  rounds: RoundListItem[]
  reportsById: Record<string, RoundReport>
}
