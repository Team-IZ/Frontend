// ─────────────────────────────────────────────────────────────
// 프로젝트 API 격리 모듈
// 백엔드 준비 시 각 함수의 Mock 블록만 삭제하고 아래 주석의 fetch를 켜면 됩니다.
// (화면·컴포넌트 코드는 수정 불필요 — 시그니처가 이미 실제 모양입니다)
// ─────────────────────────────────────────────────────────────
import type {
  CohortScope,
  CreateProjectRequest,
  Curriculum,
  Project,
  ProjectPage,
  ProjectQuery,
  ProjectStatus,
  ConceptHistory,
  ProjectStatusReport,
} from './types'
import { CONCEPT_COUNT, canCreate, canDelete, canEditSchedule, canOnlyExtendDue } from './rules'

// ───────── Mock 전용 (백엔드 연동 시 이 블록 삭제) ─────────
import {
  COHORT,
  CONCEPT_HISTORY,
  CURRICULA,
  MOCK_TODAY,
  PROJECTS,
  STATUS_BY_PROJECT,
  STATUS_REPORT,
} from './mockDb'

/** 목 지연. 로딩 상태가 실제로 보이는지 개발 중 확인하려면 필요합니다 */
const LATENCY_MS = 250

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

/**
 * 준비 필요 순 — 손댈 것이 남은 회차가 위로. **정렬은 서버가 한다**(페이지가 나뉘면
 * 클라이언트 정렬은 현재 페이지 안에서만 맞기 때문). 목에서도 서버 자리에서 정렬한다.
 */
const STATUS_ORDER: Record<ProjectStatus, number> = { PREP: 0, READY: 1, RUNNING: 2, DONE: 3 }

/**
 * 마감 이른 순. **미설정을 어디에 두는지는 정렬마다 다르다.**
 *
 * `마감 임박 순`에서는 뒤다 — 비교할 값이 없는데 0으로 치면 맨 앞에 온다.
 * `준비 필요 순`에서는 **앞이다** — 마감조차 안 잡힌 회차가 가장 손댈 것이 많다.
 * 그래서 `nullFirst`를 받는다(같은 함수를 두 벌 만들면 한쪽만 고쳐진다).
 */
function byDue(a: Project, b: Project, nullFirst = false): number {
  return byField(a.dueAt, b.dueAt, nullFirst)
}

/** 날짜 하나로 비교. `null`을 어디에 둘지는 정렬마다 달라서 인자로 받는다 */
function byField(a: string | null, b: string | null, nullFirst = false): number {
  if (!a && !b) return 0
  if (!a) return nullFirst ? -1 : 1
  if (!b) return nullFirst ? 1 : -1
  return a.localeCompare(b)
}
// ──────────────────────────────────────────────────────────

/**
 * 오늘 날짜(`YYYY-MM-DD`). 마감까지 남은 일수를 셀 때 쓴다.
 *
 * **화면이 목 파일을 직접 열지 않게 하려고 여기 둔다.** 목 단계에서는 목업 기준일로
 * 얼려야 값이 매일 달라지지 않는데, 그 사정은 목의 것이지 화면의 것이 아니다 —
 * 연동 시 아래 한 줄만 `new Date().toISOString().slice(0, 10)`으로 바꾼다.
 *
 * 서버 왕복이 아니라 동기 함수다 — 시계를 읽는 데 요청을 보낼 이유가 없다.
 */
export function getToday(): string {
  // ===== Mock 버전 (현재 활성) =====
  return MOCK_TODAY
  // return new Date().toISOString().slice(0, 10)
}

/**
 * `GET /cohorts/{cohortId}/projects`
 *
 * 검색·필터·정렬을 **전부 서버가 처리한다.** 화면은 받은 `items`를 그리기만 한다 —
 * 전량을 받아 거르면 회차가 쌓였을 때 못 쓰고, `counts`(전체 모집단 기준)를 셀 수
 * 없다(`docs/dev/api-boundary.md` §1-②). 페이지 분할은 필요한 화면에서 더한다.
 */
