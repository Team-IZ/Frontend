// ─────────────────────────────────────────────────────────────
// 운영 관리 API 격리 모듈
// 백엔드 준비 시 각 함수의 Mock 블록만 삭제하고 아래 주석의 fetch를 켜면 됩니다.
// (화면·컴포넌트 코드는 수정 불필요 — 시그니처가 이미 실제 모양입니다)
// ─────────────────────────────────────────────────────────────
//
// **검색·필터·정렬·페이지·집계는 전부 이 파일 안에서 합니다.** 목이 배열이라 화면에서
// 돌리는 게 되지만, 실제 API는 그 결과를 서버가 줍니다 — 그대로 두면 연동이 재작성이
// 됩니다(`docs/dev/api/api-boundary.md` §1-②, `docs/dev/mock-first-screens.md` §3-3).
import type {
  AddRosterRequest,
  AddRosterResult,
  AssignClassRequest,
  AssignResult,
  ClassQuery,
  ClassRoom,
  MockCohort,
  CurriculumDetail,
  CurriculumPage,
  CurriculumQuery,
  CurriculumStatus,
  MovedTrainee,
  Org,
  RosterPage,
  RosterQuery,
  Trainee,
} from './types'
import { ROSTER_PAGE_SIZE, checkEmail, needsManager } from '../rules'

// ───────── Mock 전용 (백엔드 연동 시 이 블록 삭제) ─────────
import { CLASSES, COHORTS, CURRICULA, MANAGERS, MOCK_NOW, ORG, TRAINEES } from './mockDb'

/*
  ⚠ **아직 목인 탭이 쓰는 기수 id.** 실제 기수 id는 UUID이고, 붙은 탭은
  `useCohortScope()`에서 받는다(`_/cohortScope.ts`).

  이 상수는 **목 데이터의 키**라 목과 함께 사라진다 — 화면이 아니라 목 경계가 갖고 있어야
  마지막 탭이 붙는 순간 `mockDb.ts`와 같이 지워진다.
*/
export const MOCK_COHORT_ID = '7'

/** 목 지연. 로딩 상태가 실제로 보이는지 개발 중 확인하려면 필요합니다 */
const LATENCY_MS = 250

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

const fail = (code: 'ADMIN_SAVE_FAILED' | 'DOMAIN_NOT_ALLOWED') =>
  new Promise<never>((_, reject) => setTimeout(() => reject({ code }), LATENCY_MS))

const hit = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.trim().toLowerCase())
// ──────────────────────────────────────────────────────────

/**
 * 지금 시각(`YYYY-MM-DDTHH:mm`). 매니저 `최근 접속` 표기가 이 값을 기준으로 계산된다.
 *
 * **화면이 목 파일을 직접 열지 않게 하려고 여기 둔다.** 목 단계에서는 목업 기준 시각으로
 * 얼려야 값이 매일 달라지지 않는데, 그 사정은 목의 것이지 화면의 것이 아니다 —
 * 연동 시 아래 한 줄만 `new Date().toISOString().slice(0, 16)`으로 바꾼다.
 *
 * 서버 왕복이 아니라 동기 함수다 — 시계를 읽는 데 요청을 보낼 이유가 없다.
 */
export function getNow(): string {
  // ===== Mock 버전 (현재 활성) =====
  return MOCK_NOW
  // return new Date().toISOString().slice(0, 16)
}

/**
 * `GET /admin/org` — 기관 한 건.
 *
 * **도메인이 여기서 나온다.** 명단·매니저 초대가 `기관 도메인 밖 주소`를 막는데, 그 값을
 * 프론트 상수로 두면 기관을 하나 더 만드는 순간 틀린다.
 */
export function getOrg(): Promise<Org> {
  // ===== Mock 버전 (현재 활성) =====
  return delay(ORG)

  // return http<Org>('/admin/org')
}

// ── ① 기수 ── **연동 완료.** 목록·생성·종료는 실서버를 쓴다(CohortsTab)

