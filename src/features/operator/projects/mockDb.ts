// ─────────────────────────────────────────────────────────────
// ⚠️ Mock 전용 데이터 — 백엔드 연동 시 이 파일을 통째로 삭제하세요.
// 실제로는 서버 DB의 projects · curricula · cohorts 테이블이 이 역할을 합니다.
// (auth의 mockDb.ts와 같은 방식 — 지울 것이 파일 경계로 보이게 둡니다)
// ─────────────────────────────────────────────────────────────
//
// 값은 목업 `docs/plan/v2/wireframe/operator/projects.html`에서 그대로 옮겼습니다.
// 숫자를 새로 지어내지 않습니다 — OP-01 파이프라인 · OP-04 현황이 **같은 미프 3차**를
// 읽으므로, 화면마다 목을 따로 만들면 같은 회차가 화면마다 다른 값을 갖게 됩니다.
import type { CohortScope, ConceptHistory, Curriculum, Project, ProjectStatusReport } from './types'

/**
 * 목업이 그려진 기준일. 실제 `new Date()`를 쓰면 값이 매일 달라져 목업과 대조할 때
 * 무엇이 맞는지 알 수 없습니다 — 그래서 **기준일만 고정하고 계산은 실제로** 합니다.
 *
 * 목업에서 역산해 나온 값입니다 — 미프 4차(07-21)가 `5일 남음`, 빅프(09-26)가
 * `72일 남음`이라 둘 다 07-16을 가리킵니다.
 */
export const MOCK_TODAY = '2026-07-16'

/*
  기수 기간 — 프로젝트 마감이 이 밖으로 나가지 않게 달력이 막는다(#64 ②).
  목업 기수 탭의 `7기 · 2026-03 ~ 09`를 날짜로 편 값이다.
*/
export const COHORT: CohortScope = {
  id: '7',
  name: '7기',
  classes: 10,
  trainees: 250,
  startAt: '2026-03-02',
  endAt: '2026-09-30',
}

