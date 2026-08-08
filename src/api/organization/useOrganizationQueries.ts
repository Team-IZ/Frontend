/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import {
  findOrganizations,
  findOrganization,
  findOperators,
  findOrganizationCohorts,
  findPlatformSummary,
  checkNameAvailability,
} from './organizationApi'
import { organizationKeys } from './organizationKeys'
import type {
  findOrganizations_Query,
  findOrganizations_Response,
  findOrganization_Path,
  findOrganization_Response,
  findOperators_Path,
  findOperators_Response,
  findOrganizationCohorts_Path,
  findOrganizationCohorts_Response,
  findPlatformSummary_Response,
  checkNameAvailability_Query,
  checkNameAvailability_Response,
} from './organizationTypes'

/** 기관 목록 조회 */
export function useFindOrganizations(
  params: { query?: findOrganizations_Query } = {},
  options?: QueryOptions<findOrganizations_Response>,
) {
  return useQuery({
    queryKey: organizationKeys.findOrganizations(params),
    queryFn: ({ signal }) => findOrganizations({ ...params, signal }),
    ...options,
  })
}

/** 기관 상세 조회 */
export function useFindOrganization(
  params: { path: findOrganization_Path },
  options?: QueryOptions<findOrganization_Response>,
) {
  return useQuery({
    queryKey: organizationKeys.findOrganization(params),
    queryFn: ({ signal }) => findOrganization({ ...params, signal }),
    ...options,
  })
}

/** 기관 오퍼레이터 계정 목록 조회 */
export function useFindOperators(
  params: { path: findOperators_Path },
  options?: QueryOptions<findOperators_Response>,
) {
  return useQuery({
    queryKey: organizationKeys.findOperators(params),
    queryFn: ({ signal }) => findOperators({ ...params, signal }),
    ...options,
  })
}

/** 기관 기수 목록 조회 (읽기전용) */
export function useFindOrganizationCohorts(
  params: { path: findOrganizationCohorts_Path },
  options?: QueryOptions<findOrganizationCohorts_Response>,
) {
  return useQuery({
    queryKey: organizationKeys.findOrganizationCohorts(params),
    queryFn: ({ signal }) => findOrganizationCohorts({ ...params, signal }),
    ...options,
  })
}

/** 플랫폼 전체 집계 조회 */
export function useFindPlatformSummary(options?: QueryOptions<findPlatformSummary_Response>) {
  return useQuery({
    queryKey: organizationKeys.findPlatformSummary(),
    queryFn: ({ signal }) => findPlatformSummary({ signal }),
    ...options,
  })
}

/** 기관명 중복 확인 */
export function useCheckNameAvailability(
  params: { query: checkNameAvailability_Query },
  options?: QueryOptions<checkNameAvailability_Response>,
) {
  return useQuery({
    queryKey: organizationKeys.checkNameAvailability(params),
    queryFn: ({ signal }) => checkNameAvailability({ ...params, signal }),
    ...options,
  })
}