/** `PATCH /admin/cohorts/{id}` — 종료. 되돌리는 것은 화면에 없다(운영 판단) */
export function closeCohort(id: string): Promise<MockCohort> {
  // ===== Mock 버전 (현재 활성) =====
  const target = COHORTS.find((c) => c.id === id)
  if (!target) return fail('ADMIN_SAVE_FAILED')
  target.status = 'CLOSED'
  return delay(target)

  // return http<Cohort>(`/admin/cohorts/${id}`, { method: 'PATCH', body: { status: 'CLOSED' } })
}

// ── ② 반 ────────────────────────────────────────────────────
/**
 * `GET /admin/classes?cohort=` — **선택 기수** 범위.
 *
 * **두 가지로 쓰인다.** 반 탭은 검색·필터를 걸어 목록으로 그리고, 나머지 넷(명단 필터·
 * 매니저 초대·배정 모드)은 **선택지 목록**이라 조건 없이 전량을 받는다. 그래서 인자가
 * `기수 id` 하나이거나 조건 객체다.
 *
 * 6~10반이라 페이지가 안 나뉜다 — 목록을 그대로 준다(E7 — 페이지가 하나면 페이저를
 * 그리지 않는다). 나뉘어야 하면 명단과 같은 모양(`page`·`size`)을 더한다.
 */
export function listClasses(q: string | ClassQuery): Promise<ClassRoom[]> {
  // ===== Mock 버전 (현재 활성) =====
  /*
    기수 id만 넘기면 **조건 없이 전량**이다 — 반은 선택지 목록으로도 쓰인다(명단 필터·
    매니저 초대·배정 모드). 검색·필터는 반 탭만 건다.
  */
  const { cohortId, search, staffing } = typeof q === 'string' ? { cohortId: q } : q

  const filtered = CLASSES.filter((c) => {
    if (c.cohortId !== cohortId) return false
    // 담당자 이름으로도 찾는다 — `이도윤이 어느 반을 맡았지`가 실제 질문이다
    if (search && !hit(c.name, search) && !hit(c.managerName ?? '', search)) return false
    if (staffing === 'UNSTAFFED' && !needsManager(c)) return false
    if (staffing === 'STAFFED' && needsManager(c)) return false
    return true
  })

  // 이름순 — `A반 · B반 …`이 유일하게 자연스러운 순서라 정렬 옵션을 두지 않는다
  return delay([...filtered].sort((a, b) => a.name.localeCompare(b.name, 'ko')))

  // return http<ClassRoom[]>(`/admin/classes?${qs(q)}`)
}

// ── ② 명단 ──────────────────────────────────────────────────
/**
 * `GET /admin/roster?cohort=&page=` — **선택 기수** 범위.
 *
 * **여기서 페이지가 처음 나뉜다**(250명). `total`은 필터를 적용한 수이고 `unassigned`는
 * 필터와 무관한 전체 기준이다 — 헤더의 `미배정 3`은 검색어를 쳐도 안 바뀌어야 한다.
 */
export function listRoster(q: RosterQuery): Promise<RosterPage> {
  // ===== Mock 버전 (현재 활성) =====
  const all = TRAINEES // 실제로는 cohortId로 걸러진다(목은 7기 하나뿐)
  void q.cohortId

  const filtered = all.filter((t) => {
    if (q.scope === 'UNASSIGNED' && t.classId !== null) return false
    if (q.search && !hit(t.name, q.search) && !hit(t.email, q.search)) return false
    if (q.classId && t.classId !== q.classId) return false
    if (q.account && t.account !== q.account) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) =>
    q.sort === 'RECENT'
      ? // 같은 날 한 번에 등록된 사람이 대부분이라 날짜만으로는 안 갈린다 — id로 마저 가른다
        b.registeredAt.localeCompare(a.registeredAt) || b.id.localeCompare(a.id)
      : a.name.localeCompare(b.name, 'ko'),
  )

  const size = q.size ?? ROSTER_PAGE_SIZE
  const page = Math.max(1, q.page ?? 1)
  const items = sorted.slice((page - 1) * size, page * size)

  return delay({
    items,
    total: sorted.length,
    // 아래 둘은 **필터 전 배열(all)에서** 센다 — 헤더가 걸러 보는 동안 안 흔들려야 한다
    cohortTotal: all.length,
    unassigned: all.filter((t) => t.classId === null).length,
  })

  // return http<RosterPage>(`/admin/roster?${qs(q)}`)
}

