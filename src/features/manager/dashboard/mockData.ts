/*
  MG-01 매니저 대시보드(인박스) 목업. API 연동 전까지 화면을 검증하기 위한 고정
  데이터 + mock API다. 실 데이터가 붙으면 이 파일은 지운다.

  값은 목업 docs/plan/v2/wireframe/manager/dashboard.html의 장면(#inbox·#done·
  #sent·#all·#clear·#noproject·#partial)을 그대로 옮긴다.

  ⚠ **회차 필터 추가(사용자 지시, 2026-08-08)** — 정의서 §3이 원래 "회차
  필터가 없다"고 못 박았던 걸 뒤집었다(교육생·히트맵·면담 화면처럼 프로젝트
  select로). 시드(`ITEMS`·`RESOLVED_HISTORY`·`RUN_SUMMARY`)는 여전히 미프
  3차 하나만 그린 것이라, select에서 다른 회차를 고르면 `RunLine`의
  "진행 중인 프로젝트 없음"(#noproject) 빈 상태가 뜬다(`getInbox` 참고) — 다른
  회차 장면은 아직 안 만들었다. 필터 토글(지난 방문 이후/전체)·처리됨 펼치기·
  행 액션 클릭은 여전히 이 파일 안에서 일어난다.

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
    이미 맞춰 둔 9명(MG04-3)의 id를 그대로 복제했다** — 최유나 `t-choi-yuna` 등.
  · **무효 응시(오세림)의 `roundId: '3'`도 `interviews.ts` `iv-3-1`(오세림·C반·
    INVALID)과 손으로 맞췄다** — [면담 목록에서 확인]이 그 회차·그 반으로 필터를
    걸고 넘어가야 하는데(사용자 지시), 걸어 둔 필터가 실제로 그 사람이 뜨는
    회차·반과 다르면 "빈 목록"이라는 오히려 더 나쁜 결과가 된다.
  · **미응시·다시 보기·미제출·분석 실패는 다른 화면 데이터와 안 맞춘다.**
    이 네 유형은 클릭해도 다른 화면으로 가지 않고(독촉은 이 화면 안에서
    끝난다) 맞출 이유가 없다 — `projects/mockData.ts`(마감 07-16 등)와 숫자가
    갈려도 "서로 다른 장면을 그리는 독립된 목"이라는 기존 관례(`interviews.ts`
    머리말) 그대로다.
  · **"지난 방문 이후" 기준 시각은 `LAST_VISITED_LABEL` 문자열 하나로 고정했다**
    (와이어 "7/26 14:20 이후" 그대로) — 실제 기기 시각을 읽어 계산하지 않는다.
    렌더할 때마다 값이 바뀌면 사용자가 스크린샷과 대조할 수 없다(다른 mock 파일의
    `MOCK_TODAY` 고정과 같은 이유).
  · **⚠ D56 C절 후속(이슈 124) — "독촉/알림 발송"을 수동 확인 체크로
    바꾸며 `FAILED`(발송 실패) 분기를 없앴다.** (버튼 문구는 이후 "연락함"→
    "체크"로 한 번 더 바뀌었다, 아래 `ItemStatus` 주석 참고) 백엔드로 메시지를 실제로 보내는
    게 아니라 매니저가 슬랙 등으로 직접 연락한 뒤 스스로 체크하는 동작이라 "전송
    실패"라는 사건 자체가 성립하지 않는다 — 원래 이슈 122가 요구했던
    "ALREADY_RESOLVED·NUDGE_FAILED 분기 동작"의 `FAILED` 쪽은 D56로 폐기됐다.
    `failed-team5`(5팀·분석 실패)에 걸려 있던 첫 클릭 실패 스크립트를 지우고
    다른 항목과 같은 정상 흐름으로 되돌렸다. `retry-jeonghaneul`(정하늘·다시
    보기)의 `ALREADY_RESOLVED`(연락하기 전에 학생이 이미 스스로 다시 봤다는
    경합 상황)는 수동 확인 흐름에서도 여전히 유효해 그대로 남긴다.
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
/** `CONTACTED` = 매니저가 "체크"를 눌러 스스로 처리 표시한 상태(D56 C절 —
 *  메시지를 실제로 보낸 게 아니라 직접 연락했다는 자기 신고다. 버튼 문구는
 *  "연락함"이었다가 2026-08-08 "체크"로 바뀌었다 — 사용자 지적, "연락"이란
 *  단어가 실제 메시지 발송처럼 읽혀서) */