export const CURRICULA: Curriculum[] = [
  {
    id: 'ai-llmops',
    registeredAt: '2026-06-28',
    name: 'AI_LLMOps',
    version: 'v2',
    teaches: [
      {
        id: 'hitl-flow',
        name: 'Supervisor 패턴의 HITL 실행 흐름',
        definition:
          'Supervisor가 HITL Trigger 함수로 개입 조건을 판정하고, Human은 APPROVE/REVISE/ABORT로 최종 의사결정을 수행한다.',
        page: 'p.53',
        section: 'HITL (p.48–60)',
      },
      {
        id: 'hitl-def',
        name: 'HITL 개념 정의',
        definition:
          'HITL은 LLM 시스템의 의사결정을 통제하기 위한 Control Layer로, 실행 결과를 검증·차단·수정한다.',
        page: 'p.48',
        section: 'HITL (p.48–60)',
      },
      {
        id: 'supervisor-role',
        name: 'Supervisor 패턴과 역할 분리 구조',
        definition:
          'Supervisor 패턴은 전체 흐름을 통제하는 중앙 조정자가 Planner, Executor, Critic Worker를 호출해 역할을 분리하는 아키텍처이다.',
        page: 'p.41',
        section: '역할 기반 설계 (p.37–46)',
      },
      {
        id: 'critic-role',
        name: 'Critic 역할',
        definition:
          'Critic은 실행 결과를 독립적으로 검토하여 정확성·일관성·정책 준수 여부를 평가하고, 필요 시 재실행을 요청한다.',
        page: 'p.40',
        section: '역할 기반 설계 (p.37–46)',
      },
      {
        id: 'snapshot',
        name: 'Snapshot 개념과 구성 요소',
        definition:
          '실행 중 특정 시점의 State를 저장해 이후 재개·디버깅에 쓰는 구조와 그 구성 요소를 다룬다.',
        page: 'p.63',
        section: '시점 관리 (p.62–75)',
      },
    ],
  },
  {
    id: 'streamlit',
    registeredAt: '2026-07-02',
    name: 'Streamlit 실습',
    version: 'v1',
    teaches: [
      {
        id: 'session-state',
        name: '세션 상태와 재실행',
        definition:
          '위젯을 조작하면 스크립트가 처음부터 다시 실행되며, 유지해야 할 값은 session_state에 둔다.',
        page: 'p.22',
        section: '세션 상태 (p.18–31)',
      },
    ],
  },
  {
    id: 'k8s',
    registeredAt: '2026-05-11',
    name: 'Kubernetes 기초',
    version: 'v1',
    teaches: [
      {
        id: 'k8s-service',
        name: 'Service와 셀렉터',
        definition:
          'Service는 레이블 셀렉터로 Pod 집합을 찾아 고정된 접근 지점을 제공하고, Pod가 교체돼도 주소가 유지된다.',
        page: 'p.31',
        section: '네트워킹 (p.28–40)',
      },
      {
        id: 'k8s-deployment',
        name: 'Deployment 롤링 업데이트',
        definition:
          'Deployment는 ReplicaSet을 단계적으로 교체해 무중단으로 새 버전을 배포하고, 실패 시 이전 상태로 되돌린다.',
        page: 'p.19',
        section: '워크로드 (p.12–27)',
      },
      {
        id: 'k8s-configmap',
        name: 'ConfigMap과 설정 분리',
        definition:
          '설정값을 이미지에서 떼어 ConfigMap으로 두면 같은 이미지를 환경마다 다른 값으로 실행할 수 있다.',
        page: 'p.44',
        section: '설정 (p.41–52)',
      },
    ],
  },
  /*
    **분석이 끝나지 않았거나 실패한 교안** — 항목이 0이라 프로젝트에 못 쓴다.
    생성 모달의 *"이 교안에서 가르친 항목이 아직 없습니다"* 빈 상태가 이 교안으로만
    보인다. 다른 교안에 항목을 채울 때 **이 픽스처를 같이 없애면 그 화면이 죽는다.**
  */
  { id: 'docker', registeredAt: '2026-07-30', name: 'Docker 기초', version: 'v1', teaches: [] },
]

/*
  `conceptCandidateCount`는 실제로는 서버가 세어서 내려주는 값입니다. 목에서도 손으로
  적지 않고 CURRICULA에서 계산합니다 — 손으로 적으면 교안을 고칠 때 여기가 안 따라옵니다.
*/
const candidates = (ids: string[]) =>
  ids.reduce((n, id) => n + (CURRICULA.find((c) => c.id === id)?.teaches.length ?? 0), 0)

