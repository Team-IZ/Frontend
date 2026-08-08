/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MutationOptions } from '@/api/_contract'
import {
  activateTrainee,
  refresh,
  validatePasswordResetToken,
  requestPasswordReset,
  confirmPasswordReset,
  signupManager,
  logout,
  login,
  resolveInvitation,
  resendAccountInvitation,
} from './authApi'
import { authKeys } from './authKeys'
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

/*
  쓰기가 성공하면 **이 도메인의 조회를 전부 무효화한다.** 무엇을 다시 읽어야 하는지는
  스펙에 없는 도메인 지식이라 생성기가 정확히 알 수 없다 — 넓게 지우면 틀리지 않는다.
  더 좁히고 싶으면 `options.onSuccess`에서 직접 무효화하고, 기본 동작은 그대로 둔다.
*/
/** 초대받은 교육생 계정 활성화 */
export function useActivateTrainee(
  options?: MutationOptions<activateTrainee_Response, { body: activateTrainee_Body }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: activateTrainee_Body }) => activateTrainee(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: authKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 액세스 토큰 재발급 */
export function useRefresh(options?: MutationOptions<refresh_Response, void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => refresh(),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: authKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 재설정 토큰 사전 검증 */
export function useValidatePasswordResetToken(
  options?: MutationOptions<
    validatePasswordResetToken_Response,
    { body: validatePasswordResetToken_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: validatePasswordResetToken_Body }) =>
      validatePasswordResetToken(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: authKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 비밀번호 재설정 안내 요청 */
export function useRequestPasswordReset(
  options?: MutationOptions<requestPasswordReset_Response, { body: requestPasswordReset_Body }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: requestPasswordReset_Body }) => requestPasswordReset(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: authKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 비밀번호 재설정 확정 */
export function useConfirmPasswordReset(
  options?: MutationOptions<confirmPasswordReset_Response, { body: confirmPasswordReset_Body }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: confirmPasswordReset_Body }) => confirmPasswordReset(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: authKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 초대받은 오퍼레이터·매니저 가입 */
export function useSignupManager(
  options?: MutationOptions<signupManager_Response, { body: signupManager_Body }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: signupManager_Body }) => signupManager(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: authKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 로그아웃 */
export function useLogout(options?: MutationOptions<logout_Response, void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => logout(),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: authKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 통합 로그인 */
export function useLogin(options?: MutationOptions<login_Response, { body: login_Body }>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: login_Body }) => login(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: authKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 초대 토큰 해석 */
export function useResolveInvitation(
  options?: MutationOptions<resolveInvitation_Response, { body: resolveInvitation_Body }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: resolveInvitation_Body }) => resolveInvitation(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: authKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 초대 메일 재발송 */
export function useResendAccountInvitation(
  options?: MutationOptions<
    resendAccountInvitation_Response,
    { body: resendAccountInvitation_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: resendAccountInvitation_Body }) => resendAccountInvitation(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: authKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}
