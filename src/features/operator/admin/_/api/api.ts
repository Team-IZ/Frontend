// ─────────────────────────────────────────────────────────────
// 운영 관리 API 격리 모듈
// 백엔드 준비 시 각 함수의 Mock 블록만 삭제하고 아래 주석의 fetch를 켜면 됩니다.
// (화면·컴포넌트 코드는 수정 불필요 — 시그니처가 이미 실제 모양입니다)
// ─────────────────────────────────────────────────────────────
//
// **검색·필터·정렬·페이지·집계는 전부 이 파일 안에서 합니다.** 목이 배열이라 화면에서
// 돌리는 게 되지만, 실제 API는 그 결과를 서버가 줍니다 — 그대로 두면 연동이 재작성이
// 됩니다(`docs/dev/api-boundary.md` §1-②, `docs/dev/mock-first-screens.md` §3-3).
import type {
  AddRosterRequest,
  AddRosterResult,
  AdminCounts,
  AssignClassRequest,
  AssignResult,
  ClassCost,
  ClassQuery,
  ClassRoom,
  Cohort,
  CohortPage,
  CohortQuery,
  CohortStatus,
  CostSummary,
  CreateClassRequest,
  CreateCohortRequest,
  CurriculumDetail,
  CurriculumPage,
  CurriculumQuery,
  CurriculumStatus,
  InviteManagerRequest,
  Manager,
  ManagerPage,
  ManagerQuery,
  ManagerStatus,
  MovedTrainee,
  Org,
  RosterPage,
  RosterQuery,
  Trainee,
} from './types'
import { ROSTER_PAGE_SIZE, canEditClasses, checkEmail, needsManager } from '../rules'

// ───────── Mock 전용 (백엔드 연동 시 이 블록 삭제) ─────────
import {
  CLASSES,
  CLASS_COST,
  COHORTS,
  COST,
  CURRICULA,
  MANAGERS,
  MOCK_NOW,
  ORG,
  TRAINEES,
} from './mockDb'

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

/**
 * `GET /admin/counts?cohort=` — 탭 이름 옆 개수.
 *
 * **탭 하나를 열려고 다섯 탭을 다 조회하지 않는다.** 개수는 목록이 아니라 수라서 서버가
 * 세는 편이 싸고, 이 한 번으로 다섯 탭이 채워진다 — 탭마다 목록을 미리 부르면 열지도
 * 않은 탭 때문에 요청이 넷 더 나간다.
 *
 * 범위가 탭마다 다르다는 것이 여기서도 보인다 — `classes`·`trainees`는 **선택 기수**,
 * `managers`·`curricula`·`cohorts`는 **기관 전체**다(OP-06 §3).
 */
export function getAdminCounts(cohortId: string): Promise<AdminCounts> {
  // ===== Mock 버전 (현재 활성) =====
  return delay({
    cohorts: COHORTS.length,
    classes: CLASSES.filter((c) => c.cohortId === cohortId).length,
    unstaffedClasses: CLASSES.filter((c) => c.cohortId === cohortId && needsManager(c)).length,
    trainees: TRAINEES.length,
    managers: MANAGERS.length,
    curricula: CURRICULA.length,
  })

  // return http<AdminCounts>(`/admin/counts?cohort=${cohortId}`)
}

// ── ① 기수 ──────────────────────────────────────────────────
/** `GET /admin/cohorts` — 기관 전체. 기수 탭만 상단 스위처의 영향을 받지 않는다 */
export function listCohorts(q: CohortQuery = {}): Promise<CohortPage> {
  // ===== Mock 버전 (현재 활성) =====
  const filtered = COHORTS.filter((c) => {
    if (q.search && !hit(c.name, q.search)) return false
    if (q.status && c.status !== q.status) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) =>
    q.sort === 'NAME'
      ? a.name.localeCompare(b.name)
      : // 최신순 — 시작일 늦은 것이 위로. 운영 중인 기수를 먼저 본다
        b.startAt.localeCompare(a.startAt),
  )

  // counts는 **필터와 무관한 전체 모집단** 기준이다(헤더 내역과 푸터 개수는 다른 값)
  const counts: Record<CohortStatus, number> = { RUNNING: 0, CLOSED: 0 }
  for (const c of COHORTS) counts[c.status]++

  return delay({ items: sorted, total: sorted.length, counts })

  // return http<CohortPage>(`/admin/cohorts?${qs(q)}`)
}

