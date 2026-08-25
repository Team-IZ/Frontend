/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type {
  findOrganizations_Query,
  findOrganization_Path,
  findOperators_Path,
  findOrganizationCohorts_Path,
  checkNameAvailability_Query,
} from './organizationTypes'

/*
  `all`이 이 도메인 전체를 가리킨다 — 쓰기 훅이 성공하면 이 접두어로 한 번에 무효화한다.
  "이 상세가 어느 목록에 속하는가"는 스펙에 없어 생성기가 알 수 없다. **넓게 지우는 것은
  틀리지 않는다**(과잉 재조회일 뿐). 부분 무효화가 필요해지면 그 도메인만 계층을 넣는다.
*/
export const organizationKeys = {
  all: ['organization'] as const,
  findOrganizations: (params: { query?: findOrganizations_Query }) =>
    [...organizationKeys.all, 'findOrganizations', params.query ?? null] as const,
  findOrganization: (params: { path: findOrganization_Path }) =>
    [...organizationKeys.all, 'findOrganization', params.path ?? null] as const,
  findOperators: (params: { path: findOperators_Path }) =>
    [...organizationKeys.all, 'findOperators', params.path ?? null] as const,
  findOrganizationCohorts: (params: { path: findOrganizationCohorts_Path }) =>
    [...organizationKeys.all, 'findOrganizationCohorts', params.path ?? null] as const,
  findPlatformSummary: () => [...organizationKeys.all, 'findPlatformSummary'] as const,
  checkNameAvailability: (params: { query: checkNameAvailability_Query }) =>
    [...organizationKeys.all, 'checkNameAvailability', params.query ?? null] as const,
}
