/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type {
  findCohortRiskTraineeRates_Path,
  findCohortRiskTraineeRates_Query,
  findCohortGroupGaps_Path,
  findCohortComparison_Path,
  findCohortComparison_Query,
  findCohortActionsRequired_Path,
} from './analyticsTypes'

/*
  `all`이 이 도메인 전체를 가리킨다 — 쓰기 훅이 성공하면 이 접두어로 한 번에 무효화한다.
  "이 상세가 어느 목록에 속하는가"는 스펙에 없어 생성기가 알 수 없다. **넓게 지우는 것은
  틀리지 않는다**(과잉 재조회일 뿐). 부분 무효화가 필요해지면 그 도메인만 계층을 넣는다.
*/
export const analyticsKeys = {
  all: ['analytics'] as const,
  findCohortRiskTraineeRates: (params: {
    path: findCohortRiskTraineeRates_Path
    query?: findCohortRiskTraineeRates_Query
  }) =>
    [
      ...analyticsKeys.all,
      'findCohortRiskTraineeRates',
      params.path ?? null,
      params.query ?? null,
    ] as const,
  findCohortGroupGaps: (params: { path: findCohortGroupGaps_Path }) =>
    [...analyticsKeys.all, 'findCohortGroupGaps', params.path ?? null] as const,
  findCohortComparison: (params: {
    path: findCohortComparison_Path
    query?: findCohortComparison_Query
  }) =>
    [
      ...analyticsKeys.all,
      'findCohortComparison',
      params.path ?? null,
      params.query ?? null,
    ] as const,
  findCohortActionsRequired: (params: { path: findCohortActionsRequired_Path }) =>
    [...analyticsKeys.all, 'findCohortActionsRequired', params.path ?? null] as const,
}
