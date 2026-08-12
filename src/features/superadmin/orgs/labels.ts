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
 * 삭제 대기 > 정지 > 오퍼레이터 미배정 > 예산 초과 > 활성
 * ```
 * **되돌릴 수 없는 것과 서비스가 멈춘 것이 위로 온다.** `operatorUnassigned`·`budgetExceeded`는
 * 서버가 주는 파생 값이라(저장 상태가 아니다) 화면이 `operators.length === 0`으로 유추하지 않는다.
 *
 * `DELETION_PENDING`·`DELETED`는 enum 값은 다르지만 **이 백엔드에서 화면에 관측되는
 * 한 같은 실제 상태**다(팀장 확인, decision-log D30·D31) — 진짜로 파기가 끝난 기관은
 * 애초에 어떤 조회 결과에도 나타나지 않는다. 그래서 여기서부터 한 분기로 합친다.
 */
export function orgStatusBadge(org: Org): OrgBadge {
  if (isDeletionLocked(org.status)) {
    const purge = purgeDateOf(org)
    return { variant: 'danger', label: purge ? `삭제 대기 · ${purge} 파기` : '삭제 대기' }
  }
  if (org.status === 'SUSPENDED') return { variant: 'neutral', label: '정지' }
  if (org.operatorUnassigned) return { variant: 'warning', label: '오퍼레이터 미배정' }
  if (org.budgetExceeded) return { variant: 'warning', label: '예산 초과' }
  return { variant: 'success', label: '활성' }
}

/**
 * 삭제 대기 판정 — SA-02 축 J6 정책(사용자 지시): 기관이 이 상태면 탭 전환·재조회 같은
 * 읽기와 "복구"만 허용하고 나머지 쓰기 액션은 전부 잠근다. `SettingsTab.tsx`(5개 설정
 * 변경 + 기관 삭제)·`OperatorsTab.tsx`(초대 + 행 액션 4종)가 이 함수 하나로 판정을
 * 공유한다 — 각자 조건을 들고 있으면 한쪽만 고치고 잊는 사고가 난다.
 */
export const isDeletionLocked = (status: Org['status']) =>
  status === 'DELETION_PENDING' || status === 'DELETED'

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

/** 로그인 기록처럼 "언제"가 중요한 값. 없으면 대시 — 호출부가 매번 분기하지 않게 여기서 받는다 */
export const formatDateTime = (iso: string | null | undefined) =>
  iso ? format(parseISO(iso), 'yyyy-MM-dd HH:mm') : '—'

/** 통화는 서버가 코드로 준다(플랫폼 공통 USD). 정책이 없으면 null이라 기호를 못 붙인다 */
export function formatCost(amount: number, currencyCode: string | null): string {
  const rounded = Math.round(amount).toLocaleString()
  return currencyCode === 'USD'
    ? `$${rounded}`
    : `${rounded}${currencyCode ? ` ${currencyCode}` : ''}`
}

/*
  저장량은 바이트로 온다. 단위를 크기에 맞춰 고른다.

  SA-01 목록은 기관 전체 합이라 늘 GB 이상이지만, SA-02 상세는 **한 기관의 항목별**
  내역이라 이제 MB 단위가 나온다 — 정수 GB로 줄이면 `0 GB`가 여러 줄 생긴다.
  TB는 아직 안 나오지만 상한을 열어 둔다(분기 하나 값이 크지 않다).
*/
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1)
  const value = bytes / 1024 ** i
  // GB 이상은 소수 첫째 자리까지. MB 이하는 정수로 충분하다
  const digits = i >= 3 && value < 100 ? 1 : 0
  return `${value.toLocaleString(undefined, { maximumFractionDigits: digits })} ${UNITS[i]}`
}

/**
 * 이번 달 `yyyy-MM`(UTC) — 개요 탭·사용량 탭이 "이번 달" 저장량을 같은 쿼리 키로 조회하도록
 * 여기 하나로 둔다. 각자 계산하면(예전처럼) 키가 갈려 캐시가 안 섞인다.
 */
export const currentPeriod = (): string => {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

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

// ── 기수 ─────────────────────────────────────────────────────────────────────

/*
  기수 상태 — 스펙에 **enum이 없고 `string`**이다(설명문에만 세 값이 적혀 있다).
  그래서 모르는 값이 올 수 있고, 그때는 **빈칸 대신 받은 값을 그대로** 보여준다.
  빈칸은 "데이터 없음"으로 읽히지만 원문은 "아직 모르는 값이 왔다"로 읽혀서,
  화면을 보는 사람이 이상을 발견할 수 있다(SA-03 calibrationStatus와 같은 판단).
*/
const COHORT_STATUS: Record<string, OrgBadge> = {
  PLANNED: { variant: 'neutral', label: '예정' },
  RUNNING: { variant: 'success', label: '진행 중' },
  CLOSED: { variant: 'neutral', label: '종료' },
}

export const cohortStatusBadge = (status: string): OrgBadge =>
  COHORT_STATUS[status] ?? { variant: 'neutral', label: status }

/**
 * 기수 기간 — `2026-03-02 ~ 2026-06-30`.
 *
 * 시작·종료가 **각각 null일 수 있다**(미정). 둘 다 없으면 기간 자체를 말할 수 없으므로
 * `null`을 돌려주고 화면이 `—`를 그린다. 한쪽만 있으면 그쪽만 보여준다 —
 * "미정"을 지어내 채우지 않는다.
 */
export function formatPeriod(startDate: string | null, endDate: string | null): string | null {
  if (!startDate && !endDate) return null
  const s = startDate ? formatDate(startDate) : ''
  const e = endDate ? formatDate(endDate) : ''
  return startDate && endDate ? `${s} ~ ${e}` : startDate ? `${s} ~` : `~ ${e}`
}
