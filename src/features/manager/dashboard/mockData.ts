/*
  MG-01 매니저 대시보드(인박스) 목업. API 연동 전까지 화면을 검증하기 위한 고정
  데이터 + mock API다. 실 데이터가 붙으면 이 파일은 지운다.

  값은 목업 docs/plan/v2/wireframe/manager/dashboard.html의 장면(#inbox·#done·
  #sent·#all·#clear·#noproject·#partial)을 그대로 옮긴다. 이 화면은 정의서 §3이
  "회차 필터가 없다"고 못 박은 대로 **하나의 고정 시나리오**만 그린다 — MG-03처럼
  회차를 골라 다른 장면을 볼 수 없으므로, 장면 전환은 이 파일이 아니라 필터
  토글(지난 방문 이후/전체)·처리됨 펼치기·행 액션 클릭으로만 일어난다.

  ⚠ 판단 기록 — 이 파일이 정한 것(정의서·와이어에 없음)

  · **면담 대기 항목 4건은 `features/manager/interviews/mockData.ts`의 실제
    caseId를 그대로 값으로 갖다 썼다**(iv-3-2·iv-3-3·iv-3-4·iv-3-5, 전부 3차
    PLANNED) — `import`가 아니라 **같은 문자열을 손으로 복제**한 것이다(모듈
    cross-import는 이 레포에 역할 간 전례가 없다, `interviews/mockData.ts`
    머리말과 같은 이유). [브리프 열기]가 실제로 그 화면을 열어야 "행에서 바로
    처리한다"(정의서 §2)는 이 화면의 핵심 전제를 검증할 수 있어서다 — 임의
    문자열을 넣으면 브리프가 "찾을 수 없음"으로 깨진다. 대기일수(6일)도
    `interviews.ts`의 실측(발행 07-21 → MOCK_TODAY 07-27)과 우연히 맞아떨어져
    그대로 썼다.
  · **회차 라벨은 와이어 원문("미프 2차")과 다르게 "미프 3차"로 적는다.** 정의서
    §3 "면담 대기는 직전 회차 리포트에서 온다"만 보면 와이어처럼 2차여야 맞지만,
    위에서 재사용한 `interviews.ts` 원본 케이스가 실제로 "3차"로 등재돼 있다.
    대시보드 행 라벨과 브리프 화면 라벨이 클릭 한 번 사이에 서로 다른 회차를
    말하면(2차→열었더니 3차) 그 자체가 화면 신뢰도를 깎는 모순이 된다 — 두 화면이
    같은 값을 말하는 쪽을 "직전 회차"라는 문구보다 우선했다. 반대하면 되돌릴 수
    있다.
  · **이름 클릭(MG-06) traineeId도 같은 이유로 `interviews.ts`·`trainees.ts`가
    이미 맞춰 둔 9명(D48)의 id를 그대로 복제했다** — 최유나 `t-choi-yuna` 등.
  · **무효 응시(오세림)의 `roundId: '3'`도 `interviews.ts` `iv-3-1`(오세림·C반·
    INVALID)과 손으로 맞췄다** — [면담 목록에서 확인]이 그 회차·그 반으로 필터를
    걸고 넘어가야 하는데(사용자 지시), 걸어 둔 필터가 실제로 그 사람이 뜨는
    회차·반과 다르면 "빈 목록"이라는 오히려 더 나쁜 결과가 된다.
  · **미응시·재응시·미제출·분석 실패는 다른 화면 데이터와 안 맞춘다.**
    이 네 유형은 클릭해도 다른 화면으로 가지 않고(독촉은 이 화면 안에서
    끝난다) 맞출 이유가 없다 — `projects/mockData.ts`(마감 07-16 등)와 숫자가
    갈려도 "서로 다른 장면을 그리는 독립된 목"이라는 기존 관례(`interviews.ts`
    머리말) 그대로다.
  · **"지난 방문 이후" 기준 시각은 `LAST_VISITED_LABEL` 문자열 하나로 고정했다**
    (와이어 "7/26 14:20 이후" 그대로) — 실제 기기 시각을 읽어 계산하지 않는다.
    렌더할 때마다 값이 바뀌면 사용자가 스크린샷과 대조할 수 없다(다른 mock 파일의
    `MOCK_TODAY` 고정과 같은 이유).
  · **독촉 결과 3종(성공·이미 처리됨·발송 실패)을 항목별로 스크립트했다.**
    케이스 표(#partial 섹션)가 "그림은 없지만 구현에는 반드시 있어야 하는 분기"라고
    못 박은 걸 실제로 클릭해서 검증할 수 있게 하려는 의도다 — `retry-jeonghaneul`
    (정하늘·재응시)은 항상 `ALREADY_RESOLVED`, `failed-team5`(5팀·분석 실패)는
    **첫 클릭만** `FAILED`(재시도하면 성공)로 고정했다. 나머지는 전부 정상
    `SENT`다. `interviews.ts`의 "저장 실패는 mock이 실제로 실패시키지 않는다"
    전례와 다른 선택인데, 이번엔 케이스 표가 이 화면 자체의 완료 조건(이슈 122
    "ALREADY_RESOLVED·NUDGE_FAILED 분기 동작")으로 못 박혀 있어 실제로 눌러
    보이는 쪽을 택했다.
  · **부분 실패(#partial, 확인이 필요한 것 밴드만 로드 실패)는 구조만 만들고
    실제로 발생시키지 않는다** — `getInbox`의 `bandTwoFailed`는 항상 `false`다.
    이 화면은 회차 선택지가 없어 MG-03처럼 "다른 진입"으로 실패 장면에 갈 수
    없다 — 강제로 실패시키는 장치를 새로 만들지 않고 `InterviewBriefScreen`의
    "저장 실패"(#savefail)와 같은 전례를 따른다: 화면 쪽 오류 처리(실패한 밴드만
    `다시 시도` 행으로 대체, 나머지는 정상 렌더)는 만들되, mock이 스스로 실패를
    켜지는 않는다.
  · **"진행 중인 프로젝트 없음"(#noproject)도 같은 이유로 구조만 있다.** 이
    화면의 `RUN_SUMMARY`는 항상 실제 값을 반환하고, `RunSummary | null`
    타입만 컴포넌트가 두 갈래로 처리한다.
  · **처리됨(펼침) 3건은 필터 토글과 무관하게 항상 같다.** 와이어가 "지난 방문
    이후" 문맥에서만 펼친 장면을 그렸지만, 실제로 "전체"에서 접힌 줄이 사라질
    이유가 없다 — 라벨의 "· 지난 방문 이후" 꼬리말만 필터가 "전체"일 때 뗀다.
*/