/*
  **회차 사다리 — 최신일수록 덜 준비됐다.** 목이 상태를 하나씩 덮게 만든 배치다.
  화면의 빈 상태는 이 사다리로만 볼 수 있어서, 여기 없는 칸은 **렌더를 확인할 수 없다.**

    6차  PREP   교안 0 · 개념 0 · 일정 ✗   방금 만든 회차 — 아무것도 없다
    5차  PREP   교안 1 · 개념 0 · 일정 ✓   교안만 붙였다
    4차  READY  교안 1 · 개념 3 · 일정 ✓   **다 준비됐고 아직 아무도 안 냈다**
    빅프  READY  개념 해당 없음             본인 커밋 영역
    3차  RUNNING 전부 참                    제출·분석·응시가 도는 중
    2차  DONE   전부 참                     끝남
*/
export const PROJECTS: Project[] = [
  {
    id: 'mif-6',
    name: '미프 6차',
    kind: 'MINI',
    status: 'PREP',
    curriculumIds: [],
    concepts: [],
    conceptCandidateCount: candidates([]),
    requirements: [],
    startAt: null,
    dueAt: null,
  },
  {
    id: 'mif-5',
    name: '미프 5차',
    kind: 'MINI',
    status: 'PREP',
    curriculumIds: ['ai-llmops'],
    concepts: [],
    conceptCandidateCount: candidates(['ai-llmops']),
    requirements: ['좋아요 버튼', '댓글 작성', '정렬 기능'],
    startAt: '2026-08-03T09:00',
    dueAt: '2026-08-17T23:59',
  },
  {
    /*
      **`준비됨 · 제출 전`** — 현황 탭의 `아직`(점선) 빈 상태를 볼 수 있는 유일한 회차다.
      개념이 3건이라 "개념부터 정하세요"가 아니고, 제출이 0이라 표를 그릴 것도 없다.
      이 칸이 없으면 그 상태는 **코드에만 있고 아무도 못 본다.**
    */
    id: 'mif-4',
    name: '미프 4차',
    kind: 'MINI',
    status: 'READY',
    curriculumIds: ['ai-llmops'],
    concepts: [
      { id: 'hitl-def', name: 'HITL 개념 정의', curriculumId: 'ai-llmops' },
      {
        id: 'supervisor-role',
        name: 'Supervisor 패턴과 역할 분리 구조',
        curriculumId: 'ai-llmops',
      },
      { id: 'critic-role', name: 'Critic 역할', curriculumId: 'ai-llmops' },
    ],
    conceptCandidateCount: candidates(['ai-llmops']),
    requirements: ['좋아요 버튼', '댓글 작성'],
    startAt: '2026-07-07T09:00',
    dueAt: '2026-07-21T23:59',
  },
  {
    id: 'bigp',
    name: '빅프',
    kind: 'BIG',
    status: 'READY',
    curriculumIds: [],
    concepts: [],
    conceptCandidateCount: 0,
    requirements: [],
    startAt: '2026-08-01T09:00',
    dueAt: '2026-09-26T23:59',
    note: '총 3회 · 첫 동작 · +2주 · 마감',
  },
  {
    id: 'mif-3',
    name: '미프 3차',
    kind: 'MINI',
    status: 'RUNNING',
    curriculumIds: ['ai-llmops', 'streamlit'],
    // 정의서 §3 `구성` 스케치와 같은 셋 — 화면마다 다른 이름이 나오지 않게 교안 항목에서 그대로 온다
    concepts: [
      { id: 'hitl-flow', name: 'Supervisor 패턴의 HITL 실행 흐름', curriculumId: 'ai-llmops' },
      {
        id: 'supervisor-role',
        name: 'Supervisor 패턴과 역할 분리 구조',
        curriculumId: 'ai-llmops',
      },
      { id: 'snapshot', name: 'Snapshot 개념과 구성 요소', curriculumId: 'ai-llmops' },
    ],
    conceptCandidateCount: candidates(['ai-llmops', 'streamlit']),
    requirements: ['좋아요 버튼', '댓글 작성', '정렬 기능', '무한 스크롤'],
    startAt: '2026-06-30T09:00',
    dueAt: '2026-07-14T23:59',
  },
  {
    id: 'mif-1',
    name: '미프 1차',
    kind: 'MINI',
    status: 'DONE',
    curriculumIds: ['k8s'],
    concepts: [
      { id: 'k8s-service', name: 'Service와 셀렉터', curriculumId: 'k8s' },
      { id: 'k8s-deployment', name: 'Deployment 롤링 업데이트', curriculumId: 'k8s' },
      { id: 'k8s-configmap', name: 'ConfigMap과 설정 분리', curriculumId: 'k8s' },
    ],
    conceptCandidateCount: candidates(['k8s']),
    requirements: ['헬스체크 엔드포인트'],
    startAt: '2026-06-08T09:00',
    dueAt: '2026-06-19T23:59',
  },
  {
    id: 'mif-2',
    name: '미프 2차',
    kind: 'MINI',
    status: 'DONE',
    curriculumIds: ['k8s'],
    concepts: [
      { id: 'k8s-service', name: 'Service와 셀렉터', curriculumId: 'k8s' },
      { id: 'k8s-deployment', name: 'Deployment 롤링 업데이트', curriculumId: 'k8s' },
      { id: 'k8s-configmap', name: 'ConfigMap과 설정 분리', curriculumId: 'k8s' },
    ],
    conceptCandidateCount: candidates(['k8s']),
    requirements: ['Deployment 롤링 업데이트', 'ConfigMap 분리'],
    startAt: '2026-06-20T09:00',
    dueAt: '2026-07-04T23:59',
  },
]

