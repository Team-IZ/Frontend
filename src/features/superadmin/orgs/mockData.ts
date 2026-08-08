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

import { isEmailShape } from '@/lib/validation'

export type OrgStatus = 'ACTIVE' | 'SUSPENDED'

/** 소프트 삭제 요청 — 즉시 파기가 아니라 보존기간이 지나야 파기된다(SA-02 §6·§7).
 * `status`(정지)와 별개 축이라 Org에 직접 둔다 — 목록(SA-01)이 이 배지를 최우선으로
 * 보여줘야 하는데, 상세(ORG_DETAILS)까지 가서 조회하게 하면 목록 화면이 상세 모듈에
 * 의존하게 된다. */
export type OrgDeletion = {
  /** YYYY-MM-DD */
  requestedAt: string
  /** YYYY-MM-DD — requestedAt + 보존기간(설정 탭의 retentionDays) */
  purgeAt: string
}

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
  /** 삭제 요청됨(파기 전) — 없으면(undefined) 정상. requestOrgDeletion이 채운다 */
  deletion?: OrgDeletion
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

/** 상태 배지 우선순위 — 삭제 대기 > 오퍼레이터 미배정 > 활성/정지. SA-01 목록과
 * SA-02 상세 헤더가 같은 배지를 보여줘야 해서(같은 기관, 다른 화면) 한 곳에 둔다 —
 * 두 화면이 각자 판정하면 우선순위가 갈릴 위험이 있다. */