export type ItemBand = 1 | 2 | 3 | 4
export type ItemStatus = 'OPEN' | 'SENT' | 'REMOVED'

type BaseItem = {
  id: string
  band: ItemBand
  roundLabel: string
  /** "지난 방문 이후" 필터에 걸리는가 — 꺼짐(false)이면 "전체"에서만 보인다 */
  recent: boolean
  status: ItemStatus
  /** NUDGE_FAILED 데모용 — 이미 한 번 실패했으면 다음 시도는 성공한다(판단 기록 참고) */
  nudgeFailedOnce?: boolean
}

export type AbsentItem = BaseItem & {
  kind: 'ABSENT'
  name: string
  traineeId: string
  className: string
  hoursLeft: number
}
export type RetryItem = BaseItem & {
  kind: 'RETRY'
  name: string
  traineeId: string
  className: string
  deadlineLabel: string
  missingCount: number
}
export type InvalidItem = BaseItem & {
  kind: 'INVALID'
  name: string
  traineeId: string
  className: string
  /** `interviews/mockData.ts`의 실제 `RoundId` — [면담 목록에서 확인] 이동 시
   *  회차·반 필터를 미리 걸어 주는 데 쓴다(판단 기록 참고) */
  roundId: string
  unanswered: number
  totalQuestions: number
  durationMin: number
}
export type InterviewItem = BaseItem & {
  kind: 'INTERVIEW'
  name: string
  traineeId: string
  className: string
  /** `interviews/mockData.ts`의 실제 caseId — 판단 기록 참고 */
  caseId: string
  waitDays: number
}
export type UnsubmittedItem = BaseItem & {
  kind: 'UNSUBMITTED'
  teamLabel: string
  memberCount: number
  deadlineLabel: string
}
export type AnalysisFailedItem = BaseItem & {
  kind: 'ANALYSIS_FAILED'
  teamLabel: string
  memberCount: number
}

