/*
  프로젝트 도메인 **계약** — 화면이 쓰는 모양.

  **서버 타입(`@/api/projectExecution`)을 그대로 쓰지 않는 이유**는 서버가 두 축으로
  나눠 준 것을 화면이 한 축으로 읽기 때문이다(`status` + `readiness` → `ProjectStatus`).
  나머지는 서버 이름을 그대로 따른다 — 이름을 바꾸면 응답과 화면을 대조할 때마다
  번역표가 필요하다.

  기획 전제 셋이 이 타입에 박혀 있다.
    · 검증 개념은 **정확히 3건**이고 프로젝트 단위로 고정된다(14번 Tier1-4).
      반·팀·개인이 달라도 같은 3건이라 이것이 유일한 비교 축이다.
    · 검증 개념은 **연결한 교안의 승인된 매핑에서만** 나온다(14번 4-3).
    · **반을 지정하지 않는다.** 프로젝트는 기수 하위다(OP-03 3-1).
*/

/**
 * 화면이 읽는 상태 — **"손댈 게 남았나"** 하나의 축이다(목업 doc-head).
 *
 * **서버는 두 축으로 준다.** 성격이 달라서다 — `RUNNING`·`CLOSED`는 **시간**이 정하고,
 * `PREP`·`READY`는 **구성이 찼는지**가 정한다. 한 필드에 합치면 *"진행 중인데 교안이
 * 비었다"* 는 실제로 있는 상태를 표현할 수 없다(백엔드 9차 회신 §14).
 *
 * ```
 * status: PLANNED  +  readiness: PREP   → PREP
 * status: PLANNED  +  readiness: READY  → READY
 * status: RUNNING                       → RUNNING
 * status: CLOSED                        → DONE
 * ```
 *
 * **판정은 서버가 한다.** `readiness`는 목록 정렬(`sort=READINESS`)과 같은 계산에서
 * 나오므로, 화면이 교안·개념·마감을 조합해 유추하면 순서와 배지가 다른 말을 한다.
 */
export type ProjectStatus = 'PREP' | 'READY' | 'RUNNING' | 'DONE'

/**
 * 서버 응답에서 **경계가 읽는 필드만** 추린 모양(목록·상세 공통 부분).
 *
 * 생성 타입을 그대로 쓰지 않는 이유는 목록(`ProjectResponse`)과 상세
 * (`ProjectDetailResponse`)가 다른 스키마인데 이 부분이 같기 때문이다 — 변환 함수를
 * 두 벌 만들지 않으려고 공통 조각을 이름 붙였다. **화면은 이 타입을 쓰지 않는다.**
 */
export type ServerProjectProjection = {
  projectId: string
  cohortId: string
  name: string
  status: string
  readiness: string
  sequenceNo: number
  curriculumCount: number
  conceptCount: number
  /** 18차 R3으로 늘어난 이름들. 길이가 `…Count`와 다를 수 있다 — 개수는 `…Count`를 쓴다 */
  curriculumNames?: string[]
  conceptNames?: string[]
  conceptCandidateCount: number
  startDate: string
  endDate: string | null
}

/**
 * 연결된 교안 한 건(`ProjectDetailResponse.curricula[]`).
 *
 * **`projectCurriculumId`가 해제 키다** — 교안 버전이 아니라 *"이 프로젝트에 붙은 연결"*
 * 을 지운다(`DELETE /projects/{id}/curricula/{projectCurriculumId}`).
 *
 * 이름·버전이 `null`일 수 있다. 교안 버전 조회가 실패한 예외 상황인데, 서버가 연결
 * 자체를 감추지 않고 ID만 내려보낸다 — 감추면 화면이 `교안 연결 안 됨`으로 잘못 읽는다.
 */
export type LinkedCurriculum = {
  projectCurriculumId: string
  curriculumVersionId: string
  materialId: string | null
  originalFileName: string | null
  versionNo: number | null
  linkedAt: string
}