export function listProjects(q: ProjectQuery): Promise<ProjectPage> {
  // ===== Mock 버전 (현재 활성) =====
  const search = q.search?.trim().toLowerCase() ?? ''
  const filtered = PROJECTS.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search)) return false
    if (q.curriculumId && !p.curriculumIds.includes(q.curriculumId)) return false
    if (q.kind && p.kind !== q.kind) return false
    if (q.status && p.status !== q.status) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) =>
    q.sort === 'DUE'
      ? byDue(a, b)
      : q.sort === 'START'
        ? // 시작 이른 순 — 미설정은 뒤(비교할 값이 없다). 시작일이 곧 준비 시한이다
          byField(a.startAt, b.startAt)
        : /*
          준비 필요 순 — 1차 키는 상태, 2차 키는 마감이다. 이름순으로 가르면 순서가
          알파벳 우연이 되는데, **같은 `준비 중`이면 마감이 가까운 쪽이 실제로 급하다**
          — 행 배경 경고(마감 임박 + 준비 중)가 가리키는 회차가 맨 위로 온다.
        */
          /*
          **마감 미설정이 맨 앞이다**(`nullFirst`). 같은 `준비 중`이라면 마감조차 안
          잡힌 회차가 마감이 있는 회차보다 손댈 것이 많다 — 렌더해 보고 알았다.
          `미프 6차`(미설정)가 `미프 5차`(32일 남음)보다 아래 있었다.
        */
          STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || byDue(a, b, true),
  )

  // counts는 **필터와 무관한 전체 모집단** 기준이다(헤더 내역과 푸터 개수는 다른 값)
  const counts: Record<ProjectStatus, number> = { PREP: 0, READY: 0, RUNNING: 0, DONE: 0 }
  for (const p of PROJECTS) counts[p.status]++

  return delay({ items: sorted, total: sorted.length, counts })

  // ===== 실제 버전 (연동 시 위를 지우고 아래를 켠다) =====
  // const params = new URLSearchParams(
  //   Object.entries(q).flatMap(([k, v]) => (v == null || k === 'cohortId' ? [] : [[k, String(v)]])),
  // )
  // return http<ProjectPage>(`/cohorts/${q.cohortId}/projects?${params}`)
}

/**
 * `GET /cohorts/{cohortId}/curricula`
 *
 * 생성 모달의 교안 선택지 + 목록의 교안 필터가 쓴다. **검증 개념 후보가 여기서 나온다**
 * — 교안이 없으면 프로젝트를 만들 수 없다(14번 4-3).
 */
export function listCurricula(cohortId: string): Promise<Curriculum[]> {
  // ===== Mock 버전 (현재 활성) =====
  void cohortId
  return delay(CURRICULA)

  // return http<Curriculum[]>(`/cohorts/${cohortId}/curricula`)
}

/** `GET /cohorts/{cohortId}` — 헤더 스코프 문구(`10반 250명`)에 쓴다 */
export function getCohortScope(cohortId: string): Promise<CohortScope> {
  // ===== Mock 버전 (현재 활성) =====
  void cohortId
  return delay(COHORT)

  // return http<CohortScope>(`/cohorts/${cohortId}`)
}

/**
 * `POST /cohorts/{cohortId}/projects`
 *
 * **서버도 3건 고정을 검증한다.** 클라이언트 검증만 있으면 우회되므로 목에서도
 * 같은 규칙을 세워 둔다 — 화면이 막는 것과 서버가 막는 것이 같은 규칙이어야 한다.
 */
export function createProject(req: CreateProjectRequest): Promise<Project> {
  // ===== Mock 버전 (현재 활성) =====
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!req.name.trim() || !canCreate(req.curriculumIds, req.conceptIds) || !req.dueAt) {
        reject({ code: 'PROJECT_CREATE_FAILED' })
        return
      }
      const created: Project = {
        id: `p-${req.name.replace(/\s+/g, '-')}`,
        name: req.name.trim(),
        kind: req.kind,
        // 생성 시 교안·개념·일정이 다 찼으므로 준비됨이다 — 상태는 서버가 판정한다
        status: 'READY',
        curriculumIds: req.curriculumIds,
        // 생성 직후에는 개념이 확정된 상태다 — 이름은 교안에서 찾아 붙인다
        concepts: req.conceptIds.slice(0, CONCEPT_COUNT).map((id) => {
          const owner = CURRICULA.find((c) => c.teaches.some((t) => t.id === id))
          return {
            id,
            name: owner?.teaches.find((t) => t.id === id)?.name ?? id,
            curriculumId: owner?.id ?? '',
          }
        }),
        conceptCandidateCount: req.curriculumIds.reduce(
          (n, id) => n + (CURRICULA.find((c) => c.id === id)?.teaches.length ?? 0),
          0,
        ),
        // 생성 폼이 받은 요구사항을 그대로 들고 간다 — 여기서 흘리면 상세가 늘 빈다
        requirements: req.requirements,
        startAt: req.startAt,
        dueAt: req.dueAt,
      }
      // 목 저장소에 넣어야 목록으로 돌아갔을 때 보인다
      PROJECTS.unshift(created)
      resolve(created)
    }, LATENCY_MS)
  })

  // return http<Project>(`/cohorts/${req.cohortId}/projects`, { method: 'POST', body: req })
}

/**
 * `GET /projects/{id}` — 상세 한 건.
 *
 * 목록의 행과 같은 모양이라 타입을 나누지 않는다. 상세에만 필요한 것(반별 현황·
 * 개념 이력)은 별도 호출로 가져온다 — 구성 탭만 볼 때 현황까지 계산할 이유가 없다.
 */
