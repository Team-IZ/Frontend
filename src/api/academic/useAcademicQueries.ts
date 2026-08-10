/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import { findCohorts, findClassrooms, findCohort, findMyEnrollments } from './academicApi'
import { academicKeys } from './academicKeys'
import type {
  findCohorts_Query,
  findCohorts_Response,
  findClassrooms_Path,
  findClassrooms_Response,
  findCohort_Path,
  findCohort_Response,
  findMyEnrollments_Response,
} from './academicTypes'

/** 기관 기수 목록 조회 */
export function useFindCohorts(
  params: { query?: findCohorts_Query } = {},
  options?: QueryOptions<findCohorts_Response>,
) {
  return useQuery({
    queryKey: academicKeys.findCohorts(params),
    queryFn: ({ signal }) => findCohorts({ ...params, signal }),
    ...options,
  })
}

/** 기수 반 목록 조회 */
export function useFindClassrooms(
  params: { path: findClassrooms_Path },
  options?: QueryOptions<findClassrooms_Response>,
) {
  return useQuery({
    queryKey: academicKeys.findClassrooms(params),
    queryFn: ({ signal }) => findClassrooms({ ...params, signal }),
    ...options,
  })
}

/** 기수 상세 조회 */
export function useFindCohort(
  params: { path: findCohort_Path },
  options?: QueryOptions<findCohort_Response>,
) {
  return useQuery({
    queryKey: academicKeys.findCohort(params),
    queryFn: ({ signal }) => findCohort({ ...params, signal }),
    ...options,
  })
}

/** 내 소속 기수·반 조회 */
export function useFindMyEnrollments(options?: QueryOptions<findMyEnrollments_Response>) {
  return useQuery({
    queryKey: academicKeys.findMyEnrollments(),
    queryFn: ({ signal }) => findMyEnrollments({ signal }),
    ...options,
  })
}
