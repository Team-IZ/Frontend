/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MutationOptions } from '@/api/_contract'
import {
  updateTierModel,
  updateModelPricing,
  updateGradingModel,
  inviteSuperAdmin,
  updateSuperAdminStatus,
} from './platformApi'
import { platformKeys } from './platformKeys'
import type {
  updateTierModel_Body,
  updateTierModel_Response,
  updateModelPricing_Path,
  updateModelPricing_Body,
  updateModelPricing_Response,
  updateGradingModel_Body,
  updateGradingModel_Response,
  inviteSuperAdmin_Body,
  inviteSuperAdmin_Response,
  updateSuperAdminStatus_Path,
  updateSuperAdminStatus_Body,
  updateSuperAdminStatus_Response,
} from './platformTypes'

/*
  쓰기가 성공하면 **이 도메인의 조회를 전부 무효화한다.** 무엇을 다시 읽어야 하는지는
  스펙에 없는 도메인 지식이라 생성기가 정확히 알 수 없다 — 넓게 지우면 틀리지 않는다.
  더 좁히고 싶으면 `options.onSuccess`에서 직접 무효화하고, 기본 동작은 그대로 둔다.
*/
/** 티어 ↔ 모델 매핑 변경 */
export function useUpdateTierModel(
  options?: MutationOptions<updateTierModel_Response, { body: updateTierModel_Body }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: updateTierModel_Body }) => updateTierModel(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: platformKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 모델 단가 수정 */
export function useUpdateModelPricing(
  options?: MutationOptions<
    updateModelPricing_Response,
    { path: updateModelPricing_Path; body: updateModelPricing_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: updateModelPricing_Path; body: updateModelPricing_Body }) =>
      updateModelPricing(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: platformKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 채점 모델 변경 (전 기관 재캘리브레이션 유발) */
export function useUpdateGradingModel(
  options?: MutationOptions<updateGradingModel_Response, { body: updateGradingModel_Body }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: updateGradingModel_Body }) => updateGradingModel(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: platformKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 슈퍼어드민 초대 */
export function useInviteSuperAdmin(
  options?: MutationOptions<inviteSuperAdmin_Response, { body: inviteSuperAdmin_Body }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: inviteSuperAdmin_Body }) => inviteSuperAdmin(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: platformKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 슈퍼어드민 정지 · 재활성 */
export function useUpdateSuperAdminStatus(
  options?: MutationOptions<
    updateSuperAdminStatus_Response,
    { path: updateSuperAdminStatus_Path; body: updateSuperAdminStatus_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: updateSuperAdminStatus_Path; body: updateSuperAdminStatus_Body }) =>
      updateSuperAdminStatus(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: platformKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}