export function getProject(id: string): Promise<Project> {
  // ===== Mock 버전 (현재 활성) =====
  const found = PROJECTS.find((p) => p.id === id)
  if (!found) return Promise.reject({ code: 'NOT_FOUND' })
  return delay(found)

  // return http<Project>(`/projects/${id}`)
}

/**
 * `GET /projects/{id}/status` — 현황 탭.
 *
 * 반별 파이프라인과 개념별 코드 매칭. **개념이 확정되기 전에는 부르지 않는다**
 * — 문항이 없으므로 집계할 대상 자체가 없다. 화면이 `useAsync`의 `enabled`로 막고,
 * 현황 탭은 그때 **왜 비었는지**를 대신 그린다.
 */
export function getProjectStatus(id: string): Promise<ProjectStatusReport> {
  // ===== Mock 버전 (현재 활성) =====
  /*
    아직 시작 안 한 회차는 **0인 리포트**를 준다. 실제 서버라면 제출 테이블이 비어 있어
    자연히 이 모양이 나오는 값이라, 목에서도 회차 상태로 그것을 흉내 낸다 — 하나만
    내려주면 `준비됨` 회차에서도 남의 회차 숫자가 보인다.
  */
  // 회차마다 다른 결과를 준다 — 하나만 두면 k8s로 돌린 회차에 AI_LLMOps 개념 이름이 뜬다
  return delay(STATUS_BY_PROJECT[id] ?? STATUS_REPORT)

  // return http<ProjectStatusReport>(`/projects/${id}/status`)
}

/**
 * `GET /projects/{id}/concept-history` — 개념 후보에 붙는 지난 회차 이력.
 *
 * 연결된 교안의 `teaches`에 대해서만 내려온다 — 교안이 바뀌면 후보가 달라지므로
 * **조건이 자연히 충족된다**(OP-04 §3).
 *
 * 개념을 아직 안 골랐어도 **선택 모달을 열면** 필요하다 — 처음 고를 때가 이력이
 * 가장 쓸모 있는 순간이다.
 */
export function getConceptHistory(id: string): Promise<ConceptHistory[]> {
  // ===== Mock 버전 (현재 활성) =====
  void id
  return delay(CONCEPT_HISTORY)

  // return http<ConceptHistory[]>(`/projects/${id}/concept-history`)
}

/**
 * `PATCH /projects/{id}/concepts` — 검증 개념 3건 저장.
 *
 * **3건이 아니면 서버도 막는다.** 클라이언트 검증만 있으면 우회된다.
 */
export function saveConcepts(id: string, conceptIds: string[]): Promise<Project> {
  // ===== Mock 버전 (현재 활성) =====
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const target = PROJECTS.find((p) => p.id === id)
      if (!target || conceptIds.length !== CONCEPT_COUNT) {
        reject({ code: 'CONCEPT_SAVE_FAILED' })
        return
      }
      target.concepts = conceptIds.map((cid) => {
        const owner = CURRICULA.find((c) => c.teaches.some((t) => t.id === cid))
        return {
          id: cid,
          name: owner?.teaches.find((t) => t.id === cid)?.name ?? cid,
          curriculumId: owner?.id ?? '',
        }
      })
      // 개념이 채워지면 준비됨으로 — 상태는 서버가 판정한다
      if (target.status === 'PREP' && target.dueAt) target.status = 'READY'
      resolve(target)
    }, LATENCY_MS)
  })

  // return http<Project>(`/projects/${id}/concepts`, { method: 'PATCH', body: { conceptIds } })
}

/**
 * `PATCH /projects/{id}/curricula` — 연결 교안 변경.
 *
 * **확정된 개념이 쓰는 교안은 뺄 수 없다**(OP-04 §5). 화면이 체크박스를 잠그지만
 * 서버도 같은 규칙을 검증한다 — 클라이언트 검증만 있으면 우회되고, 출처가 끊긴 개념은
 * 리포트·면담 브리프가 교안 위치를 가리킬 수 없게 된다.
 *
 * `conceptCandidateCount`를 여기서 다시 센다. **서버가 세어 내려주는 값**이라
 * 화면이 교안 목록에서 합산하면 교안 전량을 받아야만 셀 수 있다(api-boundary §1-②).
 */
export function saveCurricula(id: string, curriculumIds: string[]): Promise<Project> {
  // ===== Mock 버전 (현재 활성) =====
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const target = PROJECTS.find((p) => p.id === id)
      const linked = CURRICULA.filter((c) => curriculumIds.includes(c.id))
      /** 확정 개념의 출처가 빠졌나 — 화면이 막지만 서버가 최종 방어선이다 */
      const orphaned = target?.concepts.some((k) => !curriculumIds.includes(k.curriculumId))
      if (!target || linked.length === 0 || orphaned) {
        reject({ code: 'CURRICULA_SAVE_FAILED' })
        return
      }
      target.curriculumIds = curriculumIds
      target.conceptCandidateCount = linked.reduce((n, c) => n + c.teaches.length, 0)
      resolve(target)
    }, LATENCY_MS)
  })

  // return http<Project>(`/projects/${id}/curricula`, { method: 'PATCH', body: { curriculumIds } })
}

