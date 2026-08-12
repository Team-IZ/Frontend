/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import { getMyAssessmentRounds } from './assessmentApi'
import { assessmentKeys } from './assessmentKeys'
import type { getMyAssessmentRounds_Response } from './assessmentTypes'

/** 교육생 홈 3구획 조회 */
export function useGetMyAssessmentRounds(options?: QueryOptions<getMyAssessmentRounds_Response>) {
  return useQuery({
    queryKey: assessmentKeys.getMyAssessmentRounds(),
    queryFn: ({ signal }) => getMyAssessmentRounds({ signal }),
    ...options,
  })
}
