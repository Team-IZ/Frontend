import type { ConceptReport, PublishedReport, ReportsData, RoundReport } from './types'

/** 스프레드로 변형을 만들 때 쓰는 좁은 타입 — 유니온을 퍼뜨리면 TS가 분기를 못 좁힌다 */
type Asked = Extract<ConceptReport, { asked: true }>

/*
  ⚠️ Mock 전용 데이터 — 백엔드 연동 시 이 파일을 통째로 삭제하세요.

  개념 이름·문답은 `trainee/session/script.ts`(TR-03)의 실제 시나리오에서 가져왔다 —
  같은 세션 결과를 두 화면이 각자 다른 말로 지어내면 연동 전부터 어긋난다.

  **도달 단계는 확정 예시 그대로다**(tr-03-session.md §2-3):
    A REST 설계  L3까지 통과 · L4 실패 → 3단  · FULL
    B 예외처리   L2까지 통과 · L3 실패 → 2단  · FULL      (2단이 합격선이다)
    C DTO 분리   L1까지 통과 · L2 실패 → 1단  · SUMMARY   ← 재시험 대상
  마감·발행일은 now + 오프셋(trainee/home 패턴과 동일).
*/

const DAY = 86_400_000

/** A — L3까지 통과, L4에서 막혔다. 합격이라 FULL */
const REST_CONCEPT: Asked = {
  asked: true,
  name: 'REST 설계',
  reachedLevel: 3,
  scope: 'FULL',
  said: '다른 방법이 있다는 것까지 이야기했어요. DELETE와 POST를 견주고 왜 지금 방식을 골랐는지 설명했습니다.',
  isRetryTarget: false,
  explanation: [
    '같은 삭제 요청이 두 번 도착하는 상황까지는 이야기가 닿지 않았어요. 첫 요청이 성공한 뒤 두 번째가 오면 이미 없는 회원을 지우려 하게 됩니다.',
  ],
  attempts: [
    {
      seq: 1,
      reachedLevel: 3,
      qa: [
        {
          questionLabel: '코드 이해',
          question: '이 컨트롤러가 받는 요청이 몇 가지이고 각각 무엇을 하나요?',
          answer:
            '조회·생성·삭제 세 가지입니다. 클래스에 /api/v1/members가 붙어 있어서 각각 GET /{id}, POST, POST /{id}/delete로 들어옵니다.',
        },
        {
          questionLabel: '설계 논리',
          question: '생성은 201, 조회와 삭제는 200을 돌려주고 있어요. 이유가 있나요?',
          answer:
            '새로 만들어진 자원이 있을 때만 201을 쓰는 것으로 알고 있어서 생성에만 CREATED를 줬습니다. 나머지는 돌려줄 새 자원이 없어 200입니다.',
        },
        {
          questionLabel: '대안 비교',
          question: '삭제를 DELETE /{id}로도 할 수 있어요. 왜 POST를 고르셨나요?',
          answer:
            '팀 컨벤션이 POST로 통일하는 것이어서 따랐습니다. DELETE를 쓰면 메서드만 보고도 의도를 알 수 있어서 프록시나 로그에서 구분하기 좋다는 차이는 있습니다.',
        },
      ],
    },
  ],
}

/** B — L2(설계 논리)까지. 2단이 합격선이라 FULL이다 */
const EXCEPTION_CONCEPT: Asked = {
  asked: true,
  name: '예외처리',
  reachedLevel: 2,
  scope: 'FULL',
  said: '왜 그렇게 만들었는지까지 설명했어요. 컨트롤러마다 두지 않고 한 곳에 모은 이유를 짚었습니다.',
  isRetryTarget: false,
  curriculumRef: { chapter: '5장', pages: '82~90쪽', title: '예외를 응답으로 바꾸기' },
  explanation: [
    'try-catch로 직접 잡는 방식과 견주는 데까지는 닿지 않았어요. 한 예외를 여러 컨트롤러가 낼 때 그 처리 코드가 몇 벌이 되는지가 갈리는 지점입니다.',
  ],
  attempts: [
    {
      seq: 1,
      reachedLevel: 2,
      qa: [
        {
          questionLabel: '코드 이해',
          question: '이 클래스는 무슨 일을 하나요? 두 메서드가 어떻게 다른가요?',
          answer:
            '전역 예외 처리기입니다. MemberNotFoundException이 올라오면 404로, 그 밖의 예외는 두 번째 메서드가 받아 500으로 내려줍니다.',
        },
        {
          questionLabel: '설계 논리',
          question: '예외 처리를 이 클래스 한 곳에 모은 이유가 있나요?',
          answer:
            '@RestControllerAdvice가 모든 컨트롤러에 적용돼서, 응답 모양을 바꿀 때 여기만 고치면 됩니다. 컨트롤러마다 두면 열 군데를 고쳐야 합니다.',
        },
        {
          questionLabel: '대안 비교',
          question: '컨트롤러 안에서 try-catch로 잡는 방법과 견주면 어떤 점이 다른가요?',
          answer: '잘 모르겠습니다. 둘 다 예외를 잡는 건 같은 것 같습니다.',
        },
      ],
    },
  ],
}

