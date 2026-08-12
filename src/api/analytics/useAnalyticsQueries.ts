/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import {
  findCohortRiskTraineeRates,
  findManagerHeatmap,
  findCohortGroupGaps,
  findCohortComparison,
  findCohortActionsRequired,
} from './analyticsApi'
import { analyticsKeys } from './analyticsKeys'
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

/** 회차별 기수 전체·반별 위험 교육생 비율 조회 */
export function useFindCohortRiskTraineeRates(
  params: { path: findCohortRiskTraineeRates_Path; query?: findCohortRiskTraineeRates_Query },
  options?: QueryOptions<findCohortRiskTraineeRates_Response>,
) {
  return useQuery({
    queryKey: analyticsKeys.findCohortRiskTraineeRates(params),
    queryFn: ({ signal }) => findCohortRiskTraineeRates({ ...params, signal }),
    ...options,
  })
}

/** 매니저 히트맵 조회 */
export function useFindManagerHeatmap(
  params: { path: findManagerHeatmap_Path; query: findManagerHeatmap_Query },
  options?: QueryOptions<findManagerHeatmap_Response>,
) {
  return useQuery({
    queryKey: analyticsKeys.findManagerHeatmap(params),
    queryFn: ({ signal }) => findManagerHeatmap({ ...params, signal }),
    ...options,
  })
}

/** 집단 미달 목록 조회 */
export function useFindCohortGroupGaps(
  params: { path: findCohortGroupGaps_Path },
  options?: QueryOptions<findCohortGroupGaps_Response>,
) {
  return useQuery({
    queryKey: analyticsKeys.findCohortGroupGaps(params),
    queryFn: ({ signal }) => findCohortGroupGaps({ ...params, signal }),
    ...options,
  })
}

/** 두 기수의 검증 개념별 평균 도달 단계 비교 */
export function useFindCohortComparison(
  params: { path: findCohortComparison_Path; query?: findCohortComparison_Query },
  options?: QueryOptions<findCohortComparison_Response>,
) {
  return useQuery({
    queryKey: analyticsKeys.findCohortComparison(params),
    queryFn: ({ signal }) => findCohortComparison({ ...params, signal }),
    ...options,
  })
}

/** 조치 필요 경보 조회 */
export function useFindCohortActionsRequired(
  params: { path: findCohortActionsRequired_Path },
  options?: QueryOptions<findCohortActionsRequired_Response>,
) {
  return useQuery({
    queryKey: analyticsKeys.findCohortActionsRequired(params),
    queryFn: ({ signal }) => findCohortActionsRequired({ ...params, signal }),
    ...options,
  })
}
