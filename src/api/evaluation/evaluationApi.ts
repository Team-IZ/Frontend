/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  findProjectEvaluationSummary_Path,
  findProjectEvaluationSummary_Query,
  findProjectEvaluationSummary_Response,
  findTraineeEvaluationDetail_Path,
  findTraineeEvaluationDetail_Query,
  findTraineeEvaluationDetail_Response,
} from './evaluationTypes'

/** [프로젝트 상세 - 결과 탭] 프로젝트 회차 결과 종합 조회 (매니저) — `GET /api/v0/projects/{projectId}/evaluations` */
export const findProjectEvaluationSummary = (
  params: {
    path: findProjectEvaluationSummary_Path
    query?: findProjectEvaluationSummary_Query
  } & RequestOptions,
) =>
  unwrap<findProjectEvaluationSummary_Response>(
    izClient.GET('/api/v0/projects/{projectId}/evaluations', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )

/** [프로젝트 상세 - 결과 탭] 교육생 채점 결과 상세 조회 (매니저) — `GET /api/v0/projects/{projectId}/evaluations/{userId}` */
export const findTraineeEvaluationDetail = (
  params: {
    path: findTraineeEvaluationDetail_Path
    query?: findTraineeEvaluationDetail_Query
  } & RequestOptions,
) =>
  unwrap<findTraineeEvaluationDetail_Response>(
    izClient.GET('/api/v0/projects/{projectId}/evaluations/{userId}', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )
