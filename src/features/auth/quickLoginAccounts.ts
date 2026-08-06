/**
 * 발표용 계정 — dev 전용 역할 전환(Header)에서 씀. 비밀번호는 전부 pass1234.
 * 역할 선택 UI는 정책상 화면엔 없음(LoginScreen 주석) — 이건 폼을 우회하는
 * 데모 지름길일 뿐, 서버가 역할을 판정하는 로그인 흐름 자체는 그대로 재사용한다.
 */
export const QUICK_LOGIN_ACCOUNTS: { label: string; email: string }[] = [
  { label: '슈퍼 어드민', email: 'admin@iz-get.com' },
  { label: '오퍼레이터', email: 'operator@iz-get.com' },
  { label: '매니저', email: 'manager@org.com' },
  { label: '교육생', email: 'trainee@org.com' },
]
