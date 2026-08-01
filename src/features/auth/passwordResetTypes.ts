// ─────────────────────────────────────────────────────────────
// 비밀번호 재설정 API 계약 · 출처: docs/plan/v2/wireframe/shared/password-reset.html#cases (mockup c6911c0)
// ─────────────────────────────────────────────────────────────

/** POST /auth/password-reset/request — 항상 202, 계정 유무·활성 상태와 무관하게 동일 응답 */
export interface RequestResetRequest {
  email: string
}

/** GET /auth/password-reset/{token} 응답 */
export interface ResetTokenInfo {
  email: string
}

/** POST /auth/password-reset/confirm */
export interface ConfirmResetRequest {
  token: string
  password: string
}

/** POST /auth/password-reset/confirm 성공 응답 — 세션 폐기가 실패해도 비밀번호 변경 자체는 성공이다 */
export interface ConfirmResetResponse {
  /** true면 다른 기기 세션 폐기가 실패 — #donepartial 렌더, 서버는 계속 재시도 */
  revokeFailed: boolean
}

/**
 * 케이스 계약 · AUTH-05 전량 (구현 근거)
 * PR_INACTIVE_ACCOUNT(v1 라운드)는 삭제됐다 — 미활성 계정은 ①요청 단계에서 이미
 * 항상 202로 균일 처리되고, 토큰 검증 단계에서는 애초에 발생하지 않는 케이스다.
 */
export type PasswordResetErrorCode =
  | 'RESET_TOKEN_EXPIRED' // 2 — 링크 만료
  | 'RESET_TOKEN_USED' // 3 — 이미 사용됨 (2와 같은 화면)
  | 'RESET_TOKEN_INVALID' // 4(신규) — 위변조·목적 불일치, 보안 로그
  | 'SAME_AS_CURRENT' // 6(신규) — 지금 쓰는 비밀번호와 같음
  | 'RESET_FAILED' // 7 — 저장 실패·롤백 (비밀번호 아직 안 바뀜)

export interface PasswordResetApiError {
  code: PasswordResetErrorCode
}
