/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import { findSuperAdmins, findModelSettings } from './platformApi'
import { platformKeys } from './platformKeys'
import type { findSuperAdmins_Response, findModelSettings_Response } from './platformTypes'

/** 슈퍼어드민 계정 목록 */
export function useFindSuperAdmins(options?: QueryOptions<findSuperAdmins_Response>) {
  return useQuery({
    queryKey: platformKeys.findSuperAdmins(),
    queryFn: ({ signal }) => findSuperAdmins({ signal }),
    ...options,
  })
}

/** 플랫폼 모델·단가 설정 조회 */
export function useFindModelSettings(options?: QueryOptions<findModelSettings_Response>) {
  return useQuery({
    queryKey: platformKeys.findModelSettings(),
    queryFn: ({ signal }) => findModelSettings({ signal }),
    ...options,
  })
}
