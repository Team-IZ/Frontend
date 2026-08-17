/*
  기획이 정한 규칙과, 그 규칙에서 나오는 표시값.

  **서버도 같은 규칙을 검증한다.** 클라이언트 검증만 있으면 우회되므로, 여기 있는
  값이 바뀌면 백엔드와 같이 바꾼다(`docs/dev/api/api-boundary.md` §1-④).
  목 데이터가 아니므로 **연동해도 이 파일은 남는다.**

  전부 순수 함수다 — `npm run check:admin`이 이 파일만 보고 규칙을 검사한다.
*/
/*
  `#lib/`은 package.json의 `imports` 필드로 정의한 **Node 표준 서브패스 import**다.
  이 파일은 `npm run check:admin`이 Node로 단독 실행하는데(`--experimental-strip-types`)
  Node는 우리 번들러 별칭(`@/`)을 모른다. `#`은 Node·TypeScript·Vite가 모두 읽는다.
*/
import { isEmailShape } from '#lib/validation.ts'
import type { CohortStatus, RosterEntry, RosterIssue, RosterIssueReason } from './api/types'

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
 * 담아 남는 높이가 없다"* 가 근거였다 — [[OP06-1]]로 탭이 갈리면서 **그 근거가 사라졌는데
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
/**
 * 반 이름을 저장할 모양으로 만든다 — **입력은 `A`, 저장은 `A반`.**
 *
 * ⚠ **한때 사용자가 「반」까지 쳤다.** 입력칸 자리표시자가 `K반`이라 그렇게 하라는 뜻이
 * 됐는데, 그러면 **매번 같은 한 글자를 다시 치고** 빠뜨리면 `A`라는 반이 생겨 목록에서
 * 혼자 다른 모양이 된다.
 *
 * **저장값은 지금 그대로 `A반`이다.** 서버는 `name`이 자유 문자열이고(스펙 `example: '1반'`,
 * 길이 말고 제약 없음) 기존 데이터가 전부 `…반`이다 — 저장 규칙을 바꾸면 매니저·교육생
 * 화면까지 같은 규칙을 알아야 하고 기존 행도 손봐야 한다. **바뀌는 것은 입력 방식뿐이다.**
 *
 * 이미 「반」으로 끝나면 그대로 둔다 — 붙이면 `A반반`이 된다.
 */
export function classroomName(input: string): string {
  const v = input.trim()
  if (!v) return v
  return v.endsWith('반') ? v : `${v}반`
}

export const DEFAULT_CLASS_CAPACITY = 25

/**
 * 반을 고치거나 없앨 수 있는 기수인가 — **개강 전에만**(op-06-admin.md OP06-7-②).
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
 * 담당 배정을 바꿀 수 있나 — **기수가 어디쯤 왔는지가 정한다**(op-06-admin.md OP06-15).
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
/**
 * 한 번에 등록할 수 있는 최대 인원 — **서버도 같은 값을 검증한다**
 * (`CSV_FORMAT_INVALID · "한 번에 최대 1000명의 교육생을 초대할 수 있습니다"`,
 * 8/13 실측 — 5000명 업로드가 이 코드로 거절됨). 넘으면 서버에 물어볼 것도 없이
 * 화면에서 먼저 막는다 — 어차피 실패할 요청은 아예 보내지 않는다.
 */
export const MAX_TRAINEE_INVITE = 1000

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
/*
  **서버가 넓어져서 화면도 같이 넓혔다**(29차 회신 Q1 「나」 · 2026-08-16 실측).

  한때 열 이름을 찾아 순서·개수와 무관하게 읽다가, 서버가 그것을 안 받아서
  (`CSV_FORMAT_INVALID · "헤더는 '이름', '이메일' 두 열이어야 합니다"`) 되돌렸었다.
  화면만 관대하면 「유효 2명」이라 해 놓고 등록에서 통째로 튕기기 때문이다.

  **지금은 서버가 받는다.** 스펙 설명도 그렇게 바뀌었다 —
  *"첫 행에 '이름'·'이메일' 열이 있는 CSV 파일(UTF-8 또는 CP949, 열 순서 무관)"*.

      번호,이메일,소속,이름   (CP949)  →  200 ✅
      이메일,이름            (UTF-8)  →  200 ✅
      이메일만                        →  400  CSV_FORMAT_INVALID
      이름이 빈칸                      →  400  TRAINEE_NAME_INVALID

  그래서 **이름으로 찾는다** — 사람들이 실제로 쓰는 파일(`번호 · 이름 · 소속 · 이메일`)이
  그대로 올라간다. 판정 기준은 여전히 서버와 같다: 두 열이 **있기만** 하면 되고, 없으면
  파일 오류다.
*/
const HEADER = { name: '이름', email: '이메일' } as const

