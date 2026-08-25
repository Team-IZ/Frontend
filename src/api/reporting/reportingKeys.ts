/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type {
  findMyReport_Path,
  findManagedTraineeReports_Query,
  findClassDiagnosis_Query,
} from './reportingTypes'

/*
  `all`이 이 도메인 전체를 가리킨다 — 쓰기 훅이 성공하면 이 접두어로 한 번에 무효화한다.
  "이 상세가 어느 목록에 속하는가"는 스펙에 없어 생성기가 알 수 없다. **넓게 지우는 것은
  틀리지 않는다**(과잉 재조회일 뿐). 부분 무효화가 필요해지면 그 도메인만 계층을 넣는다.
*/
export const reportingKeys = {
  all: ['reporting'] as const,
  findMyReports: () => [...reportingKeys.all, 'findMyReports'] as const,
  findMyReport: (params: { path: findMyReport_Path }) =>
    [...reportingKeys.all, 'findMyReport', params.path ?? null] as const,
  findManagedTraineeReports: (params: { query: findManagedTraineeReports_Query }) =>
    [...reportingKeys.all, 'findManagedTraineeReports', params.query ?? null] as const,
  findClassDiagnosis: (params: { query: findClassDiagnosis_Query }) =>
    [...reportingKeys.all, 'findClassDiagnosis', params.query ?? null] as const,
}
