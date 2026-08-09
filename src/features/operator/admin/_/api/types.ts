/*
  운영 관리 도메인 **계약** — 서버와 주고받는 모양만 둔다.

  여기 있는 이름과 값은 **백엔드와 합의해야 하는 것**이다(`docs/dev/api/api-boundary.md` §1-③).
  판정 규칙은 rules.ts, 목 데이터는 mockDb.ts, 호출은 api.ts로 갈라 뒀다 — 연동할 때
  무엇을 지우고 무엇을 남길지가 파일 경계로 보이게.

  기획 전제 넷이 이 타입에 박혀 있다(OP-06 · 17번 3-2).
    · **탭마다 범위가 다르다.** 반·명단·비용은 `선택 기수`, 매니저·교안은 `기관 전체`다 —
      매니저는 기수를 옮겨 다니고 교안은 여러 기수가 같이 쓴다. 그래서 쿼리에
      `cohortId`가 붙는 것과 안 붙는 것이 갈린다.
    · **매니저는 한 종류다.** 총괄/담당이 폐기되어 권한 필드가 없다 — 무엇을 볼 수
      있는지는 **담당 반**이 정한다.
    · **담당 배정은 기간형 이력이다.** 퇴사한 매니저를 지우지 않고 정지로 남기는 이유가
      이것이다 — 6기 A반 담당이 누구였는지가 그 계정에 붙어 있다.
    · **오퍼레이터 계정은 여기 없다.** 초대·정지는 슈퍼어드민(SA-02) 소관이다.

  ## ⚠ 이 파일은 줄어드는 중이다
  탭을 하나씩 실서버에 붙이면서 **연동이 끝난 블록은 지운다** — 그 자리의 타입은
  스펙에서 생성된다(`src/api/` 아래). 손으로 쓴 계약이 남아 있으면 생성 타입과 조용히
  갈린다. 마지막 탭이 붙으면 이 파일과 `api.ts`·`mockDb.ts`가 함께 사라진다.
*/
import type { findCohorts_Item } from '@/api/academic/academicTypes'
import type { findManagers_Item as ManagerRosterEntry } from '@/api/member/memberTypes'

// ── 기관 ────────────────────────────────────────────────────
/**
 * 기관 한 건. 모달 제목(`매니저 초대 · 그린컴퍼니 부트캠프`)과 **도메인 검증**에 쓴다.
 *
 * `domain`을 프론트 상수로 두지 않는다 — 기관마다 다른 값이고, 화면이 정하면
 * 기관을 하나 더 만드는 순간 틀린다.
 */
export type Org = {
  id: string
  name: string
  /** 기관 도메인. 이 밖의 주소는 명단·매니저 초대에 등록되지 않는다 */
  domain: string
}

/**
 * 탭 이름 옆 개수. **다섯 탭을 미리 조회하지 않으려고 따로 받는다** — 개수는 목록이
 * 아니라 수라서 서버가 세는 편이 싸다.
 */
export type AdminCounts = {
  cohorts: number
  classes: number
  /**
   * 담당 매니저가 없는 반 수. **필터와 무관한 전체 기준**이라 목록만으로는 못 센다 —
   * `담당 없음`으로 걸러 보고 있어도 헤더의 이 수는 그대로여야 한다.
   */
  unstaffedClasses: number
  trainees: number
  managers: number
  curricula: number
}

// ── ① 기수 ── **연동 완료.** 손으로 쓴 계약을 지웠다 ────────────
/*
  기수 타입은 이제 스펙에서 생성된다(`@/api/academic/academicTypes`). 여기 남은 것은
  **라벨·배지가 상태값을 알아야 해서** 한 줄뿐이다 — 두 파일이 각자 파생 타입을 만들면
  같은 개념을 가리키는 경로가 둘이 된다.

  ⚠ 값이 `RUNNING`·`CLOSED` 둘에서 **셋(`PLANNED` 추가)으로 늘었다.** 목이 개강 전을
  진행 중에 섞고 있었다.
*/
export type CohortStatus = findCohorts_Item['status']

/**
 * ⚠ **목 전용.** 아직 목인 반·매니저 탭이 `getCohort()`로 기수 하나를 읽는다
 * (개강일로 반 수정 가능 여부를 가른다). 그 탭들이 붙으면 이 타입도 함께 사라진다.
 */
export type MockCohort = {
  id: string
  name: string
  status: Extract<CohortStatus, 'RUNNING' | 'CLOSED'>
  classes: number
  trainees: number
  startAt: string
  endAt: string
  /** 상단 스위처가 지금 가리키는 기수인가 */
  current: boolean
}

// ── ②③ 반·명단·매니저 ── **연동 완료.** 응답 타입은 스펙에서 생성된다
/*
  남은 셋은 **서버 계약이 아니라 화면 안의 값**이다 — CSV 판정은 `rules.ts`가 하고
  그 결과를 `RosterCsvField`·`AddRosterDialog`가 그린다. 서버는 자기 실패 코드를
  따로 준다(`Failure.status` 1·2·3) — 그건 등록 결과이고 이건 보내기 전 판정이라
  다른 값이다.
*/

/** 계정 상태 — 교육생·매니저가 같은 값을 쓰고 라벨만 갈린다(labels.ts) */
export type AccountStatus = ManagerRosterEntry['status']

