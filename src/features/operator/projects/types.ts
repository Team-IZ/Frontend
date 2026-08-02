/*
  프로젝트 도메인 **계약** — 서버와 주고받는 모양만 둔다.

  여기 있는 이름과 값은 **백엔드와 합의해야 하는 것**이다(`docs/dev/api-boundary.md` §1-③).
  판정 규칙은 projectRules.ts, 목 데이터는 projectMockDb.ts, 호출은 projectApi.ts로
  갈라 뒀다 — 연동할 때 무엇을 지우고 무엇을 남길지가 파일 경계로 보이게.

  기획 전제 셋이 이 타입에 박혀 있다.
    · 검증 개념은 **정확히 3건**이고 프로젝트 단위로 고정된다(14번 Tier1-4).
      반·팀·개인이 달라도 같은 3건이라 이것이 유일한 비교 축이다.
    · 검증 개념은 **연결한 교안의 `teaches`에서만** 나온다(14번 4-3).
    · **반을 지정하지 않는다.** 프로젝트는 기수 하위다(OP-03 3-1) — v1에서 바뀐
      구조라 `classId` 같은 필드를 만들면 안 된다.
*/

/**
 * 회차 유형. **미프 = 미니프로젝트 · 빅프 = 빅프로젝트.**
 *
 * 기획 문서는 `미프`·`빅프` 약어만 쓰고 전체 이름이 한 번도 안 나온다 — 로마자
 * 약어를 지어내면 백엔드와 다른 이름을 쓰게 되므로 **전체 이름 기준**으로 짓는다.
 * 화면 라벨(`미프`)은 화면이 갖는다.
 */
export type ProjectKind = 'MINI' | 'BIG'

/**
 * 상태는 시간이 아니라 **설계 기준**이다(목업 doc-head).
 * `예정`은 제출 마감 열이 이미 말한다 — 오퍼레이터에게 필요한 것은 "손댈 게 남았나"다.
 *
 * **서버가 판정해 내려주는 값이다.** 화면이 교안·개념·마감 유무를 조합해 유추하면
 * 같은 규칙이 두 곳에 생긴다.
 */
export type ProjectStatus = 'PREP' | 'READY' | 'RUNNING' | 'DONE'

/** 교안이 가르친 항목 — 검증 개념 후보. 프로젝트가 이 중 3건을 확정한다 */
export type TeachItem = {
  id: string
  name: string
  /** 정의 한 줄. 이름만으로는 무엇을 묻게 될지 판단할 수 없다(OP-03 §3) */
  definition: string
  /** 교안 안 위치. 리포트·면담 브리프가 이 값을 읽는다 */
  page: string
  /** 출처 교안 섹션. 후보를 교안별·섹션별로 묶어 보여줄 때 쓴다 */
  section: string
}

export type Curriculum = {
  id: string
  name: string
  version: string
  /** 분석이 안 끝났거나 실패하면 비어 있다 — 그때는 프로젝트를 만들 수 없다 */
  teaches: TeachItem[]
}

/** 확정된 검증 개념. **출처를 달고 다닌다** — 없으면 교안 위치를 가리킬 수 없다(OP-04 §3) */
export type VerificationConcept = {
  id: string
  name: string
  curriculumId: string
}

