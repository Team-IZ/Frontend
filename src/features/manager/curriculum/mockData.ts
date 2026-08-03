/*
  MG-09 교안 목업 데이터. API 연동 없이 고정 배열로 화면을 검증한다.
  실 연동 시 GET /curricula?cohort= · GET /curricula/{id} 응답으로 대체된다.

  v1(SC-M12 · CUR-01~03)의 등록·재분석·주제 편집·검색·적용 프로젝트 필터 전부
  없다 — MG-09는 그 화면에서 "권한과 범위"만 뺀 것이 아니라 데이터 모델 자체가
  다르다(정의서 §4·§5). 유형/추출상태(4종)/주제지정 칩 대신 섹션·가르친 항목
  (정의문 포함)·쓰인 회차·검증 개념(★)을 쓴다.
*/

export type AnalysisStatus = 'DONE' | 'FAILED'

/** 회차 결과 상태 — "발행 완료"는 projects.html·project-detail.html과 같은 어휘 */
export type RoundResultStatus = 'PUBLISHED' | 'PRE_PUBLISH' | 'PLANNED'

export type CurriculumItem = {
  id: string
  name: string
  /** 페이지. 예: "p.48" */
  page: string
  /**
   * 정의문 — 교안 분석이 뽑은 문장. null이면 "정의문이 추출되지 않았습니다"를
   * 보여준다(빈칸 금지, §7) — isSummary 항목은 같은 null이라도 원인이 다르므로
   * 문구 뒤에 "섹션 요약 항목입니다"를 덧붙인다.
   */
  definition: string | null
  /** 섹션 끝의 요약 항목 — 정의문이 원래 없는 성격이라 별도 표시 */
  isSummary?: boolean
  /** 이 항목이 검증 개념(★)으로 쓰였다면 어느 회차 몇 번째인지 */
  verifiedAs?: { round: string; index: number }
}

export type CurriculumSection = {
  id: string
  name: string
  /** 페이지 범위. 예: "p.48–60" */
  pageRange: string
  items: CurriculumItem[]
}

export type UsedRound = {
  round: string
  /** 검증 개념 이름 목록. null = "검증 개념 미확정"(OP-04에서 아직 안 정함) */
  verifiedConcepts: string[] | null
  /** 담당 반 진행. null = "—"(아직 시작 전) */
  attendance: string | null
  resultStatus: RoundResultStatus
}

export type CurriculumRow = {
  id: string
  name: string
  version: string
  analysisStatus: AnalysisStatus
  /** 분석 실패면 null → 목록에서 "―" */
  sectionCount: number | null
  itemCount: number | null
  /** 목록 "쓰인 회차" 칸 표시용 */
  usedRoundLabels: string[]
}

export type CurriculumDetail = {
  registeredAt: string
  /** 분석 실패면 null */
  pageCount: number | null
  /** 분석 실패면 null — "상세는 열리되 섹션이 없다"(§7) */
  sections: CurriculumSection[] | null
  usedRounds: UsedRound[]
}

export const CURRICULA: CurriculumRow[] = [
  {
    id: 'cur-1',
    name: 'AI_LLMOps',
    version: 'v2',
    analysisStatus: 'DONE',
    sectionCount: 8,
    itemCount: 34,
    usedRoundLabels: ['미프 3차', '미프 4차'],
  },
  {
    id: 'cur-2',
    name: 'Streamlit 실습',
    version: 'v1',
    analysisStatus: 'DONE',
    sectionCount: 4,
    itemCount: 9,
    usedRoundLabels: ['미프 3차'],
  },
  {
    id: 'cur-3',
    name: 'Kubernetes 기초',
    version: 'v1',
    analysisStatus: 'FAILED',
    sectionCount: null,
    itemCount: null,
    usedRoundLabels: ['미프 2차'],
  },
]

