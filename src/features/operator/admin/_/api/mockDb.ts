// ─────────────────────────────────────────────────────────────
// ⚠️ Mock 전용 데이터 — 백엔드 연동 시 이 파일을 통째로 삭제하세요.
// 실제로는 서버 DB의 orgs · cohorts · classes · trainees · managers · curricula ·
// usage 테이블이 이 역할을 합니다.
// (auth · projects의 mockDb.ts와 같은 방식 — 지울 것이 파일 경계로 보이게 둡니다)
// ─────────────────────────────────────────────────────────────
//
// 값은 목업 `docs/plan/v2/wireframe/operator/admin.html`에서 그대로 옮겼습니다.
// 숫자를 새로 지어내지 않습니다 — 7기의 `10반 250명`은 프로젝트 화면(OP-03)이 읽는
// 값과 같아야 하고(`features/operator/projects/mockDb.ts`의 COHORT), 반 인원 합이
// 명단 수와 어긋나면 배정 모드의 `미배정 3명`이 설명되지 않습니다.
//
// ▸ 목업끼리 어긋난 자리 셋은 아래 해당 위치에 `⚠ 목업 불일치`로 적어 뒀습니다.
import type { CurriculumDetail } from './types'

/**
 * 목업이 그려진 기준 시각. 실제 `new Date()`를 쓰면 값이 매일 달라져 목업과 대조할 때
 * 무엇이 맞는지 알 수 없습니다 — **기준 시각만 고정하고 계산은 실제로** 합니다.
 *
 * 날짜(`2026-07-16`)는 프로젝트 목의 `MOCK_TODAY`와 같은 날입니다. 시각은 매니저
 * 최근 접속이 `오늘 09:41` · `어제 18:02`로 읽히도록 그 뒤로 잡았습니다.
 */
export const MOCK_NOW = '2026-07-16T14:20'

// ── ④ 교안만 남았다 — 나머지 도메인의 목 데이터는 연동과 함께 지웠다