export function orgStatusBadge(org: Org): {
  variant: 'success' | 'warning' | 'neutral' | 'danger'
  label: string
} {
  if (org.deletion) return { variant: 'danger', label: `삭제 대기 · ${org.deletion.purgeAt} 파기` }
  if (org.operators.length === 0) return { variant: 'warning', label: '오퍼레이터 미배정' }
  return org.status === 'ACTIVE'
    ? { variant: 'success', label: '활성' }
    : { variant: 'neutral', label: '정지' }
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

/*
  ══════════════════════════════ SA-02 기관 상세 ══════════════════════════════

  정의서(SA-02-org-detail.md) · 와이어프레임(superadmin/console.html#page-overview
  이하 — overview·noop·operators·invite·mailfail·lastblock·usage·usagefail·
  settings·deleteconfirm)만 보고 짰다(v1 원본 없음, SA-01과 같은 사정).

  데모를 3개 기관에 몰아둔다 — 상태를 기관마다 흩어두면 리뷰가 "이 케이스는 어느
  기관에서 보나"를 매번 찾아야 한다:
  - org-1(그린컴퍼니 부트캠프) — 정상 케이스의 무대. 오퍼레이터 4명이 활성·초대중·
    메일실패는 아니고 정지·퇴사까지 이 화면에서 나오는 상태를 다 보여준다.
  - org-4(블루아카데미) — 오퍼레이터가 1명뿐 → "마지막 오퍼레이터 정지 차단"(N2)의
    무대. 와이어프레임 #lastblock도 이 기관 이름을 쓴다.
  - org-5(파이널랩) — SA-01부터 오퍼레이터 0명(§3 핵심 신호). 기수도 0개라 개요 탭
    상단 경고(#noop)가 여기서 뜬다.
  - org-3(코드스쿨 A트랙) — 사용량 집계가 **항상** 실패한다(#usagefail 데모). 매번
    같은 기관에서 재현돼야 "이 영역만 막힌다"를 리뷰가 검증하기 쉽다.

  나머지 10개 기관은 ORG_DETAILS에 없다 — getOrgDetail이 fallback을 그 자리에서
  만들어 최소 골격(SA-01의 operators 이름만 살리고, 기수·사용량은 traineeCount에서
  파생)으로 진입은 항상 되게 한다. "목록의 아무 행이나 눌러도 상세가 뜬다"가
  목적이라, 14개 기관 전부에 손으로 데이터를 채우는 비용을 들이지 않는다.
*/

export type CohortStatus = 'ONGOING' | 'ENDED'

export interface Cohort {
  id: string
  label: string
  status: CohortStatus
  classCount: number
  traineeCount: number
  /** "2026-06 ~ 09" 같은 표시용 문구 */
  period: string
}

export type OperatorStatus = 'ACTIVE' | 'INVITED' | 'MAIL_FAILED' | 'SUSPENDED'

export interface Operator {
  id: string
  /** null = 초대만 됐고 아직 가입 전(표에 "—") */
  name: string | null
  email: string
  status: OperatorStatus
  /** YYYY-MM-DD 또는 "방금" */
  invitedAt: string
  /** null = 로그인 기록 없음 */
  lastLoginAt: string | null
}

export interface ModelUsageRow {
  purpose: string
  tierLabel: string
  model: string
  calls: number
  inputTokens: number
  outputTokens: number
  costUsd: number
}

export interface StorageBreakdownRow {
  label: string
  gb: number
}

export interface OrgUsage {
  storageBreakdown: StorageBreakdownRow[]
  totalStorageGb: number
  activeTrainees: number
  completedSessions: number
  gradingRounds: number
  publishedReports: number
  monthBudgetUsd: number
  costDeltaPct: number
  models: ModelUsageRow[]
}

export type VisibilityDefault = '요약' | '상세'

export interface OrgSettings {
  budgetUsd: number
  tokenLimitM: number
  retentionDays: number
  defaultVisibility: VisibilityDefault
  githubOrgSync: boolean
  zipUpload: boolean
}

export interface OrgDetail {
  cohorts: Cohort[]
  operators: Operator[]
  settings: OrgSettings
}

/** 손으로 채운 3개 기관 — 위 주석의 데모 배정 그대로 */
const ORG_DETAILS: Record<string, OrgDetail> = {
  'org-1': {
    cohorts: [
      {
        id: 'c-8',
        label: '8기',
        status: 'ONGOING',
        classCount: 10,
        traineeCount: 52,
        period: '2026-06 ~ 09',
      },
      {
        id: 'c-7',
        label: '7기',
        status: 'ONGOING',
        classCount: 9,
        traineeCount: 48,
        period: '2026-05 ~ 08',
      },
      {
        id: 'c-6',
        label: '6기',
        status: 'ENDED',
        classCount: 9,
        traineeCount: 48,
        period: '2026-02 ~ 05',
      },
    ],
    operators: [
      {
        id: 'op-1',
        name: '박지현',
        email: 'jihyun@green.com',
        status: 'ACTIVE',
        invitedAt: '2026-03-02',
        lastLoginAt: '2026-07-28',
      },
      {
        id: 'op-2',
        name: '한도윤',
        email: 'doyun@green.com',
        status: 'ACTIVE',
        invitedAt: '2026-05-11',
        lastLoginAt: '2026-07-27',
      },
      // 지정은 됐지만 아직 가입 전 — mailfail과 구분: 여긴 메일이 정상 발송된 케이스
      {
        id: 'op-3',
        name: null,
        email: 'newop@green.com',
        status: 'INVITED',
        invitedAt: '2026-07-27',
        lastLoginAt: null,
      },
      // 정지·퇴사 — 재활성 가능한 상태를 보여주는 데모
      {
        id: 'op-4',
        name: '최상현',
        email: 'sanghyun@green.com',
        status: 'SUSPENDED',
        invitedAt: '2025-11-02',
        lastLoginAt: '2026-05-02',
      },
    ],
    settings: {
      budgetUsd: 600,
      tokenLimitM: 200,
      retentionDays: 180,
      defaultVisibility: '요약',
      githubOrgSync: true,
      zipUpload: true,
    },
  },
  'org-4': {
    cohorts: [
      {
        id: 'c-b1',
        label: '1기',
        status: 'ENDED',
        classCount: 2,
        traineeCount: 40,
        period: '2025-10 ~ 2026-01',
      },
    ],
    // 딱 1명 — "정지" 눌러도 LAST_OPERATOR로 막혀야 한다(N2, #lastblock)
    operators: [
      {
        id: 'op-5',
        name: '정민호',
        email: 'minho@blueac.io',
        status: 'ACTIVE',
        invitedAt: '2026-01-15',
        lastLoginAt: '2026-07-20',
      },
    ],
    settings: {
      budgetUsd: 200,
      tokenLimitM: 80,
      retentionDays: 180,
      defaultVisibility: '요약',
      githubOrgSync: false,
      zipUpload: true,
    },
  },
  'org-5': {
    // 오퍼레이터 0명 → 기수도 0개(#noop) — SA-01부터 이어지는 같은 기관
    cohorts: [],
    operators: [],
    settings: {
      budgetUsd: 400,
      tokenLimitM: 100,
      retentionDays: 180,
      defaultVisibility: '요약',
      githubOrgSync: false,
      zipUpload: true,
    },
  },
}

const DEFAULT_SETTINGS: OrgSettings = {
  budgetUsd: 400,
  tokenLimitM: 100,
  retentionDays: 180,
  defaultVisibility: '요약',
  githubOrgSync: false,
  zipUpload: true,
}

/** 손으로 안 채운 기관의 최소 골격 — SA-01의 operators 이름만 살리고 나머지는
 * traineeCount·cohortCount에서 파생한다. 실 데이터가 아니라 "진입이 죽지 않는다"가
 * 목적이므로 정밀도는 필요 없다. */
function fallbackDetail(org: Org): OrgDetail {
  const perCohort = org.cohortCount > 0 ? Math.round(org.traineeCount / org.cohortCount) : 0
  const cohorts: Cohort[] = Array.from({ length: org.cohortCount }, (_, i) => ({
    id: `${org.id}-c-${i + 1}`,
    label: `${i + 1}기`,
    status: i === org.cohortCount - 1 && org.status === 'ACTIVE' ? 'ONGOING' : 'ENDED',
    classCount: Math.max(1, Math.round(perCohort / 5)),
    traineeCount: perCohort,
    period: '—',
  }))
  const operators: Operator[] = org.operators.map((name, i) => ({
    id: `${org.id}-op-${i + 1}`,
    name,
    email: `operator${i + 1}@${org.domain}`,
    status: org.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
    invitedAt: org.createdAt,
    lastLoginAt: null,
  }))
  return { cohorts, operators, settings: { ...DEFAULT_SETTINGS } }
}

/** 화면·mock API가 실제로 읽고 쓰는 저장소. ORG_DETAILS(손으로 채운 3곳)를 시드로
 * 쓰고, 나머지는 처음 조회될 때 fallbackDetail로 채운다 — SA-01의 ORGS와 같은
 * 관례(함수가 직접 mutate)로, 초대·정지 같은 액션이 화면을 벗어났다 돌아와도
 * 유지된다. */
const detailStore: Record<string, OrgDetail> = {}

function getOrCreateDetail(orgId: string): OrgDetail {
  if (!detailStore[orgId]) {
    const org = ORGS.find((o) => o.id === orgId)
    detailStore[orgId] = ORG_DETAILS[orgId] ?? (org ? fallbackDetail(org) : { ...emptyDetail() })
  }
  return detailStore[orgId]
}

function emptyDetail(): OrgDetail {
  return { cohorts: [], operators: [], settings: { ...DEFAULT_SETTINGS } }
}

/** GET /admin/orgs/{id} — 기관 메타 + 상세. 기관이 없으면 null(잘못된 주소) */
export function getOrgDetail(orgId: string): { org: Org; detail: OrgDetail } | null {
  const org = ORGS.find((o) => o.id === orgId)
  if (!org) return null
  return { org, detail: getOrCreateDetail(orgId) }
}

// ───────────────────────── 오퍼레이터 초대·정지 ─────────────────────────

export type InviteFieldErrorCode = 'INVALID_EMAIL' | 'ALREADY_INVITED' | 'DOMAIN_NOT_ALLOWED'

/** 케이스 2·N1 — 제출 전 필드 검증(정의서 §3 "모달 필드 하단"). 서버 왕복이 필요
 * 없는 형식·중복·도메인 검사라 OrgCreateDialog의 실시간 중복 확인과 달리 동기로 둔다. */
export function validateOperatorEmail(
  orgDomain: string,
  existing: Operator[],
  email: string,
): InviteFieldErrorCode | null {
  const trimmed = email.trim()
  if (!isEmailShape(trimmed)) return 'INVALID_EMAIL'
  const domain = trimmed.slice(trimmed.indexOf('@') + 1).toLowerCase()
  if (domain !== orgDomain.toLowerCase()) return 'DOMAIN_NOT_ALLOWED'
  if (existing.some((o) => o.email.toLowerCase() === trimmed.toLowerCase()))
    return 'ALREADY_INVITED'
  return null
}

// ===== Mock 전용 (백엔드 연동 시 이 블록 삭제) =====
/** 로컬파트에 이 문자열이 있으면 "지정됐지만 메일이 안 나감"으로 응답한다(케이스
 * 4·5 합침 — 정의서 §6 "서버 사정이 다를 뿐 사용자가 할 일은 재발송 하나"). 이메일
 * *형식*은 여전히 유효해야 하니 로컬파트에 섞는다(도메인에 넣으면 검증부터 막힌다). */
const INVITE_MAIL_FAIL_TRIGGER = 'fail'
// ====================================================

/** POST /admin/orgs/{id}/operators — 초대. 메일 실패해도 계정 자리는 남는다(§6). */
export function inviteOperator(orgId: string, email: string): Promise<Operator> {
  // ===== Mock 버전 (현재 활성) =====
  return new Promise((resolve) => {
    setTimeout(() => {
      const detail = getOrCreateDetail(orgId)
      const trimmed = email.trim()
      const mailFailed = trimmed.toLowerCase().split('@')[0]?.includes(INVITE_MAIL_FAIL_TRIGGER)
      const operator: Operator = {
        id: `op-${Date.now()}`,
        name: null,
        email: trimmed,
        status: mailFailed ? 'MAIL_FAILED' : 'INVITED',
        invitedAt: '방금',
        lastLoginAt: null,
      }
      detail.operators = [operator, ...detail.operators]
      syncOrgOperatorNames(orgId) // 초대 자체는 ACTIVE가 아니라 목록엔 안 잡힌다 —
      // 그래도 다른 액션과 같은 자리에서 항상 불러 "언제 부르는지"를 고민 안 하게 한다.
      resolve(operator)
    }, 500)
  })

  // ===== 실제 백엔드 버전 =====
  // const res = await fetch(`/admin/orgs/${orgId}/operators`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email }),
  // })
  // return res.json()
}

/** POST /admin/orgs/{id}/operators/{opId}/resend — 재발송. 자리를 지우지 않고
 * 상태만 되돌린다(§6). */
export function resendInvite(orgId: string, operatorId: string): Promise<Operator> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const detail = getOrCreateDetail(orgId)
      const op = detail.operators.find((o) => o.id === operatorId)
      if (!op) {
        reject(new Error('operator not found'))
        return
      }
      op.status = 'INVITED'
      op.invitedAt = '방금'
      resolve(op)
    }, 500)
  })
}