/**
 * `POST /admin/roster/preview` — 등록 전에 무엇이 걸리는지 보여준다.
 *
 * **파일 안에서만 판정할 수 없는 것이 하나 있다** — `이미 등록된 이메일`. 명단 전량을
 * 화면이 받아야 셀 수 있으므로 서버가 센다(api-boundary §1-②). 형식·도메인은 화면이
 * 그 자리에서 잡고(rules.parseRosterCsv), 여기서는 그 결과를 합쳐 돌려준다.
 */
export function previewRoster(req: AddRosterRequest): Promise<AddRosterResult> {
  // ===== Mock 버전 (현재 활성) =====
  return delay(evaluateRoster(req))

  // return http<AddRosterResult>('/admin/roster/preview', { method: 'POST', body: req })
}

/**
 * `POST /admin/roster` — 등록 + 활성화 초대 발송.
 *
 * **한 줄 때문에 전체를 막지 않는다**(OP-06 §6). 유효 행은 등록하고, 이미 등록된 것은
 * 건너뛰고, 형식 오류는 행 번호로 알린다.
 */
export function addRoster(req: AddRosterRequest): Promise<AddRosterResult> {
  // ===== Mock 버전 (현재 활성) =====
  const result = evaluateRoster(req)
  if (result.added === 0 && result.skipped === 0) return fail('ADMIN_SAVE_FAILED')

  for (const entry of req.entries) {
    const key = entry.email.toLowerCase()
    if (TRAINEES.some((t) => t.email.toLowerCase() === key)) continue
    if (checkEmail(entry.email, ORG.domain)) continue
    TRAINEES.unshift({
      id: `t-${key}`,
      name: entry.name,
      email: entry.email,
      classId: null,
      className: null,
      // 등록과 동시에 활성화 초대가 나간다 — 받는 사람이 활성화하기 전까지는 초대 대기다
      account: 'INVITED',
      statusNote: null,
      registeredAt: getNow().slice(0, 10),
    })
  }
  return delay(result)

  // return http<AddRosterResult>('/admin/roster', { method: 'POST', body: req })
}

// ── Mock 전용: 미리보기와 등록이 같은 판정을 쓰게 묶는다 ──
function evaluateRoster(req: AddRosterRequest): AddRosterResult {
  void req.cohortId
  let added = 0
  let skipped = 0
  const invalid: AddRosterResult['invalid'] = []

  req.entries.forEach((entry, i) => {
    const reason = checkEmail(entry.email, ORG.domain)
    if (reason) {
      invalid.push({ line: i + 1, reason })
      return
    }
    const key = entry.email.toLowerCase()
    if (TRAINEES.some((t) => t.email.toLowerCase() === key)) skipped++
    else added++
  })

  return { added, skipped, invalid }
}

/**
 * `PATCH /admin/roster/assign` — 배정.
 *
 * **확인 모달을 세우지 않는다**(OP-06 §3) — 250명을 스무 번 나눠 넣는 작업이라 매번
 * 확인을 받으면 반복 배정이 안 된다. 대신 **되돌리기**를 남기고, 그러려면 누가 어느
 * 반에 들어갔는지를 응답이 알려줘야 한다.
 */
