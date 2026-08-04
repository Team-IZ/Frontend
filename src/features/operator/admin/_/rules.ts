/*
  기획이 정한 규칙과, 그 규칙에서 나오는 표시값.

  **서버도 같은 규칙을 검증한다.** 클라이언트 검증만 있으면 우회되므로, 여기 있는
  값이 바뀌면 백엔드와 같이 바꾼다(`docs/dev/api-boundary.md` §1-④).
  목 데이터가 아니므로 **연동해도 이 파일은 남는다.**

  전부 순수 함수다 — `npm run check:admin`이 이 파일만 보고 규칙을 검사한다.
*/
import type {
  ClassRoom,
  CohortStatus,
  RosterEntry,
  RosterIssue,
  RosterIssueReason,
} from './api/types'

/**
 * 명단 한 쪽에 몇 명.
 *
 * **여기가 페이저를 처음 그리는 화면이다**(api-boundary §2-1이 *"실제로 나뉘어야 하는
 * 화면(OP-06 명단 250명)에서 더한다"* 고 미뤄 둔 그 자리).
 *
 * **02-layout §6을 따른다** — *"스크롤과 페이징을 같이 쓰지 않는다. 한 쪽이 뷰포트에
 * 들어가는 행 수로 자른다"*(OP-05가 20행 → 13행으로 줄인 선례). 1512×900 실측으로
 * **열 줄과 페이저가 다 들어간다**(마지막 행 바닥 846px · 페이저 바닥 891px).
 * 이메일을 이름 밑에서 제 열로 빼면서 행이 57px → 53px이 되어 그 4px씩이 만든 자리다.
 *
 * ⚠ **한때 25였다.** 목업 푸터가 `1–25 / 250명`이었고, *"이 탭이 반 표와 명단 표를 같이
 * 담아 남는 높이가 없다"* 가 근거였다 — [[D24]]로 탭이 갈리면서 **그 근거가 사라졌는데
 * 값만 남아 있었다.** 25쪽이 되는 것은 맞지만, 250은 페이지로 훑을 수가 아니라 검색·필터로
 * 좁힐 수다 — 뒤쪽 쪽수를 눌러 사람을 찾는 동선은 처음부터 없다.
 *
 * 기획이 쪽당 인원을 정하면 여기만 바꾼다.
 */
export const ROSTER_PAGE_SIZE = 10

/**
 * 새 반의 기본 정원. 목업의 반이 전부 `/ 25`이고, 17번이 스코프를 **250명 · 10반**으로
 * 잡은 그 값이다(`250 ÷ 10`). 입력에서 바꿀 수 있다 — 기본값이지 상한이 아니다.
 */
export const DEFAULT_CLASS_CAPACITY = 25

/**
 * 반을 고치거나 없앨 수 있는 기수인가 — **개강 전에만**(decision-log D30-②).
 *
 * *"부트캠프 시작 이후엔 반 안 고친다"* 가 기획의 답이다. 시작하고 나면 그 반으로 회차가
 * 돌고 리포트가 쌓여서, 이름을 바꾸거나 없애면 지난 기록이 가리키는 곳이 사라진다.
 *
 * **날짜 하나로 갈린다 — 예외를 만들지 않는다.** `인원이 0명이면` 같은 조건을 더하면
 * *"왜 이 반만 되지"* 를 매번 설명해야 한다.
 *
 * **잠긴 뒤에도 담당 매니저 변경과 반 배정은 된다.** 그건 운영 중에 계속 일어나는
 * 일이고(매니저 퇴사·중도 합류), 반 자체를 바꾸는 것이 아니다.
 *
 * @param today `YYYY-MM-DD`. 서버 시각을 넣는다 — 사용자 시계로 판정하면 우회된다
 */
export function canEditClasses(cohortStartAt: string, today: string): boolean {
  return today < cohortStartAt
}

/**
 * 담당 배정을 바꿀 수 있나 — **기수가 어디쯤 왔는지가 정한다**(decision-log D38).
 *
 * 반 편집(`canEditClasses`)은 개강 전에만 열리지만, **담당 변경은 운영 중에도 일어난다**
 * (매니저 퇴사·교체). 대신 그때는 학생이 이미 그 사람을 보고 있으므로 확인을 받는다.
 *
 *   · `FREE`   시작 전 — 아직 아무 일도 안 일어났다
 *   · `CONFIRM` 진행 중 — 되돌릴 수 있지만 학생이 보는 담당자가 바뀐다
 *   · `LOCKED` 종료 — 이미 끝난 기수다. 이력 조회만 한다
 *
 * @param today `YYYY-MM-DD`. 서버 시각을 넣는다 — 사용자 시계로 판정하면 우회된다
 */
export function assignPolicy(
  cohort: { status: CohortStatus; startAt: string },
  today: string,
): 'FREE' | 'CONFIRM' | 'LOCKED' {
  if (cohort.status === 'CLOSED') return 'LOCKED'
  return today < cohort.startAt ? 'FREE' : 'CONFIRM'
}

