/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import {
  findMyReports,
  findMyReport,
  findManagedTraineeReports,
  findClassDiagnosis,
} from './reportingApi'
import { reportingKeys } from './reportingKeys'
import type {
  findMyReports_Response,
  findMyReport_Path,
  findMyReport_Response,
  findManagedTraineeReports_Query,
  findManagedTraineeReports_Response,
  findClassDiagnosis_Query,
  findClassDiagnosis_Response,
} from './reportingTypes'

/** 내 리포트 전량 조회 */
export function useFindMyReports(options?: QueryOptions<findMyReports_Response>) {
  return useQuery({
    queryKey: reportingKeys.findMyReports(),
    queryFn: ({ signal }) => findMyReports({ signal }),
    ...options,
  })
}

/** 리포트 단건 조회 */
export function useFindMyReport(
  params: { path: findMyReport_Path },
  options?: QueryOptions<findMyReport_Response>,
) {
  return useQuery({
    queryKey: reportingKeys.findMyReport(params),
    queryFn: ({ signal }) => findMyReport({ ...params, signal }),
    ...options,
  })
}

/** 담당 교육생 리포트 조회 (매니저) */
export function useFindManagedTraineeReports(
  params: { query: findManagedTraineeReports_Query },
  options?: QueryOptions<findManagedTraineeReports_Response>,
) {
  return useQuery({
    queryKey: reportingKeys.findManagedTraineeReports(params),
    queryFn: ({ signal }) => findManagedTraineeReports({ ...params, signal }),
    ...options,
  })
}

/** 수업 진단 리포트 조회 */
export function useFindClassDiagnosis(
  params: { query: findClassDiagnosis_Query },
  options?: QueryOptions<findClassDiagnosis_Response>,
) {
  return useQuery({
    queryKey: reportingKeys.findClassDiagnosis(params),
    queryFn: ({ signal }) => findClassDiagnosis({ ...params, signal }),
    ...options,
  })
}