/** DELETE /admin/orgs/{id}/operators/{opId} — 아직 가입 전인 초대 자리 취소.
 * 가입 완료된 계정(활성·정지)엔 쓰지 않는다 — 그건 정지/재활성이 맡는다. */
export function cancelInvite(orgId: string, operatorId: string): void {
  const detail = getOrCreateDetail(orgId)
  detail.operators = detail.operators.filter((o) => o.id !== operatorId)
  syncOrgOperatorNames(orgId)
}

/** SA-01 `Org.operators`(이름 배열)를 SA-02 `OrgDetail.operators`(상세 레코드)의
 * 활성 인원으로 다시 맞춘다. 두 필드가 서로 다른 화면(SA-01 목록·SA-02 상세)의
 * 서로 다른 저장소에 있어서, 상세에서 초대·정지·재활성을 해도 자동으로는 안
 * 맞춰진다 — 안 부르면 SA-01 목록의 "오퍼레이터 미배정" 배지·오퍼레이터 이름이
 * 상세에서 방금 정지·재활성한 것과 안 맞게 뒤쳐진다. 초대(INVITED)는 아직
 * 로그인한 적 없는 사람이라 여기 안 들어간다(§6, suspendOperator 주석과 같은 이유). */
function syncOrgOperatorNames(orgId: string): void {
  const org = ORGS.find((o) => o.id === orgId)
  if (!org) return
  const detail = getOrCreateDetail(orgId)
  org.operators = detail.operators
    .filter((o) => o.status === 'ACTIVE')
    .map((o) => o.name)
    .filter((n): n is string => Boolean(n))
}