/** 명단 한 줄 — CSV 한 행이자 직접 입력 한 행 */
export type RosterEntry = {
  name: string
  email: string
}

export type RosterIssue = {
  /** 1부터. CSV 편집기의 행 번호와 같아야 한다 */
  line: number
  reason: RosterIssueReason
}

/**
 * 행이 걸린 이유 — **보내기 전에 화면이 판정하는 것만** 담는다.
 *
 * *이미 등록된 이메일*은 여기 없다. 명단 전량을 받아야 셀 수 있어 서버가 판정하고
 * (드라이런 · 9차 Q3-③), 그 결과는 `Failure.status`로 온다.
 */
export type RosterIssueReason = 'INVALID_FORMAT' | 'DOMAIN_NOT_ALLOWED' | 'DUPLICATE_IN_FILE'

// ── ④ 교안 ──────────────────────────────────────────────────
/**
 * 교안 분석 상태.
 *
 * **`FAILED`인 교안은 프로젝트에 연결할 수 없다**(OP-03 `교안에 항목 0`) — 가르친
 * 항목이 안 나오면 검증 개념 후보가 없기 때문이다.
 */
export type CurriculumStatus = 'DONE' | 'ANALYZING' | 'FAILED'

export type CurriculumRow = {
  id: string
  name: string
  version: string
  /** 분석 전·실패면 null. **0과 다르다**(F3 — 없음과 0을 다르게 표시) */
  sections: number | null
  teachItems: number | null
  /** 이 교안을 쓰는 회차 이름. 재분석 안전장치가 이 값을 읽는다 */
  linkedProjectNames: string[]
  status: CurriculumStatus
}

/** 섹션 하나 + 그 섹션이 가르친 항목. **좌 섹션 목록 → 우 항목**의 마스터-디테일 재료 */
export type CurriculumSection = {
  id: string
  name: string
  /** `p.48–60`. **리포트와 면담이 가리키는 교안 위치가 이 값이다** */
  pages: string
  items: TeachItem[]
}

/**
 * 가르친 항목 — 검증 개념 후보.
 *
 * **정의 한 줄을 같이 둔다.** 이름만으로는 무엇을 묻게 될지 판단할 수 없는데, 프로젝트가
 * 고르는 순간 그것이 그 회차 **모든 학생의 문항**이 된다(14번 6-3).
 */
export type TeachItem = {
  id: string
  name: string
  page: string
  definition: string
}

/** 이 교안을 쓰는 회차 한 줄 — **조회가 아니라 안전장치다**(OP-06 §3) */
export type LinkedProject = {
  id: string
  name: string
  cohortName: string
  /** 이 교안에서 고른 검증 개념. 비어 있으면 `항목 미확정` */
  conceptNames: string[]
  /** 회차 상태. 프로젝트 도메인과 **같은 값을 쓰되 타입은 나눈다**(§ 아래 주석) */
  status: LinkedProjectStatus
  /** 응시 진행 중일 때만. `198/231` */
  attended: number | null
  attendable: number | null
}

/*
  프로젝트 도메인(`features/operator/projects/types.ts`)의 `ProjectStatus`와 값이 같다.
  **일부러 다시 적었다** — 레이어 규칙이 `features/A → features/B` import를 막고(D15),
  그 규칙이 막으려는 것이 정확히 이 결합이다. 여기 있는 것은 *교안이 안전장치로 읽는
  회차 상태*이고, 프로젝트 화면이 쓰는 것은 *회차 설계가 완결됐나*다 — 지금은 값이
  같지만 한쪽이 상태를 늘려도 다른 쪽이 따라갈 이유가 없다.
*/
export type LinkedProjectStatus = 'PREP' | 'READY' | 'RUNNING' | 'DONE'

export type CurriculumDetail = CurriculumRow & {
  /** 파일명 · 쪽수 · 등록 시각. 분석 실패 화면이 이것으로 무엇을 다시 올릴지 말한다 */
  fileName: string
  pageCount: number
  registeredAt: string
  sectionList: CurriculumSection[]
  linked: LinkedProject[]
  /** 실패 사유. 그대로 화면에 쓴다 — 무엇을 고쳐야 하는지가 여기 있다 */
  failureReason: string | null
}

export type CurriculumQuery = {
  search?: string
  status?: CurriculumStatus
}

export type CurriculumPage = {
  items: CurriculumRow[]
  total: number
  counts: Record<CurriculumStatus, number>
}

// ── ⑤ 비용 ── **연동 완료.** 타입이 스펙에서 생성된다(@/api/usage/usageTypes)

// ── 실패 ────────────────────────────────────────────────────
/**
 * 목업 케이스 표의 에러코드 — 문서와 코드가 같은 이름을 쓴다(00-index).
 *
 * **표에 있는 것만 둔다.** `ADMIN_SAVE_FAILED`는 저장 전반(기수·반·초대·재분석)이
 * 쓰는 하나짜리 코드이고, `DOMAIN_NOT_ALLOWED`는 명단·초대가 **다른 문구**로 답해야
 * 해서 갈라져 있다. 표에 없는 코드를 미리 넣지 않는다 — 받아도 무엇을 보여줄지
 * 정해진 게 없다(mock-first §5).
 */
export type AdminErrorCode = 'ADMIN_SAVE_FAILED' | 'DOMAIN_NOT_ALLOWED'
