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
  /** 등록일. 구성 탭에서만 쓴다 — 어느 버전을 언제 올린 것인지가 개념 출처의 근거다 */
  registeredAt: string
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
  status: ProjectStatus
  /** 연결된 교안. 1개 이상이어야 개념 후보가 나온다. 아직 안 붙였으면 빈 배열 */
  curriculumIds: string[]
  /** 확정된 검증 개념. 3건이거나 0건(미확정)이다 — 그 사이는 저장되지 않는다 */
  concepts: VerificationConcept[]
  /**
   * 연결한 교안들이 가르친 항목 수. **서버가 세어서 내려준다.**
   * 화면이 교안 목록에서 합산하면 교안 전량을 받아야만 셀 수 있다(api-boundary §1-②).
   */
  conceptCandidateCount: number
  /**
   * 회차 시작(`YYYY-MM-DDTHH:mm`). 생성 시 마감과 함께 범위로 받는다.
   *
   * ⚠ 기획 문서에 없던 개념이라 **무엇을 여는 날인지 정의가 필요하다**(#64).
   * 응시 창은 개인별(코드 분석 완료 + 24h)이라 이 날짜와 무관하다 — 지금은
   * "이 회차가 시작되는 날"로만 쓰고 학생 화면에 영향을 주지 않는다.
   */
  startAt: string | null
  /** 제출 마감(`YYYY-MM-DDTHH:mm`). 미설정이면 null. **시각은 회차마다 다르다** */
  dueAt: string | null
  /**
   * 요구사항 — 교안과 별개이고 **구현 P/F에만** 쓴다(14번 6-3).
   *
   * **배열인 이유는 판정 단위다.** MG-08이 항목마다 `✓`/`✗`와 이유를 붙이고
   * (`✓ 2 · ✗ 1` · *"자리는 만들었지만 쓰이지 않았어요"*) 팀 행을 펼쳐 항목별로 본다 —
   * 문장 덩어리로 두면 그 판정을 어디에 걸지가 없다.
   *
   * **id는 주지 않는다.** 판정이 이름 매칭으로 나가므로(MG-08 충족 조건) 문자열이
   * 곧 키다. 필요해지면 그때 서버 계약에서 준다 — 지금 만들면 아무도 안 쓴다.
   */
  requirements: string[]
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

/**
 * 정렬 축 — **이 화면에서 실제로 던지는 질문마다 하나씩**이다.
 *
 *   `PREP_FIRST`  뭐부터 손대야 하나 — 상태 → 마감 미설정 → 마감
 *   `DUE`         뭐가 급한가       — 제출 마감 이른 순
 *   `START`       뭐가 곧 열리나    — 시작 이른 순. **시작일이 곧 준비 시한이다**
 *
 * ⚠ `최근 생성 순`이 없다 — 계약에 `createdAt`이 없어서 만들 수 없다. 지금은 새 회차가
 * `PREP_FIRST`에서 위로 오지만 그건 우연이고, 목록이 길어지면 방금 만든 것을 못 찾는다.
 */
export type ProjectSort = 'PREP_FIRST' | 'DUE' | 'START'

export type ProjectQuery = {
  cohortId: string
  search?: string
  curriculumId?: string
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
  curriculumIds: string[]
  conceptIds: string[]
  /** 항목 하나가 판정 단위다 — `Project.requirements` 주석 참고 */
  requirements: string[]
  /** 회차 시작 — 생성 시 마감과 범위로 함께 받는다(`YYYY-MM-DDTHH:mm`) */
  startAt: string
  /** 제출 마감 — 날짜와 시각을 둘 다 받는다(`YYYY-MM-DDTHH:mm`) */
  dueAt: string
}

// ── 상세(OP-04) ──────────────────────────────────────────────
/*
  탭 셋. 순서가 **읽는 것 → 굴러가는 것 → 고치는 것**이다.

    개요  이 회차가 무엇인가          — 검증 개념·교안·기간·일정·측정 규칙
    현황  잘 굴러가고 있나            — 반별 진행·개념 공백
    구성  무엇을 바꿀 것인가          — 교안·개념·요구사항 편집

  **잠그지 않는다.** 정의서 §6은 개념 3건 전까지 일정·현황을 잠그라고 했지만,
  잠긴 탭은 **왜 잠겼는지도 어떻게 열리는지도 말하지 못한다** — 체크리스트 C1이
  금지한 게이팅과 같은 문제다. 대신 각 탭이 **자기가 왜 비었는지**를 쓴다
  (02-layout §4의 `아직`/`없음` 구분).
*/
export type ProjectTab = 'overview' | 'status' | 'config'