export const CURRICULUM_DETAILS: Record<string, CurriculumDetail> = {
  'cur-1': {
    registeredAt: '07-02',
    pageCount: 168,
    sections: [
      {
        id: 's1',
        name: 'HITL (Human In The Loop)',
        pageRange: 'p.48–60',
        items: [
          {
            id: 'i1',
            name: 'HITL 개념 정의',
            page: 'p.48',
            definition:
              'HITL은 LLM 시스템의 의사결정을 통제하기 위한 Control Layer로, 실행 결과를 검증·차단·수정하며 사람을 시스템의 구성요소로 설계한다.',
          },
          {
            id: 'i2',
            name: 'HITL이 필요한 이유',
            page: 'p.49',
            definition:
              '무한 재시도로 인한 비용 증가, Tool/API 호출 비용 리스크, 정책 위반으로 인한 법적·보안 사고를 통제하기 위해 HITL이 필요하다.',
          },
          {
            id: 'i3',
            name: '개입 지점 설계',
            page: 'p.51',
            definition:
              '실행 전 승인, 실행 후 검토, 예외 발생 시 개입 세 가지 지점 중 무엇을 쓸지 비용과 위험으로 정한다.',
          },
          {
            id: 'i4',
            name: 'AgentState에 HITL 필드 추가',
            page: 'p.54',
            definition: '사람 결정과 다음 단계를 상태 객체에 넣어 노드 사이로 넘긴다.',
          },
          {
            id: 'i5',
            name: 'HITL Trigger 조건 함수',
            page: 'p.55',
            definition:
              '최대 반복 횟수와 거절 상태를 보고 사람 확인이 필요한지 판단한다. 조건이 참이면 그래프 실행을 멈추고 사용자 입력을 기다리는 노드로 넘긴다.',
            verifiedAs: { round: '미프 3차', index: 1 },
          },
          {
            id: 'i6',
            name: '중단과 재개',
            page: 'p.56',
            definition: '중단 지점을 저장하고 사람 입력이 들어오면 그 지점부터 이어서 실행한다.',
          },
          {
            id: 'i7',
            name: 'HITL Design Checklist와 사용자 부담 Trade-off',
            page: 'p.58',
            definition:
              '확인 지점이 많으면 안전하지만 사용자가 지치고, 적으면 빠르지만 잘못된 실행을 놓친다.',
          },
          {
            id: 'i8',
            name: '승인 UI 패턴',
            page: 'p.59',
            definition: '무엇을 승인하는지 보여주고 되돌릴 수 있게 만든다.',
          },
          {
            id: 'i9',
            name: 'HITL 요약',
            page: 'p.60',
            definition: null,
            isSummary: true,
          },
        ],
      },
      {
        id: 's2',
        name: '역할 기반 설계',
        pageRange: 'p.37–46',
        items: [
          {
            id: 'i10',
            name: '역할 분리의 필요',
            page: 'p.37',
            definition: '한 에이전트가 계획과 실행을 같이 하면 실패 원인을 가릴 수 없다.',
          },
          {
            id: 'i11',
            name: 'Supervisor 패턴',
            page: 'p.39',
            definition: '상위 에이전트가 하위 에이전트에 작업을 배분하고 결과를 모은다.',
          },
          {
            id: 'i12',
            name: 'Worker 정의',
            page: 'p.41',
            definition: '각 Worker는 한 가지 도구만 쓰고 자기 결과에만 책임진다.',
          },
          {
            id: 'i13',
            name: '역할 간 통신',
            page: 'p.43',
            definition: '상태 객체를 공유하되 쓰기 권한은 역할별로 나눈다.',
          },
          {
            id: 'i14',
            name: '역할 기반 설계 요약',
            page: 'p.46',
            definition: null,
            isSummary: true,
          },
        ],
      },
      {
        id: 's3',
        name: '시점 관리 (Snapshot)',
        pageRange: 'p.62–75',
        items: [
          {
            id: 'i15',
            name: 'Checkpoint 개념',
            page: 'p.63',
            definition: '그래프 실행 중간 상태를 저장해 특정 시점으로 되돌아갈 수 있게 한다.',
          },
          {
            id: 'i16',
            name: 'State 관리와 체크포인트',
            page: 'p.66',
            definition:
              'thread_id로 대화별 상태를 구분하고, 체크포인트마다 State 스냅샷을 저장해 재실행·롤백에 쓴다.',
            verifiedAs: { round: '미프 3차', index: 3 },
          },
          {
            id: 'i17',
            name: '저장소 선택',
            page: 'p.70',
            definition: '메모리·SQLite·Redis 중 운영 규모에 맞는 체크포인트 저장소를 고른다.',
          },
          {
            id: 'i18',
            name: '시점 관리 요약',
            page: 'p.75',
            definition: null,
            isSummary: true,
          },
        ],
      },
      {
        id: 's4',
        name: 'Agent 시스템 구축 필요 기술',
        pageRange: 'p.128–150',
        items: [
          {
            id: 'i19',
            name: 'Graph 구성 (StateGraph 정의)',
            page: 'p.131',
            definition:
              '노드를 함수로, 엣지를 노드 간 흐름으로 선언해 실행 순서를 명시적인 그래프로 그린다.',
            verifiedAs: { round: '미프 3차', index: 2 },
          },
          {
            id: 'i20',
            name: '조건부 엣지',
            page: 'p.138',
            definition: '이전 노드의 반환값으로 다음에 실행할 노드를 함수로 분기한다.',
          },
          {
            id: 'i21',
            name: '도구(Tool) 바인딩',
            page: 'p.144',
            definition:
              '함수 시그니처를 스키마로 노출해 모델이 어떤 도구를 언제 부를지 고르게 한다.',
          },
          {
            id: 'i22',
            name: 'Agent 시스템 구축 요약',
            page: 'p.150',
            definition: null,
            isSummary: true,
          },
        ],
      },
      {
        id: 's5',
        name: 'Agent 시스템 평가',
        pageRange: 'p.95–108',
        items: [
          {
            id: 'i23',
            name: '평가 지표 설계',
            page: 'p.97',
            definition: '정확도만이 아니라 도구 호출 성공률·응답 지연·비용을 함께 본다.',
          },
          {
            id: 'i24',
            name: 'LLM-as-a-Judge',
            page: 'p.102',
            definition: '별도 모델에 채점 기준을 주고 출력을 평가시켜 사람 평가를 보완한다.',
          },
          {
            id: 'i25',
            name: '회귀 테스트셋 구성',
            page: 'p.106',
            definition:
              '실패 사례를 모아 고정 테스트셋으로 만들어 변경마다 같은 기준으로 재검증한다.',
          },
        ],
      },
      {
        id: 's6',
        name: 'AI Agent 설계 — 면접관 예제',
        pageRange: 'p.21–35',
        items: [
          {
            id: 'i26',
            name: '면접관 에이전트 요구사항',
            page: 'p.22',
            definition: '질문 생성 · 답변 평가 · 후속 질문 결정을 각각 다른 노드로 분리한다.',
          },
          {
            id: 'i27',
            name: '대화 상태 설계',
            page: 'p.28',
            definition: null,
          },
          {
            id: 'i28',
            name: '평가 기준 프롬프트',
            page: 'p.33',
            definition: '채점 기준을 항목별로 나눠 프롬프트에 명시해야 평가가 흔들리지 않는다.',
          },
        ],
      },
      {
        id: 's7',
        name: 'Trace 실행 관측',
        pageRange: 'p.77–90',
        items: [
          {
            id: 'i29',
            name: 'Trace 개념',
            page: 'p.78',
            definition: '노드 실행 순서·입출력·소요 시간을 기록해 실행 경로를 재구성한다.',
          },
          {
            id: 'i30',
            name: 'Span과 계층 구조',
            page: 'p.83',
            definition: '한 실행 안의 하위 작업을 Span으로 나눠 어디서 시간이 걸렸는지 본다.',
          },
          {
            id: 'i31',
            name: '실패 지점 재현',
            page: 'p.88',
            definition: '실패한 Trace의 입력을 그대로 재생해 같은 오류가 재현되는지 확인한다.',
          },
        ],
      },
      {
        id: 's8',
        name: 'LLMOps 개념 이해',
        pageRange: 'p.7–10',
        items: [
          {
            id: 'i32',
            name: 'LLMOps 정의',
            page: 'p.7',
            definition: 'LLM 기반 서비스를 지속적으로 배포·모니터링·개선하는 운영 체계다.',
          },
          {
            id: 'i33',
            name: 'MLOps와의 차이',
            page: 'p.8',
            definition: '프롬프트·컨텍스트·평가 데이터셋 관리가 모델 재학습만큼 비중이 크다.',
          },
          {
            id: 'i34',
            name: 'LLMOps 개념 요약',
            page: 'p.10',
            definition: null,
            isSummary: true,
          },
        ],
      },
    ],
    usedRounds: [
      {
        round: '미프 3차',
        verifiedConcepts: ['HITL Trigger 조건 함수', 'Graph 구성', 'State 관리'],
        attendance: '응시 58/71',
        resultStatus: 'PRE_PUBLISH',
      },
      {
        round: '미프 4차',
        verifiedConcepts: null,
        attendance: null,
        resultStatus: 'PLANNED',
      },
    ],
  },

  'cur-2': {
    registeredAt: '06-19',
    pageCount: 46,
    sections: [
      {
        id: 's1',
        name: 'Streamlit 기초와 위젯',
        pageRange: 'p.1–10',
        items: [
          {
            id: 'i1',
            name: '위젯 기본 개념',
            page: 'p.2',
            definition:
              'st.button·st.slider 등은 값이 바뀔 때마다 스크립트를 처음부터 다시 실행시킨다.',
          },
          {
            id: 'i2',
            name: '레이아웃 구성',
            page: 'p.5',
            definition: 'st.columns·st.tabs로 화면을 나누고 st.sidebar로 입력을 분리한다.',
          },
          {
            id: 'i3',
            name: '세션 상태(session_state)',
            page: 'p.8',
            definition:
              '재실행 사이에도 값을 유지해야 하는 상태를 st.session_state 딕셔너리에 저장한다.',
            verifiedAs: { round: '미프 3차', index: 2 },
          },
        ],
      },
      {
        id: 's2',
        name: '캐싱과 성능',
        pageRange: 'p.11–16',
        items: [
          {
            id: 'i4',
            name: '@st.cache_data 개념',
            page: 'p.12',
            definition: '같은 인자로 부른 함수 결과를 저장해 데이터 로딩·전처리를 반복하지 않는다.',
          },
          {
            id: 'i5',
            name: '캐시 무효화 조건',
            page: 'p.14',
            definition: '함수 코드·인자·의존 파일이 바뀌면 캐시가 자동으로 무효화된다.',
            verifiedAs: { round: '미프 3차', index: 1 },
          },
        ],
      },
      {
        id: 's3',
        name: '배포와 secrets 관리',
        pageRange: 'p.17–20',
        items: [
          {
            id: 'i6',
            name: 'Streamlit Community Cloud 배포',
            page: 'p.18',
            definition: '레포를 연결하면 push마다 자동으로 재배포된다.',
          },
          {
            id: 'i7',
            name: 'secrets.toml',
            page: 'p.19',
            definition:
              'API 키 같은 비밀 값을 코드에 넣지 않고 별도 파일·대시보드 설정으로 분리한다.',
          },
        ],
      },
      {
        id: 's4',
        name: '컴포넌트 확장',
        pageRange: 'p.21–22',
        items: [
          {
            id: 'i8',
            name: 'st.form으로 입력 묶기',
            page: 'p.21',
            definition: '여러 입력을 한 번에 제출해 입력마다 재실행되는 것을 막는다.',
          },
          {
            id: 'i9',
            name: '컴포넌트 확장 요약',
            page: 'p.22',
            definition: null,
            isSummary: true,
          },
        ],
      },
    ],
    usedRounds: [
      {
        round: '미프 3차',
        verifiedConcepts: ['캐시 무효화 조건', '세션 상태(session_state)'],
        attendance: '응시 58/71',
        resultStatus: 'PRE_PUBLISH',
      },
    ],
  },

  // 분석 실패 — 섹션·항목 없음(§7). 회차 연결은 재분석 전(이전 버전)에 이미
  // 확정된 것이라 그대로 남아있다 — 분석 실패가 이 교안이 안 쓰였다는 뜻은 아니다.
  'cur-3': {
    registeredAt: '06-12',
    pageCount: null,
    sections: null,
    usedRounds: [
      {
        round: '미프 2차',
        verifiedConcepts: ['Pod 구성요소', 'Service·Ingress 설계', 'Deployment 전략'],
        attendance: '응시 71/71',
        resultStatus: 'PUBLISHED',
      },
    ],
  },
}