export function assignClass(req: AssignClassRequest): Promise<AssignResult> {
  // ===== Mock 버전 (현재 활성) =====
  const room = CLASSES.find((c) => c.id === req.classId)
  if (!room || req.traineeIds.length === 0) return fail('ADMIN_SAVE_FAILED')

  const targets = TRAINEES.filter((t) => req.traineeIds.includes(t.id))
  const moved: MovedTrainee[] = []
  for (const t of targets) {
    // 이미 그 반이면 아무 일도 아니다 — 세면 인원이 부풀고 되돌리기가 남는다
    if (t.classId === room.id) continue

    moved.push({
      id: t.id,
      name: t.name,
      fromClassId: t.classId,
      fromClassName: t.className,
    })
    /*
      **떠나온 반에서 빼야 한다.** 더하기만 하고 있었더니 B반 사람을 A반으로 옮길 때마다
      A반은 늘고 B반은 그대로여서 **반 인원 합이 명단 수보다 커졌다** — 배정 모드가
      `범위=전체`로 옮기기를 지원하는 이상(반 통폐합) 반드시 짝을 맞춰야 한다.
    */
    const from = CLASSES.find((c) => c.id === t.classId)
    if (from) from.size = Math.max(0, from.size - 1)

    t.classId = room.id
    t.className = room.name
  }
  // **정원 초과를 막지 않는다** — 중도 합류·반 통폐합으로 실제로 생기고, 막으면 운영이 멈춘다
  room.size += moved.length
  syncManagerAssignments()

  return delay({ classId: room.id, className: room.name, moved, size: room.size })

  // return http<AssignResult>('/admin/roster/assign', { method: 'PATCH', body: req })
}

/**
 * `PATCH /admin/roster/unassign` — 방금 배정을 되돌린다.
 *
 * 잘못 넣으면 **그 학생이 엉뚱한 반에서 회차를 시작한다** — 되돌리기가 없으면 25명을
 * 손으로 빼야 한다.
 */
export function undoAssign(result: AssignResult): Promise<void> {
  // ===== Mock 버전 (현재 활성) =====
  const room = CLASSES.find((c) => c.id === result.classId)
  for (const m of result.moved) {
    const t = TRAINEES.find((x) => x.id === m.id)
    if (!t) continue
    // **원래 자리로 돌려놓는다.** 무조건 `미배정`으로 보내면 옮기기 전 소속이 사라진다
    t.classId = m.fromClassId
    t.className = m.fromClassName
    const from = CLASSES.find((c) => c.id === m.fromClassId)
    if (from) from.size += 1
  }
  if (room) room.size = Math.max(0, room.size - result.moved.length)
  syncManagerAssignments()
  return delay(undefined)

  // return http<void>('/admin/roster/unassign', { method: 'PATCH', body: { ids: result.traineeIds } })
}

/** `POST /admin/roster/invite` — 활성화 초대 재발송. 초대 대기인 사람에게만 의미가 있다 */
export function resendTraineeInvites(traineeIds: string[]): Promise<number> {
  // ===== Mock 버전 (현재 활성) =====
  const targets = TRAINEES.filter((t) => traineeIds.includes(t.id) && t.account === 'INVITED')
  return delay(targets.length)

  // return http<number>('/admin/roster/invite', { method: 'POST', body: { ids: traineeIds } })
}

/**
 * `PATCH /admin/roster/{id}/status` — 교육생 비활성(OP06-7-①).
 *
 * **중도 이탈은 삭제가 아니다.** 명단에서 지우면 그 사람이 남긴 응시·리포트가 주인을
 * 잃는다 — 계정만 막고 **사유·일자**를 남긴다(매니저의 `정지 · 퇴사 2026-05-02`와 같은 모양).
 *
 * **반은 건드리지 않는다.** MG-05 헤더가 `25명 · 활성 23 · 초대 대기 1 · 비활성 1`이라
 * 비활성을 반 인원 안에 세고 있다 — 반에서 빼면 담당 매니저가 그만둔 학생을 못 본다.
 *
 * **되돌리는 길이 없다.** 그만둔 사람이 돌아오는 경우를 기획이 두지 않았다 — 그래서
 * `status` 인자도 없다. **되돌릴 수 없는 조작이라 화면이 확인을 받는다.**
 */