export const LAST_OPERATOR_ERROR = 'LAST_OPERATOR' as const

/** PATCH /admin/orgs/{id}/operators/{opId} — 정지. 활성(ACTIVE) 오퍼레이터가 이 한
 * 명뿐이면 막는다(N2, §6 "고아 기관 방지"). **초대중(INVITED)·메일발송실패는 세지
 * 않는다** — 아직 로그인한 적 없는 계정이라 그 초대가 실제로 받아들여질지
 * 보장이 안 된다(메일이 스팸함에 묻히거나, 받는 사람이 그냥 무시할 수도 있다).
 * 받지도 않은 초대를 "커버"로 치고 마지막 활성 계정을 정지시키면, 그 초대가
 * 영영 안 열릴 경우 기관이 그대로 고아가 된다 — 정지는 그 사람이 실제로 들어와서
 * ACTIVE가 된 뒤에만 풀린다. */
export function suspendOperator(
  orgId: string,
  operatorId: string,
): { ok: true } | { ok: false; code: typeof LAST_OPERATOR_ERROR } {
  const detail = getOrCreateDetail(orgId)
  const target = detail.operators.find((o) => o.id === operatorId)
  if (!target) return { ok: false, code: LAST_OPERATOR_ERROR }
  const activeCount = detail.operators.filter((o) => o.status === 'ACTIVE').length
  if (target.status === 'ACTIVE' && activeCount <= 1) {
    return { ok: false, code: LAST_OPERATOR_ERROR }
  }
  target.status = 'SUSPENDED'
  syncOrgOperatorNames(orgId)
  return { ok: true }
}

