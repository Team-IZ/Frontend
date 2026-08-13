/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import { findProjectEvaluationSummary, findTraineeEvaluationDetail } from './evaluationApi'
import { evaluationKeys } from './evaluationKeys'
import type {
  findProjectEvaluationSummary_Path,
  findProjectEvaluationSummary_Query,
  findProjectEvaluationSummary_Response,
  findTraineeEvaluationDetail_Path,
  findTraineeEvaluationDetail_Query,
  findTraineeEvaluationDetail_Response,
} from './evaluationTypes'

/** [프로젝트 상세 - 결과 탭] 프로젝트 회차 결과 종합 조회 (매니저) */
export function useFindProjectEvaluationSummary(
  params: { path: findProjectEvaluationSummary_Path; query?: findProjectEvaluationSummary_Query },
  options?: QueryOptions<findProjectEvaluationSummary_Response>,
) {
  return useQuery({
    queryKey: evaluationKeys.findProjectEvaluationSummary(params),
    queryFn: ({ signal }) => findProjectEvaluationSummary({ ...params, signal }),
    ...options,
  })
}

/** [프로젝트 상세 - 결과 탭] 교육생 채점 결과 상세 조회 (매니저) */
export function useFindTraineeEvaluationDetail(
  params: { path: findTraineeEvaluationDetail_Path; query?: findTraineeEvaluationDetail_Query },
  options?: QueryOptions<findTraineeEvaluationDetail_Response>,
) {
  return useQuery({
    queryKey: evaluationKeys.findTraineeEvaluationDetail(params),
    queryFn: ({ signal }) => findTraineeEvaluationDetail({ ...params, signal }),
    ...options,
  })
}
