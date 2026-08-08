/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MutationOptions } from '@/api/_contract'
import { inviteManager, registerTrainees, updateTraineeStatus } from './memberApi'
import { memberKeys } from './memberKeys'
import type {
  inviteManager_Path,
  inviteManager_Body,
  inviteManager_Response,
  registerTrainees_Path,
  registerTrainees_Body,
  registerTrainees_Response,
  updateTraineeStatus_Path,
  updateTraineeStatus_Body,
  updateTraineeStatus_Response,
} from './memberTypes'

/*
  쓰기가 성공하면 **이 도메인의 조회를 전부 무효화한다.** 무엇을 다시 읽어야 하는지는
  스펙에 없는 도메인 지식이라 생성기가 정확히 알 수 없다 — 넓게 지우면 틀리지 않는다.
  더 좁히고 싶으면 `options.onSuccess`에서 직접 무효화하고, 기본 동작은 그대로 둔다.
*/
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
