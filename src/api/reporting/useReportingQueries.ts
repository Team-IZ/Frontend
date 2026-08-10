/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import { findClassDiagnosis } from './reportingApi'
import { reportingKeys } from './reportingKeys'
import type { findClassDiagnosis_Query, findClassDiagnosis_Response } from './reportingTypes'

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
