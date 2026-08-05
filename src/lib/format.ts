/*
  날짜·카운트다운 포맷 — 도메인을 모르는 순수 함수. `trainee/home`이 먼저 만들었고
  `trainee/submission`이 같은 것을 필요로 했다 — 두 번째 도메인이 필요로 한 시점에
  올린다는 규칙(`lib/useAsync.ts` 결정 기록과 같은 판단)을 그대로 따른다.
*/

const pad2 = (n: number) => String(n).padStart(2, '0')

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