// ── 이메일 ──────────────────────────────────────────────────
/*
  기관 도메인 밖 주소는 등록되지 않는다(OP-06 §3 · 케이스 `DOMAIN_NOT_ALLOWED`).

  형식 검사는 **최소한만** 한다. RFC를 흉내 낸 정규식은 실제로 유효한 주소를 떨어뜨리고,
  진짜 판정은 초대 메일이 도착하는지로 갈린다 — 여기서 막을 것은 `이름만 적힌 칸`처럼
  명백히 주소가 아닌 것이다.
*/
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmailShape(value: string): boolean {
  return EMAIL_SHAPE.test(value)
}

/** 기관 도메인 주소인가. 대소문자를 가리지 않는다 — 사용자는 섞어 친다 */
export function isOrgEmail(value: string, domain: string): boolean {
  return value.toLowerCase().endsWith(`@${domain.toLowerCase()}`)
}

/** 화면이 쓰는 판정 하나 — 이 주소를 등록할 수 있나. 못 하면 이유가 곧 문구가 된다 */
export function checkEmail(value: string, domain: string): RosterIssueReason | null {
  if (!isEmailShape(value)) return 'INVALID_FORMAT'
  if (!isOrgEmail(value, domain)) return 'DOMAIN_NOT_ALLOWED'
  return null
}

// ── CSV ────────────────────────────────────────────────────
export type ParsedRoster = {
  /** 등록 후보. 서버가 여기서 **이미 등록된 이메일**을 다시 걸러낸다 */
  entries: RosterEntry[]
  /** 고쳐야 하는 행. **행 번호를 그대로 쓴다** — 편집기에서 그 줄을 찾을 수 있어야 한다 */
  invalid: RosterIssue[]
}

/**
 * 명단 CSV를 읽는다. **열은 둘 — 이름, 이메일**(목업 `#roster-add`).
 *
 * **한 줄 때문에 전체를 막지 않는다**(OP-06 §6). 오류 행은 번호로 모아 알리고 나머지는
 * 그대로 등록 후보가 된다 — 수백 명 파일을 통째로 되돌리면 아무도 안 쓴다.
 *
 * ▸ **머리글 행은 건너뛴다.** 양식을 내려받아 쓰면 첫 줄이 `이름,이메일`인데, 그것을
 *   오류로 세면 **모든 파일이 오류 1건**으로 시작한다. 둘째 칸이 주소 모양이 아닌
 *   첫 줄 하나만 건너뛴다 — 규칙을 어휘(`이름`·`name`)로 정하면 언어마다 틀린다.
 * ▸ **파일 안 중복도 잡는다.** 서버는 *이미 등록된* 것만 아는데, 같은 파일에 같은
 *   주소가 두 번 있으면 어느 쪽이 등록됐는지 알 수 없다.
 *
 * 서버 검증을 대신하지 않는다 — 같은 규칙이 서버에도 있어야 한다(우회 가능).
 */
export function parseRosterCsv(text: string, domain: string): ParsedRoster {
  const entries: RosterEntry[] = []
  const invalid: RosterIssue[] = []
  const seen = new Set<string>()

  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw.trim()) continue // 빈 줄은 오류가 아니다 — 파일 끝 개행이 늘 붙는다

    const line = i + 1
    const [name = '', email = ''] = raw.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))

    // 머리글 — 첫 유효 줄이면서 주소 모양이 아니면 양식의 열 이름으로 본다
    if (entries.length === 0 && invalid.length === 0 && !isEmailShape(email)) continue

    const reason = checkEmail(email, domain)
    if (reason) {
      invalid.push({ line, reason })
      continue
    }
    const key = email.toLowerCase()
    if (seen.has(key)) {
      invalid.push({ line, reason: 'DUPLICATE_IN_FILE' })
      continue
    }
    seen.add(key)
    // 이름이 비면 이메일 앞부분을 쓴다 — 초대는 나가야 하고, 이름은 받는 사람이 고친다
    entries.push({ name: name || email.slice(0, email.indexOf('@')), email })
  }

  return { entries, invalid }
}

/**
 * 직접 입력 행을 검사한다 — **CSV와 같은 판정을 같은 순서로** 한다.
 *
 * 직접 입력만 `checkEmail`을 한 줄씩 돌리고 있었고, 그래서 CSV가 잡는 것 둘을 놓쳤다.
 *
 * ▸ **줄 번호가 어긋났다.** 빈 행을 걸러낸 뒤의 인덱스를 번호로 썼다 — 1행을 비우고
 *   2행에 잘못된 주소를 치면 화면은 `1번째 줄 오류`라고 말하는데 그 칸은 멀쩡한 빈 칸이다.
 *   **입력칸 번호와 같아야 한다**(CSV의 행 번호가 편집기 줄 번호와 같아야 하는 것과 같다).
 * ▸ **입력칸 사이 중복을 안 잡았다.** 같은 주소를 두 줄에 치면 둘 다 유효로 세는데
 *   서버는 하나만 등록한다 — `✓ 유효 2명`이라 해 놓고 1명이 들어간다.
 *
 * @param rows 빈 행을 **포함한** 입력칸 전체. 번호가 칸과 맞아야 해서 거르지 않고 받는다
 */