/**
 * `PATCH /projects/{id}/requirements` — 요구사항 편집.
 *
 * **항목 배열로 보낸다.** MG-08이 항목마다 P/F를 판정하므로 그 단위가 계약에 그대로
 * 있어야 한다(types `requirements` 주석). 공백·중복 정리는 입력 시점에 끝나 있다.
 *
 * 관문이 아니다 — 요구사항은 **구현 P/F에만** 쓰고 문항을 만들지 않으므로(14번 6-3)
 * 비어 있어도 일정·현황이 열린다. 검증 개념과 갈리는 지점이 여기다.
 */
export function saveRequirements(id: string, requirements: string[]): Promise<Project> {
  // ===== Mock 버전 (현재 활성) =====
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const target = PROJECTS.find((p) => p.id === id)
      if (!target) {
        reject({ code: 'REQUIREMENTS_SAVE_FAILED' })
        return
      }
      target.requirements = requirements
      resolve(target)
    }, LATENCY_MS)
  })

  // return http<Project>(`/projects/${id}/requirements`, { method: 'PATCH', body: { requirements } })
}

/**
 * `DELETE /projects/{id}` — 회차 삭제.
 *
 * **학생 데이터가 붙은 회차는 서버도 막는다**(`canDelete`). 화면이 버튼을 잠그지만
 * 클라이언트 검증만 있으면 우회되고, 그때 사라지는 것은 학생이 실제로 한 제출·응시·
 * 리포트다. 되돌릴 수 없는 삭제라 **양쪽이 같은 규칙을 갖는 것이 특히 중요하다.**
 */
export function deleteProject(id: string): Promise<void> {
  // ===== Mock 버전 (현재 활성) =====
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const i = PROJECTS.findIndex((p) => p.id === id)
      if (i < 0 || !canDelete(PROJECTS[i].status)) {
        reject({ code: 'PROJECT_DELETE_FAILED' })
        return
      }
      PROJECTS.splice(i, 1)
      resolve()
    }, LATENCY_MS)
  })

  // return http<void>(`/projects/${id}`, { method: 'DELETE' })
}

/**
 * `PATCH /projects/{id}/schedule` — 회차 기간 수정.
 *
 * **사람이 정하는 날짜는 둘뿐이다**(시작일 · 제출 마감). 응시 창·재시험 창·리포트 발행은
 * 규칙에서 파생되므로 저장하지 않는다 — 값으로 저장하면 규칙이 바뀔 때 이미 만든 회차만
 * 옛 값을 갖는다.
 *
 * **시각은 받지 않는다.** 마감은 `DUE_TIME`(23:59) 고정이고 화면이 붙여서 보낸다.
 *
 * ⚠ **유효 범위 검증이 아직 없다**(#64). 기수 기간 밖은 달력이 막지만, **다음 회차보다
 * 늦은 마감**은 지금 저장된다 — 그러면 재시험 창(`3일 또는 다음 제출일 중 빠른 쪽`)이
 * 열리지 않는다. 막을지 경고만 할지가 미결이라 화면은 **사실만 보여준다**(E8).
 */
export function saveSchedule(id: string, startAt: string, dueAt: string): Promise<Project> {
  // ===== Mock 버전 (현재 활성) =====
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const target = PROJECTS.find((p) => p.id === id)
      /*
        **진행 중이면 마감을 당길 수 없다**(`canOnlyExtendDue`). 학생은 이미 "언제까지"를
        알고 있어서, 앞당기면 낼 수 있다고 알던 기회가 조용히 사라진다. 화면이 달력으로
        막지만 서버도 같은 규칙을 갖는다.
      */
      const pulledIn =
        !!target && canOnlyExtendDue(target.status) && !!target.dueAt && dueAt < target.dueAt
      if (!target || dueAt <= startAt || !canEditSchedule(target.status) || pulledIn) {
        reject({ code: 'SCHEDULE_SAVE_FAILED' })
        return
      }
      target.startAt = startAt
      target.dueAt = dueAt
      // 마감이 채워지고 개념도 3건이면 준비됨으로 — 상태는 서버가 판정한다
      if (target.status === 'PREP' && target.concepts.length === CONCEPT_COUNT) {
        target.status = 'READY'
      }
      resolve(target)
    }, LATENCY_MS)
  })

  // return http<Project>(`/projects/${id}/schedule`, { method: 'PATCH', body: { startAt, dueAt } })
}