/*
  검증 개념 후보에 붙는 지난 회차 이력(OP-04 개념 선택).
  **같은 교안이 붙었을 때만 나타난다** — 교안이 바뀌면 후보 자체가 달라진다.
*/
export const CONCEPT_HISTORY: ConceptHistory[] = [
  {
    teachId: 'supervisor-role',
    kind: 'GROUP_MISS',
    note: '미프 3차에서 집단 미달 — 7개 반에서 절반 이상 2단 이하',
  },
  { teachId: 'snapshot', kind: 'USED', note: '미프 3차에서 사용 · 평균 3.3단' },
  { teachId: 'session-state', kind: 'NO_MATCH', note: '미프 1차에서 코드 매칭 0 — 8팀 중 7팀' },
]

/*
  현황 탭 — 반별 파이프라인과 개념별 코드 매칭. 미프 3차 기준이다.

  **응시 분모가 제출이 아니라 분석 완료**인 것에 주의한다(응시 창이 분석 후 열린다).
  B반은 분석 실패 1건이 있어 24 제출 → 23 분석 → 20/23 응시다.
*/
export const STATUS_REPORT: ProjectStatusReport = {
  /*
    ⚠ **팀 수는 기획에 없다.** 250명을 5명씩 묶어 50팀으로 뒀다 — 팀 크기가 어디에도
    정의돼 있지 않아 프론트가 정한 값이다. 화면은 **팀 수만** 쓰므로(`50개 팀 중 31개`)
    크기가 정해지면 이 숫자만 바뀐다.
  */
  totalTeams: 50,
  /*
    **10반 250명** — 기수 스코프(`COHORT`)와 같은 수다. 목업은 4반만 그렸는데(`A · B · C …`),
    헤더가 `10반 250명`이라고 말하는 화면에 표가 4줄이면 나머지가 어디 갔는지 묻게 된다.

    **반마다 다른 상황을 덮는다** — 한 가지만 있으면 그 표현이 맞는지 확인할 수 없다.
  */
  classes: [
    // 정상 — 전원 제출·분석, 응시만 2명 남았다
    {
      className: 'A반',
      submitted: 25,
      total: 25,
      analyzed: 25,
      analysisFailed: 0,
      attended: 23,
      attendable: 25,
      manager: '박지현',
    },
    // 분석 실패 1건 — 그 학생은 응시 모집단에서 빠진다(24 제출 → 23 응시 가능)
    {
      className: 'B반',
      submitted: 24,
      total: 25,
      analyzed: 23,
      analysisFailed: 1,
      attended: 20,
      attendable: 23,
      manager: '이도윤',
    },
    {
      className: 'C반',
      submitted: 23,
      total: 25,
      analyzed: 23,
      analysisFailed: 0,
      attended: 19,
      attendable: 23,
      manager: '최상현',
    },
    // 완전 정상 — 전원 제출·분석·응시. 이 줄이 없으면 "원래 다 이런가" 싶어진다
    {
      className: 'D반',
      submitted: 25,
      total: 25,
      analyzed: 25,
      analysisFailed: 0,
      attended: 25,
      attendable: 25,
      manager: '김서연',
    },
    // 분석 실패 다수 — 3명이 응시 자체를 못 한다
    {
      className: 'E반',
      submitted: 25,
      total: 25,
      analyzed: 22,
      analysisFailed: 3,
      attended: 18,
      attendable: 22,
      manager: '정우진',
    },
    // 담당 매니저 없음 — 배정은 OP-06, 조치 알림은 OP-01 소관이라 여기서는 사실만 쓴다
    {
      className: 'F반',
      submitted: 22,
      total: 25,
      analyzed: 22,
      analysisFailed: 0,
      attended: 18,
      attendable: 22,
      manager: null,
    },
    // 응시가 크게 남았다 — 응시 창(분석 완료 + 24h)을 놓친 학생이 많은 반
    {
      className: 'G반',
      submitted: 18,
      total: 25,
      analyzed: 18,
      analysisFailed: 0,
      attended: 5,
      attendable: 18,
      manager: '한지민',
    },
    {
      className: 'H반',
      submitted: 25,
      total: 25,
      analyzed: 25,
      analysisFailed: 0,
      attended: 24,
      attendable: 25,
      manager: '오세훈',
    },
    // 미제출 다수 + 담당 없음 — 둘이 겹치는 반
    {
      className: 'I반',
      submitted: 20,
      total: 25,
      analyzed: 20,
      analysisFailed: 0,
      attended: 16,
      attendable: 20,
      manager: null,
    },
    {
      className: 'J반',
      submitted: 25,
      total: 25,
      analyzed: 24,
      analysisFailed: 1,
      attended: 22,
      attendable: 24,
      manager: '서지우',
    },
  ],
  /*
    **모집단은 분석 완료 수(227명)다** — 코드가 분석돼야 개념 매칭을 판정할 수 있다.

    이름은 `PROJECTS`의 개념 이름을 **그대로** 쓴다. 다르게 적으면 같은 회차가 탭마다
    다른 이름을 보여준다 — 실제로 구성 탭은 `Snapshot 개념과 구성 요소`, 현황은
    `시점 관리`였다(mock-first §2-4).

    **공백을 둘 둔다** — 하나만 있으면 경고가 여러 건일 때 화면이 어떻게 되는지 모른다.
  */
  matches: [
    {
      conceptId: 'hitl-flow',
      conceptName: 'Supervisor 패턴의 HITL 실행 흐름',
      matched: 224,
      total: 227,
      unmatchedTeams: 0,
    },
    {
      conceptId: 'supervisor-role',
      conceptName: 'Supervisor 패턴과 역할 분리 구조',
      matched: 138,
      total: 227,
      unmatchedTeams: 12,
    },
    {
      conceptId: 'snapshot',
      conceptName: 'Snapshot 개념과 구성 요소',
      matched: 84,
      total: 227,
      unmatchedTeams: 31,
    },
  ],
}