/** PATCH /admin/orgs/{id}/operators/{opId} — 재활성. 마지막 1인 제약이 없다(정지에만 있다). */
export function reactivateOperator(orgId: string, operatorId: string): void {
  const detail = getOrCreateDetail(orgId)
  const op = detail.operators.find((o) => o.id === operatorId)
  if (op) op.status = 'ACTIVE'
  syncOrgOperatorNames(orgId)
}

// ───────────────────────── 사용량 · 비용 ─────────────────────────

export type UsageApiErrorCode = 'USAGE_UNAVAILABLE'

export interface UsageApiError {
  code: UsageApiErrorCode
}

/** 손으로 채운 사용량 — org-1만. 합계($412 = 286+104+22)가 SA-01 목록의
 * monthlyAiCostUsd와 맞아야 한다(같은 기관을 두 화면에서 본다). */
const USAGE_BY_ORG: Record<string, OrgUsage> = {
  'org-1': {
    storageBreakdown: [
      { label: '코드 제출물 (레포·ZIP)', gb: 4.8 },
      { label: '문답 원문', gb: 2.1 },
      { label: '채점 근거 (evidence)', gb: 1.6 },
      { label: '리포트 · 내보내기 PDF', gb: 0.9 },
    ],
    totalStorageGb: 9.4,
    activeTrainees: 148,
    completedSessions: 612,
    gradingRounds: 1840,
    publishedReports: 96,
    monthBudgetUsd: 600,
    costDeltaPct: 12,
    models: [
      {
        purpose: '채점',
        tierLabel: '플랫폼 고정',
        model: 'claude-opus-5',
        calls: 3120,
        inputTokens: 18_400_000,
        outputTokens: 2_100_000,
        costUsd: 286,
      },
      {
        purpose: '질문 생성',
        tierLabel: '균형 티어',
        model: 'claude-sonnet-5',
        calls: 1540,
        inputTokens: 9_200_000,
        outputTokens: 3_400_000,
        costUsd: 104,
      },
      {
        purpose: '요약',
        tierLabel: '비용 우선 티어',
        model: 'claude-haiku-4-5',
        calls: 420,
        inputTokens: 2_100_000,
        outputTokens: 600_000,
        costUsd: 22,
      },
    ],
  },
}

/** org-1 예시의 항목별 비중 — 저장량 4종·모델 3종. 손으로 안 채운 13개 기관도
 * "저장량 구성이 여러 막대로 어떻게 쪼개지는지", "모델별 비용 표가 실제로 어떻게
 * 채워지는지"를 바로 볼 수 있어야 한다(막대 1개·행 1개짜리 자리표시로는 이 탭을
 * 평가할 수 없다). 항목 이름(코드 제출물·문답 원문 등, 채점·질문 생성·요약)은
 * 실제 데이터 스키마이지 org-1만의 특징이 아니라서 그대로 재사용하고, org마다
 * 다른 건 규모(비중을 그 기관의 storageGb·monthlyAiCostUsd에 곱한 값)뿐이다. */
