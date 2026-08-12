/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  findCohortRiskTraineeRates_Path,
  findCohortRiskTraineeRates_Query,
  findCohortRiskTraineeRates_Response,
  findManagerHeatmap_Path,
  findManagerHeatmap_Query,
  findManagerHeatmap_Response,
  findCohortGroupGaps_Path,
  findCohortGroupGaps_Response,
  findCohortComparison_Path,
  findCohortComparison_Query,
  findCohortComparison_Response,
  findCohortActionsRequired_Path,
  findCohortActionsRequired_Response,
} from './analyticsTypes'

/** 회차별 기수 전체·반별 위험 교육생 비율 조회 — `GET /api/v0/cohorts/{cohortId}/analytics/risk-trainees` */
export const findCohortRiskTraineeRates = (
  params: {
    path: findCohortRiskTraineeRates_Path
    query?: findCohortRiskTraineeRates_Query
  } & RequestOptions,
) =>
  unwrap<findCohortRiskTraineeRates_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/analytics/risk-trainees', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )

/** 매니저 히트맵 조회 — `GET /api/v0/cohorts/{cohortId}/analytics/heatmap` */
export const findManagerHeatmap = (
  params: { path: findManagerHeatmap_Path; query: findManagerHeatmap_Query } & RequestOptions,
) =>
  unwrap<findManagerHeatmap_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/analytics/heatmap', {
      params: { path: params.path, query: params.query },
      signal: params.signal,
    }) as never,
  )

/** 집단 미달 목록 조회 — `GET /api/v0/cohorts/{cohortId}/analytics/group-gaps` */
export const findCohortGroupGaps = (params: { path: findCohortGroupGaps_Path } & RequestOptions) =>
  unwrap<findCohortGroupGaps_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/analytics/group-gaps', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 두 기수의 검증 개념별 평균 도달 단계 비교 — `GET /api/v0/cohorts/{cohortId}/analytics/cohort-comparison` */
export const findCohortComparison = (
  params: { path: findCohortComparison_Path; query?: findCohortComparison_Query } & RequestOptions,
) =>
  unwrap<findCohortComparison_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/analytics/cohort-comparison', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )

/** 조치 필요 경보 조회 — `GET /api/v0/cohorts/{cohortId}/analytics/actions` */
export const findCohortActionsRequired = (
  params: { path: findCohortActionsRequired_Path } & RequestOptions,
) =>
  unwrap<findCohortActionsRequired_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/analytics/actions', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )
