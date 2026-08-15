/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import { findSessionProblem, findCurrentSession, getMyAssessmentRounds } from './assessmentApi'
import { assessmentKeys } from './assessmentKeys'
import type {
  findSessionProblem_Path,
  findSessionProblem_Response,
  findCurrentSession_Response,
  getMyAssessmentRounds_Response,
} from './assessmentTypes'

/** 문제 하나의 코드·질문·문답 조회 */
export function useFindSessionProblem(
  params: { path: findSessionProblem_Path },
  options?: QueryOptions<findSessionProblem_Response>,
) {
  return useQuery({
    queryKey: assessmentKeys.findSessionProblem(params),
    queryFn: ({ signal }) => findSessionProblem({ ...params, signal }),
    ...options,
  })
}

/** 지금 이어서 할 세션 조회 */
export function useFindCurrentSession(options?: QueryOptions<findCurrentSession_Response>) {
  return useQuery({
    queryKey: assessmentKeys.findCurrentSession(),
    queryFn: ({ signal }) => findCurrentSession({ signal }),
    ...options,
  })
}

/** 교육생 홈 3구획 조회 */
export function useGetMyAssessmentRounds(options?: QueryOptions<getMyAssessmentRounds_Response>) {
  return useQuery({
    queryKey: assessmentKeys.getMyAssessmentRounds(),
    queryFn: ({ signal }) => getMyAssessmentRounds({ signal }),
    ...options,
  })
}
