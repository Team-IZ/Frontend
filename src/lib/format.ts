/*
  날짜·카운트다운 포맷 — 도메인을 모르는 순수 함수. `trainee/home`이 먼저 만들었고
  `trainee/submission`이 같은 것을 필요로 했다 — 두 번째 도메인이 필요로 한 시점에
  올린다는 규칙(`lib/useAsync.ts` 결정 기록과 같은 판단)을 그대로 따른다.
*/

const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * 조사를 받침에 맞춰 붙인다 — `withParticle('회차', '을', '를')` → `회차를`.
 *
 * **세 번째 도메인이 같은 것을 필요로 해서 여기로 올렸다**(D14). `operator/projects`가
 * 먼저 만들었고 `manager/projects`가 목 데이터 안에 복붙했으며(교차 import가 막혀서),
 * `lib/errorCopy`가 세 번째다 — 실패 문구가 대상 이름을 받아 쓰기 때문이다.
 *
 * 한글이 아닌 글자로 끝나면(영문·숫자) 받침 없는 쪽을 쓴다 — `없음`이 아니라 기본값이다.
 */
export function withParticle(name: string, withBatchim: string, without: string): string {
  const last = name.trim().at(-1) ?? ''
  const code = last.charCodeAt(0)
  const isHangul = code >= 0xac00 && code <= 0xd7a3
  const hasBatchim = isHangul && (code - 0xac00) % 28 !== 0
  return `${name}${hasBatchim ? withBatchim : without}`
}

/** "07-14 18:00" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** "07-24" */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** "7월 24일" */
export function formatDateKorean(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

/** "HH:MM:SS" — 초단위 실시간 카운트다운(체크리스트 §6 "초 단위로") */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

/** "1일 4시간" · "6일" · "4시간" · "40분" — 굵은 단위 표시 */
export function formatCoarse(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (days >= 1) return hours > 0 ? `${days}일 ${hours}시간` : `${days}일`
  if (hours >= 1) return `${hours}시간`
  return `${minutes}분`
}

/*
  바이트 → 사람이 읽는 크기. superadmin 사용량 화면이 먼저 만들었고 `trainee/submission`이
  같은 것을 필요로 해서 올렸다(이 파일 머리 주석의 규칙).

  SA-02 상세는 한 기관의 항목별 내역이라 MB가 나오고, TB는 아직 안 나오지만 상한을
  열어 둔다(분기 하나 값이 크지 않다).
*/
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1)
  const value = bytes / 1024 ** i
  // GB 이상은 소수 첫째 자리까지. MB 이하는 정수로 충분하다
  const digits = i >= 3 && value < 100 ? 1 : 0
  return `${value.toLocaleString(undefined, { maximumFractionDigits: digits })} ${BYTE_UNITS[i]}`
}
