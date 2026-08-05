import type { ConceptReport, PublishedReport, ReportsData, RoundReport } from './types'

/*
  ⚠️ Mock 전용 데이터 — 백엔드 연동 시 이 파일을 통째로 삭제하세요.

  개념 순서·문항 텍스트는 `trainee/session/script.ts`(TR-03)의 실제 시나리오에서
  가져왔다 — 같은 세션 결과를 두 화면이 각자 다른 말로 지어내면 연동 전부터 어긋난다
  (TR-04 재검증 발견 #4). 마감·발행일은 now + 오프셋(trainee/home 패턴과 동일).
*/

const DAY = 86_400_000

function mif3(now: number): PublishedReport {
  const concepts: ConceptReport[] = [
    {
      name: 'Graph 구성',
      level: 2,
      said: '왜 그렇게 만들었는지까지 설명했어요. 다른 방법이 있는지는 확인되지 않았습니다.',
      isRetryTarget: true,
      curriculumRef: { chapter: '2장', pages: '28~35쪽', title: '그래프 구성하기' },
      explain: [
        '조건부 분기 말고 Supervisor 구조로도 만들 수 있습니다. 교안 2장 뒷부분에서 둘을 견줍니다.',
      ],
      qa: [
        {
          questionLabel: '질문 1',
          question: '이 그래프는 노드를 어떤 순서로 연결하나요? 전체 흐름을 설명해 주세요.',
          answer: '이 그래프는 agent와 human 노드를 연결합니다.',
        },
        {
          questionLabel: '질문 2',
          question: 'conditional_edges에서 분기 조건은 무엇을 기준으로 정해지나요?',
          answer: 'should_trigger_hitl 함수가 True/False를 돌려주는 값으로 분기합니다.',
        },
      ],
    },
    {
      name: 'HITL Trigger 조건',
      level: 1,
      said: '이 함수가 무엇을 하는지는 설명했어요. 다만 교안에 있던 세 번째 조건을 왜 넣지 않았는지는 확인되지 않았습니다.',
      isRetryTarget: true,
      curriculumRef: { chapter: '3장', pages: '36~46쪽', title: '사람 확인이 필요한 순간' },
      // comparedReach 없음 — 이 회차는 retryState: 'PENDING'(다시 보기 전)이라 "다시
      // 봤을 때" 레벨이 아직 없다. comparedReach는 retryState: 'DONE'일 때만 존재한다
      // (types.ts 계약). mif2 쪽 예시가 DONE 케이스를 담당한다.
      explain: [
        '교안 3장에서는 사람이 확인해야 하는 경우를 세 가지로 나눕니다 — 재시도 상한, 거절 결정, 그리고 위험 키워드가 들어온 경우입니다.',
        '앞의 두 가지는 코드에 있었지만 세 번째는 없었어요. 이런 조건이 빠지면 위험한 요청이 사람 확인 없이 지나갑니다.',
      ],
      qa: [
        {
          questionLabel: '질문 1',
          question:
            '이 함수는 무슨 일을 하나요? 어떤 값이 들어오고, 어디에서 쓰이는지도 같이 이야기해 주세요.',
          answer:
            'state를 받아서 사람이 확인해야 하는 상황인지 True/False로 알려주는 함수입니다. 재시도가 3번을 넘거나 결정이 REJECTED면 True를 돌려줍니다.',
        },
        {
          questionLabel: '질문 2',
          question:
            '교안에서는 사람이 확인해야 하는 조건을 세 가지로 봤는데, 여기서는 두 가지만 보고 있어요. 왜 그렇게 하셨나요?',
          answer:
            'retry 횟수가 넘거나 REJECTED가 오면 사람이 봐야 한다고 생각해서 두 개만 넣었습니다.',
        },
        {
          questionLabel: '질문 2 · 다시 설명',
          question:
            '이 함수가 True를 돌려주는 경우를 먼저 짚어 보고, 교안에 있던 나머지 한 가지를 여기서는 왜 넣지 않았는지 이야기해 주세요.',
          answer: '세 번째 조건은 잘 기억이 안 납니다.',
        },
      ],
    },
    {
      name: 'State 관리',
      level: 4,
      said: '언제 문제가 되는지까지 이야기했어요. add_messages를 쓰지 않았을 때 어디가 깨지는지 조건을 짚었습니다.',
      isRetryTarget: false,
      qa: [
        {
          questionLabel: '질문 1',
          question: 'messages에 add_messages를 붙인 이유가 뭔가요?',
          answer: '그냥 리스트로 두면 노드마다 덮어써져서, 이어 붙이도록 하려고 썼습니다.',
        },
        {
          questionLabel: '질문 2',
          question: '이걸 쓰지 않았다면 어디에서 문제가 생겼을까요?',
          answer:
            'HITL 노드에서 사람 답을 받아 다시 agent로 돌아갈 때, 앞 대화가 사라져서 같은 질문을 반복했을 것 같습니다.',
        },
      ],
    },
  ]

  return {
    id: 'mif-3',
    label: '미프 3차',
    status: 'PUBLISHED',
    publishedAt: new Date(now - DAY).toISOString(),
    curriculum: 'AI_LLMOps',
    concepts,
    retryState: 'PENDING',
    retryDueAt: new Date(now + 6 * DAY).toISOString(),
  }
}

