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

// ── ② 반 · 명단 ─────────────────────────────────────────────
export type ClassRoom = {
  id: string
  cohortId: string
  /** 예: `A반` */
  name: string
  /** 정원. `25명`만 있으면 더 넣어도 되는지 판단할 수 없다(OP-06 §3) */
  capacity: number
  /** 현재 인원 */
  size: number
  /** 담당 매니저. 없으면 null — `담당 없음` 경고가 붙고 OP-01 `조치 필요`에도 올라간다 */
  managerId: string | null
  managerName: string | null
  /**
   * **지금 담당 구간이 언제·누구 손으로 열렸나.** 배정이 기간형 이력이라(§ 위 전제)
   * 서버는 이미 구간을 닫고 여는데, 그 구간의 시작을 화면에 내려주는 필드가 없었다 —
   * 담당이 바뀐 것을 보고도 *"누가 언제 바꿨지"* 를 물을 데가 없다.
   *
   * **표에 열로 세우지 않는다.** 반 탭의 질문은 *"어느 반에 담당이 없나"* 라 이 값은
   * 그 질문에 답하지 않는다 — **바꾸는 자리**(담당 배정 모달)에서만 읽는다.
   *
   * ⚠ **백엔드와 확인할 것** — 기획에 필드로 적힌 적이 없다(mock-first §4). 이력 전체를
   * 주는 엔드포인트가 따로 생기면 여기 둘은 그쪽으로 옮긴다.
   */
  assignedAt: string | null
  assignedBy: string | null
}

/**
 * 반 목록 조회 조건.
 *
 * **선택 사항이다.** 반은 선택지 목록으로도 쓰이므로(명단 필터·초대 모달·배정 모드)
 * 그쪽은 조건 없이 전량을 받는다 — 반 탭만 검색·필터를 건다.
 *
 * `counts`·페이지가 없는 이유 — 한 기수에 6~10반이라 한 화면에 들어간다(E7 — 페이지가
 * 하나면 페이저를 그리지 않는다). 반이 그보다 많아지는 기수가 나오면 그때 더한다.
 */
export type ClassQuery = {
  cohortId: string
  /** 반 이름 또는 담당 매니저 이름 */
  search?: string
  /** 담당이 비어 있는 반만 — OP-01 `조치 필요`가 가리키는 그 상태다 */
  staffing?: ClassStaffing
}

export type ClassStaffing = 'STAFFED' | 'UNSTAFFED'

/**
 * 계정 상태 — **스펙에서 온다**(`AccountStatus`: INVITED · ACTIVE · INACTIVE).
 *
 * 교육생과 매니저가 같은 값을 쓰고 라벨만 갈린다(labels.ts). 9차에서 `LOCKED`가
 * 제거됐다 — DB CHECK가 애초에 세 값만 허용해 도달할 수 없는 값이었다.
 */
export type AccountStatus = ManagerRosterEntry['status']

export type Trainee = {
  id: string
  name: string
  email: string
  /** 소속 반. null이면 미배정 */
  classId: string | null
  className: string | null
  account: AccountStatus
  /*
    ⚠ **`team`과 `previousCohort`를 뺐다**(op-06-admin.md OP06-6). 목업에는 둘 다 있지만
    이 도메인이 답하는 질문에 쓰이지 않는다.

      · `team` — 팀은 **프로젝트마다 재편성되는 회차의 속성**이라 사람에 고정으로 붙지
        않는다(01-design-checklist 규칙 · 00-index `학생 → 팀 = 프로젝트마다 재편성`).
        매니저용 명단(MG-05)은 **같은 이유로 팀 열을 이미 뺐다** — OP-06만 목업을 베껴
        어기고 있었다. 회차 이름 없는 `3팀`은 한 기수에 회차가 여럿이면 무엇도 가리키지
        않는다.
      · `previousCohort` — **이 부트캠프에 재수강생이 없다**(기획 확인 2026-08-04).
        열도 필드도 존재 이유가 없었다 — 목업에 있다고 그대로 옮긴 자리다.
  */
  /**
   * 비활성 사유·일자(`중도 이탈 2026-08-04`). 활성이면 null.
   *
   * **매니저의 `statusNote`와 같은 모양이다** — MG-05가 *"초대 대기·비활성 행은 흐리게 +
   * **사유·일자**를 쓰되 액션을 두지 않는다. 초대·정지는 **오퍼레이터 소관**"* 이라고
   * 요구하는데, 그 액션이 어느 오퍼레이터 화면에도 없었다(OP06-7-①).
   *
   * **비활성이어도 반은 유지된다.** MG-05 헤더가 `25명 · 활성 23 · 초대 대기 1 ·
   * 비활성 1`이라 **비활성이 그 반 인원 안에 세어져 있다** — 반에서 빼면 담당 매니저가
   * 그만둔 학생을 아예 못 본다.
   */
  statusNote: string | null
  /**
   * 명단에 들어온 날(`YYYY-MM-DD`).
   *
   * **정렬 키라서 행에 있어야 한다**(E2). `최근 등록순`으로 정렬해 놓고 등록일이 안 보이면
   * 왜 그 순서인지 묻게 된다 — 기수 탭의 `기간` → `시작 ~ 종료`와 같은 자리다.
   * 중도 합류를 가려내는 값이기도 하다(개강일과 다른 사람이 곧 나중에 들어온 사람이다).
   */
  registeredAt: string
}

