/*
  프로젝트 API 경계 — **화면이 유일하게 의존하는 곳.**

  생성 훅(`@/api/projectExecution`)을 직접 부르지 않고 여기를 거치는 이유가 셋이다.
    · 서버가 두 축(`status`+`readiness`)으로 주는 상태를 화면은 한 축으로 읽는다
    · 서버 응답 이름이 화면 어휘와 다른 자리가 있다(`endDate` → 마감, `assessedCount` → 응시)
    · 서버가 안 주는 것을 여기서 메운다(기수 반 개수는 조회 두 건을 합쳐야 나온다)

  **조회는 함수로 두고 훅으로 만들지 않았다.** 화면이 `useAsync(load, enabled)`를 쓰고
  있고, react-query 훅으로 옮기면 15개 화면을 같이 뜯어야 한다. 캐시가 필요해지면 그때
  옮긴다 — 지금 옮기면 연동과 리팩터링이 한 diff에 섞인다.
*/
import {
  findProjects,
  findProject,
  findConceptCandidates,
  findProjectClassProgress,
  createProject as createProjectApi,
  updateSchedule,
  confirmConcepts,
  linkCurriculum,
  unlinkCurriculum,
  replaceRequirements,
  deleteProject as deleteProjectApi,
} from '@/api/projectExecution/projectExecutionApi'
import { findLinkableCurricula, findSections } from '@/api/curriculum/curriculumApi'
import { findCohort, findClassrooms } from '@/api/academic/academicApi'
import type {
  CohortScope,
  ConceptCandidate,
  CreateProjectRequest,
  CreateProjectResult,
  Curriculum,
  Project,
  ProjectDetail,
  ProjectPage,
  ProjectQuery,
  ProjectStatus,
  ProjectStatusReport,
  ServerProjectProjection,
} from './types'

/**
 * 오늘 날짜(`YYYY-MM-DD`). 마감까지 남은 일수를 셀 때 쓴다.
 *
 * **서버 왕복이 아니다** — 시계를 읽는 데 요청을 보낼 이유가 없다. 목 단계에서는
 * 목업 기준일로 얼려 뒀는데, 실서버에서는 실제 날짜가 맞다.
 */
export function getToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const pad = (n: number) => String(n).padStart(2, '0')

/*
  ─── 서버 → 화면 변환 ────────────────────────────────────────────
*/

/**
 * 두 축을 화면의 한 축으로 합친다(types `ProjectStatus` 참고).
 *
 * `readiness`는 `PLANNED`일 때만 의미가 있다 — 서버는 진행 중·종료 회차에도 계산해
 * 주지만(개강 후 교안이 비는 것도 실제로 있다) 화면의 배지는 시간 축이 이긴다.
 */
function toProjectStatus(status: string, readiness: string): ProjectStatus {
  if (status === 'RUNNING') return 'RUNNING'
  if (status === 'CLOSED') return 'DONE'
  return readiness === 'READY' ? 'READY' : 'PREP'
}

/** 화면 상태 → 서버 `status` 쿼리. 준비 중·준비됨은 **둘 다 `PLANNED`** 다 */
function toServerStatus(
  s: ProjectStatus | undefined,
): 'PLANNED' | 'RUNNING' | 'CLOSED' | undefined {
  if (!s) return undefined
  if (s === 'RUNNING') return 'RUNNING'
  if (s === 'DONE') return 'CLOSED'
  return 'PLANNED'
}

const SORT: Record<string, 'READINESS' | 'DUE_SOON' | 'START_DATE'> = {
  PREP_FIRST: 'READINESS',
  DUE: 'DUE_SOON',
  START: 'START_DATE',
}

function toProject(p: ServerProjectProjection): Project {
  return {
    projectId: p.projectId,
    cohortId: p.cohortId,
    name: p.name,
    status: toProjectStatus(p.status, p.readiness),
    sequenceNo: p.sequenceNo,
    curriculumCount: p.curriculumCount,
    conceptCount: p.conceptCount,
    conceptCandidateCount: p.conceptCandidateCount,
    startDate: p.startDate,
    endDate: p.endDate,
  }
}

