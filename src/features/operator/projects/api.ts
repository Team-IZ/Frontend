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
} from './types'
import { CONCEPT_COUNT, canCreate } from './rules'

// ───────── Mock 전용 (백엔드 연동 시 이 블록 삭제) ─────────
import { COHORT, CURRICULA, MOCK_TODAY, PROJECTS } from './mockDb'

/** 목 지연. 로딩 상태가 실제로 보이는지 개발 중 확인하려면 필요합니다 */
const LATENCY_MS = 250

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

/**
 * 준비 필요 순 — 손댈 것이 남은 회차가 위로. **정렬은 서버가 한다**(페이지가 나뉘면
 * 클라이언트 정렬은 현재 페이지 안에서만 맞기 때문). 목에서도 서버 자리에서 정렬한다.
 */
const STATUS_ORDER: Record<ProjectStatus, number> = { PREP: 0, READY: 1, RUNNING: 2, DONE: 3 }

/** 마감 이른 순. 미설정은 비교할 값이 없어 뒤로 — 없는 값을 0으로 치면 맨 앞에 온다 */
function byDue(a: Project, b: Project): number {
  if (!a.dueAt && !b.dueAt) return 0
  if (!a.dueAt) return 1
  if (!b.dueAt) return -1
  return a.dueAt.localeCompare(b.dueAt)
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
      : /*
          준비 필요 순 — 1차 키는 상태, 2차 키는 마감이다. 이름순으로 가르면 순서가
          알파벳 우연이 되는데, **같은 `준비 중`이면 마감이 가까운 쪽이 실제로 급하다**
          — 행 배경 경고(마감 임박 + 준비 중)가 가리키는 회차가 맨 위로 온다.
        */
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || byDue(a, b),
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
      if (!req.name.trim() || !canCreate(req.curriculumIds, req.conceptIds)) {
        reject({ code: 'PROJECT_CREATE_FAILED' })
        return
      }
      const created: Project = {
        id: `p-${req.name.replace(/\s+/g, '-')}`,
        name: req.name.trim(),
        kind: req.kind,
        status: 'PREP',
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
        dueAt: null,
      }
      // 목 저장소에 넣어야 목록으로 돌아갔을 때 보인다
      PROJECTS.unshift(created)
      resolve(created)
    }, LATENCY_MS)
  })

  // return http<Project>(`/cohorts/${req.cohortId}/projects`, { method: 'POST', body: req })
}