/** 명단 범위. 배정 모드는 기본이 `미배정만`이고, 반 통폐합 때만 `전체`로 바꾼다 */
export type RosterScope = 'ALL' | 'UNASSIGNED'

export type RosterSort = 'NAME' | 'RECENT'

export type RosterQuery = {
  cohortId: string
  search?: string
  classId?: string
  account?: AccountStatus
  scope?: RosterScope
  sort?: RosterSort
  /**
   * **여기서 페이지가 처음 필요해진다.** 250명이라 한 화면에 안 들어간다 —
   * api-boundary §2-1이 *"실제로 나뉘어야 하는 화면(OP-06 명단 250명)에서 더한다"* 고
   * 미뤄 둔 그 자리다.
   */
  page?: number
  size?: number
}

export type RosterPage = {
  items: Trainee[]
  /** 필터를 적용한 결과 수. 푸터의 `1–25 / ○○명`이 이 값이다 */
  total: number
  /**
   * 기수 전체 인원. **필터와 무관한 기준**이라 `total`과 다르다.
   *
   * 헤더 수와 빈 화면의 *"7기 ○○명에서 찾았습니다"* 가 이 값을 쓴다 — `total`을 쓰면
   * 걸러 보는 동안 헤더가 필터 결과를 반복하고, 결과가 0일 때 **`0명에서 찾았습니다`** 라는
   * 말이 안 되는 문장이 나온다(반 탭 헤더가 `counts`를 따로 받는 것과 같은 이유).
   */
  cohortTotal: number
  /** 미배정 인원. 이것도 **필터와 무관한 전체 기준**이라 목록만으로는 못 센다 */
  unassigned: number
}

/** 명단 한 줄 — CSV 한 행이자 직접 입력 한 행 */
export type RosterEntry = {
  name: string
  email: string
}

export type AddRosterRequest = {
  cohortId: string
  entries: RosterEntry[]
}

/**
 * 명단 등록 결과. **한 줄 때문에 전체를 막지 않는다**(OP-06 §6) — 유효 행은 등록하고
 * 나머지는 이유별로 센다. 수백 명 파일을 통째로 되돌리면 아무도 안 쓴다.
 */
export type AddRosterResult = {
  /** 등록됨. 활성화 초대가 나간다 */
  added: number
  /** 이미 등록된 이메일 — 건너뛴다 */
  skipped: number
  /** 고쳐야 하는 행. **행 번호로 알린다** — 어디를 고칠지 모르면 파일을 다시 만들게 된다 */
  invalid: RosterIssue[]
}

export type RosterIssue = {
  /** 1부터. CSV 편집기의 행 번호와 같아야 한다 */
  line: number
  reason: RosterIssueReason
}

/**
 * 행이 걸린 이유.
 *
 * **`DOMAIN_NOT_ALLOWED`가 케이스 표에 있는 계약값**이다(목업 `#roster-add`).
 * 나머지 둘은 그 표의 `형식 오류`·`이미 등록된 이메일`을 나눈 것이고, 문구가 갈리므로
 * 코드도 갈라 둔다 — 합치면 화면이 무엇을 고치라고 할지 정할 수 없다.
 */
