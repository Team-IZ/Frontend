/*
  SA-01 기관 목록 목업 데이터 + mock API. v1 원본이 없어(features-v1/superadmin 자체가
  없음) 정의서(SA-01-org-list.md)·와이어프레임(superadmin/console.html#page-list)만
  보고 새로 짰다.

  API 격리는 auth 모듈(features/auth/authApi.ts)과 같은 관례 — 실 연동 시 각 함수의
  Mock 블록만 지우고 fetch로 바꾸면 된다. 화면 코드는 안 바뀐다.

  데이터 모델은 정의서 §4("기관명·상태·기수 수·교육생 수·이번 달 비용·오퍼레이터 배정
  여부")를 기준으로 하되, 표에 실제로 그려지는 오퍼레이터 이름·생성일은 "오퍼레이터
  배정 여부"의 자연스러운 확장으로 포함했다. "예산 초과" 배지·"정렬" 컨트롤은
  와이어프레임 실제 렌더(#page-list)에 없어 뺐다 — 와이어프레임이 정의서 ASCII보다
  구체적인 최종 계약이라 그쪽을 따랐다(둘이 갈릴 때의 판단, CLAUDE.md §3).

  통화도 같은 이유로 정의서 ASCII의 ₩ 대신 와이어프레임의 $ 표기를 따랐다(AI 비용은
  모델 단가 기준이라 달러가 자연스럽다 — SA-03도 같은 단위를 쓸 것으로 예상).
*/

export type OrgStatus = 'ACTIVE' | 'SUSPENDED'

export type Org = {
  id: string
  name: string
  domain: string
  status: OrgStatus
  cohortCount: number
  traineeCount: number
  /** 이번 달 AI 비용(USD) */
  monthlyAiCostUsd: number
  /** 오퍼레이터 이름 목록. 빈 배열 = "오퍼레이터 미배정"(이 목록의 핵심 신호) */
  operators: string[]
  /** YYYY-MM-DD */
  createdAt: string
}

export const ORGS: Org[] = [
  {
    id: 'org-1',
    name: '그린컴퍼니 부트캠프',
    domain: 'greencompany.kr',
    status: 'ACTIVE',
    cohortCount: 3,
    traineeCount: 148,
    monthlyAiCostUsd: 412,
    operators: ['박지현', '한도윤'],
    createdAt: '2026-03-02',
  },
  {
    id: 'org-2',
    name: '넥스트러너스',
    domain: 'nextlearners.io',
    status: 'ACTIVE',
    cohortCount: 2,
    traineeCount: 96,
    monthlyAiCostUsd: 268,
    operators: ['서민아'],
    createdAt: '2026-04-11',
  },
  {
    id: 'org-3',
    name: '코드스쿨 A트랙',
    domain: 'codeschool-a.ac.kr',
    status: 'ACTIVE',
    cohortCount: 5,
    traineeCount: 210,
    monthlyAiCostUsd: 690,
    operators: ['윤재호'],
    createdAt: '2026-02-20',
  },
  {
    id: 'org-4',
    name: '블루아카데미',
    domain: 'blueacademy.edu',
    status: 'SUSPENDED',
    cohortCount: 1,
    traineeCount: 40,
    monthlyAiCostUsd: 88,
    operators: ['정민호'],
    createdAt: '2026-01-15',
  },
  // 오퍼레이터 미배정 — 목록의 핵심 신호. 정의서 §6 "생성 실패는 아무것도 남기지
  // 않는다"의 대구로, 이건 생성이 *성공*한 정상 흐름(활성 · 오퍼레이터 미배정)이다.
  {
    id: 'org-5',
    name: '파이널랩',
    domain: 'finallab.dev',
    status: 'ACTIVE',
    cohortCount: 0,
    traineeCount: 0,
    monthlyAiCostUsd: 0,
    operators: [],
    createdAt: '2026-07-14',
  },
  {
    id: 'org-6',
    name: '코드스쿨 B트랙',
    domain: 'codeschool-b.ac.kr',
    status: 'ACTIVE',
    cohortCount: 4,
    traineeCount: 176,
    monthlyAiCostUsd: 520,
    operators: ['이수진'],
    createdAt: '2026-01-28',
  },
  {
    id: 'org-7',
    name: '데브캠프 서울',
    domain: 'devcamp-seoul.com',
    status: 'ACTIVE',
    cohortCount: 2,
    traineeCount: 84,
    monthlyAiCostUsd: 190,
    operators: ['최은비'],
    createdAt: '2026-05-06',
  },
  {
    id: 'org-8',
    name: '테크브릿지 아카데미',
    domain: 'techbridge.kr',
    status: 'ACTIVE',
    cohortCount: 1,
    traineeCount: 52,
    monthlyAiCostUsd: 121,
    operators: ['강태현'],
    createdAt: '2026-06-02',
  },
  {
    id: 'org-9',
    name: '넥스트코드 스쿨',
    domain: 'nextcode-school.io',
    status: 'ACTIVE',
    cohortCount: 3,
    traineeCount: 132,
    monthlyAiCostUsd: 305,
    operators: ['오하늘'],
    createdAt: '2026-03-19',
  },
  {
    id: 'org-10',
    name: '코딩부스트',
    domain: 'codingboost.kr',
    status: 'SUSPENDED',
    cohortCount: 1,
    traineeCount: 28,
    monthlyAiCostUsd: 0,
    operators: ['남기석'],
    createdAt: '2025-11-08',
  },
  {
    id: 'org-11',
    name: '프론티어 부트캠프',
    domain: 'frontier-bootcamp.com',
    status: 'ACTIVE',
    cohortCount: 2,
    traineeCount: 88,
    monthlyAiCostUsd: 214,
    operators: ['배수아'],
    createdAt: '2026-04-25',
  },
  {
    id: 'org-12',
    name: '알고리즘하우스',
    domain: 'algohouse.ac.kr',
    status: 'ACTIVE',
    cohortCount: 1,
    traineeCount: 46,
    monthlyAiCostUsd: 98,
    operators: ['조민준'],
    createdAt: '2026-06-30',
  },
  {
    id: 'org-13',
    name: '스택업 캠퍼스',
    domain: 'stackup-campus.kr',
    status: 'ACTIVE',
    cohortCount: 2,
    traineeCount: 74,
    monthlyAiCostUsd: 176,
    operators: ['임서연'],
    createdAt: '2026-05-14',
  },
  {
    id: 'org-14',
    name: '리부트 아카데미',
    domain: 'rebootacademy.kr',
    status: 'ACTIVE',
    cohortCount: 1,
    traineeCount: 30,
    monthlyAiCostUsd: 67,
    operators: ['한지민'],
    createdAt: '2026-07-01',
  },
]

