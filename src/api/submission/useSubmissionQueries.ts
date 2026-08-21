/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import {
  getSubmissionAnalysis,
  getSubmissionAnalysisResult,
  findProjectSubmissionStatus,
  findMySubmission,
} from './submissionApi'
import { submissionKeys } from './submissionKeys'
import type {
  getSubmissionAnalysis_Path,
  getSubmissionAnalysis_Response,
  getSubmissionAnalysisResult_Path,
  getSubmissionAnalysisResult_Response,
  findProjectSubmissionStatus_Path,
  findProjectSubmissionStatus_Query,
  findProjectSubmissionStatus_Response,
  findMySubmission_Path,
  findMySubmission_Response,
} from './submissionTypes'

/** 코드 분석 진행 상태·실패 사유 조회 */
export function useGetSubmissionAnalysis(
  params: { path: getSubmissionAnalysis_Path },
  options?: QueryOptions<getSubmissionAnalysis_Response>,
) {
  return useQuery({
    queryKey: submissionKeys.getSubmissionAnalysis(params),
    queryFn: ({ signal }) => getSubmissionAnalysis({ ...params, signal }),
    ...options,
  })
}

/** 코드 분석 결과 조회 */
export function useGetSubmissionAnalysisResult(
  params: { path: getSubmissionAnalysisResult_Path },
  options?: QueryOptions<getSubmissionAnalysisResult_Response>,
) {
  return useQuery({
    queryKey: submissionKeys.getSubmissionAnalysisResult(params),
    queryFn: ({ signal }) => getSubmissionAnalysisResult({ ...params, signal }),
    ...options,
  })
}

/** [프로젝트 상세 - 제출현황 탭] 프로젝트 회차 제출 현황 조회 (매니저) */
export function useFindProjectSubmissionStatus(
  params: { path: findProjectSubmissionStatus_Path; query?: findProjectSubmissionStatus_Query },
  options?: QueryOptions<findProjectSubmissionStatus_Response>,
) {
  return useQuery({
    queryKey: submissionKeys.findProjectSubmissionStatus(params),
    queryFn: ({ signal }) => findProjectSubmissionStatus({ ...params, signal }),
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