/** C — L1까지. 2단 미만이라 재시험 대상이고 SUMMARY다 */
const DTO_CONCEPT: Asked = {
  asked: true,
  name: 'DTO 분리',
  reachedLevel: 1,
  scope: 'SUMMARY',
  said: '이 코드가 무엇을 하는지는 설명했어요. 다만 엔티티를 그대로 내보내지 않은 이유는 확인되지 않았습니다.',
  isRetryTarget: true,
  curriculumRef: { chapter: '3장', pages: '40~52쪽', title: '엔티티와 응답 모델' },
  // SUMMARY라 explanation·attempts가 **아예 없다** — null이 아니라 안 온다.
}

function mif3(now: number): PublishedReport {
  return {
    id: 'mif-3',
    label: '미프 3차',
    status: 'PUBLISHED',
    publishedAt: new Date(now - DAY).toISOString(),
    curriculum: 'Spring Boot 기초',
    concepts: [REST_CONCEPT, EXCEPTION_CONCEPT, DTO_CONCEPT],
    retryState: 'PENDING',
    retryDueAt: new Date(now + 6 * DAY).toISOString(),
  }
}

/** 재시험을 마친 회차 — 같은 리포트 안에 처음·다시가 병기된다 */
function mif2(now: number): RoundReport {
  return {
    id: 'mif-2',
    label: '미프 2차',
    status: 'PUBLISHED',
    publishedAt: new Date(now - 10 * DAY).toISOString(),
    curriculum: 'Spring Boot 기초',
    retryState: 'DONE',
    retryCompletedAt: new Date(now - 6 * DAY).toISOString(),
    concepts: [
      {
        asked: true,
        name: 'Service 역할 분리',
        reachedLevel: 4,
        scope: 'FULL',
        said: '언제 깨지는지까지 이야기했어요. 트랜잭션 경계가 어디여야 하는지 조건을 짚었습니다.',
        isRetryTarget: false,
        attempts: [
          {
            seq: 1,
            reachedLevel: 4,
            qa: [
              {
                questionLabel: '코드 이해',
                question: '이 서비스가 하는 일을 순서대로 설명해 주세요.',
                answer:
                  '레포지토리에서 조회하고, 없으면 예외를 던지고, 있으면 응답 모델로 바꿔 돌려줍니다.',
              },
            ],
          },
        ],
      },
      {
        /*
          재시험으로 1단 → 3단이 됐다. **배지는 여전히 1단**이다 — 원점수가 정본이고
          올라간 것은 배지 아래 한 줄과 문답 병기로만 보인다.
          재시험을 마쳤으므로 scope가 FULL로 승격됐고 isRetryTarget은 false다.
        */
        asked: true,
        name: 'Repository 계층',
        reachedLevel: 1,
        scope: 'FULL',
        said: '이 코드가 무엇을 하는지는 설명했어요. 인터페이스로 둔 이유는 처음에 확인되지 않았습니다.',
        isRetryTarget: false,
        curriculumRef: { chapter: '4장', pages: '60~72쪽', title: '데이터 접근 계층' },
        explanation: [
          'JpaRepository를 상속한 인터페이스만 두면 구현체를 스프링이 만들어 줍니다. 교안 4장에서 그 이유와 한계를 함께 다룹니다.',
        ],
        attempts: [
          {
            seq: 1,
            reachedLevel: 1,
            qa: [
              {
                questionLabel: '코드 이해',
                question: '이 인터페이스는 무슨 일을 하나요?',
                answer: '회원을 DB에서 찾아오는 역할입니다.',
              },
              {
                questionLabel: '설계 논리',
                question: '구현 클래스가 없는데 어떻게 동작하나요?',
                answer: '잘 모르겠습니다.',
              },
            ],
          },
          {
            seq: 2,
            reachedLevel: 3,
            qa: [
              {
                questionLabel: '코드 이해',
                question: '이 인터페이스는 무슨 일을 하나요?',
                answer:
                  'JpaRepository를 상속해서 회원 조회·저장을 맡습니다. 메서드 이름만 정해두면 쿼리가 만들어집니다.',
              },
              {
                questionLabel: '설계 논리',
                question: '구현 클래스가 없는데 어떻게 동작하나요?',
                answer:
                  '스프링이 애플리케이션이 뜰 때 프록시 구현체를 만들어 주입해 줍니다. 그래서 우리가 직접 쓸 필요가 없습니다.',
              },
              {
                questionLabel: '대안 비교',
                question: '직접 구현체를 만드는 방법과 견주면 어떤가요?',
                answer:
                  '직접 만들면 쿼리를 마음대로 쓸 수 있지만 단순 CRUD까지 다 써야 합니다. 복잡한 쿼리만 따로 빼는 방법도 있습니다.',
              },
            ],
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
    curriculum: 'Spring Boot 기초',
    retryState: 'NONE',
    concepts: [
      {
        asked: true,
        name: '계층 구조',
        reachedLevel: 2,
        scope: 'FULL',
        said: '왜 그렇게 만들었는지까지 설명했어요.',
        isRetryTarget: false,
        curriculumRef: { chapter: '1장', pages: '12~20쪽', title: '컨트롤러와 서비스' },
        explanation: ['컨트롤러가 요청만 받고 로직을 서비스로 넘기면 테스트가 쉬워집니다.'],
        attempts: [
          {
            seq: 1,
            reachedLevel: 2,
            qa: [
              {
                questionLabel: '코드 이해',
                question: '계층을 이렇게 나눈 이유가 있나요?',
                answer: '각 단계를 따로 테스트하고 싶어서 나눴습니다.',
              },
            ],
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
    case 'unasked':
      // 개념 하나가 그 학생 코드에 없어 문항이 안 만들어졌다 — 3개 중 2개만 응시했다
      mif3Report = {
        ...mif3(now),
        concepts: [REST_CONCEPT, { asked: false, name: '예외처리' }, DTO_CONCEPT],
      }
      break
    case 'zero':
      // 0단 — L1조차 통과 못했다. `문항 없음`과 나란히 두면 차이가 보인다.
      // 서술도 0단에 맞게 새로 쓴다 — 스프레드로 단계만 바꾸면 "무엇을 하는지는
      // 설명했어요"라는 1단 문장이 0단 배지 밑에 남아 화면이 모순된 말을 한다.
      mif3Report = {
        ...mif3(now),
        concepts: [
          {
            asked: true,
            name: 'REST 설계',
            reachedLevel: 0,
            scope: 'SUMMARY',
            said: '이 코드가 무엇을 하는지부터 이야기가 닿지 않았어요. 어떤 요청을 받고 무엇을 돌려주는지 먼저 짚어 보면 좋겠습니다.',
            isRetryTarget: true,
            curriculumRef: { chapter: '2장', pages: '24~38쪽', title: '컨트롤러가 하는 일' },
          },
          { asked: false, name: '예외처리' },
          DTO_CONCEPT,
        ],
      }
      break
    case 'after':
      mif3Report = {
        ...mif3(now),
        retryState: 'DONE',
        retryCompletedAt: new Date(now - 60_000).toISOString(),
        // 재시험을 마쳐 C가 FULL로 승격됐다 — 해설이 열리고 문답이 두 벌이 된다
        concepts: [
          REST_CONCEPT,
          EXCEPTION_CONCEPT,
          {
            ...DTO_CONCEPT,
            scope: 'FULL',
            isRetryTarget: false,
            explanation: [
              '엔티티를 그대로 내보내면 DB 테이블 모양이 API 응답에 그대로 드러납니다. 컬럼을 하나 더하는 순간 응답이 같이 바뀌어요.',
            ],
            attempts: [
              {
                seq: 1,
                reachedLevel: 1,
                qa: [
                  {
                    questionLabel: '코드 이해',
                    question: 'findMember가 하는 일을 순서대로 설명해 주세요.',
                    answer: '회원을 찾아서 돌려줍니다.',
                  },
                  {
                    questionLabel: '설계 논리',
                    question: 'Member를 그대로 돌려주지 않고 바꿔서 내보내는 이유가 있나요?',
                    answer: '잘 모르겠습니다.',
                  },
                ],
              },
              {
                seq: 2,
                reachedLevel: 3,
                qa: [
                  {
                    questionLabel: '코드 이해',
                    question: 'findMember가 하는 일을 순서대로 설명해 주세요.',
                    answer:
                      '레포지토리에서 회원을 찾고, 없으면 예외를 던집니다. 있으면 MemberResponse로 바꿔서 돌려줍니다.',
                  },
                  {
                    questionLabel: '설계 논리',
                    question: 'Member를 그대로 돌려주지 않고 바꿔서 내보내는 이유가 있나요?',
                    answer:
                      '엔티티에는 비밀번호처럼 밖에 나가면 안 되는 필드가 있고, DB 구조가 그대로 API에 드러나기 때문입니다.',
                  },
                  {
                    questionLabel: '대안 비교',
                    question: '엔티티를 그대로 반환하는 방법과 견주면 어떤가요?',
                    answer:
                      '변환 코드를 안 써도 되니 편하지만, 컬럼을 추가하면 응답이 같이 바뀌어서 클라이언트가 깨질 수 있습니다.',
                  },
                ],
              },
            ],
          },
        ],
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
