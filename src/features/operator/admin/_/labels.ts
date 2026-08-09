/*
  화면 표시용 한글 라벨.

  **계약(types.ts)과 갈라 둔 이유** — enum 값은 서버와 맞추는 것이고 라벨은 화면 것이다.
  한 파일에 두면 "서버가 한글을 내려주나?"가 헷갈리고, 문구를 고칠 때마다 계약 파일이 바뀐다.

  **한 곳에 모은 이유** — 같은 상태를 배지와 필터 드롭다운이 같이 쓴다. 각자 갖게 두면
  `초대 대기`를 고칠 때 한 곳만 바뀌고 같은 상태가 화면 안에서 두 이름으로 보인다.
*/
import type {
  AccountStatus,
  CohortStatus,
  CurriculumStatus,
  LinkedProjectStatus,
  RosterIssueReason,
} from './api/types'

/**
 * 기수 상태 — **서버가 셋을 준다**(`PLANNED`·`RUNNING`·`CLOSED`).
 *
 * 목일 때는 둘(진행·종료)이었다. 개강 전 기수를 진행 중으로 그리면 **아직 시작 안 한
 * 기수에 사람을 넣어도 되는지**가 화면에서 안 갈린다 — 반 편성을 고칠 수 있는 구간이
 * 바로 여기다(개강 후에는 잠근다).
 */
export const COHORT_STATUS_LABEL: Record<CohortStatus, string> = {
  PLANNED: '개강 전',
  RUNNING: '진행 중',
  CLOSED: '종료',
}

/**
 * 계정 상태 — **MG-05와 같은 라벨을 쓴다.**
 *
 * ⚠ **목업 둘이 어긋난다.** 이 화면의 목업(`operator/admin.html`)은 `초대됨`이라 쓰고,
 * 교육생 명부 목업(`manager/trainees.html`)과 MG-05 정의서는 `초대 대기`라 쓴다.
 * 같은 사람의 같은 상태이므로 **한 이름이어야 한다** — 오퍼레이터가 등록한 것과
 * 매니저가 보는 것이 다른 물건처럼 보이면 안 된다(OP-03 §3-2가 `검증 개념` 어휘를
 * 통일한 것과 같은 판단).
 *
 * MG-05 쪽을 골랐다. 이미 구현돼 있고(`features/manager/trainees`), 정의서 본문이
 * 세 번 그 말을 쓴다 — 목업 한 곳의 표기보다 근거가 두껍다. **기획이 정하면 여기만 바꾼다.**
 */
export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  ACTIVE: '활성',
  INVITED: '초대 대기',
  INACTIVE: '비활성',
}

/**
 * 매니저 계정 상태 — **교육생과 같은 `AccountStatus`인데 라벨이 하나 다르다.**
 *
 * 서버는 둘 다 `INVITED`·`ACTIVE`·`INACTIVE`를 쓴다. 그런데 교육생의 `INACTIVE`는
 * *중도 이탈*이고 매니저의 것은 *운영자가 막은 것*이라, 교육생은 `비활성`이고 매니저는
 * **`정지`** 다 — 목일 때 `SUSPENDED`라는 별도 값으로 갈라 두었던 그 차이가 라벨로 남는다.
 */
export const MANAGER_STATUS_LABEL: Record<AccountStatus, string> = {
  ACTIVE: '활성',
  INVITED: '초대 대기',
  INACTIVE: '정지',
}

export const CURRICULUM_STATUS_LABEL: Record<CurriculumStatus, string> = {
  DONE: '완료',
  ANALYZING: '분석 중',
  FAILED: '분석 실패',
}

export const LINKED_PROJECT_STATUS_LABEL: Record<LinkedProjectStatus, string> = {
  PREP: '준비 중',
  READY: '예정',
  RUNNING: '진행 중',
  DONE: '종료',
}

/**
 * 명단 오류 행 문구.
 *
 * **이유마다 고칠 곳이 다르다.** 형식은 그 줄을, 도메인은 주소 자체를, 파일 안 중복은
 * 둘 중 하나를 지워야 한다 — 하나로 합치면 화면이 무엇을 하라고 할지 정할 수 없다.
 */
export const ROSTER_ISSUE_LABEL: Record<RosterIssueReason, string> = {
  INVALID_FORMAT: '이메일 형식 오류',
  DOMAIN_NOT_ALLOWED: '기관 도메인 밖 주소',
  /*
    **`파일 안에서 중복`이 아니다.** 같은 판정을 직접 입력에서도 쓰는데 거기엔 파일이
    없어서, 두 줄에 같은 주소를 치면 `파일 안에서 중복`이라는 말이 나왔다 —
    `이 목록 안에서`는 CSV와 입력칸 양쪽에 다 맞는다.
  */
  DUPLICATE_IN_FILE: '같은 주소가 두 번 있음',
}