/**
 * 확정된 검증 개념(`ProjectDetailResponse.concepts[]`).
 *
 * **출처를 달고 다닌다** — 리포트의 교안 위치와 면담 브리프가 `curriculumVersionId`와
 * 페이지를 읽는다. 없으면 `p.53`을 어느 문서에서 펼지 알 수 없다(OP-04 §3).
 *
 * **키가 둘이다.** `mappingId`는 확정할 때 보내는 값(`PUT /concepts`의 `mappingIds`),
 * `teachesId`는 현황·분석이 개념을 가리킬 때 쓰는 공용 원장 키다. 화면의 선택 상태는
 * **`mappingId`로 든다** — 그래야 고른 것을 그대로 저장할 수 있다.
 */
export type VerificationConcept = {
  mappingId: string
  teachesId: string
  extractedName: string | null
  curriculumVersionId: string | null
  pageStart: number | null
  pageEnd: number | null
}

/**
 * 검증 개념 후보(`GET /projects/{id}/concept-candidates`).
 *
 * 섹션 항목(`GET /curricula/{materialId}/sections`)과 **겹치는 여섯 필드가 이름·타입·의미
 * 까지 같다**(9차 R2). 그래서 생성 모달(프로젝트가 아직 없어 후보를 못 부른다)은 섹션
 * 조회로 같은 것을 그린다 — 두 곳에서 한 컴포넌트를 쓸 수 있는 이유다.
 */
export type ConceptCandidate = {
  mappingId: string
  teachesId: string
  extractedName: string
  /** 정의 한 줄. 이름만으로는 무엇을 묻게 될지 판단할 수 없다(OP-03 §3) */
  description: string | null
  /** `true`면 정의문이 없다 — 고르면 문항 품질이 갈린다 */
  definitionMissing: boolean
  /** 어느 교안에서 온 후보인가 — 후보를 묶는 기준 */
  curriculumVersionId: string
  sectionId: string | null
  sectionTitle: string | null
  pageStart: number | null
  pageEnd: number | null
}

/**
 * 교안 한 건. 목록(`findLinkableCurricula`)이 주는 모양이다.
 *
 * ⚠ **`teaches`가 없다.** 예전 목은 교안이 후보를 들고 다녔지만 서버는 갈라 준다 —
 * 후보는 `findConceptCandidates`(프로젝트 기준) 또는 `findSections`(교안 기준)가 준다.
 */
/** 교안 분석 시도의 상태. `null`(분석 전)은 이 유니온에 없다 — 필드 쪽에서 `| null`로 받는다 */
export type CurriculumAnalysisStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

export type Curriculum = {
  versionId: string
  materialId: string
  versionNo: number
  originalFileName: string
  /**
   * 쪽수. 분석 전이거나 확정되지 않았으면 `null`이다.
   * (18차 R6에서 스펙이 `["integer","null"]`로 맞춰졌다.)
   */
  pageCount: number | null
  /**
   * 가장 최근 **분석 시도**의 상태. `null`이면 한 번도 시도하지 않은 것이다 —
   * **`FAILED`와 갈라야 한다**(전자는 기다리면 되고 후자는 다시 올려야 한다).
   *
   * 전에는 `pageCount == null`로 분석 여부를 **추측**했다(18차 R2로 요청해 받은 필드다).
   */
  analysisStatus: CurriculumAnalysisStatus | null
  /**
   * 승인된 「가르친 항목」 수. **고르기 전에** 이 교안에서 검증 개념 3건을 뽑을 수 있는지
   * 알려 준다 — 전에는 골라 봐야 알았다.
   */
  teachesCount: number
  createdAt: string
}