/** 반별 파이프라인 한 줄 — 제출 → 분석 → 응시 */
export type ClassProgress = {
  className: string
  submitted: number
  total: number
  analyzed: number
  /** 분석 실패 팀 수. 0이면 화면에 `—`로 쓴다(없음과 0을 다르게 — F3) */
  analysisFailed: number
  attended: number
  /** 응시 모집단은 제출이 아니라 **분석 완료** 수다(응시 창이 분석 후 열린다) */
  attendable: number
  /** 담당 매니저. 없으면 null — 미배정은 OP-01 `조치 필요`가 잡는다 */
  manager: string | null
}

/**
 * 개념별 코드 매칭 — **문항이 만들어졌는가**.
 *
 * 고른 개념이 학생 코드에 없으면 그 개념은 물을 수 없다. 학생 문제가 아니라
 * **개념 선택이 프로젝트와 안 맞은 것**이다(OP-04 §6).
 */
export type ConceptMatch = {
  conceptId: string
  conceptName: string
  matched: number
  total: number
  /** 팀 전원이 미매칭인 팀 수. 팀 전반이면 개념을 교체해야 한다 */
  unmatchedTeams: number
}

export type ProjectStatusReport = {
  classes: ClassProgress[]
  matches: ConceptMatch[]
  /** 팀 수 — `8개 팀 중 6개` 문구의 분모 */
  totalTeams: number
}

/**
 * 검증 개념 후보에 붙는 지난 회차 이력.
 *
 * **같은 교안이 붙었을 때만 나타난다** — 검증 개념은 그 회차 교안이 가르친 것에서만
 * 나오므로(14번 4-3) 조건이 자연히 충족된다. **이력은 판단을 대신하지 않는다**(OP-04 §3):
 * `집단 미달`은 *"피해야 한다"* 도 *"다시 물어야 한다"* 도 아니고, `코드 매칭 0`은
 * 학생이 못한 것이 아니라 **묻지 못했다**는 뜻이다.
 */
export type ConceptHistory = {
  teachId: string
  kind: 'GROUP_MISS' | 'NO_MATCH' | 'USED'
  /** 화면에 그대로 쓰는 문구. 판정이 아니라 사실만 적는다 */
  note: string
}

// ── 실패 ────────────────────────────────────────────────────
/**
 * 실패 코드 — **`api.ts`가 reject하는 모든 지점이 여기 있는 값을 쓴다.**
 *
 * 기준은 *"케이스 표에 있나"* 가 아니라 **"실제로 던지는 지점이 있나"** 다. 예전에
 * `NETWORK`를 지운 이유는 표에 없어서가 아니라 **아무도 던지지 않는 코드**였기
 * 때문이다 — 쓰지 않는 것을 계약에 넣으면 백엔드가 그것을 만든다(mock-first §5).
 *
 * ⚠ **아래 둘은 목업 케이스 표에 아직 없다.** 정의서 OP-04 §6이 `#cases-op04`를
 * 가리키는데 그 앵커가 `operator/projects.html`에 없다. 그래도 코드를 두는 이유:
 * 실패 지점이 실재하고, 식별자가 없으면 표가 생겼을 때 `api.ts`를 다시 만져야 한다.
 * **지금 정해지지 않은 것은 문구와 다음 행동**이고 그건 화면이 표를 보고 붙인다 —
 * 그때까지 화면은 코드로 분기하지 않고 실패 하나만 그린다. (PR 질문 · 표부터 고친다)
 */
export type ProjectErrorCode =
  | 'PROJECT_CREATE_FAILED'
  | 'CONCEPT_SAVE_FAILED'
  | 'CURRICULA_SAVE_FAILED'
  | 'REQUIREMENTS_SAVE_FAILED'
  | 'SCHEDULE_SAVE_FAILED'
  | 'PROJECT_DELETE_FAILED'