/*
  ─── 조회 ────────────────────────────────────────────────────────
*/

/**
 * `GET /cohorts/{cohortId}/projects`
 *
 * 검색·필터·정렬·집계를 **전부 서버가 한다**(9차 R3). 화면은 받은 것을 그린다.
 *
 * ⚠ **준비 중/준비됨 필터만 여기서 한 번 더 좁힌다.** 서버 `status`가 세 값이라
 * `PLANNED`까지만 좁혀 오고, 그 안에서 `readiness`로 가르는 것은 응답에 실려 온 값을
 * 보는 것이라 **집계가 아니다**(전량을 받아 거르는 것과 다르다 — 페이지가 나뉘어도
 * 이 좁히기는 그 페이지 안에서 정확하다).
 */
export async function listProjects(q: ProjectQuery): Promise<ProjectPage> {
  const res = await findProjects({
    path: { cohortId: q.cohortId },
    query: {
      search: q.search,
      curriculumId: q.curriculumId,
      status: toServerStatus(q.status),
      sort: q.sort ? SORT[q.sort] : undefined,
    },
  })

  let items = (res.projects as ServerProjectProjection[]).map(toProject)
  if (q.status === 'PREP' || q.status === 'READY') {
    items = items.filter((p) => p.status === q.status)
  }

  /*
    `counts`는 서버가 필터와 무관한 전체 모집단으로 준다. 세 키뿐이라 `PLANNED`를
    준비 중·준비됨으로 못 가른다 — **그 둘은 비워 둔다**(types `ProjectPage.counts`).
  */
  const c = res.counts as Record<string, number>
  return {
    items,
    total: q.status === 'PREP' || q.status === 'READY' ? items.length : res.total,
    counts: { RUNNING: c.RUNNING, DONE: c.CLOSED },
    population: (c.PLANNED ?? 0) + (c.RUNNING ?? 0) + (c.CLOSED ?? 0),
  }
}

/** `GET /projects/{projectId}` — 상세. 교안·개념·요구사항이 같이 온다(9차 R1) */
export async function getProject(projectId: string): Promise<ProjectDetail> {
  const p = await findProject({ path: { projectId } })
  return {
    ...toProject(p as unknown as ServerProjectProjection),
    curricula: p.curricula,
    concepts: p.concepts,
    requirementTitles: p.requirementTitles,
  }
}

/**
 * `GET /cohorts/{cohortId}/curricula` — 연결할 수 있는 교안.
 *
 * 생성 모달의 선택지와 목록의 교안 필터가 쓴다. **후보(`teaches`)는 안 온다** —
 * 개념 후보는 `listConceptCandidates`(프로젝트 기준)나 `listSectionCandidates`(교안 기준)다.
 */
export function listCurricula(cohortId: string): Promise<Curriculum[]> {
  return findLinkableCurricula({ path: { cohortId } }) as Promise<Curriculum[]>
}

/**
 * `GET /cohorts/{cohortId}` + `GET /cohorts/{cohortId}/classrooms`
 *
 * ⚠ **조회가 둘인 이유:** 헤더가 `10반 250명`을 그리는데 `findCohort`에 반 개수가 없다.
 * 서버가 세어 주면 한 건으로 준다(9차 §7에 흡수하기로 적었다).
 */
export async function getCohortScope(cohortId: string): Promise<CohortScope> {
  const [cohort, rooms] = await Promise.all([
    findCohort({ path: { cohortId } }),
    findClassrooms({ path: { cohortId } }),
  ])
  return {
    cohortId: cohort.cohortId,
    name: cohort.name,
    classes: rooms.classrooms.length,
    trainees: cohort.traineeCount,
    startDate: cohort.startDate,
    endDate: cohort.endDate,
  }
}

/** `GET /projects/{projectId}/concept-candidates` — 이 회차에 붙은 교안들의 승인된 매핑 전량 */
export function listConceptCandidates(projectId: string): Promise<ConceptCandidate[]> {
  return findConceptCandidates({ path: { projectId } }) as Promise<ConceptCandidate[]>
}

