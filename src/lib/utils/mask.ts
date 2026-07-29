/*
  개인정보 표시 제한 보호조치(제10조). 시스템마다 다른 방식으로 마스킹하면
  조합을 통해 원본이 복원될 수 있어 "동일한 방식"이 요건이다. 그래서 아키텍처
  §7의 "3번 반복 후 공용 승격" 규칙과 달리 처음부터 lib에 둔다 — 이후 명단
  배정·플랫폼 콘솔 등 다른 화면도 반드시 이 함수를 쓴다.
*/

/**
 * 이메일 로컬파트 앞 2글자만 남기고 나머지는 `*`. 도메인은 그대로 둔다.
 * 로컬파트가 2글자 이하면 첫 1글자만 남긴다.
 *
 *   maskEmail('minjun@ex.com')  →  'mi****@ex.com'
 *   maskEmail('ab@ex.com')      →  'a*@ex.com'
 */
export function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at < 0) return email

  const local = email.slice(0, at)
  const domain = email.slice(at)
  const keep = local.length <= 2 ? 1 : 2
  const masked = local.slice(0, keep) + '*'.repeat(Math.max(0, local.length - keep))

  return masked + domain
}