export type Project = {
  id: string
  name: string
  kind: ProjectKind
  status: ProjectStatus
  /** 연결된 교안. 1개 이상이어야 개념 후보가 나온다. 빅프는 빈 배열 */
  curriculumIds: string[]
  /** 확정된 검증 개념. 3건이거나 0건(미확정)이다 — 그 사이는 저장되지 않는다 */
  concepts: VerificationConcept[]
  /**
   * 연결한 교안들이 가르친 항목 수. **서버가 세어서 내려준다.**
   * 화면이 교안 목록에서 합산하면 교안 전량을 받아야만 셀 수 있다(api-boundary §1-②).
   */
  conceptCandidateCount: number
  /**
   * 회차 시작일(`YYYY-MM-DD`). 생성 시 마감과 함께 범위로 받는다.
   *
   * ⚠ 기획 문서에 없던 개념이라 **무엇을 여는 날인지 정의가 필요하다**(#64).
   * 응시 창은 개인별(코드 분석 완료 + 24h)이라 이 날짜와 무관하다 — 지금은
   * "이 회차가 시작되는 날"로만 쓰고 학생 화면에 영향을 주지 않는다.
   */
  startAt: string | null
  /** 제출 마감(ISO, 시각 포함). 미설정이면 null */
  dueAt: string | null
  /** 빅프 전용 안내. 시작 전에는 회차 번호가 없다(첫 동작 시점이 사람마다 다르다) */
  note?: string
}

export type CohortScope = {
  id: string
  /** 표시명. 예: `7기` */
  name: string
  classes: number
  trainees: number
  /** 기수 기간. 회차 마감이 이 밖으로 나가지 않게 달력이 막는다(#64) */
  startAt: string
  endAt: string
}

// ── 목록 조회 ────────────────────────────────────────────────
/*
  검색·필터·정렬은 **서버가 처리한다.** 화면이 전량을 받아 거르면 회차가 쌓였을 때
  못 쓰고, 무엇보다 집계(`counts`)를 셀 수 없다.

  **페이지 파라미터는 아직 없다.** 기수당 회차가 6~8개라 한 페이지에 들어가고, 목록도
  페이저를 그리지 않는다(E7 — 누를 수 없는 컨트롤은 장식이다). 실제로 나뉘어야 하는
  화면(OP-06 명단 250명)에서 `page`·`size`를 더한다 — 지금 넣으면 아무도 안 보내는
  필드가 계약에 남는다.
*/

export type ProjectSort = 'PREP_FIRST' | 'DUE'

export type ProjectQuery = {
  cohortId: string
  search?: string
  curriculumId?: string
  kind?: ProjectKind
  status?: ProjectStatus
  sort?: ProjectSort
}

export type ProjectPage = {
  items: Project[]
  /** 필터를 적용한 결과 수 — 푸터의 `1–5 / 5개`. 페이지가 나뉘면 `items.length`와 갈린다 */
  total: number
  /**
   * 상태별 개수. **필터와 무관한 전체 모집단 기준**이라 목록만으로는 만들 수 없다
   * — 헤더의 `준비 중 2 · 진행 중 1 · 종료 1`이 이 값이다.
   */
  counts: Record<ProjectStatus, number>
}

export type CreateProjectRequest = {
  cohortId: string
  name: string
  kind: ProjectKind
  curriculumIds: string[]
  conceptIds: string[]
  /** 한 줄에 하나. 교안과 별개이고 **구현 P/F에만** 쓴다(14번 6-3) */
  requirements: string
  /** 회차 시작일 — 생성 시 마감과 범위로 함께 받는다 */
  startAt: string
  /** 제출 마감 — 날짜는 고르고 시각은 고정(18:00)이다 */
  dueAt: string
}

// ── 실패 ────────────────────────────────────────────────────
/**
 * 목업 케이스 표의 에러코드 — 문서와 코드가 같은 이름을 쓴다(00-index).
 *
 * **표에 있는 것만 둔다.** `NETWORK` 같은 일반 실패를 미리 넣어 뒀다가 지웠다 —
 * 케이스 표에 없는 코드는 문구도 다음 행동도 정해진 게 없어서, 화면이 그걸 받아도
 * 무엇을 보여줄지 결정할 수 없다. 실패를 구분해야 할 이유가 생기면 그때 표부터 고친다.
 *
 * `CONCEPT_SAVE_FAILED`는 OP-04(상세)가 쓴다 — 같은 도메인 계약이라 여기 둔다.
 */
export type ProjectErrorCode = 'PROJECT_CREATE_FAILED' | 'CONCEPT_SAVE_FAILED'