export type Project = {
  projectId: string
  /**
   * 이 회차가 속한 기수.
   *
   * **상세가 연관 조회(형제 회차·교안·기수 기간)의 기준으로 쓴다.** "지금 보고 있는
   * 기수"를 쓰면 주소로 직접 들어왔을 때 화면이 두 기수를 섞는다.
   */
  cohortId: string
  name: string
  /** 두 축을 합친 화면용 상태 — `toProjectStatus` */
  status: ProjectStatus
  /** 회차 번호. 서버가 기수 안에서 매긴다 — 화면이 세지 않는다 */
  sequenceNo: number
  /** 연결 교안 수. **목록은 이 숫자만** 받고 상세가 목록을 받는다 */
  curriculumCount: number
  /** 확정 개념 수. 3이거나 0이다 — 그 사이는 저장되지 않는다 */
  conceptCount: number
  /**
   * 연결된 교안 이름 전량. **개수 표시에는 안 쓴다** — 이름을 못 찾은 항목은 조용히
   * 빠지므로 길이가 `curriculumCount`와 다를 수 있다(18차 R3 회신).
   */
  curriculumNames: string[]
  /** 확정된 검증 개념 이름 전량. 위와 같은 이유로 개수는 `conceptCount`를 쓴다 */
  conceptNames: string[]
  /** 연결한 교안들의 승인된 매핑 수. **서버가 세어 준다** — 화면이 합산하면 교안 전량이 필요하다 */
  conceptCandidateCount: number
  /**
   * 회차 시작일(`YYYY-MM-DD`).
   *
   * ⚠ **시각이 없다.** 목은 `T09:00`까지 들고 있었는데 서버 컬럼이 `date`다.
   */
  startDate: string
  /** 제출 마감일(`YYYY-MM-DD`). 미설정이면 `null` — 아래 ⚠ 참고 */
  endDate: string | null
}

/**
 * 상세 — 목록에 없는 배열 셋이 더 온다.
 *
 * **목록에 싣지 않은 이유**는 회차마다 교안·개념 전량을 끌고 오기 때문이다. 목록은
 * 숫자 셋(`curriculumCount`·`conceptCount`·`conceptCandidateCount`)만 받는다.
 */
export type ProjectDetail = Project & {
  curricula: LinkedCurriculum[]
  concepts: VerificationConcept[]
  /** 요구사항. 교안과 별개고 **구현 P/F에만** 쓴다(14번 6-3) */
  requirementTitles: string[]
}

export type CohortScope = {
  cohortId: string
  /** 표시명. 예: `9기` */
  name: string
  /** 반 개수. **`findCohort`에 없어서 `findClassrooms`를 한 번 더 부른다**(9차 §7) */
  classes: number
  trainees: number
  /** 기수 기간. 회차 일정이 이 밖으로 못 나가게 달력이 막는다(#64). 미설정이면 `null` */
  startDate: string | null
  endDate: string | null
}

// ── 목록 조회 ────────────────────────────────────────────────

/**
 * 정렬 축 — 서버 `ProjectListSort`와 1:1이다(이름만 화면 쪽 것을 쓴다).
 *
 *   `PREP_FIRST` → `READINESS`   뭐부터 손대야 하나
 *   `DUE`        → `DUE_SOON`    뭐가 급한가
 *   `START`      → `START_DATE`  뭐가 곧 열리나
 */
export type ProjectSort = 'PREP_FIRST' | 'DUE' | 'START'

export type ProjectQuery = {
  cohortId: string
  search?: string
  /** 교안 버전 ID 또는 자료 ID — 서버가 둘 다 받는다(9차 회신 §9) */
  curriculumId?: string
  status?: ProjectStatus
  sort?: ProjectSort
}

export type ProjectPage = {
  items: Project[]
  /** 필터를 적용한 결과 수 — 푸터의 `1–5 / 5개` */
  total: number
  /**
   * 상태별 개수. **필터와 무관한 전체 모집단 기준**이다.
   *
   * 서버 `counts`는 `PLANNED`·`RUNNING`·`CLOSED` 세 키뿐이라 준비 중·준비됨을 가를 수
   * 없다. 10차 Q1 회신의 `readinessCounts`(`PREP`·`READY`)가 `PLANNED`를 그 둘로 나눠
   * 주기로 했고 **스펙에는 `required`로 들어가 있다.**
   *
   * ⚠ **그런데 배포된 서버가 그 필드를 안 보낸다**(실측: 응답 키가 `projects`·`total`·
   * `counts` 셋뿐). 그래서 `PREP`·`READY`는 **없을 수 있다** — `undefined`를 허용하는
   * 이유다. 필터 라벨은 개수가 없으면 라벨만 그린다(`0`으로 채우면 없는 사실을 주장한다).
   */
  counts: Partial<Record<ProjectStatus, number>>
  /**
   * 이 기수의 전체 회차 수 — 화면 제목의 `총 7개`.
   *
   * `PREP + READY == counts.PLANNED`라 **`counts` 네 값을 더하면 PLANNED를 두 번 센다.**
   * 서버의 세 키 합으로만 만든다.
   */
  population: number
}

