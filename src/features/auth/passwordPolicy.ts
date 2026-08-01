/**
 * 비밀번호 정책(AU-02·AU-03 공용) — 미충족 기준 목록을 돌려준다.
 * v1에서는 AU-02 전용 파일(inviteStates.ts)에 얹혀 있었는데, AU-03도 같은 함수가
 * 필요해지면서(두 번째 실사용) 화면을 모르는 순수 함수로 여기 뺐다.
 */
export function checkPasswordPolicy(password: string): string[] {
  const unmet: string[] = []
  if (password.length < 8) unmet.push('8자 이상')
  if (!/[A-Za-z]/.test(password)) unmet.push('영문 포함')
  if (!/[0-9]/.test(password)) unmet.push('숫자 포함')
  if (!/[^A-Za-z0-9]/.test(password)) unmet.push('특수문자 포함')
  return unmet
}