const STORAGE_SHARE = [
  { label: '코드 제출물 (레포·ZIP)', share: 4.8 / 9.4 },
  { label: '문답 원문', share: 2.1 / 9.4 },
  { label: '채점 근거 (evidence)', share: 1.6 / 9.4 },
  { label: '리포트 · 내보내기 PDF', share: 0.9 / 9.4 },
] as const

const MODEL_SHARE = [
  {
    purpose: '채점',
    tierLabel: '플랫폼 고정',
    model: 'claude-opus-5',
    costShare: 286 / 412,
    callShare: 3120 / 5080,
    inputShare: 18_400_000 / 29_700_000,
    outputShare: 2_100_000 / 6_100_000,
  },
  {
    purpose: '질문 생성',
    tierLabel: '균형 티어',
    model: 'claude-sonnet-5',
    costShare: 104 / 412,
    callShare: 1540 / 5080,
    inputShare: 9_200_000 / 29_700_000,
    outputShare: 3_400_000 / 6_100_000,
  },
  {
    purpose: '요약',
    tierLabel: '비용 우선 티어',
    model: 'claude-haiku-4-5',
    costShare: 22 / 412,
    callShare: 420 / 5080,
    inputShare: 2_100_000 / 29_700_000,
    outputShare: 600_000 / 6_100_000,
  },
] as const

/** 손으로 안 채운 기관의 사용량 — org-1 비중을 이 기관의 규모로 스케일한다.
 * 비용 합계는 마지막 행에 나머지를 몰아서 org.monthlyAiCostUsd와 정확히
 * 맞춘다(표 합계 행과 상단 요약 숫자가 반올림 때문에 어긋나면 안 된다). */
function fallbackUsage(org: Org): OrgUsage {
  const storageGb = Math.round(org.traineeCount * 0.0635 * 10) / 10
  const storageBreakdown: StorageBreakdownRow[] =
    storageGb > 0
      ? STORAGE_SHARE.map((row) => ({
          label: row.label,
          gb: Math.round(storageGb * row.share * 10) / 10,
        }))
      : []

  const totalCalls = org.monthlyAiCostUsd * (5080 / 412)
  const totalInputTokens = org.monthlyAiCostUsd * (29_700_000 / 412)
  const totalOutputTokens = org.monthlyAiCostUsd * (6_100_000 / 412)
  let costRemaining = org.monthlyAiCostUsd
  const models: ModelUsageRow[] =
    org.monthlyAiCostUsd > 0
      ? MODEL_SHARE.map((row, i) => {
          const isLast = i === MODEL_SHARE.length - 1
          const costUsd = isLast ? costRemaining : Math.round(org.monthlyAiCostUsd * row.costShare)
          costRemaining -= costUsd
          return {
            purpose: row.purpose,
            tierLabel: row.tierLabel,
            model: row.model,
            calls: Math.round(totalCalls * row.callShare),
            inputTokens: Math.round(totalInputTokens * row.inputShare),
            outputTokens: Math.round(totalOutputTokens * row.outputShare),
            costUsd,
          }
        })
      : []

  return {
    storageBreakdown,
    totalStorageGb: storageGb,
    activeTrainees: Math.round(org.traineeCount * 0.04),
    completedSessions: org.traineeCount * 2,
    gradingRounds: org.traineeCount * 6,
    publishedReports: Math.round(org.traineeCount * 0.3),
    monthBudgetUsd: getOrCreateDetail(org.id).settings.budgetUsd,
    costDeltaPct: org.monthlyAiCostUsd > 0 ? 12 : 0,
    models,
  }
}

/** 이 기관은 사용량 조회가 **항상** 실패한다(#usagefail 고정 데모 — 위 파일
 * 머리말 참고). 재조회를 눌러도 다시 실패해야 "이 영역만 막힌다"(§6)가 매번
 * 같은 모습으로 재현된다. */
const USAGE_ALWAYS_FAIL_ORG_ID = 'org-3'

// ───────────────────────── 사용량 · 기간 ─────────────────────────