/*
  **제출 전** — `미프 4차`(준비됨)가 이 상태다. 개념 3건이 정해져 문항은 만들어졌는데
  아직 아무도 안 냈다.

  반 목록을 **비우지 않고 0으로** 둔다. 반 편성은 이미 끝났고 없는 것은 제출뿐이라,
  빈 배열로 두면 "반이 없는 것"과 구분되지 않는다(없음과 0은 다르다 — F3). 위 리포트에서
  파생시켜 **반 구성이 갈리지 않게** 한다 — 손으로 적으면 A반이 두 곳에서 달라진다.
*/
export const STATUS_REPORT_NOT_STARTED: ProjectStatusReport = {
  totalTeams: STATUS_REPORT.totalTeams,
  classes: STATUS_REPORT.classes.map((c) => ({
    ...c,
    submitted: 0,
    analyzed: 0,
    analysisFailed: 0,
    attended: 0,
    attendable: 0,
  })),
  // 문항은 만들어졌지만 낸 코드가 없으니 매칭할 대상이 없다
  matches: [],
}

/*
  **종료된 회차** — `미프 2차`. 교안이 Kubernetes라 매칭 결과도 **그 회차 개념**이다.

  회차마다 리포트를 가르는 이유: 하나만 두면 k8s로 돌린 회차에 AI_LLMOps 개념 이름이
  뜬다. 화면은 `프로젝트 개념`과 `매칭 결과`를 나란히 보여주므로 **둘이 어긋나면 바로
  보인다**(mock-first §2-4 — 같은 회차가 화면마다 다른 값을 갖지 않게).

  **공백이 하나다.** 위 `STATUS_REPORT`가 2건이라, 경고 문구가 단수·복수에서 어떻게
  갈리는지 이 회차로만 확인할 수 있다.
*/
export const STATUS_REPORT_DONE: ProjectStatusReport = {
  totalTeams: 50,
  classes: STATUS_REPORT.classes.map((c) => ({
    ...c,
    // 끝난 회차라 제출·분석·응시가 다 닫혔다 — 남은 미제출은 그대로 미제출로 끝났다
    analyzed: c.submitted,
    analysisFailed: 0,
    attended: c.submitted,
    attendable: c.submitted,
  })),
  matches: [
    {
      conceptId: 'k8s-service',
      conceptName: 'Service와 셀렉터',
      matched: 229,
      total: 232,
      unmatchedTeams: 0,
    },
    {
      conceptId: 'k8s-deployment',
      conceptName: 'Deployment 롤링 업데이트',
      matched: 231,
      total: 232,
      unmatchedTeams: 0,
    },
    {
      conceptId: 'k8s-configmap',
      conceptName: 'ConfigMap과 설정 분리',
      matched: 96,
      total: 232,
      unmatchedTeams: 27,
    },
  ],
}