export type CreateProjectRequest = {
  cohortId: string
  name: string
  /** 연결할 교안 버전 ID들 */
  curriculumVersionIds: string[]
  /** 확정할 검증 개념 — `ConceptCandidate.mappingId` 3건 */
  mappingIds: string[]
  requirementTitles: string[]
  /** `YYYY-MM-DD` */
  startDate: string
  endDate: string
}

/**
 * 생성 결과 — **부분 성공이 있다.**
 *
 * 서버는 생성을 다섯 호출로 나눠 받는다(회차 생성 → 교안 연결 → 개념 확정 → 요구사항).
 * 후보 조회가 `projectId`를 요구해서 한 번에 못 만든다. 중간에 실패해도 **회차는 이미
 * 만들어져 있고**, 같은 이름으로 다시 만들 수 없다(삭제해도 이름·순번이 점유된 채로
 * 남는다 — 9차 회신 §10). 그래서 지우고 다시 만들게 하지 않고 **상세로 보내 이어서
 * 채우게 한다.**
 */
export type CreateProjectResult = {
  projectId: string
  /** 어디까지 됐나. `COMPLETE`가 아니면 상세에서 이어서 설정해야 한다 */
  step: 'COMPLETE' | 'CURRICULA_FAILED' | 'CONCEPTS_FAILED' | 'REQUIREMENTS_FAILED'
}

// ── 상세(OP-04) ──────────────────────────────────────────────
/*
  탭 셋. 순서가 **읽는 것 → 굴러가는 것 → 고치는 것**이다.
    개요  이 회차가 무엇인가 · 현황  잘 굴러가나 · 구성  무엇을 바꾸나
*/
export type ProjectTab = 'overview' | 'status' | 'config'

/** 반별 파이프라인 한 줄 — 제출 → 분석 → 응시 */
export type ClassProgress = {
  classId: string
  className: string
  submitted: number
  total: number
  analyzed: number
  /** 분석 실패 인원. 0이면 화면에 `—`로 쓴다(없음과 0을 다르게 — F3) */
  analysisFailed: number
  attended: number
  /**
   * 응시 모집단은 제출이 아니라 **분석 완료** 수다 — 응시 창이 분석 후 열린다.
   * 서버 `classes[]`에 분모가 따로 없어 `analysisSucceededCount`를 쓴다.
   */
  attendable: number
  /** 담당 매니저. 서버는 배열로 준다 — 없으면 빈 배열 */
  managerNames: string[]
}

/**
 * 개념별 코드 매칭 — **문항이 만들어졌는가**.
 *
 * 고른 개념이 학생 코드에 없으면 그 개념은 물을 수 없다. 학생 문제가 아니라
 * **개념 선택이 프로젝트와 안 맞은 것**이다(OP-04 §6).
 */
export type ConceptMatch = {
  teachesId: string
  conceptName: string
  matched: number
  /** 분석이 끝난 인원 — 매칭 여부를 판정할 수 있는 모집단 */
  total: number
  unmatchedTeams: number
}

/**
 * 현황 탭이 그리는 것.
 *
 * ⚠ **팀 수가 없다.** 목은 `8개 팀 중 6개`를 썼는데 서버 응답에 분모가 없어 그 문구를
 * 못 쓴다 — 화면이 **팀 수를 말하지 않는 문구**로 바꾼다(9차 §7에 흡수하기로 적었다).
 */
export type ProjectStatusReport = {
  classes: ClassProgress[]
  matches: ConceptMatch[]
}

/**
 * 지난 회차 이력 — **서버에 없다.**
 *
 * 목이 개념 후보마다 `집단 미달`·`코드 매칭 0`을 붙여 줬는데(OP-04 §3) 그것을 주는
 * 엔드포인트가 없다. `Analytics`의 `findCohortGroupGaps`가 비슷한 것을 기수 단위로
 * 주지만 **개념 후보에 붙이는 형태가 아니다** — 붙이려면 회차·개념을 넘나들며 조립해야
 * 하고, 그건 화면이 할 판정이 아니다(api-boundary §1-②).
 *
 * 그래서 **이력 표시를 뺀다.** 판단을 대신하지 않는 참고 정보였고, 없다고 개념을 못
 * 고르지는 않는다. 10차에 요청하고 그때 되살린다.
 */