/**
 * `GET /curricula/{materialId}/sections` — **프로젝트가 아직 없을 때의 후보.**
 *
 * 생성 모달은 회차를 만들기 전에 개념을 고르는데 `findConceptCandidates`는
 * `projectId`를 요구한다. 섹션 조회가 같은 매핑을 주고 **겹치는 여섯 필드가 이름·타입·
 * 의미까지 같아서**(9차 R2 회신) 같은 컴포넌트로 그릴 수 있다.
 */
export async function listSectionCandidates(
  materialId: string,
  curriculumVersionId: string,
): Promise<ConceptCandidate[]> {
  const sections = await findSections({ path: { materialId } })
  return sections.flatMap((s) =>
    s.items.map((it) => ({
      mappingId: it.mappingId,
      // 섹션 항목은 teachesId를 주지 않는다 — 확정은 mappingId로 하므로 화면에 필요 없다
      teachesId: '',
      extractedName: it.extractedName,
      description: it.description,
      definitionMissing: it.definitionMissing,
      curriculumVersionId,
      sectionId: s.sectionId,
      sectionTitle: s.title,
      pageStart: it.pageStart,
      pageEnd: it.pageEnd,
    })),
  )
}

/**
 * `GET /projects/{projectId}/class-progress` — 현황 탭.
 *
 * **개념이 확정되기 전에는 부르지 않는다** — 문항이 없어 집계할 대상이 없다. 화면이
 * `useAsync`의 `enabled`로 막고, 현황 탭은 그때 **왜 비었는지**를 대신 그린다.
 */
export async function getProjectStatus(projectId: string): Promise<ProjectStatusReport> {
  const r = await findProjectClassProgress({ path: { projectId } })
  return {
    classes: r.classes.map((c) => ({
      classId: c.classId,
      className: c.className,
      submitted: c.submittedCount,
      total: c.targetTraineeCount,
      analyzed: c.analysisSucceededCount,
      analysisFailed: c.analysisFailedCount,
      attended: c.assessedCount,
      // 응시 창은 분석 후 열린다 — 분모는 제출이 아니라 분석 완료다
      attendable: c.analysisSucceededCount,
      managerNames: c.managerNames,
    })),
    matches: r.conceptMatches.map((m) => ({
      teachesId: m.teachesId,
      conceptName: m.conceptName,
      matched: m.matchedTraineeCount,
      total: m.analysedTraineeCount,
      unmatchedTeams: m.unmatchedTeamCount,
    })),
  }
}

/*
  ─── 변경 ────────────────────────────────────────────────────────
*/

/**
 * 회차 생성 — **호출 넷이 순서대로 나간다.**
 *
 * 후보 조회가 `projectId`를 요구해서 한 번에 못 만든다. 중간에 실패해도 회차는 이미
 * 만들어져 있고 **같은 이름으로 다시 만들 수 없으므로**(삭제해도 이름·순번이 점유된 채
 * 남는다 — 9차 회신 §10) 되돌리지 않고 **어디까지 됐는지를 돌려준다.** 화면은 상세로
 * 보내 이어서 채우게 한다.
 */
export async function createProject(req: CreateProjectRequest): Promise<CreateProjectResult> {
  const created = await createProjectApi({
    path: { cohortId: req.cohortId },
    body: {
      name: req.name.trim(),
      // 빅프로젝트는 제품에서 빠졌다 — 고를 것이 없으므로 화면에 토글이 없다
      category: 'MINI_PROJECT',
      startDate: req.startDate,
      endDate: req.endDate,
    },
  })
  const projectId = created.projectId

  try {
    // 연결 순서가 곧 표시 순서(sequenceNo)라 순차로 보낸다
    for (const curriculumVersionId of req.curriculumVersionIds) {
      await linkCurriculum({ path: { projectId }, body: { curriculumVersionId } })
    }
  } catch {
    return { projectId, step: 'CURRICULA_FAILED' }
  }

  try {
    await confirmConcepts({ path: { projectId }, body: { mappingIds: req.mappingIds } })
  } catch {
    return { projectId, step: 'CONCEPTS_FAILED' }
  }

  if (req.requirementTitles.length > 0) {
    try {
      await replaceRequirements({
        path: { projectId },
        body: { requirementTitles: req.requirementTitles },
      })
    } catch {
      return { projectId, step: 'REQUIREMENTS_FAILED' }
    }
  }

  return { projectId, step: 'COMPLETE' }
}