/*
  **잘 굴러간 회차** — `미프 1차`. 공백이 하나도 없다.

  이 픽스처가 없으면 **현황 탭에 경고가 없는 화면을 볼 수 없다.** 실제로는 그게
  오퍼레이터의 평상시 화면인데, 목이 전부 경고를 달고 있으면 *"경고가 원래 늘 있는 것"*
  처럼 보이고 경고가 신호로 안 읽힌다(E1 — 안 줄어드는 배지는 벽지가 된다).
*/
export const STATUS_REPORT_CLEAN: ProjectStatusReport = {
  totalTeams: 50,
  classes: STATUS_REPORT.classes.map((c) => ({
    ...c,
    submitted: c.total,
    analyzed: c.total,
    analysisFailed: 0,
    attended: c.total,
    attendable: c.total,
  })),
  matches: [
    {
      conceptId: 'k8s-service',
      conceptName: 'Service와 셀렉터',
      matched: 244,
      total: 250,
      unmatchedTeams: 0,
    },
    {
      conceptId: 'k8s-deployment',
      conceptName: 'Deployment 롤링 업데이트',
      matched: 248,
      total: 250,
      unmatchedTeams: 0,
    },
    {
      conceptId: 'k8s-configmap',
      conceptName: 'ConfigMap과 설정 분리',
      matched: 239,
      total: 250,
      unmatchedTeams: 0,
    },
  ],
}

/*
  **회차별 현황.** 상태로 유추하지 않고 id로 명시한다 — `DONE이면 이 리포트` 식으로
  두면 종료 회차가 둘이 되는 순간 둘이 같은 값을 갖는다. 실제 서버는 회차마다 다른
  결과를 주므로 목도 그 모양이어야 한다.

  각 회차가 **서로 다른 상태를 하나씩** 맡는다 — 여기 없는 회차는 화면에서 확인할 수 없다.
*/
export const STATUS_BY_PROJECT: Record<string, ProjectStatusReport> = {
  'mif-4': STATUS_REPORT_NOT_STARTED, // 준비됨 · 제출 전
  'mif-3': STATUS_REPORT, // 진행 중 · 공백 2건
  'mif-2': STATUS_REPORT_DONE, // 종료 · 공백 1건
  'mif-1': STATUS_REPORT_CLEAN, // 종료 · 공백 없음(평상시)
}