export function checkRosterRows(rows: RosterEntry[], domain: string): RosterIssue[] {
  const issues: RosterIssue[] = []
  const seen = new Set<string>()

  rows.forEach((row, i) => {
    const email = row.email.trim()
    if (!email) return // 아직 안 친 칸은 오류가 아니다

    const reason = checkEmail(email, domain)
    if (reason) return issues.push({ line: i + 1, reason })

    const key = email.toLowerCase()
    if (seen.has(key)) return issues.push({ line: i + 1, reason: 'DUPLICATE_IN_FILE' })
    seen.add(key)
  })

  return issues
}

// ── 정원 ────────────────────────────────────────────────────
export type CapacityPreview = {
  /** 넣은 뒤 인원 */
  next: number
  /** 정원을 넘는가. **막지는 않는다** */
  over: boolean
  /** 남는 자리. 넘으면 음수 */
  remaining: number
}

/**
 * 고른 순간 **결과를 미리 보여준다** — 목업 레일의 `22 → 24 / 25 · 1자리 남음`.
 * 넣기 전에 알면 되돌릴 일이 줄어든다.
 *
 * **정원 초과를 막지 않는다**(OP-06 §3). 중도 합류·반 통폐합으로 실제로 생기고,
 * 막으면 운영이 멈춘다 — **넘는다는 사실만 알린다.**
 */
export function capacityPreview(room: ClassRoom, adding: number): CapacityPreview {
  const next = room.size + adding
  return { next, over: next > room.capacity, remaining: room.capacity - next }
}

/**
 * 담당 매니저가 없는 반인가.
 *
 * **서버 판정 필드를 따로 두지 않는다.** `managerId === null`과 1:1이라 필드를 만들면
 * 같은 사실이 두 곳에 생기고, 한쪽만 갱신되는 순간 목록과 경고가 어긋난다.
 * (프로젝트의 `ProjectStatus`와 다른 경우다 — 저쪽은 교안·개념·마감 **여러 입력**을
 * 서버가 종합해 판정하는 값이라 화면이 유추하면 규칙이 두 벌이 된다.)
 */
export function needsManager(room: ClassRoom): boolean {
  return room.managerId === null
}

// ── 표시값 ──────────────────────────────────────────────────
/**
 * 최근 접속 — 목업 `오늘 09:41` · `어제 18:02` · `2026-05-02`.
 *
 * **서버는 시각만 주고 표기는 화면이 만든다.** `오늘`을 서버가 계산해 문자열로 내려주면
 * 그 응답이 캐시되는 순간 틀린다(api-boundary §2-3과 같은 이유).
 *
 * @param now 기준 시각. 목 단계에서는 목업 기준일을 넣어 값을 고정한다
 */
export function formatLastSeen(iso: string | null, now: string): string | null {
  if (!iso) return null
  const days = dayDiff(now, iso)
  if (Number.isNaN(days)) return null
  const time = iso.slice(11, 16)
  if (days === 0) return `오늘 ${time}`
  if (days === 1) return `어제 ${time}`
  return iso.slice(0, 10)
}

/** 날짜 부분만 남긴 일수 차. 시각이 섞이면 하루 차이가 들쭉날쭉해진다 */
function dayDiff(from: string, to: string): number {
  const a = new Date(from.slice(0, 10)).getTime()
  const b = new Date(to.slice(0, 10)).getTime()
  return Math.round((a - b) / 86_400_000)
}

/**
 * 달력이 고른 날짜를 저장 형식(`YYYY-MM-DD`)으로.
 *
 * `toISOString()`을 쓰지 않는다 — UTC로 밀려 **한국 시간 오전 9시 이전이면 하루가
 * 어긋난다.** 로컬 달력에서 고른 날짜는 로컬 날짜여야 한다.
 */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 기간 표기 `2026-03 ~ 09`. 해가 같으면 뒤쪽 연도를 접는다 — 표에서 같은 글자가 반복된다 */
export function formatPeriod(startAt: string, endAt: string): string {
  const start = startAt.slice(0, 7)
  const end = endAt.slice(0, 7)
  return start.slice(0, 4) === end.slice(0, 4) ? `${start} ~ ${end.slice(5)}` : `${start} ~ ${end}`
}

/**
 * 금액. **소수점을 만들지 않는다** — `$412`처럼 자리만 끊는다(A4 — 모르는 정밀도를
 * 아는 척하지 않는다). 1인당처럼 나눈 값만 소수 둘째 자리까지 쓴다.
 */
export function formatUsd(amount: number, fraction = 0): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  })}`
}

/** 1인당 비용. 분자·분모가 **같은 줄에 다 있는** 파생값이라 화면이 나눈다 */
export function perTrainee(amount: number, trainees: number): string {
  return trainees > 0 ? formatUsd(amount / trainees, 2) : '—'
}