/*
  와이어프레임(#page-usage `.filter`)에 "기간 ▾" 셀렉트가 있지만 구현이 빠져
  있었다. 무엇을 단위로 나눌지 판단: 이 화면의 1급 지표("이번 달 AI 비용")와
  설정 탭의 "AI 월 예산 상한"이 전부 **달** 단위 계약값이고, 정의서 §4 데이터
  목록도 "모델별 호출·토큰·단가 · 월 추이"라고 못 박아 월 단위임을 명시한다 —
  그래서 기간 옵션도 "지난 3개월"류 합계 구간이 아니라 **개별 달**로 나눈다(합계
  구간을 넣으면 "호출 수" 같은 개별 지표의 의미가 "그 달"에서 "그 구간 합"으로
  바뀌어 표 헤더까지 다시 정의해야 한다).

  과거 달의 실측값이 없는 mock이라, 이 기관의 월간 성장률(costDeltaPct = "전월
  대비 +N%")이 매달 일정했다고 가정하고 되감는다. 부트캠프가 성장하는 동안은
  교육생·저장량·세션·비용이 같이 늘어나는 게 자연스러운 상관관계라, 필드마다
  다른 임의의 과거 숫자를 지어내는 것보다 이 방식이 근거가 있다.
*/
export type UsagePeriod = 'CURRENT' | 'LAST_MONTH' | 'TWO_MONTHS_AGO'

export const USAGE_PERIOD_OPTIONS: { value: UsagePeriod; label: string }[] = [
  { value: 'CURRENT', label: '이번 달' },
  { value: 'LAST_MONTH', label: '지난 달' },
  { value: 'TWO_MONTHS_AGO', label: '2개월 전' },
]

const USAGE_PERIOD_STEPS_BACK: Record<UsagePeriod, number> = {
  CURRENT: 0,
  LAST_MONTH: 1,
  TWO_MONTHS_AGO: 2,
}

function scaleUsageForPeriod(usage: OrgUsage, period: UsagePeriod): OrgUsage {
  const stepsBack = USAGE_PERIOD_STEPS_BACK[period]
  if (stepsBack === 0) return usage
  // 등락이 0%거나 음수면(성장률 데이터가 없거나 이미 줄고 있는 기관) 억지로
  // 되감지 않는다 — 나눗셈이 오히려 과거를 더 크게 만들거나 발산한다.
  const growth = 1 + usage.costDeltaPct / 100
  const factor = growth > 0 ? growth ** -stepsBack : 1
  const scaleInt = (n: number) => Math.round(n * factor)
  const scale1 = (n: number) => Math.round(n * factor * 10) / 10
  return {
    storageBreakdown: usage.storageBreakdown.map((row) => ({ ...row, gb: scale1(row.gb) })),
    totalStorageGb: scale1(usage.totalStorageGb),
    activeTrainees: scaleInt(usage.activeTrainees),
    completedSessions: scaleInt(usage.completedSessions),
    gradingRounds: scaleInt(usage.gradingRounds),
    publishedReports: scaleInt(usage.publishedReports),
    monthBudgetUsd: usage.monthBudgetUsd, // 예산 한도는 계약값 — 시점과 무관하게 그대로
    costDeltaPct: usage.costDeltaPct,
    models: usage.models.map((m) => ({
      ...m,
      calls: scaleInt(m.calls),
      inputTokens: scaleInt(m.inputTokens),
      outputTokens: scaleInt(m.outputTokens),
      costUsd: scaleInt(m.costUsd),
    })),
  }
}

/** GET /admin/orgs/{id}/usage?period= — 케이스 6. 실패해도 기관 정보·다른 탭은
 * 그대로다(§6 "이 영역만 막는다") — 그래서 이 함수는 화면 전체가 아니라
 * 사용량 탭 컴포넌트 하나만 감싼다. */
export function getOrgUsage(orgId: string, period: UsagePeriod = 'CURRENT'): Promise<OrgUsage> {
  // ===== Mock 버전 (현재 활성) =====
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (orgId === USAGE_ALWAYS_FAIL_ORG_ID) {
        reject({ code: 'USAGE_UNAVAILABLE' } satisfies UsageApiError)
        return
      }
      const org = ORGS.find((o) => o.id === orgId)
      const current = USAGE_BY_ORG[orgId] ?? fallbackUsage(org!)
      resolve(scaleUsageForPeriod(current, period))
    }, 500)
  })

  // ===== 실제 백엔드 버전 =====
  // const res = await fetch(`/admin/orgs/${orgId}/usage?period=${period}`)
  // if (!res.ok) return Promise.reject(await res.json()) // { code: 'USAGE_UNAVAILABLE' }
  // return res.json()
}