export type ItemStatus = 'OPEN' | 'CONTACTED' | 'REMOVED'

type BaseItem = {
  id: string
  band: ItemBand
  roundLabel: string
  /** "지난 방문 이후" 필터에 걸리는가 — 꺼짐(false)이면 "전체"에서만 보인다 */
  recent: boolean
  status: ItemStatus
  /** 체크한 날짜("YYYY-MM-DD"). `status !== 'CONTACTED'`면 항상 null(사용자
   *  지적, 2026-08-08 — "방금"이 고정 문구라 몇 시간·며칠이 지나도 안 바뀌던
   *  문제). 분 단위까진 필요 없고 날짜만 필요하다(사용자 지시) —
   *  `checkedLabel()`이 이 값과 `MOCK_TODAY`를 비교해 오늘/어제/N일 전을
   *  고른다. */
  checkedAt: string | null
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

/**
 * 프로젝트 select 옵션(사용자 지시, 2026-08-08 — 교육생·히트맵·면담 화면처럼
 * 이 화면도 프로젝트 select로 바꾼다). `projects/mockData.ts`의 `PROJECTS`
 * id·이름을 손으로 복제했다(교차 import 금지, 이 파일 머리말 판단 기록과
 * 같은 원칙) — 교안조차 안 붙은 `mif-5`는 뺐다(heatmap `ROUND_OPTIONS`와
 * 같은 범위, 1~4차만).
 */
export type RoundId = 'mif-1' | 'mif-2' | 'mif-3' | 'mif-4'
export const ROUND_OPTIONS: { value: RoundId; label: string }[] = [
  { value: 'mif-1', label: '미프 1차' },
  { value: 'mif-2', label: '미프 2차' },
  { value: 'mif-3', label: '미프 3차' },
  { value: 'mif-4', label: '미프 4차' },
]

export const LAST_VISITED_LABEL = '7/26 14:20'

const ITEMS: InboxItem[] = [
  // ① 마감이 있는 것
  {
    id: 'absent-choiyuna',
    kind: 'ABSENT',
    band: 1,
    recent: true,
    status: 'OPEN',
    checkedAt: null,
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
    checkedAt: null,
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
    checkedAt: null,
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
    checkedAt: null,
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
    checkedAt: null,
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
    checkedAt: null,
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
    checkedAt: null,
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
    checkedAt: null,
    teamLabel: '3팀',
    memberCount: 4,
    roundLabel: '미프 3차',
    deadlineLabel: '내일 18:00',
  },
  // ⚠ 이미 체크된 채로 시작하는 시드(사용자 지시, 2026-08-08) — "체크함 · N일
  // 전"이 실제로 어떻게 보이는지 확인하려면 며칠 전에 체크된 예시가 있어야
  // 한다(막 눌러야만 나오는 "오늘"만으론 못 본다). `MOCK_TODAY`(07-27) 기준
  // 3일 전으로 잡았다.
  {
    id: 'failed-team5',
    kind: 'ANALYSIS_FAILED',
    band: 4,
    recent: false,
    status: 'CONTACTED',
    checkedAt: '2026-07-24',
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

// ── 체크 날짜 라벨 ────────────────────────────────────────────

/**
 * 이 파일의 시나리오가 그려진 기준일 — `interviews.ts`의 실측(발행 07-21 →
 * MOCK_TODAY 07-27, 위 판단 기록 참고)과 맞춰 같은 07-27로 잡는다. 실제
 * `new Date()`를 쓰면 값이 매일 달라져 대조가 안 된다(다른 mock 파일의
 * `MOCK_TODAY` 고정과 같은 이유).
 */
const MOCK_TODAY = '2026-07-27'
const DAY_MS = 86_400_000
const dateOnly = (isoDate: string) => new Date(`${isoDate}T00:00:00`).getTime()

/**
 * 체크 날짜 → "오늘"·"어제"·"N일 전"(사용자 지시, 2026-08-08 — 분 단위는
 * 필요 없고 날짜 단위면 된다). `checkedAt`이 없으면(아직 체크 안 함) 호출할
 * 일이 없지만, 방어적으로 빈 문자열을 준다.
 */
export function checkedLabel(checkedAt: string | null, today: string = MOCK_TODAY): string {
  if (!checkedAt) return ''
  const days = Math.round((dateOnly(today) - dateOnly(checkedAt)) / DAY_MS)
  if (days <= 0) return '오늘'
  if (days === 1) return '어제'
  return `${days}일 전`
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

/**
 * `GET /manager/inbox?round=` — `round`가 추가됐다(사용자 지시, 2026-08-08).
 * 이 파일의 시드(`ITEMS`·`RESOLVED_HISTORY`·`RUN_SUMMARY`)는 전부 미프 3차
 * 하나만 그린 것이라(파일 머리말 "하나의 고정 시나리오") **`mif-3` 외 회차는
 * 아직 시나리오가 없다** — `RunLine`이 이미 처리하는 "진행 중인 프로젝트
 * 없음"(#noproject) 빈 상태를 그대로 재사용한다. 다른 회차 시나리오가
 * 필요해지면 이 분기부터 채운다.
 */
export function getInbox(scope: InboxScope, round: RoundId): Promise<InboxResult> {
  if (round !== 'mif-3') {
    return delay({
      run: null,
      items: [],
      resolvedHistory: [],
      lastVisitedLabel: LAST_VISITED_LABEL,
      bandTwoFailed: false,
    })
  }
  const items = ITEMS.filter((i) => i.status !== 'REMOVED' && (scope === 'ALL' || i.recent))
  return delay({
    run: RUN_SUMMARY,
    items,
    resolvedHistory: RESOLVED_HISTORY,
    lastVisitedLabel: LAST_VISITED_LABEL,
    bandTwoFailed: false,
  })
}

/** `CONFIRMED` = 체크 반영됨. `ALREADY_RESOLVED` = 매니저가 확인하기 전에
 *  학생이 스스로 이미 처리한 경합 상황 — 메시지를 안 보내도 여전히 일어날 수
 *  있다(D56 C절, `FAILED`는 폐기 — 발송이 없으니 발송 실패도 없다) */
export type ContactResult = { kind: 'CONFIRMED' } | { kind: 'ALREADY_RESOLVED' }

/**
 * `PATCH /manager/inbox/:id/contacted`(단건) · `PATCH .../team`(팀 단위) — 실제
 * 메시지를 보내는 API가 아니라 매니저가 "체크"를 눌렀다는 상태 저장이다
 * (D56 C절 — 알림 채널은 자르고 상태만 남긴다). 아이템을 못 찾는 방어적 분기는
 * "이미 처리됨"과 동일하게 다룬다 — 보낼 것도, 실패할 것도 없다.
 *
 * ⚠ "팀 전원"이 아니다(사용자 지적, 2026-08-08) — 제출은 팀 대표 1인이 한다
 * (`projects/mockData.ts` `TeamSubmission.submitterName`, 한 명뿐). 버튼
 * 문구에서도 "전원"을 빼고 "체크"만 남겼다.
 */
export function markContacted(id: string): Promise<ContactResult> {
  const item = ITEMS.find((i) => i.id === id)
  if (!item) return delay({ kind: 'ALREADY_RESOLVED' })

  if (item.id === 'retry-jeonghaneul') {
    item.status = 'REMOVED'
    return delay({ kind: 'ALREADY_RESOLVED' })
  }

  item.status = 'CONTACTED'
  // 실제로 지금 누른 것이니 "오늘"로 남긴다 — `checkedLabel`이 이 값과
  // `MOCK_TODAY`를 비교해 방금 누른 항목은 항상 "오늘"로 보여준다.
  item.checkedAt = MOCK_TODAY
  return delay({ kind: 'CONFIRMED' })
}