function mif2(now: number): RoundReport {
  return {
    id: 'mif-2',
    label: '미프 2차',
    status: 'PUBLISHED',
    publishedAt: new Date(now - 10 * DAY).toISOString(),
    curriculum: 'AI_LLMOps',
    retryState: 'DONE',
    retryCompletedAt: new Date(now - 6 * DAY).toISOString(),
    concepts: [
      {
        name: 'Service 역할 분리',
        level: 4,
        said: '다른 방법이 있다는 것까지 이야기했어요. NodePort와 Ingress를 견주고 왜 지금 방식을 골랐는지 설명했습니다.',
        isRetryTarget: false,
        qa: [
          {
            questionLabel: '질문 1',
            question: '이 Service는 왜 ClusterIP로 만들었나요?',
            answer: '외부에 직접 노출할 필요가 없고, Ingress가 앞에서 라우팅을 맡아서요.',
          },
        ],
      },
      {
        name: 'Deployment 구성',
        level: 4,
        said: '언제 문제가 되는지까지 이야기했어요. replica를 늘렸을 때 어디가 먼저 막히는지 짚었습니다.',
        isRetryTarget: true,
        curriculumRef: { chapter: '4장', pages: '50~58쪽', title: '배포 전략' },
        comparedReach: { before: 2, after: 4 },
        explain: [
          '교안에서는 replica 수를 늘리기 전에 리소스 한도를 먼저 정합니다. 한도가 없으면 노드 하나가 감당하지 못할 때 전체가 같이 죽습니다.',
        ],
        qa: [
          {
            questionLabel: '질문 1',
            question: 'replica를 3으로 둔 이유가 있나요?',
            answer: '하나가 죽어도 서비스가 이어지게 하려고 3으로 뒀습니다.',
          },
          {
            questionLabel: '질문 2',
            question: '리소스 한도 없이 replica만 늘리면 어디서 문제가 생길까요?',
            answer: '노드 하나에 여러 pod가 몰리면 메모리를 다 써서 전체가 같이 죽을 수 있습니다.',
          },
        ],
      },
    ],
  }
}

function mif1(now: number): RoundReport {
  return {
    id: 'mif-1',
    label: '미프 1차',
    status: 'PUBLISHED',
    publishedAt: new Date(now - 40 * DAY).toISOString(),
    curriculum: 'AI_LLMOps',
    retryState: 'NONE',
    concepts: [
      {
        name: 'LangGraph 기본 구조',
        level: 2,
        said: '왜 그렇게 만들었는지까지 설명했어요.',
        isRetryTarget: false,
        curriculumRef: { chapter: '1장', pages: '12~20쪽', title: '그래프와 노드' },
        explain: ['노드를 함수로 나누면 테스트가 쉬워집니다. 교안 1장에서 같은 이유로 나눕니다.'],
        qa: [
          {
            questionLabel: '질문 1',
            question: '노드를 이렇게 나눈 이유가 있나요?',
            answer: '각 단계를 따로 테스트하고 싶어서 함수로 나눴습니다.',
          },
        ],
      },
    ],
  }
}

/** @param previewStatus dev 전용 — 미프 3차 한 라운드만 다른 상태로 바꿔치기한다 */
export function buildReportsFixture(now: number, previewStatus?: string): ReportsData {
  let mif3Report: RoundReport = mif3(now)

  switch (previewStatus) {
    case 'pre':
      mif3Report = {
        id: 'mif-3',
        label: '미프 3차',
        status: 'PENDING_PUBLISH',
        publishAfter: new Date(now + DAY).toISOString(),
      }
      break
    case 'private':
      mif3Report = { id: 'mif-3', label: '미프 3차', status: 'PENDING_VISIBILITY' }
      break
    case 'missed':
      mif3Report = { id: 'mif-3', label: '미프 3차', status: 'NOT_ATTEMPTED' }
      break
    case 'void':
      mif3Report = { id: 'mif-3', label: '미프 3차', status: 'VOID_ATTEMPT' }
      break
    case 'stopped':
      mif3Report = { id: 'mif-3', label: '미프 3차', status: 'STOPPED' }
      break
    case 'after':
      mif3Report = {
        ...mif3(now),
        retryState: 'DONE',
        retryCompletedAt: new Date(now - 60_000).toISOString(),
      }
      break
  }

  const reports = [mif3Report, mif2(now), mif1(now)]
  return {
    rounds: reports.map((r) => ({
      id: r.id,
      label: r.label,
      hasPendingRetry: r.status === 'PUBLISHED' && r.retryState === 'PENDING',
    })),
    reportsById: Object.fromEntries(reports.map((r) => [r.id, r])),
  }
}

/** "리포트가 하나도 없음" — 회차 배열 자체가 없는 별도 프리뷰 */
export function buildEmptyFixture(): ReportsData {
  return { rounds: [], reportsById: {} }
}