/**
 * `PUT /projects/{id}/concepts` — 검증 개념 3건 확정.
 *
 * **`mappingId`를 보낸다**(`teachesId`가 아니다). 서버도 3건 고정을 검증한다.
 * 응답 본문이 없어 저장 뒤 상세를 다시 읽어야 한다.
 */
export async function saveConcepts(projectId: string, mappingIds: string[]): Promise<void> {
  await confirmConcepts({ path: { projectId }, body: { mappingIds } })
}

/**
 * 교안 연결 변경 — **연결·해제가 각각 한 건씩 나간다.**
 *
 * 서버에 "이 목록으로 통째로 교체"가 없어서 차집합을 계산해 보낸다. 확정된 개념이 쓰는
 * 교안을 떼면 서버가 409 `CURRICULUM_IN_USE_BY_CONCEPTS`로 막는다 — 화면도 체크박스를
 * 잠그지만 클라이언트 검증만 있으면 우회된다(OP-04 §5).
 */
export async function saveCurricula(
  projectId: string,
  current: { projectCurriculumId: string; curriculumVersionId: string }[],
  nextVersionIds: string[],
): Promise<void> {
  const removed = current.filter((c) => !nextVersionIds.includes(c.curriculumVersionId))
  const added = nextVersionIds.filter((id) => !current.some((c) => c.curriculumVersionId === id))
  // 해제를 먼저 한다 — 붙이고 떼면 중간에 실패했을 때 안 고른 교안이 남는다
  for (const c of removed) {
    await unlinkCurriculum({ path: { projectId, projectCurriculumId: c.projectCurriculumId } })
  }
  for (const curriculumVersionId of added) {
    await linkCurriculum({ path: { projectId }, body: { curriculumVersionId } })
  }
}

/**
 * `PUT /projects/{id}/requirements` — 전체 교체.
 *
 * **항목 배열로 보낸다.** MG-08이 항목마다 P/F를 판정하므로 그 단위가 계약에 그대로
 * 있어야 한다. 공백·중복 정리는 입력 시점에 끝나 있다(`addRequirements`).
 */
export async function saveRequirements(
  projectId: string,
  requirementTitles: string[],
): Promise<void> {
  await replaceRequirements({ path: { projectId }, body: { requirementTitles } })
}

/**
 * `PATCH /projects/{id}` — 회차 기간 수정.
 *
 * ⚠ **날짜만 보낸다. 시각은 서버가 안 받는다.**
 * `project.end_date`는 `DATE`이고, 학생에게 나가는 실제 마감(`submission_due_at`)은
 * **다른 테이블이며 이 값과 연결돼 있지 않다**(9차 회신 §15). 그래서 화면이 `23:59`을
 * 붙여 마감이라고 쓰면 서버가 뒷받침하지 않는 시각을 주장하게 된다 — 시각 입력을 뺐다.
 * 결론(ⓐ/ⓑ/ⓒ)이 나오면 여기와 화면을 같이 바꾼다.
 */
export async function saveSchedule(
  projectId: string,
  startDate: string,
  endDate: string,
): Promise<void> {
  await updateSchedule({ path: { projectId }, body: { startDate, endDate } })
}

/**
 * `DELETE /projects/{id}` — 회차 삭제(소프트).
 *
 * **제출·응시가 붙은 회차는 서버가 막는다**(409 `PROJECT_NOT_DELETABLE`). 화면도 버튼을
 * 잠그지만 클라이언트 검증만 있으면 우회되고, 그때 사라지는 것은 학생이 실제로 한 제출·
 * 응시다.
 *
 * ⚠ **지운 회차의 이름·순번은 다시 못 쓴다**(9차 회신 §10) — 삭제 확인 문구가 그 사실을
 * 말해야 한다.
 */
export async function deleteProject(projectId: string): Promise<void> {
  await deleteProjectApi({ path: { projectId } })
}