/** 한 줄을 칸으로 나눈다 — **따옴표 안의 쉼표를 안 자른다**(엑셀이 그렇게 내보낸다) */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else quoted = false
      } else cur += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      cells.push(cur)
      cur = ''
    } else cur += c
  }
  cells.push(cur)
  return cells.map((x) => x.trim())
}

/**
 * 명단 CSV를 읽는다. **머리글에서 `이름`·`이메일` 열을 찾아** 그 두 열만 쓴다.
 *
 * **한 줄 때문에 전체를 막지 않는다**(OP-06 §6). 오류 행은 번호로 모아 알리고 나머지는
 * 그대로 등록 후보가 된다 — 수백 명 파일을 통째로 되돌리면 아무도 안 쓴다.
 *
 * ▸ **행 번호는 파일의 줄 번호다.** 편집기에서 그 줄을 찾을 수 있어야 한다.
 * ▸ **파일 안 중복도 잡는다.** 서버는 *이미 등록된* 것만 아는데, 같은 파일에 같은
 *   주소가 두 번 있으면 어느 쪽이 등록됐는지 알 수 없다.
 *
 * 서버 검증을 대신하지 않는다 — 같은 규칙이 서버에도 있어야 한다(우회 가능).
 */
export function parseRosterCsv(text: string, domain: string): ParsedRoster {
  const entries: RosterEntry[] = []
  const invalid: RosterIssue[] = []
  const seen = new Set<string>()

  // BOM — 엑셀이 UTF-8로 내보내면 맨 앞에 붙는다. 남기면 첫 열 이름이 안 맞는다
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)

  /*
    머리글 줄 — **`이름`·`이메일` 열을 이름으로 찾는다.** 순서도 개수도 안 따진다(서버
    규칙과 같다). 둘 중 하나라도 없으면 그 파일로는 아무것도 할 수 없어 파일 오류다.

    ⚠ **머리글 칸도 `trim()`한다.** 엑셀이 `이름, 이메일`처럼 쉼표 뒤 공백을 남기는
    파일이 흔한데, 그대로 비교하면 `" 이메일" !== "이메일"`이라 **열이 있는데 없다고**
    한다. BOM은 위에서 이미 뗐다.
  */
  const headerLine = lines.findIndex((l) => l.trim())
  const header = headerLine < 0 ? [] : splitCsvLine(lines[headerLine]).map((c) => c.trim())
  const cols = {
    name: header.indexOf(HEADER.name),
    email: header.indexOf(HEADER.email),
  }
  if (cols.name < 0 || cols.email < 0)
    return { entries, invalid: [{ line: Math.max(headerLine + 1, 1), reason: 'HEADER_NOT_FOUND' }] }

  for (let i = headerLine + 1; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw.trim()) continue // 빈 줄은 오류가 아니다 — 파일 끝 개행이 늘 붙는다

    const line = i + 1
    const cells = splitCsvLine(raw)
    const name = (cells[cols.name] ?? '').trim()
    const email = (cells[cols.email] ?? '').trim()
    if (!name && !email) continue // 다른 열만 채워진 줄은 우리 것이 아니다

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
    /*
      ⚠ **이름이 비면 오류다.** 이메일 앞부분으로 채우고 있었는데, 서버는 그 행 하나로
      **파일 전체를 400으로 거절한다**(`TRAINEE_NAME_INVALID`). 화면만 관대하면
      「유효 2명」이라 해 놓고 아무도 안 들어간다 — 판정은 서버와 같아야 한다.
    */
    if (!name) {
      invalid.push({ line, reason: 'NAME_REQUIRED' })
      continue
    }
    entries.push({ name, email })
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

    // CSV와 같은 판정 — 이름 없이 보내면 서버가 거절한다
    if (!row.name.trim()) return issues.push({ line: i + 1, reason: 'NAME_REQUIRED' })

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
export function capacityPreview(
  room: { capacity: number; size: number },
  adding: number,
): CapacityPreview {
  const next = room.size + adding
  return { next, over: next > room.capacity, remaining: room.capacity - next }
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

/**
 * 기간 표기 `2026-03 ~ 09`. 해가 같으면 뒤쪽 연도를 접는다 — 표에서 같은 글자가 반복된다.
 *
 * **한쪽이 비어 있을 수 있다.** 서버의 `startDate`·`endDate`가 둘 다 nullable이라
 * 날짜를 안 정하고 만든 기수가 온다 — 있는 쪽만 쓰고 없는 쪽은 `?`로 둔다.
 * 둘 다 없으면 기간 자체가 정해지지 않은 것이라 `—`다.
 */
/**
 * 남은 기간 — **끝이 가까우면 개월이 거짓말한다.**
 *
 * 서버가 주는 `monthsLeft`는 개월이라, 8월에 보는 8월 말 종료 기수가 `0개월`이 된다.
 * 이미 끝난 것과 **2주 남은 것이 같은 글자**가 된다. 한 달을 못 채우면 날짜로 센다.
 *
 * @param today `YYYY-MM-DD`. 서버 시각을 넣는다
 */
export function remainingLabel(
  monthsLeft: number,
  endAt: string | null,
  today: string,
): { text: string; ending: boolean } {
  if (monthsLeft >= 2) return { text: `${monthsLeft}개월`, ending: false }
  if (!endAt) return { text: `${monthsLeft}개월`, ending: false }
  const days = dayDiff(endAt, today)
  if (Number.isNaN(days)) return { text: `${monthsLeft}개월`, ending: false }
  if (days < 0) return { text: '종료됨', ending: true }
  if (days === 0) return { text: '오늘 종료', ending: true }
  return { text: `${days}일`, ending: days <= 14 }
}

export function formatPeriod(startAt: string | null, endAt: string | null): string {
  if (!startAt && !endAt) return '—'
  const start = startAt?.slice(0, 7)
  const end = endAt?.slice(0, 7)
  if (!start || !end) return `${start ?? '?'} ~ ${end ?? '?'}`
  return start.slice(0, 4) === end.slice(0, 4) ? `${start} ~ ${end.slice(5)}` : `${start} ~ ${end}`
}

/**
 * 금액. **소수점을 만들지 않는다** — `$412`처럼 자리만 끊는다(A4 — 모르는 정밀도를
 * 아는 척하지 않는다). 1인당처럼 나눈 값만 소수 둘째 자리까지 쓴다.
 *
 * ⚠ **0이 아닌데 0으로 보이게 두지 않는다.** `$0.42`를 `$0`으로 끊었더니 화면이
 * *"지난달 $0 → -100%"* 라고 말했다 — $0에서 $0으로 갔는데 100% 줄었다는 뜻이 되어
 * 읽는 사람이 어느 쪽을 믿을지 모른다(실측 — 9기 누적 0.415542).
 *
 * ⚠ **그렇다고 `<$1`로 쓰지 않는다.** 한때 그렇게 했는데 *"이게 뭐냐"* 는 말을 들었다 —
 * 「1달러보다 작다」는 **얼마인지를 지운다.** 42센트인지 1센트인지 모른 채 다음 판단을
 * 못 한다. **1달러 미만이면 센트까지 쓴다**(`$0.42`). 자릿수가 하나 늘 뿐이고,
 * 0인 기수는 여전히 `$0`이라 **「안 썼다」와 「조금 썼다」가 눈에 갈린다.**
 */
export function formatUsd(amount: number, fraction = 0): string {
  if (fraction === 0 && amount !== 0 && Math.abs(amount) < 1) {
    // 센트로도 0이 되는 값 — 여기서만 「보다 작다」를 쓴다. 자릿수를 더 늘려도 못 읽는다
    if (Math.abs(amount) < 0.005) return amount > 0 ? '<$0.01' : '>-$0.01'
    const cents = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return amount < 0 ? `-$${cents}` : `$${cents}`
  }
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  })}`
}

/** 1인당 비용. 분자·분모가 **같은 줄에 다 있는** 파생값이라 화면이 나눈다 */
export function perTrainee(amount: number, trainees: number): string {
  return trainees > 0 ? formatUsd(amount / trainees, 2) : '—'
}
