/*
  SA-03 플랫폼 설정 목업 데이터 + mock API. 정의서(SA-03-platform-settings.md) ·
  와이어프레임(superadmin/console.html#page-model 이하 — model·modelchange·
  nopricing·accounts·cases-sa03)만 보고 짰다(v1 원본 없음, SA-01·SA-02와 같은 사정).

  API 격리는 orgs/mockData.ts와 같은 관례 — 모듈 스코프 저장소를 함수가 직접
  mutate하고, 화면은 getPlatformSettings()로 "다시 읽어오기" 한다.

  판단 근거(정의서·와이어프레임 밖에서 이 세션이 정한 것):

  - **재캘리브레이션 경고 문구의 "N개 기관"** — 와이어 #modelchange가 "14개 기관"이라고
    못 박아 뒀다. orgs 기능의 ORGS.length를 그대로 가져오면 두 기능(superadmin/orgs ·
    superadmin/settings)이 서로 import하게 되는데, 지금 이 레포에 그런 교차참조 관례가
    없어(각 기능 폴더가 자기 mockData만 쓴다) 새로 만들지 않는다. 대신 이 파일 안에
    같은 숫자(14)를 상수로 박아둔다 — 실제 백엔드에서는 어차피 이 화면이 직접 조회할
    값이라 mock 단계에서 두 파일을 묶을 이유가 약하다.
  - **슈퍼어드민 계정 재활성 없음** — 정의서 §3·§5가 "목록 · 초대 · 정지" 셋만
    명시한다(SA-02 오퍼레이터는 정지/재활성 둘 다 명시돼 있어 달랐다). 정지된 계정을
    되돌리는 액션은 만들지 않는다 — 필요해지면 팀장님과 별도 판단.
  - **계정 초대는 SA-02 오퍼레이터와 같이 INVITED로 시작한다** — 처음엔 케이스
    계약(#cases-sa03)에 메일 실패·초대중 상태가 없다는 이유로 즉시 ACTIVE를
    만들었는데, 다시 보니 두 가지가 안 맞았다: (1) "활성"인데 `lastLoginAt`이
    없다(로그인한 적이 없다는 뜻)는 게 그 자체로 모순이고, (2) 슈퍼어드민은
    플랫폼에서 가장 강한 권한이라(§6 "풀어 줄 상위 권한이 아예 없다") 본인이
    실제로 로그인하기 전까지 활성으로 치면 안 된다 — 오퍼레이터보다 더 엄격해야
    할 자리가 오히려 검증이 없는 건 앞뒤가 바뀌었다. INVITED는 오퍼레이터와
    같은 이유로 "마지막 슈퍼어드민" 집계에서 빠진다(아직 로그인한 적 없는
    계정은 커버로 치지 않는다).
  - **단가 미입력 데모** — claude-opus-6을 "채점 모델 변경" 선택지에는 있지만 단가
    표에는 없는 모델로 시드해 둔다. 실제로 채점 모델을 opus-6으로 바꾸면 그 즉시
    단가 미입력 경고(#nopricing)가 뜬다 — 와이어가 #modelchange → #nopricing으로
    이어지는 흐름과 같다.
*/

export type ModelId = 'claude-opus-5' | 'claude-opus-6' | 'claude-sonnet-5' | 'claude-haiku-4-5'

/** 채점 모델 변경 시 고를 수 있는 후보. claude-opus-6은 아직 단가가 없다(위 주석) */
export const AVAILABLE_MODELS: ModelId[] = [
  'claude-opus-5',
  'claude-opus-6',
  'claude-sonnet-5',
  'claude-haiku-4-5',
]

/** 재캘리브레이션 경고에 쓰는 기관 수 — 와이어 #modelchange 문구("14개 기관")와 맞춘
 * 고정값이다(파일 머리말 판단 근거 참고). */
const ORG_COUNT_SNAPSHOT = 14

export interface GradingModelState {
  model: ModelId
  calibrationVersion: string
  /** YYYY-MM-DD — 이 캘리브레이션 버전이 적용된 날 */
  appliedAt: string
}

const GRADING_MODEL: GradingModelState = {
  model: 'claude-opus-5',
  calibrationVersion: 'cal-2026-04',
  appliedAt: '2026-04-11',
}

export type Tier = 'ACCURACY' | 'BALANCED' | 'COST'

export interface TierMapping {
  tier: Tier
  label: string
  model: ModelId
  /** "쓰이는 곳" 표시용 문구 */
  usedFor: string
}

