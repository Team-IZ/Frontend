/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MutationOptions } from '@/api/_contract'
import { updateOrganizationOperationSettings } from './usageApi'
import { usageKeys } from './usageKeys'
import type {
  updateOrganizationOperationSettings_Path,
  updateOrganizationOperationSettings_Body,
  updateOrganizationOperationSettings_Response,
} from './usageTypes'

/*
  쓰기가 성공하면 **이 도메인의 조회를 전부 무효화한다.** 무엇을 다시 읽어야 하는지는
  스펙에 없는 도메인 지식이라 생성기가 정확히 알 수 없다 — 넓게 지우면 틀리지 않는다.
  더 좁히고 싶으면 `options.onSuccess`에서 직접 무효화하고, 기본 동작은 그대로 둔다.
*/
/** 기관 운영 설정 변경 */
export function useUpdateOrganizationOperationSettings(
  options?: MutationOptions<
    updateOrganizationOperationSettings_Response,
    {
      path: updateOrganizationOperationSettings_Path
      body: updateOrganizationOperationSettings_Body
    }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      path: updateOrganizationOperationSettings_Path
      body: updateOrganizationOperationSettings_Body
    }) => updateOrganizationOperationSettings(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: usageKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}