export type InboxItem =
  AbsentItem | RetryItem | InvalidItem | InterviewItem | UnsubmittedItem | AnalysisFailedItem

export type ResolvedHistoryItem = {
  id: string
  kind: 'INTERVIEW' | 'ABSENT' | 'INVALID'
  name: string
  className: string
  roundLabel: string
  /** 면담 종결 항목에서만 — "다음에 할 것" */
  nextAction?: string
  /** 무효 응시 확인 항목에서만 — "무효 아님" 등 판정 결과 한 줄 */
  resultNote?: string
  doneFlag: string
}

// ── 시드 데이터 ──────────────────────────────────────────────

export const LAST_VISITED_LABEL = '7/26 14:20'

const ITEMS: InboxItem[] = [
  // ① 마감이 있는 것
  {
    id: 'absent-choiyuna',
    kind: 'ABSENT',
    band: 1,
    recent: true,
    status: 'OPEN',
    name: '최유나',
    traineeId: 't-choi-yuna',
    className: 'C반',
    roundLabel: '미프 3차',
    hoursLeft: 3,
  },
  {
    id: 'retry-jeonghaneul',
    kind: 'RETRY',
    band: 1,
    recent: true,
    status: 'OPEN',
    name: '정하늘',
    traineeId: 't-jung-haneul',
    className: 'A반',
    roundLabel: '미프 2차',
    deadlineLabel: '내일 18:00',
    missingCount: 1,
  },
  // ② 확인이 필요한 것
  {
    id: 'invalid-ohserim',
    kind: 'INVALID',
    band: 2,
    recent: true,
    status: 'OPEN',
    name: '오세림',
    traineeId: 't-oh-serim',
    className: 'C반',
    roundId: '3',
    roundLabel: '미프 3차',
    unanswered: 2,
    totalQuestions: 3,
    durationMin: 4,
  },
  // ③ 면담 대기
  {
    id: 'interview-choiyuna',
    kind: 'INTERVIEW',
    band: 3,
    recent: true,
    status: 'OPEN',
    name: '최유나',
    traineeId: 't-choi-yuna',
    className: 'C반',
    roundLabel: '미프 3차',
    caseId: 'iv-3-2',
    waitDays: 6,
  },
  {
    id: 'interview-kimminjun',
    kind: 'INTERVIEW',
    band: 3,
    recent: true,
    status: 'OPEN',
    name: '김민준',
    traineeId: 't-kim-minjun',
    className: 'A반',
    roundLabel: '미프 3차',
    caseId: 'iv-3-4',
    waitDays: 6,
  },
  {
    id: 'interview-leeseojun',
    kind: 'INTERVIEW',
    band: 3,
    recent: false,
    status: 'OPEN',
    name: '이서준',
    traineeId: 't-lee-seojun',
    className: 'A반',
    roundLabel: '미프 3차',
    caseId: 'iv-3-3',
    waitDays: 6,
  },
  {
    id: 'interview-hanjiwoo',
    kind: 'INTERVIEW',
    band: 3,
    recent: false,
    status: 'OPEN',
    name: '한지우',
    traineeId: 't-han-jiwoo',
    className: 'B반',
    roundLabel: '미프 3차',
    caseId: 'iv-3-5',
    waitDays: 6,
  },
  // ④ 미제출
  {
    id: 'unsubmitted-team3',
    kind: 'UNSUBMITTED',
    band: 4,
    recent: true,
    status: 'OPEN',
    teamLabel: '3팀',
    memberCount: 4,
    roundLabel: '미프 3차',
    deadlineLabel: '내일 18:00',
  },
  {
    id: 'failed-team5',
    kind: 'ANALYSIS_FAILED',
    band: 4,
    recent: false,
    status: 'OPEN',
    teamLabel: '5팀',
    memberCount: 3,
    roundLabel: '미프 3차',
  },
]

