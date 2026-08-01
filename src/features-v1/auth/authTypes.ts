// ─────────────────────────────────────────────────────────────
// 인증 API 계약 · 출처: docs/plan/screen/definition/SC-A01-login.md §5
// 백엔드 팀과 이 형태를 그대로 맞추면 연동 시 수정이 없습니다.
// ─────────────────────────────────────────────────────────────

export type Role = 'SUPERADMIN' | 'OPERATOR' | 'MANAGER' | 'TRAINEE'

/** SC-A01/A02 상태 알림 색 — @/components/ui/Alert의 variant 어휘와 맞춘다 */
export type AlertVariant = 'danger' | 'warning' | 'info'

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

/**
 * AUTH-03 예외 9 case (mockup c6911c0 · shared/login.html#cases 계약 기준)
 * v1 대비: 잠금(2·3)을 지연 1종(AUTH_THROTTLED)으로 병합. 4·5 이름이 서로 바뀐다 —
 * AUTH_UNVERIFIED = 미활성(초대 전) · AUTH_INACTIVE = 정지. 반대로 쓰지 않는다.
 */
export type AuthErrorCode =
  | 'AUTH_INVALID' // 1 이메일/비번 불일치
  | 'AUTH_THROTTLED' // 2·3 연속 실패 지연 (잠금 아님)
  | 'AUTH_UNVERIFIED' // 4 미활성 계정 — 초대 활성화 전, 재발송 가능
  | 'AUTH_INACTIVE' // 5 정지된 계정 — 문의만
  | 'AUTH_TOKEN_ISSUE' // 6 Access 발급 실패
  | 'AUTH_ROLLBACK' // 7 Refresh 발급·DB 실패 → 롤백
  | 'AUTH_COOKIE' // 8 Refresh Cookie 설정 실패
  | 'AUTH_NO_CONTEXT' // 9 role/org_id 부재

export interface ApiError {
  code: AuthErrorCode
  /** case 2·3에서만 내려옴 — 재시도까지 남은 초 */
  retryAfter?: number
}
