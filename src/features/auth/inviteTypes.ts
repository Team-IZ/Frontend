// ─────────────────────────────────────────────────────────────
// 초대 가입·활성화 API 계약 · 출처: docs/plan/screen/definition/SC-A02-signup-activation.md §5
// ─────────────────────────────────────────────────────────────

/** 초대 토큰 유형 — 서버가 판정하며 사용자가 선택하지 않음 */
export type InviteType = 'MANAGER' | 'TRAINEE'

/** GET /auth/invite/{token} 응답 — 이 값으로 폼 변형(A/B)이 결정됨 */
export interface InviteInfo {
  inviteType: InviteType
  email: string // 초대값 · 화면에서 읽기전용 (D13)
}

/** POST /auth/signup (변형 A · 매니저) */
export interface SignupRequest {
  token: string
  name: string
  password: string
  consents: string[] // 동의한 항목 코드 목록
}

/** POST /auth/activate (변형 B · 교육생) */
export interface ActivateRequest {
  token: string
  password: string
  consents: string[]
}

/**
 * SC-A02 §6 예외 case
 * 코드명을 명세의 case 번호와 1:1로 맞춰 추적이 쉽도록 함
 */
export type InviteErrorCode =
  // 변형 A — 매니저 회원가입 (AUTH-01)
  | 'A1_TOKEN_EXPIRED' // 초대 토큰 만료
  | 'A2_TOKEN_USED' // 토큰 재사용
  | 'A3_TOKEN_INVALID' // 토큰 위변조
  | 'A5_EMAIL_DUPLICATE' // 이메일 중복
  | 'A7_SIGNUP_ROLLBACK' // 계정 생성 실패(롤백)
  // 변형 B — 교육생 계정 활성화 (AUTH-06)
  | 'B1_NOT_IN_ROSTER' // 명단 외 이메일
  | 'B2_TOKEN_EXPIRED' // 초대 토큰 만료
  | 'B3_MAIL_NOT_RECEIVED' // 초대 메일 미수신
  | 'B4_ALREADY_ACTIVE' // 이미 활성화
  | 'B5_EMAIL_DUPLICATE' // 이메일 중복 등록
  | 'B7_ACTIVATE_ROLLBACK' // 상태 저장 실패(롤백)
  | 'B8_INVALID_ORG_TOKEN' // 잘못된 기관·기수 토큰
  // 동의 (D14)
  | 'CS3_CONSENT_SAVE_FAILED' // 동의 저장 실패

export interface InviteApiError {
  code: InviteErrorCode
}