// ───────────────────────── 개요 탭 지표 ─────────────────────────

/** 개요 탭의 지표 카드는 항상 즉시 그려진다 — getOrgUsage()(사용량 탭, 실패 가능)와
 * 의도적으로 분리한다(§6 "이 영역만 막는다"의 반대편: 개요는 사용량 집계 실패에
 * 물들면 안 된다). USAGE_BY_ORG에 손으로 채운 값이 있으면 그 값을 쓰고(org-1은
 * 이 값이 사용량 탭과 일치해야 한다), 없으면 fallbackUsage와 같은 파생식을 쓴다. */
export function getOverviewSnapshot(org: Org): {
  storageGb: number
  /** null = 전월 대비를 말할 수 없는 경우(저장량 0·정지 기관) */
  storageDeltaPct: number | null
  activeSessions: number
  budgetUsd: number
  budgetPct: number
} {
  const settings = getOrCreateDetail(org.id).settings
  const usage = USAGE_BY_ORG[org.id]
  const storageGb = usage ? usage.totalStorageGb : Math.round(org.traineeCount * 0.0635 * 10) / 10
  const activeSessions = usage
    ? Math.round(usage.activeTrainees * 0.04)
    : Math.round(org.traineeCount * 0.04)
  const budgetPct =
    settings.budgetUsd > 0 ? Math.round((org.monthlyAiCostUsd / settings.budgetUsd) * 100) : 0
  // 저장량 증가율 — 실측 과거 데이터가 없는 mock이라 org-1의 실측값(+8%, 와이어
  // #page-overview)을 "활성 기관은 매달 이만큼씩 쌓인다"는 공통 가정으로 쓴다
  // (usage 탭 fallbackUsage의 costDeltaPct=12%와 같은 방식 — 저장량은 AI 비용과
  // 다른 지표라 값도 다르다). 저장량이 0(오퍼레이터 미배정이라 아직 아무것도 안
  // 쌓인 기관)이거나 기관이 정지 상태(로그인이 막혀 있어 새 데이터가 안 쌓인다)면
  // "전월 대비"를 말할 근거가 없어 null로 둔다.
  const storageDeltaPct = org.status === 'ACTIVE' && storageGb > 0 ? 8 : null
  return {
    storageGb,
    storageDeltaPct,
    activeSessions,
    budgetUsd: settings.budgetUsd,
    budgetPct,
  }
}

// ───────────────────────── 설정 · 삭제 ─────────────────────────

/** PATCH /admin/orgs/{id}/settings */
export function updateOrgSettings(orgId: string, patch: Partial<OrgSettings>): OrgSettings {
  const detail = getOrCreateDetail(orgId)
  detail.settings = { ...detail.settings, ...patch }
  return detail.settings
}

/** PATCH /admin/orgs/{id} — 기관 상태(활성/정지). 소속 전원 로그인 차단, 데이터는
 * 보존(§6) — 삭제(soft-delete)와는 다른 축이라 org.deletion을 건드리지 않는다. */
export function updateOrgStatus(orgId: string, status: OrgStatus): void {
  const org = ORGS.find((o) => o.id === orgId)
  if (org) org.status = status
}

/** DELETE /admin/orgs/{id} — 케이스 7. 즉시 파기가 아니라 soft-delete + 보존기간이다
 * (§7 "기관 삭제 — 즉시 파기가 아니다"). purgeAt은 지금 설정된 retentionDays 기준. */
export function requestOrgDeletion(orgId: string): OrgDeletion {
  const org = ORGS.find((o) => o.id === orgId)
  if (!org) throw new Error('org not found')
  const detail = getOrCreateDetail(orgId)
  const requestedAt = new Date().toISOString().slice(0, 10)
  const purge = new Date()
  purge.setDate(purge.getDate() + detail.settings.retentionDays)
  const deletion: OrgDeletion = { requestedAt, purgeAt: purge.toISOString().slice(0, 10) }
  org.deletion = deletion
  return deletion
}

/** 보존기간 안에는 복구할 수 있다(§7) — 파기 후 복구 경로는 없다(케이스8은 화면
 * 자체가 없음, 정의서 §6 "그림 없음"). */
export function cancelOrgDeletion(orgId: string): void {
  const org = ORGS.find((o) => o.id === orgId)
  if (org) org.deletion = undefined
}