const TIER_MAPPINGS: Record<Tier, TierMapping> = {
  ACCURACY: {
    tier: 'ACCURACY',
    label: '정확도 우선',
    model: 'claude-opus-5',
    usedFor: '질문 생성',
  },
  BALANCED: {
    tier: 'BALANCED',
    label: '균형',
    model: 'claude-sonnet-5',
    usedFor: '질문 생성 · 요약',
  },
  COST: {
    tier: 'COST',
    label: '비용 우선',
    model: 'claude-haiku-4-5',
    usedFor: '요약',
  },
}

export const TIER_ORDER: Tier[] = ['ACCURACY', 'BALANCED', 'COST']

export interface ModelPricing {
  model: ModelId
  inputUsdPerM: number
  outputUsdPerM: number
  /** YYYY-MM-DD */
  appliedAt: string
}

/** undefined = 단가 미설정(§6 "0으로 계산하지 않는다") */
const PRICING: Partial<Record<ModelId, ModelPricing>> = {
  'claude-opus-5': {
    model: 'claude-opus-5',
    inputUsdPerM: 6.0,
    outputUsdPerM: 30.0,
    appliedAt: '2026-04-01',
  },
  'claude-sonnet-5': {
    model: 'claude-sonnet-5',
    inputUsdPerM: 3.2,
    outputUsdPerM: 16.0,
    appliedAt: '2026-04-01',
  },
  'claude-haiku-4-5': {
    model: 'claude-haiku-4-5',
    inputUsdPerM: 1.0,
    outputUsdPerM: 5.0,
    appliedAt: '2026-04-01',
  },
  // claude-opus-6: 아직 미설정 — #nopricing 데모
}

export type SuperadminStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED'

export interface SuperadminAccount {
  id: string
  name: string
  email: string
  status: SuperadminStatus
  /** "지금" 또는 YYYY-MM-DD, null = 로그인 기록 없음(INVITED 상태의 자연스러운 값) */
  lastLoginAt: string | null
  /** 지금 로그인한 계정 — 목록에 "나" 배지 */
  isSelf?: boolean
}