/** `POST /admin/cohorts` — 초기 명단을 같이 넣으면 등록과 동시에 활성화 초대가 나간다 */
export function createCohort(req: CreateCohortRequest): Promise<Cohort> {
  // ===== Mock 버전 (현재 활성) =====
  if (!req.name.trim() || req.startAt >= req.endAt) return fail('ADMIN_SAVE_FAILED')
  // 같은 기관 안에서 기수명은 중복될 수 없다 — 서버도 같은 규칙을 검증한다
  if (COHORTS.some((c) => c.name === req.name.trim())) return fail('ADMIN_SAVE_FAILED')

  const created: Cohort = {
    id: `c-${req.name.trim()}`,
    name: req.name.trim(),
    status: 'RUNNING',
    classes: 0,
    trainees: req.roster?.length ?? 0,
    startAt: req.startAt,
    endAt: req.endAt,
    current: false,
  }
  COHORTS.unshift(created)
  return delay(created)

  // return http<Cohort>('/admin/cohorts', { method: 'POST', body: req })
}

/**
 * `GET /admin/cohorts/{id}` — 기수 한 건.
 *
 * **반 탭이 시작일을 알아야 한다**(D30-② — 개강 전에만 반을 고친다). 목록을 통째로
 * 받아 찾지 않는다: 화면이 필요한 것은 한 건이고, 기수가 늘면 목록은 계속 커진다.
 */
export function getCohort(id: string): Promise<Cohort> {
  // ===== Mock 버전 (현재 활성) =====
  const target = COHORTS.find((c) => c.id === id)
  if (!target) return fail('ADMIN_SAVE_FAILED')
  return delay(target)

  // return http<Cohort>(`/admin/cohorts/${id}`)
}