export type RosterIssueReason = 'INVALID_FORMAT' | 'DOMAIN_NOT_ALLOWED' | 'DUPLICATE_IN_FILE'

export type CreateClassRequest = {
  cohortId: string
  name: string
  capacity: number
  /** 담당 매니저 · 선택. 비우면 `담당 없음`으로 만들어지고 목록에 경고가 붙는다 */
  managerId: string | null
}

export type AssignClassRequest = {
  cohortId: string
  classId: string
  traineeIds: string[]
}

/**
 * 배정 결과. **되돌리기에 필요한 것만** 담는다.
 *
 * 확인 모달을 세우면 반복 배정이 안 되고(250명을 스무 번 나눠 넣는다), 안 세우면 잘못
 * 누른 25명을 손으로 되돌려야 한다 — **즉시 실행 + 되돌리기**가 그 사이의 답이다.
 * 배너에 **이름을 적는다** — `2명`만 쓰면 누구를 되돌리는지 모른 채 누른다.
 */
export type AssignResult = {
  classId: string
  className: string
  /**
   * 옮긴 사람들. **옮기기 전 소속을 같이 들고 있다** — 이게 없으면 되돌리기가 원래
   * 자리로 못 돌려놓는다(op-06-admin.md OP06-6).
   */
  moved: MovedTrainee[]
  /** 배정 후 그 반 인원. 레일의 `방금 +2`가 이 값을 쓴다 */
  size: number
}

/**
 * 옮긴 사람 한 명.
 *
 * `fromClassId`가 **되돌리기의 전부다.** 이 값이 없던 동안 되돌리기는 무조건 `미배정`으로
 * 보냈다 — B반 사람을 A반으로 옮기고 되돌리면 **B반이 아니라 미배정이 됐다.**
 */
export type MovedTrainee = {
  id: string
  name: string
  /** 옮기기 전 소속. null이면 원래 미배정이었다 */
  fromClassId: string | null
  fromClassName: string | null
}

// ── ③ 매니저 ────────────────────────────────────────────────
export type ManagerStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED'

