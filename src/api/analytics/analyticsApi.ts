/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  getRiskSignalsForInbox_Path,
  getRiskSignalsForInbox_Query,
  getRiskSignalsForInbox_Response,
  findCohortRiskTraineeRates_Path,
  findCohortRiskTraineeRates_Query,
  findCohortRiskTraineeRates_Response,
  findManagerHeatmap_Path,
  findManagerHeatmap_Query,
  findManagerHeatmap_Response,
  findCohortGroupGaps_Path,
  findCohortGroupGaps_Response,
  findManagerConceptScope_Path,
  findManagerConceptScope_Query,
  findManagerConceptScope_Response,
  findCohortComparison_Path,
  findCohortComparison_Query,
  findCohortComparison_Response,
  findCohortActionsRequired_Path,
  findCohortActionsRequired_Response,
  findActionRequiredProjects_Path,
  findActionRequiredProjects_Response,
} from './analyticsTypes'

/** 위험 신호 조회 (인박스 행 근거) — `GET /api/v0/cohorts/{cohortId}/analytics/signals` */
export const getRiskSignalsForInbox = (
  params: {
    path: getRiskSignalsForInbox_Path
    query?: getRiskSignalsForInbox_Query
  } & RequestOptions,
) =>
  unwrap<getRiskSignalsForInbox_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/analytics/signals', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )

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

/** 면담 브리프 개념 소관 판정 — `GET /api/v0/cohorts/{cohortId}/analytics/concept-scope` */
export const findManagerConceptScope = (
  params: {
    path: findManagerConceptScope_Path
    query: findManagerConceptScope_Query
  } & RequestOptions,
) =>
  unwrap<findManagerConceptScope_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/analytics/concept-scope', {
      params: { path: params.path, query: params.query },
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

/** 조치 필요 항목 조회 — `GET /api/v0/classes/{classId}/projects` */
export const findActionRequiredProjects = (
  params: { path: findActionRequiredProjects_Path } & RequestOptions,
) =>
  unwrap<findActionRequiredProjects_Response>(
    izClient.GET('/api/v0/classes/{classId}/projects', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )
