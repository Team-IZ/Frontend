/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Header · _Response · _Item · _Errors
*/

// POST /api/v0/auth/trainee-activation — 초대받은 교육생 계정 활성화
export type activateTrainee_Body = NonNullable<
  operations['activateTrainee']['requestBody']
>['content']['application/json']
export type activateTrainee_Response =
  operations['activateTrainee']['responses'][200]['content']['application/json']
export type activateTrainee_Errors =
  | 'INVITATION_INVALID'
  | 'PASSWORD_CONFIRMATION_MISMATCH'
  | 'REQUIRED_CONSENT_MISSING'
  | 'INVITATION_NOT_IN_ROSTER'
  | 'INVITATION_ALREADY_ACCEPTED'
  | 'ACTIVATION_STATE_CHANGED'
  | 'INVITATION_EXPIRED'
  | 'WEAK_PASSWORD'

// POST /api/v0/auth/refresh — 액세스 토큰 재발급
export type refresh_Response =
  operations['refresh']['responses'][200]['content']['application/json']
export type refresh_Errors =
  | 'REFRESH_TOKEN_INVALID'
  | 'REFRESH_IDENTITY_CHANGED'
  | 'LOGIN_ACCOUNT_INACTIVE'
  | 'LOGIN_ORG_SUSPENDED'
  | 'LOGIN_ORIGIN_NOT_ALLOWED'
  | 'PASSWORD_EXPIRED'
  | 'LOGIN_TEMPORARILY_BLOCKED'
  | 'LOGIN_NO_ORG_CONTEXT'

// POST /api/v0/auth/password-reset/validations — 재설정 토큰 사전 검증
export type validatePasswordResetToken_Body = NonNullable<
  operations['validatePasswordResetToken']['requestBody']
>['content']['application/json']
export type validatePasswordResetToken_Response =
  operations['validatePasswordResetToken']['responses'][200]['content']['application/json']
export type validatePasswordResetToken_Errors =
  'RESET_TOKEN_INVALID' | 'RESET_TOKEN_USED' | 'RESET_TOKEN_EXPIRED'

// POST /api/v0/auth/password-reset/requests — 비밀번호 재설정 안내 요청
export type requestPasswordReset_Body = NonNullable<
  operations['requestPasswordReset']['requestBody']
>['content']['application/json']
export type requestPasswordReset_Response =
  operations['requestPasswordReset']['responses'][202]['content']['application/json']
export type requestPasswordReset_Errors = 'VALIDATION_FAILED'

// POST /api/v0/auth/password-reset/confirmations — 비밀번호 재설정 확정
export type confirmPasswordReset_Body = NonNullable<
  operations['confirmPasswordReset']['requestBody']
>['content']['application/json']
export type confirmPasswordReset_Response =
  operations['confirmPasswordReset']['responses'][200]['content']['application/json']
export type confirmPasswordReset_Errors =
  | 'RESET_TOKEN_INVALID'
  | 'VALIDATION_FAILED'
  | 'RESET_TOKEN_USED'
  | 'RESET_TOKEN_EXPIRED'
  | 'WEAK_PASSWORD'
  | 'SAME_AS_CURRENT'
  | 'RESET_FAILED'

// POST /api/v0/auth/manager-signup — 초대받은 오퍼레이터·매니저 가입
export type signupManager_Body = NonNullable<
  operations['signupManager']['requestBody']
>['content']['application/json']
export type signupManager_Response =
  operations['signupManager']['responses'][200]['content']['application/json']
export type signupManager_Errors =
  | 'INVITATION_INVALID'
  | 'PASSWORD_CONFIRMATION_MISMATCH'
  | 'REQUIRED_CONSENT_MISSING'
  | 'INVITATION_ALREADY_ACCEPTED'
  | 'ACTIVATION_STATE_CHANGED'
  | 'INVITATION_EXPIRED'
  | 'WEAK_PASSWORD'

// POST /api/v0/auth/logout — 로그아웃
export type logout_Response = void
export type logout_Errors = 'LOGIN_ORIGIN_NOT_ALLOWED'

// POST /api/v0/auth/login — 통합 로그인
export type login_Body = NonNullable<
  operations['login']['requestBody']
>['content']['application/json']
export type login_Response = operations['login']['responses'][200]['content']['application/json']
export type login_Errors =
  | 'VALIDATION_FAILED'
  | 'LOGIN_INVALID'
  | 'LOGIN_ACCOUNT_INACTIVE'
  | 'LOGIN_ORG_SUSPENDED'
  | 'LOGIN_ORIGIN_NOT_ALLOWED'
  | 'PASSWORD_EXPIRED'
  | 'LOGIN_TEMPORARILY_BLOCKED'
  | 'LOGIN_NO_ORG_CONTEXT'

// POST /api/v0/auth/invitations/resolve — 초대 토큰 해석
export type resolveInvitation_Body = NonNullable<
  operations['resolveInvitation']['requestBody']
>['content']['application/json']
export type resolveInvitation_Response =
  operations['resolveInvitation']['responses'][200]['content']['application/json']
export type resolveInvitation_Errors =
  | 'INVITATION_INVALID'
  | 'INVITATION_NOT_IN_ROSTER'
  | 'INVITATION_ALREADY_ACCEPTED'
  | 'INVITATION_EXPIRED'

// POST /api/v0/auth/invitations/resend — 초대 메일 재발송
export type resendAccountInvitation_Body = NonNullable<
  operations['resendAccountInvitation']['requestBody']
>['content']['application/json']
export type resendAccountInvitation_Response =
  operations['resendAccountInvitation']['responses'][202]['content']['application/json']
export type resendAccountInvitation_Errors = 'VALIDATION_FAILED'
