/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import { getAnalysis, getAnalysisResult, findMySubmission } from './submissionApi'
import { submissionKeys } from './submissionKeys'
import type {
  getAnalysis_Path,
  getAnalysis_Response,
  getAnalysisResult_Path,
  getAnalysisResult_Response,
  findMySubmission_Path,
  findMySubmission_Response,
} from './submissionTypes'

/** 코드 분석 진행 상태·실패 사유 조회 */
export function useGetAnalysis(
  params: { path: getAnalysis_Path },
  options?: QueryOptions<getAnalysis_Response>,
) {
  return useQuery({
    queryKey: submissionKeys.getAnalysis(params),
    queryFn: ({ signal }) => getAnalysis({ ...params, signal }),
    ...options,
  })
}

/** 코드 분석 결과 조회 */
export function useGetAnalysisResult(
  params: { path: getAnalysisResult_Path },
  options?: QueryOptions<getAnalysisResult_Response>,
) {
  return useQuery({
    queryKey: submissionKeys.getAnalysisResult(params),
    queryFn: ({ signal }) => getAnalysisResult({ ...params, signal }),
    ...options,
  })
}

/** 내 팀의 제출 현황 조회 */
export function useFindMySubmission(
  params: { path: findMySubmission_Path },
  options?: QueryOptions<findMySubmission_Response>,
) {
  return useQuery({
    queryKey: submissionKeys.findMySubmission(params),
    queryFn: ({ signal }) => findMySubmission({ ...params, signal }),
    ...options,
  })
}
