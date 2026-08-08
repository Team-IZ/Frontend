/*
  SA-01·SA-02가 함께 쓰는 표시 규칙. **서버 값 → 화면 문구**만 담는다.

  여기 있는 것은 전부 **화면 것**이라 백엔드가 바뀌어도 남는다(api-boundary.md ⑤).
  반대로 값 자체(상태·비용·기수 수)는 서버가 준다 — 여기서 계산하지 않는다.
*/
import { addDays, format, parseISO } from 'date-fns'
import type { findOrganizations_Item } from '@/api/organization/organizationTypes'

type Org = findOrganizations_Item

// ── 상태 배지 ────────────────────────────────────────────────────────────────

export type OrgBadge = { variant: 'success' | 'warning' | 'neutral' | 'danger'; label: string }

/**
 * 상태 배지 — **우선순위가 이 함수의 전부다.**
 *
 * SA-01 목록과 SA-02 상세 헤더가 같은 기관에 같은 배지를 보여야 해서 한 곳에 둔다.
 * 두 화면이 각자 판정하면 우선순위가 갈린다.
 *
 * ```
 * 삭제됨 > 삭제 대기 > 정지 > 오퍼레이터 미배정 > 예산 초과 > 활성
 * ```
 * **되돌릴 수 없는 것과 서비스가 멈춘 것이 위로 온다.** `operatorUnassigned`·`budgetExceeded`는
 * 서버가 주는 파생 값이라(저장 상태가 아니다) 화면이 `operators.length === 0`으로 유추하지 않는다.
 */
export function orgStatusBadge(org: Org): OrgBadge {
  if (org.status === 'DELETED') return { variant: 'neutral', label: '삭제됨' }
  if (org.status === 'DELETION_PENDING') {
    const purge = purgeDateOf(org)
    return { variant: 'danger', label: purge ? `삭제 대기 · ${purge} 파기` : '삭제 대기' }
  }
  if (org.status === 'SUSPENDED') return { variant: 'neutral', label: '정지' }
  if (org.operatorUnassigned) return { variant: 'warning', label: '오퍼레이터 미배정' }
  if (org.budgetExceeded) return { variant: 'warning', label: '예산 초과' }
  return { variant: 'success', label: '활성' }
}

/**
 * 파기 예정일 — **서버가 안 준다.** 삭제 시각 + 보존기간으로 계산한다.
 * 백엔드에 `purgeAt`을 요청해 두었고, 오면 이 함수는 그 값을 그대로 쓰게 바뀐다.
 */
export function purgeDateOf(org: Org): string | null {
  if (!org.deletedAt) return null
  return format(addDays(parseISO(org.deletedAt), org.dataRetentionDays), 'yyyy-MM-dd')
}

// ── 정렬 ─────────────────────────────────────────────────────────────────────

/**
 * 서버가 지원하는 정렬은 **이름·생성일 둘뿐**이다.
 *
 * 기수 수·교육생 수·비용은 별도 배치 집계라 **페이지를 자른 뒤에 채워진다** — 전역 정렬이
 * 성립하지 않는다(스펙 설명). 그래서 그 세 컬럼은 정렬 버튼을 두지 않는다.
 * 클라이언트로 정렬하면 **현재 페이지 안에서만** 맞는데 사용자는 전체가 정렬된 줄 안다.
 */
export type OrgSortKey = 'name' | 'createdAt'
export type OrgSortDirection = 'asc' | 'desc'

const SORT_VALUES = {
  'name-asc': 'NAME_ASC',
  'name-desc': 'NAME_DESC',
  'createdAt-asc': 'CREATED_AT_ASC',
  'createdAt-desc': 'CREATED_AT_DESC',
} as const

export const orgSortValue = (key: OrgSortKey, direction: OrgSortDirection) =>
  SORT_VALUES[`${key}-${direction}`]

/** 컬럼별 기본 방향 — 날짜는 최신이 먼저, 이름은 오름차순이 자연스럽다 */
export const ORG_SORT_DEFAULT_DIRECTION: Record<OrgSortKey, OrgSortDirection> = {
  name: 'asc',
  createdAt: 'desc',
}

// ── 값 표시 ──────────────────────────────────────────────────────────────────

/** `2026-08-07T…` → `2026-08-07`. 목록에 시각까지 쓰면 열이 넓어지기만 한다 */
export const formatDate = (iso: string) => format(parseISO(iso), 'yyyy-MM-dd')

/** 통화는 서버가 코드로 준다(플랫폼 공통 USD). 정책이 없으면 null이라 기호를 못 붙인다 */
export function formatCost(amount: number, currencyCode: string | null): string {
  const rounded = Math.round(amount).toLocaleString()
  return currencyCode === 'USD'
    ? `$${rounded}`
    : `${rounded}${currencyCode ? ` ${currencyCode}` : ''}`
}

/** 저장량은 바이트로 온다. GB 미만이 나올 규모가 아니라 정수 GB로 줄인다 */
export const formatGb = (bytes: number) => `${Math.round(bytes / 1024 ** 3).toLocaleString()} GB`

/** `0.0675` → `+7%`. null이면 비교할 전월이 없다는 뜻이라 문구를 안 만든다 */
export function formatChangeRate(rate: number | null | undefined): string | null {
  if (rate == null) return null
  const pct = Math.round(rate * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

/** 오퍼레이터 이름 — 목록은 `박지현 외 1`, 없으면 대시 */
export function formatOperators(operators: Org['operators']): string {
  if (!operators?.length) return '—'
  const [first, ...rest] = operators
  return rest.length ? `${first.name} 외 ${rest.length}` : first.name
}