// ── ④ 교안 ──────────────────────────────────────────────────
/*
  ⚠ 목업 불일치 — 목록의 `섹션 12 · 항목 87`은 상세에 그려진 섹션 8개(항목 82)와
  맞지 않는다. **개수를 손으로 적지 않고 `sectionList`에서 센다**(아래 `withCounts`) —
  목록과 상세가 같은 원천을 읽어야 둘이 어긋나지 않는다(D1).

  ⚠ 프로젝트 목과 다른 자리 — `features/operator/projects/mockDb.ts`는 Kubernetes를
  `teaches: []`(= 교안 항목 0 케이스)로 두는데, 이 화면 목업은 `완료 · 미프 2차 사용`
  이다. 이 화면의 목업을 따랐다. 두 목이 하나가 되는 것은 API가 붙을 때다.

  항목의 이름·정의·쪽수는 목업과 프로젝트 목에서 그대로 옮겼다 — 리포트·면담 브리프가
  이 위치를 가리키므로 지어내면 안 되는 값이다(14번 6-3).
*/
const AI_LLMOPS: Omit<CurriculumDetail, 'sections' | 'teachItems'> = {
  id: 'ai-llmops',
  name: 'AI_LLMOps',
  version: 'v2',
  linkedProjectNames: ['미프 3차', '미프 4차'],
  status: 'DONE',
  fileName: 'ai_llmops_v2.pdf',
  pageCount: 168,
  registeredAt: '2026-06-28 10:14',
  failureReason: null,
  sectionList: [
    {
      id: 's-hitl',
      name: 'HITL (Human In The Loop)',
      pages: 'p.48–60',
      items: [
        {
          id: 'hitl-def',
          name: 'HITL 개념 정의',
          page: 'p.48',
          definition:
            'HITL은 LLM 시스템의 의사결정을 통제하기 위한 Control Layer로, 실행 결과를 검증·차단·수정하며 사람을 시스템의 구성요소로 설계한다.',
        },
        {
          id: 'hitl-why',
          name: 'HITL이 필요한 이유',
          page: 'p.49',
          definition:
            '무한 재시도로 인한 비용 증가, Tool/API 호출 비용 리스크, 정책 위반으로 인한 법적·보안 사고를 통제하기 위해 HITL이 필요하다.',
        },
        {
          id: 'hitl-cases',
          name: 'HITL 적용 사례 비교',
          page: 'p.50',
          definition:
            '콘텐츠 생성·고객 응대 사례에서 Trigger 조건에 따라 사람이 승인/수정/차단/직접 응답으로 개입하는 패턴을 보여준다.',
        },
        {
          id: 'hitl-position',
          name: 'HITL의 위치와 역할',
          page: 'p.51',
          definition:
            'HITL은 특정 단계가 아니라 Design–Run–Trace–Evaluate–Improve 전체 운영 사이클을 관통하는 정책이다.',
        },
        {
          id: 'hitl-supervisor',
          name: 'Supervisor 패턴에서 HITL 구현 원칙',
          page: 'p.52',
          definition:
            'HITL은 중앙에서 통제되어야 하므로 Supervisor가 흐름과 개입을 모두 통제하며, Worker는 HITL을 호출하지 않고 사람도 하나의 Node로 취급한다.',
        },
        {
          id: 'hitl-flow',
          name: 'Supervisor 패턴의 HITL 실행 흐름',
          page: 'p.53',
          definition:
            'Supervisor가 HITL Trigger 함수로 개입 조건을 판정하고, Human은 APPROVE/REVISE/ABORT로 최종 의사결정을 수행한다.',
        },
        {
          id: 'hitl-checklist',
          name: 'HITL Design Checklist과 사용자 부담 Trade-off',
          page: 'p.58',
          definition:
            '개입 조건(정량+정책), 개입 방식, 개입 이후 흐름을 정의해야 하며, 안전성 vs 사용성 Trade-off를 위해 3가지 방안을 고려한다.',
        },
      ],
    },
    {
      id: 's-roles',
      name: '역할 기반 설계',
      pages: 'p.37–46',
      items: [
        {
          id: 'critic-role',
          name: 'Critic 역할',
          page: 'p.40',
          definition:
            'Critic은 실행 결과를 독립적으로 검토하여 정확성·일관성·정책 준수 여부를 평가하고, 필요 시 재실행을 요청한다.',
        },
        {
          id: 'supervisor-role',
          name: 'Supervisor 패턴과 역할 분리 구조',
          page: 'p.41',
          definition:
            'Supervisor 패턴은 전체 흐름을 통제하는 중앙 조정자가 Planner, Executor, Critic Worker를 호출해 역할을 분리하는 아키텍처이다.',
        },
      ],
    },
    {
      id: 's-snapshot',
      name: '시점 관리 (Snapshot)',
      pages: 'p.62–75',
      items: [
        {
          id: 'snapshot',
          name: 'Snapshot 개념과 구성 요소',
          page: 'p.63',
          definition:
            '실행 중 특정 시점의 State를 저장해 이후 재개·디버깅에 쓰는 구조와 그 구성 요소를 다룬다.',
        },
      ],
    },
    {
      id: 's-agent-design',
      name: 'AI Agent 설계 — 면접관 예제',
      pages: 'p.21–35',
      items: [
        {
          id: 'graph',
          name: 'Graph 구성',
          page: 'p.24',
          definition: '노드와 엣지로 실행 순서를 정의하고 조건 분기와 종료 조건을 설계한다.',
        },
        {
          id: 'state',
          name: 'State 관리',
          page: 'p.28',
          definition: 'AgentState를 TypedDict로 정의하고 노드 사이에서 무엇을 넘길지 결정한다.',
        },
      ],
    },
    {
      id: 's-trace',
      name: 'Trace 실행 관측',
      pages: 'p.77–154',
      items: [
        {
          id: 'trace-span',
          name: 'Trace와 Span 구조',
          page: 'p.80',
          definition:
            '한 번의 실행을 Trace로 묶고 각 노드·도구 호출을 Span으로 남겨 지연과 실패 지점을 추적한다.',
        },
      ],
    },
    {
      id: 's-llmops',
      name: 'LLMOps 개념 이해',
      pages: 'p.7–10',
      items: [
        {
          id: 'llmops-def',
          name: 'LLMOps 정의',
          page: 'p.7',
          definition:
            'LLM 기반 시스템을 설계·운영·관측·개선하는 반복 사이클 전체를 다루는 운영 방법론이다.',
        },
      ],
    },
  ],
  linked: [
    {
      id: 'mif-3',
      name: '미프 3차',
      cohortName: '7기',
      conceptNames: ['HITL Trigger 조건', 'Supervisor 역할 분리', 'Snapshot 구성 요소'],
      status: 'RUNNING',
      attended: 198,
      attendable: 231,
    },
    {
      id: 'mif-4',
      name: '미프 4차',
      cohortName: '7기',
      conceptNames: [],
      status: 'READY',
      attended: null,
      attendable: null,
    },
  ],
}

