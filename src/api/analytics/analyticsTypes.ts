/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Response · _Item · _Errors
*/

// GET /api/v0/cohorts/{cohortId}/analytics/risk-trainees — 회차별 기수 전체·반별 위험 교육생 비율 조회
export type findCohortRiskTraineeRates_Path =
  operations['findCohortRiskTraineeRates']['parameters']['path']
export type findCohortRiskTraineeRates_Query = NonNullable<
  operations['findCohortRiskTraineeRates']['parameters']['query']
>
export type findCohortRiskTraineeRates_Response =
  operations['findCohortRiskTraineeRates']['responses'][200]['content']['application/json']
export type findCohortRiskTraineeRates_Errors =
  | 'CLASSROOM_NOT_IN_COHORT'
  | 'PROJECT_NOT_IN_COHORT'
  | 'ROUND_RANGE_INVALID'
  | 'TEAM_LEVEL_PROJECT_REQUIRED'
  | 'TEAM_LEVEL_SINGLE_CLASSROOM_REQUIRED'
  | 'ANALYTICS_VIEWER_NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'ANALYTICS_VIEWER_NOT_ACTIVE'
  | 'ANALYTICS_ORGANIZATION_NOT_ACTIVE'
  | 'ANALYTICS_ROLE_NOT_ALLOWED'
  | 'ANALYTICS_COHORT_CROSS_ORGANIZATION'
  | 'ACCESS_DENIED'
  | 'COHORT_NOT_FOUND'
  | 'CLASSROOM_NOT_FOUND'

// GET /api/v0/cohorts/{cohortId}/analytics/group-gaps — 집단 미달 목록 조회
export type findCohortGroupGaps_Path = operations['findCohortGroupGaps']['parameters']['path']
export type findCohortGroupGaps_Response =
  operations['findCohortGroupGaps']['responses'][200]['content']['application/json']
export type findCohortGroupGaps_Item = findCohortGroupGaps_Response['gaps'][number]
export type findCohortGroupGaps_Errors =
  | 'ANALYTICS_VIEWER_NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'ANALYTICS_VIEWER_NOT_ACTIVE'
  | 'ANALYTICS_ORGANIZATION_NOT_ACTIVE'
  | 'ANALYTICS_ROLE_NOT_ALLOWED'
  | 'ANALYTICS_COHORT_CROSS_ORGANIZATION'
  | 'ACCESS_DENIED'
  | 'COHORT_NOT_FOUND'

// GET /api/v0/cohorts/{cohortId}/analytics/cohort-comparison — 두 기수의 검증 개념별 평균 도달 단계 비교
export type findCohortComparison_Path = operations['findCohortComparison']['parameters']['path']
export type findCohortComparison_Query = NonNullable<
  operations['findCohortComparison']['parameters']['query']
>
export type findCohortComparison_Response =
  operations['findCohortComparison']['responses'][200]['content']['application/json']
export type findCohortComparison_Errors =
  | 'BASELINE_COHORT_INVALID'
  | 'ANALYTICS_VIEWER_NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'ANALYTICS_VIEWER_NOT_ACTIVE'
  | 'ANALYTICS_ORGANIZATION_NOT_ACTIVE'
  | 'ANALYTICS_ROLE_NOT_ALLOWED'
  | 'ANALYTICS_COHORT_CROSS_ORGANIZATION'
  | 'ACCESS_DENIED'
  | 'COHORT_NOT_FOUND'

// GET /api/v0/cohorts/{cohortId}/analytics/actions — 조치 필요 경보 조회
export type findCohortActionsRequired_Path =
  operations['findCohortActionsRequired']['parameters']['path']
export type findCohortActionsRequired_Response =
  operations['findCohortActionsRequired']['responses'][200]['content']['application/json']
export type findCohortActionsRequired_Errors =
  | 'ANALYTICS_VIEWER_NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'ANALYTICS_VIEWER_NOT_ACTIVE'
  | 'ANALYTICS_ORGANIZATION_NOT_ACTIVE'
  | 'ANALYTICS_ROLE_NOT_ALLOWED'
  | 'ANALYTICS_COHORT_CROSS_ORGANIZATION'
  | 'ACCESS_DENIED'
  | 'COHORT_NOT_FOUND'