const SUPERADMIN_ACCOUNTS: SuperadminAccount[] = [
  {
    id: 'sa-1',
    name: '김운영',
    email: 'kim@iz-get.com',
    status: 'ACTIVE',
    lastLoginAt: '지금',
    isSelf: true,
  },
  {
    id: 'sa-2',
    name: '오세라',
    email: 'sera@iz-get.com',
    status: 'ACTIVE',
    lastLoginAt: '2026-07-28',
  },
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** GET /admin/settings — 화면이 매번 이 스냅샷을 다시 읽어 "다시 읽어오기" 패턴을
 * 따른다(orgs/mockData.ts getOrgDetail과 같은 관례). */
export function getPlatformSettings(): {
  gradingModel: GradingModelState
  tierMappings: TierMapping[]
  pricing: Partial<Record<ModelId, ModelPricing>>
  accounts: SuperadminAccount[]
  orgCountSnapshot: number
} {
  return {
    gradingModel: { ...GRADING_MODEL },
    tierMappings: TIER_ORDER.map((t) => TIER_MAPPINGS[t]),
    pricing: { ...PRICING },
    accounts: [...SUPERADMIN_ACCOUNTS],
    orgCountSnapshot: ORG_COUNT_SNAPSHOT,
  }
}

// ───────────────────────── 채점 모델 · 캘리브레이션 ─────────────────────────

/** PATCH /admin/settings/grading-model — 케이스 "채점 모델 변경"(#modelchange).
 * 확인 모달(전 기관 재캘리브레이션 경고)은 화면이 맡는다 — 이 함수는 확정된 뒤에만
 * 불린다. 캘리브레이션 버전은 오늘 날짜로 새로 발급한다. */
export function changeGradingModel(model: ModelId): GradingModelState {
  GRADING_MODEL.model = model
  GRADING_MODEL.calibrationVersion = `cal-${today()}`
  GRADING_MODEL.appliedAt = today()
  return { ...GRADING_MODEL }
}

// ───────────────────────── 티어 매핑 ─────────────────────────

/** PATCH /admin/settings/tiers/{tier} — §5 "매핑 변경(확인 모달)". 채점 모델과 달리
 * 재캘리브레이션이 필요 없다(질문 생성·요약 전용, 채점 결과 비교와 무관) — 화면의
 * 확인 모달은 "정말 바꿀지"만 묻는 가벼운 확인이다. */
export function updateTierMapping(tier: Tier, model: ModelId): TierMapping {
  TIER_MAPPINGS[tier] = { ...TIER_MAPPINGS[tier], model }
  return { ...TIER_MAPPINGS[tier] }
}

// ───────────────────────── 단가 ─────────────────────────

/** 지금 실제로 쓰이는 모델(채점 + 3티어) 중 단가가 없는 것 — 있으면 화면이 경고
 * 배너(#nopricing)를 띄운다. §6 "단가 미입력을 0으로 계산하지 않는다". */
export function getUnpricedModelsInUse(): ModelId[] {
  const inUse = new Set<ModelId>([
    GRADING_MODEL.model,
    ...TIER_ORDER.map((t) => TIER_MAPPINGS[t].model),
  ])
  return [...inUse].filter((m) => !PRICING[m])
}

/** PUT /admin/settings/pricing/{model} — 단가 입력·수정. 0·0을 입력하면 "미설정"으로
 * 되돌린다(둘 다 0일 때만 — 한쪽만 0이면 그 모델은 정말 그 방향만 무료라는 뜻일 수
 * 있어 그대로 저장한다). 그래서 화면에 "0으로 계산되는 단가"가 남는 경우가 아예
 * 없다 — 있으면 미설정이고, 없으면 실제 값이다(§6 "0으로 계산하지 않는다"). 서버
 * 왕복이 필요 없는 로컬 상태 변경이라 동기로 둔다(orgs/mockData.ts의
 * updateOrgSettings와 같은 결). */
export function updatePricing(
  model: ModelId,
  inputUsdPerM: number,
  outputUsdPerM: number,
): ModelPricing | undefined {
  if (inputUsdPerM === 0 && outputUsdPerM === 0) {
    delete PRICING[model]
    return undefined
  }
  const pricing: ModelPricing = { model, inputUsdPerM, outputUsdPerM, appliedAt: today() }
  PRICING[model] = pricing
  return pricing
}

// ───────────────────────── 슈퍼어드민 계정 ─────────────────────────

export type SuperadminInviteErrorCode = 'INVALID_EMAIL' | 'ALREADY_EXISTS' | 'NAME_REQUIRED'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 제출 전 필드 검증 — 서버 왕복이 필요 없는 형식·중복 검사라 orgs의
 * validateOperatorEmail과 같은 결로 동기로 둔다. */
export function validateSuperadminInvite(
  name: string,
  email: string,
): SuperadminInviteErrorCode | null {
  if (!name.trim()) return 'NAME_REQUIRED'
  const trimmed = email.trim()
  if (!EMAIL_RE.test(trimmed)) return 'INVALID_EMAIL'
  if (SUPERADMIN_ACCOUNTS.some((a) => a.email.toLowerCase() === trimmed.toLowerCase()))
    return 'ALREADY_EXISTS'
  return null
}

/** POST /admin/settings/accounts — 초대. SA-02 오퍼레이터와 같이 INVITED로
 * 시작한다(파일 머리말 판단 근거) — 본인이 실제로 로그인해야 ACTIVE가 된다. */
export function inviteSuperadmin(name: string, email: string): SuperadminAccount {
  const account: SuperadminAccount = {
    id: `sa-${Date.now()}`,
    name: name.trim(),
    email: email.trim(),
    status: 'INVITED',
    lastLoginAt: null,
  }
  SUPERADMIN_ACCOUNTS.unshift(account)
  return account
}

/** DELETE /admin/settings/accounts/{id} — 아직 로그인 전인 초대 자리 취소.
 * SA-02 cancelInvite와 같은 이유로 ACTIVE·SUSPENDED 계정엔 쓰지 않는다. */
export function cancelSuperadminInvite(id: string): void {
  const idx = SUPERADMIN_ACCOUNTS.findIndex((a) => a.id === id && a.status === 'INVITED')
  if (idx !== -1) SUPERADMIN_ACCOUNTS.splice(idx, 1)
}

export const LAST_SUPERADMIN_ERROR = 'LAST_SUPERADMIN' as const

/** PATCH /admin/settings/accounts/{id} — 정지. 활성 슈퍼어드민이 이 한 명뿐이면
 * 막는다(§6 "풀어 줄 상위 권한이 아예 없다" — SA-02 LAST_OPERATOR보다 더 치명적).
 * INVITED(아직 로그인한 적 없음)는 커버로 세지 않는다 — SA-02 LAST_OPERATOR와
 * 같은 이유(받아들여질지 보장 안 된 초대로 마지막 활성 계정을 정지시키면 고아가
 * 될 수 있다). */
export function suspendSuperadmin(
  id: string,
): { ok: true } | { ok: false; code: typeof LAST_SUPERADMIN_ERROR } {
  const target = SUPERADMIN_ACCOUNTS.find((a) => a.id === id)
  if (!target) return { ok: false, code: LAST_SUPERADMIN_ERROR }
  const activeCount = SUPERADMIN_ACCOUNTS.filter((a) => a.status === 'ACTIVE').length
  if (target.status === 'ACTIVE' && activeCount <= 1) {
    return { ok: false, code: LAST_SUPERADMIN_ERROR }
  }
  target.status = 'SUSPENDED'
  return { ok: true }
}
