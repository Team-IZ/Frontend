/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type {
  findProjects_Path,
  findProject_Path,
  findRounds_Path,
  findConceptCandidates_Path,
  findProjectClassProgress_Path,
  findProjectClassProgress_Query,
} from './projectExecutionTypes'

/*
  `all`이 이 도메인 전체를 가리킨다 — 쓰기 훅이 성공하면 이 접두어로 한 번에 무효화한다.
  "이 상세가 어느 목록에 속하는가"는 스펙에 없어 생성기가 알 수 없다. **넓게 지우는 것은
  틀리지 않는다**(과잉 재조회일 뿐). 부분 무효화가 필요해지면 그 도메인만 계층을 넣는다.
*/
export const projectExecutionKeys = {
  all: ['projectExecution'] as const,
  findProjects: (params: { path: findProjects_Path }) =>
    [...projectExecutionKeys.all, 'findProjects', params.path ?? null] as const,
  findProject: (params: { path: findProject_Path }) =>
    [...projectExecutionKeys.all, 'findProject', params.path ?? null] as const,
  findRounds: (params: { path: findRounds_Path }) =>
    [...projectExecutionKeys.all, 'findRounds', params.path ?? null] as const,
  findConceptCandidates: (params: { path: findConceptCandidates_Path }) =>
    [...projectExecutionKeys.all, 'findConceptCandidates', params.path ?? null] as const,
  findProjectClassProgress: (params: {
    path: findProjectClassProgress_Path
    query?: findProjectClassProgress_Query
  }) =>
    [
      ...projectExecutionKeys.all,
      'findProjectClassProgress',
      params.path ?? null,
      params.query ?? null,
    ] as const,
}
