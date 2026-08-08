/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MutationOptions } from '@/api/_contract'
import {
  createOrganization,
  restoreOrganization,
  deleteOrganization,
  updateOrganization,
  updateOperatorStatus,
} from './organizationApi'
import { organizationKeys } from './organizationKeys'
import type {
  createOrganization_Body,
  createOrganization_Response,
  restoreOrganization_Path,
  restoreOrganization_Response,
  deleteOrganization_Path,
  deleteOrganization_Body,
  deleteOrganization_Response,
  updateOrganization_Path,
  updateOrganization_Body,
  updateOrganization_Response,
  updateOperatorStatus_Path,
  updateOperatorStatus_Body,
  updateOperatorStatus_Response,
} from './organizationTypes'

/*
  쓰기가 성공하면 **이 도메인의 조회를 전부 무효화한다.** 무엇을 다시 읽어야 하는지는
  스펙에 없는 도메인 지식이라 생성기가 정확히 알 수 없다 — 넓게 지우면 틀리지 않는다.
  더 좁히고 싶으면 `options.onSuccess`에서 직접 무효화하고, 기본 동작은 그대로 둔다.
*/
/** 기관 생성 및 기본 운영 정책 초기화 */
export function useCreateOrganization(
  options?: MutationOptions<createOrganization_Response, { body: createOrganization_Body }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: createOrganization_Body }) => createOrganization(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 기관 복구 */
export function useRestoreOrganization(
  options?: MutationOptions<restoreOrganization_Response, { path: restoreOrganization_Path }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: restoreOrganization_Path }) => restoreOrganization(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 기관 soft-delete */
export function useDeleteOrganization(
  options?: MutationOptions<
    deleteOrganization_Response,
    { path: deleteOrganization_Path; body: deleteOrganization_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: deleteOrganization_Path; body: deleteOrganization_Body }) =>
      deleteOrganization(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 기관 이름 또는 운영 상태 변경 */
export function useUpdateOrganization(
  options?: MutationOptions<
    updateOrganization_Response,
    { path: updateOrganization_Path; body: updateOrganization_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: updateOrganization_Path; body: updateOrganization_Body }) =>
      updateOrganization(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 오퍼레이터 계정 정지 / 재활성 */
export function useUpdateOperatorStatus(
  options?: MutationOptions<
    updateOperatorStatus_Response,
    { path: updateOperatorStatus_Path; body: updateOperatorStatus_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: updateOperatorStatus_Path; body: updateOperatorStatus_Body }) =>
      updateOperatorStatus(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}