export type Manager = {
  id: string
  /** 초대만 나가고 아직 가입 전이면 null — 이름은 받는 사람이 정한다 */
  name: string | null
  email: string
  /**
   * **소속 기수.** 매니저도 반처럼 기수에 붙는다(op-06-admin.md OP06-15).
   *
   * 담당 반이 있으면 그 기수가 여기 들어오고, **아직 반을 안 맡았어도**(초대 대기) 초대할
   * 때 정한 기수가 들어온다 — 그래야 기수로 좁혀 봐도 계정이 사라지지 않는다.
   * 담당 반만으로 소속을 판정하면 **초대 대기·정지 계정이 어느 기수에도 안 잡힌다**
   * (실측: 7기로 걸렀더니 9명 중 7명만 남았다).
   */
  cohortIds: string[]
  /**
   * 담당 반 — 기수마다 한 묶음. **조회 범위만큼 담긴다**(op-06-admin.md OP06-14).
   *
   * 배정이 기간형 이력이라(OP-06 §3) 한 사람이 여러 기수에 담당을 갖는다. 그런데 5·6·7기를
   * 연달아 맡은 사람의 것을 다 늘어놓으면 칸이 넘치고 *"지금 무엇을 맡나"* 도 묻힌다.
   * 그래서 **서버가 조회 범위만큼 잘라서 준다.**
   *
   *   · 기수 필터 없음 → **진행 중인 기수**의 담당(+ 나머지는 `pastCohorts` 수로)
   *   · 기수 필터 있음 → **그 기수**의 담당(끝난 기수여도 그대로 보여준다)
   *
   * **필터를 걸면 그 기수를 볼 수 있어야 한다** — 한때 진행 중 기수만 담아서, 6기로
   * 걸러도 6기 담당이 안 보이고 목록이 아예 비었다.
   *
   * 비어 있으면 그 범위에 맡은 반이 없다는 뜻이다(`null`을 쓰지 않는다 — 없음과 빈
   * 목록이 같은 사실이라 두 표현을 두면 화면이 둘 다 검사해야 한다).
   */
  assignments: ManagerAssignment[]
  /**
   * `assignments`에 **안 담긴** 지난 기수 수.
   *
   * 이름을 다 늘어놓지 않으면서 *"이 계정에는 기록이 있다"* 를 남기는 값이다 — 퇴사한
   * 매니저를 지우지 않고 정지로 남기는 이유(OP-06 §3)가 화면에도 보여야 한다.
   * **기수 필터를 걸면 0이다** — 그때는 그 기수가 곧 답이라 나머지를 셀 이유가 없다.
   */
  pastCohorts: number
  /**
   * 담당 인원 합 — **`assignments`와 같은 범위**. 그 범위에 맡은 반이 없으면 null.
   *
   * ⚠ 끝난 기수까지 더하고 있었다(OP06-13). 5·6·7기를 맡은 사람이 `73명`으로 보였는데
   * 실제로 지금 보는 것은 50명이었다 — **`담당 인원순` 정렬이 부하가 아니라 근속을
   * 재고 있었다.** 서버가 센다(반 목록 전량을 받아야만 셀 수 있는 값이다).
   */
  headcount: number | null
  status: ManagerStatus
  /** 정지 사유·일자(`퇴사 2026-05-02`). 상태만 있으면 왜 정지인지 모른다 */
  statusNote: string | null
  /** 최근 접속(ISO). **`오늘 09:41` 같은 표기는 화면이 만든다** — 응답이 캐시되면 틀린다 */
  lastSeenAt: string | null
  /**
   * 초대를 보낸 날·보낸 사람.
   *
   * **초대 대기 행에는 이것 말고 볼 것이 없다.** 가입 전이라 `lastSeenAt`이 null이고
   * 담당 반도 없어서, 이 값이 없으면 `재발송`을 눌러야 할지 판단할 근거가 아무것도
   * 없다 — 어제 보낸 것인지 3주 전 것인지 모른 채 누른다.
   *
   * 반의 `assignedAt`/`assignedBy`(OP06-2)와 같은 모양이다.
   */
  invitedAt: string
  invitedBy: string
}

/** 매니저 목록 정렬. **담당 인원순이 있는 이유는 부하 분포가 조치 대상이기 때문**이다 */
export type ManagerSort = 'NAME' | 'HEADCOUNT'

export type ManagerAssignment = {
  /** 기수 필터가 이 값으로 걸린다 — 이름은 바뀔 수 있고 id는 안 바뀐다 */
  cohortId: string
  cohortName: string
  /** 여러 반을 맡을 수 있다 — 목업 `7기 · B반, D반` */
  classNames: string[]
}

export type ManagerQuery = {
  search?: string
  /**
   * **이 기수 소속만**(OP06-15). 화면이 늘 채워 보낸다 — 매니저 탭이 상단 기수 스위처를
   * 따르기 때문이다. 소속은 `Manager.cohortIds` 기준이라 담당 반이 없어도 걸린다.
   */
  cohortId?: string
  status?: ManagerStatus
  sort?: ManagerSort
}

export type ManagerPage = {
  items: Manager[]
  total: number
  counts: Record<ManagerStatus, number>
  /** 담당 없는 반 이름. 있으면 목록 위에 경고가 붙는다 — OP-01 `조치 필요`와 같은 신호 */
  unstaffedClasses: string[]
}

export type InviteManagerRequest = {
  email: string
  /**
   * 어느 기수 매니저로 초대하는가(OP06-15).
   *
   * **반이 아니라 기수다.** 가입 전에는 로그인을 못 해 반의 면담·독촉을 처리할 수 없으므로
   * 담당 반은 안 받지만(OP06-11), **기수 소속은 정할 수 있다** — 그래야 초대 대기 계정이
   * 그 기수 목록에 보이고, 가입을 마치면 그 안에서 반을 맡길 수 있다.
   *
   * **권한 선택은 없다** — 매니저는 한 종류이고, 무엇을 볼 수 있는지는 담당 반이 정한다.
   */
  cohortId: string
}

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
