// ─────────────────────────────────────────────────────────────
// ⚠️ Mock 전용 데이터 — 백엔드 연동 시 이 파일을 통째로 삭제하세요.
// 실제로는 서버 DB의 projects · curricula · cohorts 테이블이 이 역할을 합니다.
// (auth의 mockDb.ts와 같은 방식 — 지울 것이 파일 경계로 보이게 둡니다)
// ─────────────────────────────────────────────────────────────
//
// 값은 목업 `docs/plan/v2/wireframe/operator/projects.html`에서 그대로 옮겼습니다.
// 숫자를 새로 지어내지 않습니다 — OP-01 파이프라인 · OP-04 현황이 **같은 미프 3차**를
// 읽으므로, 화면마다 목을 따로 만들면 같은 회차가 화면마다 다른 값을 갖게 됩니다.
import type { CohortScope, Curriculum, Project } from './types'

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
  // 분석이 끝나지 않았거나 실패한 교안 — 항목이 0이라 프로젝트에 못 쓴다
  { id: 'k8s', name: 'Kubernetes 기초', version: 'v1', teaches: [] },
]

/*
  `conceptCandidateCount`는 실제로는 서버가 세어서 내려주는 값입니다. 목에서도 손으로
  적지 않고 CURRICULA에서 계산합니다 — 손으로 적으면 교안을 고칠 때 여기가 안 따라옵니다.
*/
const candidates = (ids: string[]) =>
  ids.reduce((n, id) => n + (CURRICULA.find((c) => c.id === id)?.teaches.length ?? 0), 0)

export const PROJECTS: Project[] = [
  {
    id: 'mif-5',
    name: '미프 5차',
    kind: 'MINI',
    status: 'PREP',
    curriculumIds: [],
    concepts: [],
    conceptCandidateCount: candidates([]),
    startAt: null,
    dueAt: null,
  },
  {
    id: 'mif-4',
    name: '미프 4차',
    kind: 'MINI',
    status: 'PREP',
    curriculumIds: ['ai-llmops'],
    concepts: [],
    conceptCandidateCount: candidates(['ai-llmops']),
    startAt: '2026-07-07',
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
    startAt: '2026-08-01',
    dueAt: '2026-09-26T23:59',
    note: '총 3회 · 첫 동작 · +2주 · 마감',
  },
  {
    id: 'mif-3',
    name: '미프 3차',
    kind: 'MINI',
    status: 'RUNNING',
    curriculumIds: ['ai-llmops', 'streamlit'],
    concepts: [
      { id: 'hitl-trigger', name: 'HITL Trigger', curriculumId: 'ai-llmops' },
      { id: 'graph', name: 'Graph 구성', curriculumId: 'ai-llmops' },
      { id: 'state', name: 'State 관리', curriculumId: 'ai-llmops' },
    ],
    conceptCandidateCount: candidates(['ai-llmops', 'streamlit']),
    startAt: '2026-06-30',
    dueAt: '2026-07-14T23:59',
  },
  {
    id: 'mif-2',
    name: '미프 2차',
    kind: 'MINI',
    status: 'DONE',
    curriculumIds: ['k8s'],
    concepts: [
      { id: 'service', name: 'Service', curriculumId: 'k8s' },
      { id: 'deployment', name: 'Deployment', curriculumId: 'k8s' },
      { id: 'configmap', name: 'ConfigMap', curriculumId: 'k8s' },
    ],
    conceptCandidateCount: candidates(['k8s']),
    startAt: '2026-06-20',
    dueAt: '2026-07-04T23:59',
  },
]