/** `PATCH /admin/cohorts/{id}` — 종료. 되돌리는 것은 화면에 없다(운영 판단) */
export function closeCohort(id: string): Promise<Cohort> {
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

export function createClass(req: CreateClassRequest): Promise<ClassRoom> {
  // ===== Mock 버전 (현재 활성) =====
  const name = req.name.trim()
  if (!name || req.capacity < 1) return fail('ADMIN_SAVE_FAILED')
  // 같은 기수 안에서 반 이름은 중복될 수 없다
  if (CLASSES.some((c) => c.cohortId === req.cohortId && c.name === name))
    return fail('ADMIN_SAVE_FAILED')

  const manager = MANAGERS.find((m) => m.id === req.managerId)
  const created: ClassRoom = {
    id: `c-${name}`,
    cohortId: req.cohortId,
    name,
    capacity: req.capacity,
    size: 0,
    managerId: manager?.id ?? null,
    managerName: manager?.name ?? null,
    assignedAt: manager ? getNow().slice(0, 10) : null,
    assignedBy: manager ? '김오퍼레이터' : null,
  }
  CLASSES.push(created)
  return delay(created)

  // return http<ClassRoom>('/admin/classes', { method: 'POST', body: req })
}

/**
 * `PATCH /admin/classes/{id}` — 이름·정원 수정(D30-②).
 *
 * **개강 전에만 열린다.** 서버도 같은 규칙을 검증한다 — 화면만 막으면 우회된다.
 * 정원을 현재 인원보다 작게 두는 것은 막지 않는다: 정원 초과를 애초에 허용하므로
 * (중도 합류·반 통폐합) 여기서만 막으면 규칙이 두 벌이 된다.
 */
export function updateClass(
  classId: string,
  req: { name: string; capacity: number },
): Promise<ClassRoom> {
  // ===== Mock 버전 (현재 활성) =====
  const room = CLASSES.find((c) => c.id === classId)
  if (!room) return fail('ADMIN_SAVE_FAILED')

  const cohort = COHORTS.find((c) => c.id === room.cohortId)
  if (!cohort || !canEditClasses(cohort.startAt, getNow().slice(0, 10)))
    return fail('ADMIN_SAVE_FAILED')

  const name = req.name.trim()
  if (!name || req.capacity < 1) return fail('ADMIN_SAVE_FAILED')
  // 같은 기수 안에서 반 이름은 중복될 수 없다 — 자기 자신은 뺀다
  if (CLASSES.some((c) => c.cohortId === room.cohortId && c.name === name && c.id !== classId))
    return fail('ADMIN_SAVE_FAILED')

  room.name = name
  room.capacity = req.capacity
  // 반 이름이 바뀌면 그 반 사람들이 들고 있는 표시명도 같이 바뀐다(D1 — 한 사실은 한 곳에서)
  for (const t of TRAINEES) if (t.classId === classId) t.className = name
  syncManagerAssignments()
  return delay(room)

  // return http<ClassRoom>(`/admin/classes/${classId}`, { method: 'PATCH', body: req })
}

/**
 * `DELETE /admin/classes/{id}` — 반 삭제(D30-②).
 *
 * **개강 전에만** 열린다. 안에 사람이 있으면 **미배정으로 되돌린다** — 명단에서 지우는
 * 것이 아니다. 개강 전이라 아직 회차도 리포트도 없고, 반 편성을 다시 짜는 중이다.
 */
export function deleteClass(classId: string): Promise<void> {
  // ===== Mock 버전 (현재 활성) =====
  const index = CLASSES.findIndex((c) => c.id === classId)
  if (index < 0) return fail('ADMIN_SAVE_FAILED')

  const cohort = COHORTS.find((c) => c.id === CLASSES[index].cohortId)
  if (!cohort || !canEditClasses(cohort.startAt, getNow().slice(0, 10)))
    return fail('ADMIN_SAVE_FAILED')

  for (const t of TRAINEES) {
    if (t.classId !== classId) continue
    t.classId = null
    t.className = null
  }
  CLASSES.splice(index, 1)
  syncManagerAssignments()
  return delay(undefined)

  // return http<void>(`/admin/classes/${classId}`, { method: 'DELETE' })
}

/**
 * `PATCH /admin/classes/{id}/manager` — 담당 배정·변경·해제.
 *
 * **배정은 기간형 이력이다**(OP-06 §3) — 서버는 덮어쓰는 것이 아니라 구간을 닫고 새로
 * 연다. 화면은 지금 담당만 보면 되므로 반 한 건을 돌려받는다.
 */
export function setClassManager(classId: string, managerId: string | null): Promise<ClassRoom> {
  // ===== Mock 버전 (현재 활성) =====
  const room = CLASSES.find((c) => c.id === classId)
  if (!room) return fail('ADMIN_SAVE_FAILED')
  const manager = MANAGERS.find((m) => m.id === managerId)
  room.managerId = manager?.id ?? null
  room.managerName = manager?.name ?? null
  // 구간을 새로 연다 — 해제면 여는 구간이 없으므로 비운다
  room.assignedAt = manager ? getNow().slice(0, 10) : null
  room.assignedBy = manager ? '김오퍼레이터' : null
  syncManagerAssignments()
  return delay(room)

  // return http<ClassRoom>(`/admin/classes/${classId}/manager`, {
  //   method: 'PATCH', body: { managerId },
  // })
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
 * `PATCH /admin/roster/{id}/status` — 교육생 비활성(D30-①).
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
/**
 * `GET /admin/managers` — **기관 전체** 범위. 매니저는 기수를 옮겨 다닌다.
 *
 * `unstaffedClasses`를 같이 준다 — 목록 위 경고가 **필터와 무관한 사실**이라 매니저
 * 목록만으로는 만들 수 없다. OP-01 `조치 필요`의 `미배정`과 같은 신호다.
 */
export function listManagers(q: ManagerQuery = {}): Promise<ManagerPage> {
  // ===== Mock 버전 (현재 활성) =====
  const filtered = MANAGERS.filter((m) => {
    if (q.search && !hit(m.name ?? '', q.search) && !hit(m.email, q.search)) return false
    if (q.status && m.status !== q.status) return false
    if (q.cohortId) {
      const cohortName = COHORTS.find((c) => c.id === q.cohortId)?.name
      if (m.assignment?.cohortName !== cohortName) return false
    }
    return true
  })

  const counts: Record<ManagerStatus, number> = { ACTIVE: 0, INVITED: 0, SUSPENDED: 0 }
  for (const m of MANAGERS) counts[m.status]++

  return delay({
    items: filtered,
    total: filtered.length,
    counts,
    unstaffedClasses: CLASSES.filter(needsManager).map((c) => c.name),
  })

  // return http<ManagerPage>(`/admin/managers?${qs(q)}`)
}

/**
 * `POST /admin/managers/invite` — 이메일 + 담당 반만 받는다.
 *
 * **권한 선택이 없다**(OP-06 §3). 총괄/담당이 폐기되어 매니저가 한 종류뿐이고, 무엇을
 * 볼 수 있는지는 담당 반이 정한다.
 */
export function inviteManager(req: InviteManagerRequest): Promise<Manager> {
  // ===== Mock 버전 (현재 활성) =====
  const reason = checkEmail(req.email, ORG.domain)
  // 도메인 밖 주소는 `저장 실패`가 아니라 **다른 문구**로 답해야 한다
  if (reason)
    return fail(reason === 'DOMAIN_NOT_ALLOWED' ? 'DOMAIN_NOT_ALLOWED' : 'ADMIN_SAVE_FAILED')
  if (MANAGERS.some((m) => m.email.toLowerCase() === req.email.toLowerCase()))
    return fail('ADMIN_SAVE_FAILED')

  const created: Manager = {
    id: `m-${req.email}`,
    name: null,
    email: req.email,
    assignment: null,
    headcount: null,
    status: 'INVITED',
    statusNote: null,
    lastSeenAt: null,
  }
  MANAGERS.push(created)
  if (req.classId) {
    const room = CLASSES.find((c) => c.id === req.classId)
    if (room) {
      room.managerId = created.id
      /*
        **가입 전이라 이름이 없다.** `created.name`(null)을 그대로 넣으면 반 목록이
        `담당 없음`을 빨갛게 띄우는데, `needsManager`는 id가 있어서 false다 —
        한 행이 서로 다른 말을 한다(D1). 이름이 생길 때까지 주소가 그 자리를 대신한다.
      */
      room.managerName = created.name ?? created.email
      room.assignedAt = getNow().slice(0, 10)
      room.assignedBy = '김오퍼레이터'
    }
  }
  syncManagerAssignments()
  return delay(created)

  // return http<Manager>('/admin/managers/invite', { method: 'POST', body: req })
}

/**
 * `PATCH /admin/managers/{id}` — 정지 · 재활성.
 *
 * **지우지 않는다.** 담당 반 배정이 기간형 이력이라 계정을 지우면 지난 기수의 담당
 * 기록이 끊긴다(OP-06 §3).
 */
export function setManagerStatus(id: string, status: ManagerStatus): Promise<Manager> {
  // ===== Mock 버전 (현재 활성) =====
  const target = MANAGERS.find((m) => m.id === id)
  if (!target) return fail('ADMIN_SAVE_FAILED')
  target.status = status
  target.statusNote = status === 'SUSPENDED' ? `정지 ${getNow().slice(0, 10)}` : null

  /*
    **정지하면 담당 반을 놓는다.** 상태만 바꾸고 있었는데, 그러면 퇴사한 사람이 반을
    붙들고 있어 **`담당 없음` 경고에 안 잡힌다** — 그 반 학생의 면담·독촉을 아무도
    처리하지 않는데 OP-01 `조치 필요`에도 안 올라간다. 경고 체계가 막으려던 바로 그 상황을
    정지 기능이 만들고 있었다(확인 모달도 *"담당 반에서 빠집니다"* 라고 약속하고 있었다).

    **재활성해도 반은 돌아오지 않는다.** 그 사이 다른 사람이 맡았을 수 있고, 되돌리는
    것은 배정이지 상태가 아니다.
  */
  if (status === 'SUSPENDED') releaseClasses(id)
  syncManagerAssignments()
  return delay(target)

  // return http<Manager>(`/admin/managers/${id}`, { method: 'PATCH', body: { status } })
}

/** `POST /admin/managers/{id}/invite` — 초대 재발송 */
export function resendManagerInvite(id: string): Promise<void> {
  // ===== Mock 버전 (현재 활성) =====
  void id
  return delay(undefined)

  // return http<void>(`/admin/managers/${id}/invite`, { method: 'POST' })
}

/** `DELETE /admin/managers/{id}/invite` — 초대 취소. 가입 전이라 이력이 없어 지워도 된다 */
export function cancelManagerInvite(id: string): Promise<void> {
  // ===== Mock 버전 (현재 활성) =====
  const i = MANAGERS.findIndex((m) => m.id === id && m.status === 'INVITED')
  if (i < 0) return fail('ADMIN_SAVE_FAILED')
  /*
    **초대와 함께 맡긴 반도 같이 푼다.** 초대할 때 담당 반을 정할 수 있는데(선택),
    계정만 지우고 있었다 — 반에는 **없는 사람의 id가 남아** 담당이 있는 것처럼 보였다.
  */
  releaseClasses(id)
  MANAGERS.splice(i, 1)
  syncManagerAssignments()
  return delay(undefined)

  // return http<void>(`/admin/managers/${id}/invite`, { method: 'DELETE' })
}

/*
  Mock 전용 — 반의 담당이 바뀌면 매니저 쪽 `담당 반`·`담당 인원`도 같이 바뀐다.
  실제로는 서버가 한 테이블에서 양쪽을 만들어 내려주므로 이런 동기화 함수가 없다.
*/
/**
 * 이 사람이 맡고 있던 반을 전부 놓는다 — 정지·초대 취소가 같이 쓴다.
 *
 * **지우는 것이 아니라 비우는 것이다.** 반은 남고 담당만 빠져 `담당 없음` 경고가 켜진다.
 */
function releaseClasses(managerId: string): void {
  for (const c of CLASSES) {
    if (c.managerId !== managerId) continue
    c.managerId = null
    c.managerName = null
    c.assignedAt = null
    c.assignedBy = null
  }
}

function syncManagerAssignments(): void {
  for (const m of MANAGERS) {
    const rooms = CLASSES.filter((c) => c.managerId === m.id)
    if (rooms.length === 0) {
      // 지난 기수 이력은 남긴다 — 지우면 `6기 A반 담당이 누구였나`가 사라진다
      if (m.assignment?.cohortName === '7기') m.assignment = null
      m.headcount = m.assignment ? m.headcount : null
      continue
    }
    m.assignment = { cohortName: '7기', classNames: rooms.map((c) => c.name) }
    m.headcount = rooms.reduce((n, c) => n + c.size, 0)
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
export function getCost(cohortId: string): Promise<{ summary: CostSummary; classes: ClassCost[] }> {
  // ===== Mock 버전 (현재 활성) =====
  void cohortId
  return delay({ summary: COST, classes: CLASS_COST })

  // return http<{ summary: CostSummary; classes: ClassCost[] }>(`/admin/cost?cohort=${cohortId}`)
}
