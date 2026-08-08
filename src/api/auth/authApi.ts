/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  activateTrainee_Body,
  activateTrainee_Response,
  refresh_Response,
  validatePasswordResetToken_Body,
  validatePasswordResetToken_Response,
  requestPasswordReset_Body,
  requestPasswordReset_Response,
  confirmPasswordReset_Body,
  confirmPasswordReset_Response,
  signupManager_Body,
  signupManager_Response,
  logout_Response,
  login_Body,
  login_Response,
  resolveInvitation_Body,
  resolveInvitation_Response,
  resendAccountInvitation_Body,
  resendAccountInvitation_Response,
} from './authTypes'

/** 초대받은 교육생 계정 활성화 — `POST /api/v0/auth/trainee-activation` */
export const activateTrainee = (params: { body: activateTrainee_Body } & RequestOptions) =>
  unwrap<activateTrainee_Response>(
    izClient.POST('/api/v0/auth/trainee-activation', {
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 액세스 토큰 재발급 — `POST /api/v0/auth/refresh` */
export const refresh = (params: RequestOptions = {}) =>
  unwrap<refresh_Response>(
    izClient.POST('/api/v0/auth/refresh', {
      params: { cookie: undefined as never },
      signal: params.signal,
    }) as never,
  )

/** 재설정 토큰 사전 검증 — `POST /api/v0/auth/password-reset/validations` */
export const validatePasswordResetToken = (
  params: { body: validatePasswordResetToken_Body } & RequestOptions,
) =>
  unwrap<validatePasswordResetToken_Response>(
    izClient.POST('/api/v0/auth/password-reset/validations', {
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 비밀번호 재설정 안내 요청 — `POST /api/v0/auth/password-reset/requests` */
export const requestPasswordReset = (
  params: { body: requestPasswordReset_Body } & RequestOptions,
) =>
  unwrap<requestPasswordReset_Response>(
    izClient.POST('/api/v0/auth/password-reset/requests', {
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 비밀번호 재설정 확정 — `POST /api/v0/auth/password-reset/confirmations` */
export const confirmPasswordReset = (
  params: { body: confirmPasswordReset_Body } & RequestOptions,
) =>
  unwrap<confirmPasswordReset_Response>(
    izClient.POST('/api/v0/auth/password-reset/confirmations', {
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 초대받은 오퍼레이터·매니저 가입 — `POST /api/v0/auth/manager-signup` */
export const signupManager = (params: { body: signupManager_Body } & RequestOptions) =>
  unwrap<signupManager_Response>(
    izClient.POST('/api/v0/auth/manager-signup', {
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 로그아웃 — `POST /api/v0/auth/logout` */
export const logout = (params: RequestOptions = {}) =>
  unwrap<logout_Response>(
    izClient.POST('/api/v0/auth/logout', {
      params: { cookie: undefined as never },
      signal: params.signal,
    }) as never,
  )

/** 통합 로그인 — `POST /api/v0/auth/login` */
export const login = (params: { body: login_Body } & RequestOptions) =>
  unwrap<login_Response>(
    izClient.POST('/api/v0/auth/login', { body: params.body, signal: params.signal }) as never,
  )

/** 초대 토큰 해석 — `POST /api/v0/auth/invitations/resolve` */
export const resolveInvitation = (params: { body: resolveInvitation_Body } & RequestOptions) =>
  unwrap<resolveInvitation_Response>(
    izClient.POST('/api/v0/auth/invitations/resolve', {
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 초대 메일 재발송 — `POST /api/v0/auth/invitations/resend` */
export const resendAccountInvitation = (
  params: { body: resendAccountInvitation_Body } & RequestOptions,
) =>
  unwrap<resendAccountInvitation_Response>(
    izClient.POST('/api/v0/auth/invitations/resend', {
      body: params.body,
      signal: params.signal,
    }) as never,
  )