export function deactivateTrainee(id: string, reason: string): Promise<Trainee> {
  // ===== Mock 버전 (현재 활성) =====
  const target = TRAINEES.find((t) => t.id === id)
  if (!target) return fail('ADMIN_SAVE_FAILED')
  // 사유 없는 비활성은 만들지 않는다 — 서버도 같은 규칙을 검증한다
  if (!reason.trim()) return fail('ADMIN_SAVE_FAILED')

  target.account = 'INACTIVE'
  target.statusNote = `${reason.trim()} ${getNow().slice(0, 10)}`
  return delay(target)

  // return http<Trainee>(`/admin/roster/${id}/status`, {
  //   method: 'PATCH', body: { status: 'INACTIVE', reason },
  // })
}

// ── ③ 매니저 ────────────────────────────────────────────────

/*
  Mock 전용 — 반의 담당이 바뀌면 매니저 쪽 `담당 반`·`담당 인원`도 같이 바뀐다.
  실제로는 서버가 한 테이블에서 양쪽을 만들어 내려주므로 이런 동기화 함수가 없다.
*/
/** 진행 중인 기수 id — 담당·인원·해제가 전부 이 범위에서만 움직인다 */

/**
 * 반 목록을 원천으로 매니저의 담당을 다시 계산한다 — **기수를 가리지 않고 전부** 담는다.
 *
 * 자르는 일은 `listManagers`가 조회 범위에 맞춰 한다(OP06-14). 여기서 미리 잘랐더니
 * **기수 필터가 끝난 기수를 못 찾아 목록이 비었다** — 저장소는 다 갖고 있고 조회가
 * 좁히는 것이 맞다.
 */
function syncManagerAssignments(): void {
  for (const m of MANAGERS) {
    const mine = CLASSES.filter((c) => c.managerId === m.id)

    const byCohort = new Map<string, string[]>()
    for (const room of mine) {
      byCohort.set(room.cohortId, [...(byCohort.get(room.cohortId) ?? []), room.name])
    }

    m.assignments = [...byCohort]
      .map(([cohortId, classNames]) => ({
        cohortId,
        cohortName: COHORTS.find((c) => c.id === cohortId)?.name ?? cohortId,
        classNames,
      }))
      // 최근 기수가 앞으로 — 목록에서 먼저 읽히는 것이 지금 것이어야 한다
      .sort((a, b) => b.cohortId.localeCompare(a.cohortId))

    /*
      **소속 기수 = 담당이 있는 기수 ∪ 초대받은 기수.** 초대로 붙은 소속은 담당이 없어도
      지우지 않는다 — 지우면 초대 대기 계정이 어느 기수 목록에도 안 나온다(OP06-15).
    */
    m.cohortIds = [...new Set([...m.cohortIds, ...byCohort.keys()])]

    // 아래 둘은 조회 범위가 정하므로 `listManagers`가 다시 채운다
    m.pastCohorts = 0
    m.headcount = null
  }
}

// ── ④ 교안 ──────────────────────────────────────────────────
/** `GET /admin/curricula` — **기관 전체** 범위. 여러 기수가 같은 교안을 쓴다 */
export function listCurricula(q: CurriculumQuery = {}): Promise<CurriculumPage> {
  // ===== Mock 버전 (현재 활성) =====
  const filtered = CURRICULA.filter((c) => {
    if (q.search && !hit(c.name, q.search)) return false
    if (q.status && c.status !== q.status) return false
    return true
  })

  const counts: Record<CurriculumStatus, number> = { DONE: 0, ANALYZING: 0, FAILED: 0 }
  for (const c of CURRICULA) counts[c.status]++

  // 목록은 상세의 부분집합이다 — 같은 원천을 잘라 준다(D1)
  return delay({
    items: filtered.map(toRow),
    total: filtered.length,
    counts,
  })

  // return http<CurriculumPage>(`/admin/curricula?${qs(q)}`)
}

