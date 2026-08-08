/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import { findOrganizationOperationSettings, findUsage, findCohortCost } from './usageApi'
import { usageKeys } from './usageKeys'
import type {
  findOrganizationOperationSettings_Path,
  findOrganizationOperationSettings_Response,
  findUsage_Path,
  findUsage_Query,
  findUsage_Response,
  findCohortCost_Path,
  findCohortCost_Query,
  findCohortCost_Response,
} from './usageTypes'

/** 기관 운영 설정 조회 */
export function useFindOrganizationOperationSettings(
  params: { path: findOrganizationOperationSettings_Path },
  options?: QueryOptions<findOrganizationOperationSettings_Response>,
) {
  return useQuery({
    queryKey: usageKeys.findOrganizationOperationSettings(params),
    queryFn: ({ signal }) => findOrganizationOperationSettings({ ...params, signal }),
    ...options,
  })
}

/** 기관 월별 저장량·활동·AI 비용 조회 */
export function useFindUsage(
  params: { path: findUsage_Path; query?: findUsage_Query },
  options?: QueryOptions<findUsage_Response>,
) {
  return useQuery({
    queryKey: usageKeys.findUsage(params),
    queryFn: ({ signal }) => findUsage({ ...params, signal }),
    ...options,
  })
}

/** 기수 비용 조회 (OP-06 ⑤) */
export function useFindCohortCost(
  params: { path: findCohortCost_Path; query: findCohortCost_Query },
  options?: QueryOptions<findCohortCost_Response>,
) {
  return useQuery({
    queryKey: usageKeys.findCohortCost(params),
    queryFn: ({ signal }) => findCohortCost({ ...params, signal }),
    ...options,
  })
}
