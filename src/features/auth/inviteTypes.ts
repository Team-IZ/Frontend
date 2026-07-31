// ─────────────────────────────────────────────────────────────
// 초대 가입·활성화 API 계약 · 출처: docs/plan/v2/wireframe/shared/signup-activation.html#cases (mockup c6911c0)
// ─────────────────────────────────────────────────────────────

/** 초대 토큰 유형 — 서버가 판정하며 사용자가 선택하지 않음 */
export type InviteType = 'MANAGER' | 'TRAINEE'

/** GET /auth/invite/{token} 응답 — 이 값으로 폼 변형(A/B)이 결정됨 */
export interface InviteInfo {
  inviteType: InviteType
  email: string // 초대값 · 화면에서 읽기전용 (D13)
}

/** POST /auth/signup (변형 A · 오퍼레이터·매니저) */
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
 * 케이스 계약 · AUTH-01 + AUTH-06 전량 (구현 근거, 두 변형 공통)
 * v1의 A/B 번호 체계를 버리고 서버 응답 코드 이름으로 통일했다.
 */
export type InviteErrorCode =
  | 'INVITE_EXPIRED' // A1·B2 — 초대 토큰 만료
  | 'INVITE_USED' // A2·B4 — 이미 가입·활성화됨
  | 'ACCOUNT_EXISTS' // B5(신규) — 재수강생, 화면은 INVITE_USED와 동일
  | 'INVITE_INVALID' // A3·B8 — 위변조·다른 기수 토큰
  | 'NOT_IN_ROSTER' // B1 — 명단 외 이메일(변형 B만)
  | 'SIGNUP_FAILED' // A7·B7·CS3 — 저장 실패·롤백

export interface InviteApiError {
  code: InviteErrorCode
  /** 만료·이미 활성화됨 등 상태 카드가 이메일을 보여줘야 하는 코드에서만 내려옴 */
  email?: string
}
