// ─────────────────────────────────────────────────────────────
// 인증 API 계약 · 출처: docs/plan/screen/definition/SC-A01-login.md §5
// 백엔드 팀과 이 형태를 그대로 맞추면 연동 시 수정이 없습니다.
// ─────────────────────────────────────────────────────────────

export type Role = 'SUPERADMIN' | 'MANAGER' | 'TRAINEE'

/** POST /auth/login 요청 */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * POST /auth/login 성공 응답
 * - refreshToken은 Set-Cookie(Secure·HttpOnly)로 내려오며 화면에서 접근/저장하지 않음
 * - initialScreen: 서버가 판정한 역할의 초기 화면 경로 (클라이언트가 역할→화면을 매핑하지 않음)
 */
export interface LoginResponse {
  accessToken: string
  role: Role
  initialScreen: string
}

/** AUTH-03 예외 9 case (SC-A01 §6) */
export type AuthErrorCode =
  | 'AUTH_INVALID' // 1 이메일/비번 불일치
  | 'AUTH_LOCKED_NEW' // 2 실패 임계 초과 → 잠금 발생
  | 'AUTH_LOCKED' // 3 잠금 계정 로그인 시도
  | 'AUTH_UNVERIFIED' // 4 미인증 계정
  | 'AUTH_INACTIVE' // 5 비활성 계정
  | 'AUTH_TOKEN_ISSUE' // 6 Access 발급 실패
  | 'AUTH_ROLLBACK' // 7 Refresh 발급·DB 실패 → 롤백
  | 'AUTH_COOKIE' // 8 Refresh Cookie 설정 실패
  | 'AUTH_NO_CONTEXT' // 9 role/org_id 부재

export interface ApiError {
  code: AuthErrorCode
  /** 잠금 case(2·3)에서만 내려옴 — 잠금 만료 시각 */
  lockedUntil?: string
}
