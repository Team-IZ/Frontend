/*
  SA-03 표시 규칙. **서버 값 → 화면 문구**만 담는다. 값 자체는 서버가 준다.

  예전 `mockData.ts`는 모델 목록(`AVAILABLE_MODELS`)과 티어 매핑을 상수로 들고 있었다.
  **둘 다 서버가 준다** — 모델은 `findModelSettings.modelPricings`가 곧 목록이고,
  티어 매핑도 서버 응답이다. 여기 남는 것은 **enum을 사람 말로 바꾸는 것**뿐이다.
*/
import { format, parseISO } from 'date-fns'
import type { findModelSettings_Response } from '@/api/platform/platformTypes'

type Tier = findModelSettings_Response['tierMappings'][number]['tierCode']
type Pricing = findModelSettings_Response['modelPricings'][number]

// ── 티어 ─────────────────────────────────────────────────────────────────────

/**
 * 티어 순서 — **정확도 → 균형 → 비용.** 서버 응답 순서에 기대지 않는다.
 * 기관이 고르는 것은 이 이름이고 실제 모델은 매핑이 정한다(스펙).
 */
export const TIER_ORDER = ['ACCURACY_FIRST', 'BALANCED', 'COST_FIRST'] as const

export const TIER_LABEL: Record<Tier, string> = {
  ACCURACY_FIRST: '정확도 우선',
  BALANCED: '균형',
  COST_FIRST: '비용 우선',
}

/** 기관이 이 티어를 고르면 무엇을 얻나 — 고르는 사람에게 필요한 것은 모델명이 아니라 이 문장이다 */
export const TIER_DESCRIPTION: Record<Tier, string> = {
  ACCURACY_FIRST: '채점 품질을 우선합니다. 비용이 가장 높습니다.',
  BALANCED: '품질과 비용의 중간입니다. 기본값으로 씁니다.',
  COST_FIRST: '비용을 우선합니다. 대량 기수에 적합합니다.',
}

/** 지금은 코드 세션 하나뿐이다(스펙 §티어 선택 대상) — 늘면 화면이 기능별로 나뉜다 */
export const FEATURE_CODE = 'CODE_SESSION'

// ── 재캘리브레이션 ───────────────────────────────────────────────────────────

/*
  ⚠️ 서버가 이 값을 **enum이 아니라 `string`**으로 준다(설명에만 `PENDING / RUNNING / ACTIVE /
  FAILED / SUPERSEDED`라고 적혀 있다). 그래서 생성 타입이 좁혀지지 않고, **모르는 값이 올 수
  있다** — 그때 화면이 빈칸이 되지 않게 폴백을 둔다.
  백엔드에 enum으로 빼 달라고 요청해 두었다(`ModelPricing.status`도 같은 상태다).
*/
const CALIBRATION_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: '대기 중', variant: 'warning' },
  RUNNING: { label: '진행 중', variant: 'warning' },
  ACTIVE: { label: '적용됨', variant: 'success' },
  FAILED: { label: '실패', variant: 'danger' },
  SUPERSEDED: { label: '이전 버전', variant: 'neutral' },
}

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral'

/** 모르는 상태는 값을 그대로 보여준다 — 숨기면 무슨 일이 일어났는지 알 수 없다 */
export const calibrationStatus = (status: string): { label: string; variant: BadgeVariant } =>
  CALIBRATION_STATUS[status] ?? { label: status, variant: 'neutral' }

/**
 * 진행 상황 한 줄 — `13/14 완료 · 1 실패`.
 *
 * **실패 건수를 숨기지 않는다.** 전 기관 대상 작업이라 일부만 실패해도 그 기관들은 옛 기준으로
 * 채점된다. 완료율만 보여주면 "거의 다 됐다"로 읽힌다.
 */
export function calibrationProgressText(
  p: {
    totalOrganizations: number
    succeeded: number
    failed: number
    running: number
    pending: number
  } | null,
): string | null {
  // 진행 정보가 없을 수 있다(서버가 null을 준다) — 그때는 문구를 만들지 않는다
  if (!p) return null
  const done = `${p.succeeded}/${p.totalOrganizations} 완료`
  const rest = [p.failed > 0 && `${p.failed} 실패`, p.running > 0 && `${p.running} 진행 중`]
    .filter(Boolean)
    .join(' · ')
  return rest ? `${done} · ${rest}` : done
}

// ── 단가 ─────────────────────────────────────────────────────────────────────

/**
 * 단가 표시 — `$0.24`. **`null`은 0이 아니다.**
 * 스펙이 못 박아 뒀다: *"0은 '무료'를 의미하므로 미설정과 구분한다."*
 * 미설정을 `$0`으로 그리면 **무료 모델로 읽힌다.**
 */
export function formatPrice(value: number | null | undefined): string {
  if (value == null) return '—'
  // 0.03처럼 작은 값이 흔해 소수점을 자르면 안 된다
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
}

/**
 * 단가가 없으면 **그 모델의 호출 비용이 집계에서 빠진다**(스펙 명시).
 * 조용히 두면 플랫폼 비용이 실제보다 적게 보이므로 화면에서 경고한다.
 */
export const isPricingMissing = (p: Pricing) => p.pricingMissing

/** 선택지에 올릴 모델 — 중지된 모델을 새로 배정할 수는 없다 */
export const isSelectableModel = (p: Pricing) => p.status === 'ACTIVE'

// ── 계정 ─────────────────────────────────────────────────────────────────────

type AccountStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE'

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  PENDING: '초대됨',
  ACTIVE: '활성',
  INACTIVE: '정지',
}

export const ACCOUNT_STATUS_VARIANT: Record<AccountStatus, 'success' | 'warning' | 'neutral'> = {
  PENDING: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'neutral',
}

// ── 날짜 ─────────────────────────────────────────────────────────────────────

export const formatDate = (iso: string) => format(parseISO(iso), 'yyyy-MM-dd')

/** 로그인 기록처럼 "언제"가 중요한 값 — 없으면 대시 */
export const formatDateTime = (iso: string | null | undefined) =>
  iso ? format(parseISO(iso), 'yyyy-MM-dd HH:mm') : '—'