const RESOLVED_HISTORY: ResolvedHistoryItem[] = [
  {
    id: 'r-parkdohyun',
    kind: 'INTERVIEW',
    name: '박도현',
    className: 'B반',
    roundLabel: '미프 2차',
    nextAction: '흐름 그려오기',
    doneFlag: '종결함 · 어제',
  },
  {
    id: 'r-hanjiwoo',
    kind: 'ABSENT',
    name: '한지우',
    className: 'B반',
    roundLabel: '미프 3차',
    doneFlag: '응시함 · 어제',
  },
  {
    id: 'r-seojihun',
    kind: 'INVALID',
    name: '서지훈',
    className: 'C반',
    roundLabel: '미프 3차',
    resultNote: '무효 아님',
    doneFlag: '확인함 · 2일 전',
  },
]

export type RunSummary = {
  roundLabel: string
  submitted: number
  submittedTotal: number
  attended: number
  attendedTotal: number
  reportPublished: boolean
  dueLabel: string
}

/** 항상 실제 값을 반환한다 — `null`(진행 중인 프로젝트 없음) 분기는 구조만 있다(판단 기록) */
const RUN_SUMMARY: RunSummary = {
  roundLabel: '미프 3차',
  submitted: 23,
  submittedTotal: 25,
  attended: 19,
  attendedTotal: 23,
  reportPublished: false,
  dueLabel: '제출 마감 07-16 18:00',
}

// ── 조회(mock API) ──────────────────────────────────────────

const LATENCY_MS = 250
const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

export type InboxScope = 'RECENT' | 'ALL'

export type InboxResult = {
  run: RunSummary | null
  items: InboxItem[]
  resolvedHistory: ResolvedHistoryItem[]
  lastVisitedLabel: string
  /** #partial 케이스용 — 항상 false(판단 기록 참고) */
  bandTwoFailed: boolean
}

/** `GET /manager/inbox` */
export function getInbox(scope: InboxScope): Promise<InboxResult> {
  const items = ITEMS.filter((i) => i.status !== 'REMOVED' && (scope === 'ALL' || i.recent))
  return delay({
    run: RUN_SUMMARY,
    items,
    resolvedHistory: RESOLVED_HISTORY,
    lastVisitedLabel: LAST_VISITED_LABEL,
    bandTwoFailed: false,
  })
}

export type NudgeResult = { kind: 'SENT' } | { kind: 'ALREADY_RESOLVED' } | { kind: 'FAILED' }

/**
 * `POST /manager/nudge`(단건) · `POST /manager/nudge/team`(팀 전원) — 대시보드는
 * 단건이라 모달 없이 그 자리에서 보낸다(정의서 §5, MG-08 규약과 같은 문구 원칙 —
 * 실제 문구는 화면 쪽 `kindLabel`이 갖는다, 이 함수는 성공 여부만 결정한다).
 */
export function nudgeItem(id: string): Promise<NudgeResult> {
  const item = ITEMS.find((i) => i.id === id)
  if (!item) return delay({ kind: 'FAILED' })

  if (item.id === 'retry-jeonghaneul') {
    item.status = 'REMOVED'
    return delay({ kind: 'ALREADY_RESOLVED' })
  }
  if (item.id === 'failed-team5' && !item.nudgeFailedOnce) {
    item.nudgeFailedOnce = true
    return delay({ kind: 'FAILED' })
  }

  item.status = 'SENT'
  return delay({ kind: 'SENT' })
}
