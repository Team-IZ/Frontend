/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MutationOptions } from '@/api/_contract'
import {
  replaceManagerClassrooms,
  updateMyCommitEmail,
  inviteManager,
  resendManagerInvitation,
  registerTrainees,
  resendTraineeInvitations,
  previewTrainees,
  updateManagerStatus,
  updateTraineeStatus,
  cancelManagerInvitation,
} from './memberApi'
import { memberKeys } from './memberKeys'
import type {
  replaceManagerClassrooms_Path,
  replaceManagerClassrooms_Body,
  replaceManagerClassrooms_Response,
  updateMyCommitEmail_Body,
  updateMyCommitEmail_Response,
  inviteManager_Path,
  inviteManager_Body,
  inviteManager_Response,
  resendManagerInvitation_Path,
  resendManagerInvitation_Response,
  registerTrainees_Path,
  registerTrainees_Body,
  registerTrainees_Response,
  resendTraineeInvitations_Path,
  resendTraineeInvitations_Body,
  resendTraineeInvitations_Response,
  previewTrainees_Path,
  previewTrainees_Body,
  previewTrainees_Response,
  updateManagerStatus_Path,
  updateManagerStatus_Body,
  updateManagerStatus_Response,
  updateTraineeStatus_Path,
  updateTraineeStatus_Body,
  updateTraineeStatus_Response,
  cancelManagerInvitation_Path,
  cancelManagerInvitation_Response,
} from './memberTypes'

/*
  쓰기가 성공하면 **이 도메인의 조회를 전부 무효화한다.** 무엇을 다시 읽어야 하는지는
  스펙에 없는 도메인 지식이라 생성기가 정확히 알 수 없다 — 넓게 지우면 틀리지 않는다.
  더 좁히고 싶으면 `options.onSuccess`에서 직접 무효화하고, 기본 동작은 그대로 둔다.
*/
/** 매니저 담당 반 전체 교체 */
export function useReplaceManagerClassrooms(
  options?: MutationOptions<
    replaceManagerClassrooms_Response,
    { path: replaceManagerClassrooms_Path; body: replaceManagerClassrooms_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      path: replaceManagerClassrooms_Path
      body: replaceManagerClassrooms_Body
    }) => replaceManagerClassrooms(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: memberKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 내 커밋 이메일 등록·변경 */
export function useUpdateMyCommitEmail(
  options?: MutationOptions<updateMyCommitEmail_Response, { body: updateMyCommitEmail_Body }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: updateMyCommitEmail_Body }) => updateMyCommitEmail(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: memberKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 매니저 초대 */
export function useInviteManager(
  options?: MutationOptions<
    inviteManager_Response,
    { path: inviteManager_Path; body: inviteManager_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: inviteManager_Path; body: inviteManager_Body }) =>
      inviteManager(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: memberKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 매니저 초대 재발송 */
export function useResendManagerInvitation(
  options?: MutationOptions<
    resendManagerInvitation_Response,
    { path: resendManagerInvitation_Path }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: resendManagerInvitation_Path }) => resendManagerInvitation(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: memberKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 직접 입력 교육생 등록 및 초대 */
export function useRegisterTrainees(
  options?: MutationOptions<
    registerTrainees_Response,
    { path: registerTrainees_Path; body: registerTrainees_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: registerTrainees_Path; body: registerTrainees_Body }) =>
      registerTrainees(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: memberKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 교육생 초대 재발송 */
export function useResendTraineeInvitations(
  options?: MutationOptions<
    resendTraineeInvitations_Response,
    { path: resendTraineeInvitations_Path; body: resendTraineeInvitations_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      path: resendTraineeInvitations_Path
      body: resendTraineeInvitations_Body
    }) => resendTraineeInvitations(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: memberKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 직접 입력 교육생 명단 사전 검증(드라이런) */
export function usePreviewTrainees(
  options?: MutationOptions<
    previewTrainees_Response,
    { path: previewTrainees_Path; body: previewTrainees_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: previewTrainees_Path; body: previewTrainees_Body }) =>
      previewTrainees(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: memberKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 매니저 계정 정지 / 재활성 */
export function useUpdateManagerStatus(
  options?: MutationOptions<
    updateManagerStatus_Response,
    { path: updateManagerStatus_Path; body: updateManagerStatus_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: updateManagerStatus_Path; body: updateManagerStatus_Body }) =>
      updateManagerStatus(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: memberKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 교육생 계정 상태 변경 */
export function useUpdateTraineeStatus(
  options?: MutationOptions<
    updateTraineeStatus_Response,
    { path: updateTraineeStatus_Path; body: updateTraineeStatus_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: updateTraineeStatus_Path; body: updateTraineeStatus_Body }) =>
      updateTraineeStatus(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: memberKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 매니저 초대 취소 */
export function useCancelManagerInvitation(
  options?: MutationOptions<
    cancelManagerInvitation_Response,
    { path: cancelManagerInvitation_Path }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: cancelManagerInvitation_Path }) => cancelManagerInvitation(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: memberKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}