const STREAMLIT: Omit<CurriculumDetail, 'sections' | 'teachItems'> = {
  id: 'streamlit',
  name: 'Streamlit 실습',
  version: 'v1',
  linkedProjectNames: ['미프 3차'],
  status: 'DONE',
  fileName: 'streamlit_v1.pdf',
  pageCount: 64,
  registeredAt: '2026-07-02 09:20',
  failureReason: null,
  sectionList: [
    {
      id: 's-session',
      name: '세션 상태',
      pages: 'p.18–31',
      items: [
        {
          id: 'session-state',
          name: '세션 상태와 재실행',
          page: 'p.22',
          definition:
            '위젯을 조작하면 스크립트가 처음부터 다시 실행되며, 유지해야 할 값은 session_state에 둔다.',
        },
      ],
    },
    {
      id: 's-layout',
      name: '레이아웃과 위젯',
      pages: 'p.8–17',
      items: [
        {
          id: 'layout-widget',
          name: '컬럼·컨테이너 배치',
          page: 'p.11',
          definition: 'columns와 container로 화면을 나누고 위젯을 배치하는 방법을 다룬다.',
        },
      ],
    },
  ],
  linked: [
    {
      id: 'mif-3',
      name: '미프 3차',
      cohortName: '7기',
      conceptNames: [],
      status: 'RUNNING',
      attended: 198,
      attendable: 231,
    },
  ],
}

const K8S: Omit<CurriculumDetail, 'sections' | 'teachItems'> = {
  id: 'k8s',
  name: 'Kubernetes 기초',
  version: 'v1',
  linkedProjectNames: ['미프 2차'],
  status: 'DONE',
  fileName: 'k8s_basic_v1.pdf',
  pageCount: 88,
  registeredAt: '2026-06-10 15:33',
  failureReason: null,
  sectionList: [
    {
      id: 's-workload',
      name: '워크로드',
      pages: 'p.20–39',
      items: [
        {
          id: 'deployment',
          name: 'Deployment',
          page: 'p.24',
          definition: 'ReplicaSet을 통해 파드 수를 유지하고 롤링 업데이트로 버전을 교체한다.',
        },
        {
          id: 'configmap',
          name: 'ConfigMap',
          page: 'p.33',
          definition: '설정값을 이미지와 분리해 두고 파드에 환경변수·볼륨으로 주입한다.',
        },
      ],
    },
    {
      id: 's-network',
      name: '네트워킹',
      pages: 'p.41–58',
      items: [
        {
          id: 'service',
          name: 'Service',
          page: 'p.45',
          definition: '셀렉터로 파드 묶음을 고정 주소 뒤에 두어 클러스터 안팎에서 접근하게 한다.',
        },
      ],
    },
  ],
  linked: [
    {
      id: 'mif-2',
      name: '미프 2차',
      cohortName: '7기',
      conceptNames: ['Service', 'Deployment', 'ConfigMap'],
      status: 'DONE',
      attended: null,
      attendable: null,
    },
  ],
}

/**
 * 분석 실패 교안. **가르친 항목이 없으므로 프로젝트에 연결할 수 없다**(OP-03 `교안에 항목 0`).
 * 실패 사유를 그대로 화면에 쓴다 — 무엇을 고쳐야 하는지가 거기 있다.
 */
const DATA_PIPELINE: Omit<CurriculumDetail, 'sections' | 'teachItems'> = {
  id: 'data-pipeline',
  name: '데이터 파이프라인',
  version: 'v1',
  linkedProjectNames: [],
  status: 'FAILED',
  fileName: 'data_pipeline_v1.pdf',
  pageCount: 92,
  registeredAt: '2026-07-26 14:02',
  failureReason:
    '파일에 암호가 걸려 있어 본문을 읽을 수 없습니다. 암호를 푼 파일로 다시 올려 주세요.',
  sectionList: [],
  linked: [],
}

/**
 * 섹션 수·항목 수를 **손으로 적지 않고 센다.**
 * 손으로 적으면 목을 고칠 때 목록만 낡고, 목록과 상세가 서로 다른 말을 하게 된다.
 * 분석이 안 끝난 교안은 `null`이다 — **0과 다르다**(F3).
 */
function withCounts(c: Omit<CurriculumDetail, 'sections' | 'teachItems'>): CurriculumDetail {
  const analyzed = c.status === 'DONE'
  return {
    ...c,
    sections: analyzed ? c.sectionList.length : null,
    teachItems: analyzed ? c.sectionList.reduce((n, s) => n + s.items.length, 0) : null,
  }
}

export const CURRICULA: CurriculumDetail[] = [AI_LLMOPS, STREAMLIT, K8S, DATA_PIPELINE].map(
  withCounts,
)

// ── ⑤ 비용 ── **연동 완료.** 목 데이터를 지웠다(CostTab이 실서버를 쓴다)
