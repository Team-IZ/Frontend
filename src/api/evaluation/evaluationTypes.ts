/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Header · _Response · _Item · _Errors
*/

// GET /api/v0/projects/{projectId}/evaluations — [프로젝트 상세 - 결과 탭] 프로젝트 회차 결과 종합 조회 (매니저)
export type findProjectEvaluationSummary_Path =
  operations['findProjectEvaluationSummary']['parameters']['path']
export type findProjectEvaluationSummary_Query = NonNullable<
  operations['findProjectEvaluationSummary']['parameters']['query']
>
export type findProjectEvaluationSummary_Response =
  operations['findProjectEvaluationSummary']['responses'][200]['content']['application/json']
export type findProjectEvaluationSummary_Errors =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'PROJECT_ROUND_NOT_FOUND'
  | 'MANAGER_SCOPE_NOT_FOUND'

// GET /api/v0/projects/{projectId}/evaluations/{userId} — [프로젝트 상세 - 결과 탭] 교육생 채점 결과 상세 조회 (매니저)
export type findTraineeEvaluationDetail_Path =
  operations['findTraineeEvaluationDetail']['parameters']['path']
export type findTraineeEvaluationDetail_Query = NonNullable<
  operations['findTraineeEvaluationDetail']['parameters']['query']
>
export type findTraineeEvaluationDetail_Response =
  operations['findTraineeEvaluationDetail']['responses'][200]['content']['application/json']
export type findTraineeEvaluationDetail_Item = NonNullable<
  findTraineeEvaluationDetail_Response['concepts']
>[number]
export type findTraineeEvaluationDetail_Errors =
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'PROJECT_ROUND_NOT_FOUND'
  | 'EVALUATION_TRAINEE_NOT_FOUND'
  | 'MANAGER_SCOPE_NOT_FOUND'