/** 목록 상단 지표 카드 — 오퍼레이터 배정처럼 기관별로 추적하는 값이 아니라, v1
 * 콘솔 셸에서 그대로 넘어온 플랫폼 스냅샷이다(정의서 §4 밖의 운영 지표). */
export const PLATFORM_SNAPSHOT = {
  budgetUsd: 3300,
  costDeltaPct: 18,
  activeSessions: 37,
  storageGb: 82,
  storageDeltaPct: 6,
}

export type OrgApiErrorCode = 'ORG_NAME_TAKEN' | 'ORG_CREATE_FAILED'

export interface OrgApiError {
  code: OrgApiErrorCode
}

export interface CreateOrgInput {
  name: string
  domain: string
  retentionDays: number
}

// ───────── Mock 전용 (백엔드 연동 시 이 블록 삭제) ─────────
/** 데모용 트리거 — 이 문자열이 들어간 기관명은 항상 생성 실패로 응답한다(case3 확인용) */
const CREATE_FAIL_TRIGGER = '실패'
// ──────────────────────────────────────────────────────────

/** GET /admin/orgs/check-name — 입력 중 실시간 중복 확인(case1) */
export function checkOrgName(name: string): Promise<{ available: boolean }> {
  // ===== Mock 버전 (현재 활성) =====
  return new Promise((resolve) => {
    setTimeout(() => {
      // 대소문자만 다른 이름도 중복으로 본다 — "CodeSchool"과 "codeschool"이 둘 다
      // 목록에 있으면 사람이 구분해서 찾아야 하는 부담이 그대로 남는다.
      const taken = ORGS.some((o) => o.name.trim().toLowerCase() === name.trim().toLowerCase())
      resolve({ available: !taken })
    }, 400)
  })

  // ===== 실제 백엔드 버전 =====
  // const res = await fetch(`/admin/orgs/check-name?name=${encodeURIComponent(name)}`)
  // return res.json() // { available }
}

/** POST /admin/orgs — 기관 생성. 실패해도 아무것도 만들어지지 않는다(case3, 롤백) */
export function createOrg(input: CreateOrgInput): Promise<Org> {
  // ===== Mock 버전 (현재 활성) =====
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (input.name.includes(CREATE_FAIL_TRIGGER)) {
        reject({ code: 'ORG_CREATE_FAILED' } satisfies OrgApiError)
        return
      }
      const org: Org = {
        id: `org-${Date.now()}`,
        name: input.name,
        domain: input.domain,
        status: 'ACTIVE',
        cohortCount: 0,
        traineeCount: 0,
        monthlyAiCostUsd: 0,
        operators: [], // 생성 직후는 항상 오퍼레이터 미배정(정의서 §3 "확정 시 활성 + 오퍼레이터 미배정")
        createdAt: new Date().toISOString().slice(0, 10),
      }
      // 공유 목업 저장소(auth/mockDb.ts와 같은 관례: 함수가 직접 mutate)에도 반영한다.
      // 여기 안 넣으면 checkOrgName이 방금 만든 기관을 못 보고, 같은 이름(대소문자만
      // 다른 것 포함)을 또 만들 수 있게 된다 — 화면의 로컬 state(orgs)만 갱신하고
      // 이 배열을 그대로 두면 재현되던 버그다.
      ORGS.unshift(org)
      resolve(org)
    }, 600)
  })

  // ===== 실제 백엔드 버전 =====
  // const res = await fetch('/admin/orgs', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(input),
  // })
  // if (!res.ok) return Promise.reject(await res.json()) // { code }
  // return res.json()
}