/** 상세에서 목록 행만 잘라낸다 — 손으로 두 벌 적으면 한쪽이 반드시 낡는다 */
function toRow(c: CurriculumDetail) {
  const { id, name, version, sections, teachItems, linkedProjectNames, status } = c
  return { id, name, version, sections, teachItems, linkedProjectNames, status }
}

/**
 * `POST /admin/curricula` — 교안 등록. 올리면 **분석이 시작된다.**
 *
 * ⚠ **목업 케이스 표에 이 줄이 없다.** 버튼(`+ 교안 등록`)만 그려져 있고 실패 문구·
 * 에러코드가 정해지지 않았다 — 그런데 OP-03이 *"교안이 없으면 프로젝트를 만들 수 없다"*
 * 고 하면서 `운영 관리 › 교안에서 등록`으로 보내므로 없는 기능이 아니다.
 * 지금은 일반 저장 실패(`ADMIN_SAVE_FAILED`)로 답한다 — **케이스 표에 줄이 생기면
 * 여기와 화면 문구를 같이 고친다.**
 *
 * 파일 자체는 `multipart/form-data`로 나간다. 목에서는 이름·쪽수만 쓴다.
 */
export function registerCurriculum(req: {
  name: string
  version: string
  fileName: string
  pageCount: number
}): Promise<CurriculumDetail> {
  // ===== Mock 버전 (현재 활성) =====
  if (!req.name.trim() || !req.version.trim()) return fail('ADMIN_SAVE_FAILED')
  if (CURRICULA.some((c) => c.name === req.name.trim() && c.version === req.version.trim()))
    return fail('ADMIN_SAVE_FAILED')

  const created: CurriculumDetail = {
    id: `cur-${req.name.trim()}-${req.version.trim()}`,
    name: req.name.trim(),
    version: req.version.trim(),
    // 분석이 끝나야 항목이 나온다 — **0이 아니라 `없음`이다**(F3)
    sections: null,
    teachItems: null,
    linkedProjectNames: [],
    status: 'ANALYZING',
    fileName: req.fileName,
    pageCount: req.pageCount,
    registeredAt: getNow().replace('T', ' '),
    sectionList: [],
    linked: [],
    failureReason: null,
  }
  CURRICULA.unshift(created)
  return delay(created)

  // return http<CurriculumDetail>('/admin/curricula', { method: 'POST', body: form })
}

export function getCurriculum(id: string): Promise<CurriculumDetail> {
  // ===== Mock 버전 (현재 활성) =====
  const found = CURRICULA.find((c) => c.id === id)
  if (!found) return fail('ADMIN_SAVE_FAILED')
  return delay(found)

  // return http<CurriculumDetail>(`/admin/curricula/${id}`)
}

/**
 * `POST /admin/curricula/{id}/analyze` — 다시 분석.
 *
 * **이미 응시한 학생의 문항과 리포트는 그대로 둔다** — 새 결과는 다음에 만드는 회차부터
 * 적용된다(OP-06 §6). 지난 회차 결과가 바뀌면 회차 간 비교가 깨진다.
 */
export function reanalyzeCurriculum(id: string): Promise<CurriculumDetail> {
  // ===== Mock 버전 (현재 활성) =====
  const target = CURRICULA.find((c) => c.id === id)
  if (!target) return fail('ADMIN_SAVE_FAILED')
  target.status = 'ANALYZING'
  target.failureReason = null
  return delay(target)

  // return http<CurriculumDetail>(`/admin/curricula/${id}/analyze`, { method: 'POST' })
}

// ── ⑤ 비용 ──────────────────────────────────────────────────
/**
 * `GET /admin/cost?cohort=` — 기관 총량 + 기수/반.
 *
 * 반별은 **선택 기수** 범위이고 요약은 기관 전체다 — 한 응답에 두 범위가 들어가는 것이
 * 이 탭의 모양이다(상단은 `기관 전체`, 아래 표는 `7기 · 이번 달`).
 */

// ── ⑥ 비용 ── **연동 완료.** CostTab이 실서버를 쓴다(useFindCohortCost)
