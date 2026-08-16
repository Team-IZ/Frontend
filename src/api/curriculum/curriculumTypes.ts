/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Header · _Response · _Item · _Errors
*/

// POST /api/v0/curricula/{materialId}/analyses — 재분석 요청
export type requestAnalysis_Path = operations['requestAnalysis']['parameters']['path']
export type requestAnalysis_Query = NonNullable<
  operations['requestAnalysis']['parameters']['query']
>
export type requestAnalysis_Response = void
export type requestAnalysis_Errors =
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'CURRICULUM_MATERIAL_NOT_FOUND'
  | 'CURRICULUM_ANALYSIS_IN_PROGRESS'

// GET /api/v0/organizations/{organizationId}/curricula — 기관 교안 목록
export type findOrganizationCurricula_Path =
  operations['findOrganizationCurricula']['parameters']['path']
export type findOrganizationCurricula_Query = NonNullable<
  operations['findOrganizationCurricula']['parameters']['query']
>
export type findOrganizationCurricula_Response =
  operations['findOrganizationCurricula']['responses'][200]['content']['application/json']
export type findOrganizationCurricula_Item = NonNullable<
  findOrganizationCurricula_Response['content']
>[number]
export type findOrganizationCurricula_Errors =
  | 'VALIDATION_FAILED'
  | 'CURRICULUM_FILTER_CONFLICT'
  | 'UNAUTHENTICATED'
  | 'ORG_ACCESS_DENIED'
  | 'ACCESS_DENIED'

// GET /api/v0/curricula/{materialId} — 교안 단건 상세
export type findCurriculum_Path = operations['findCurriculum']['parameters']['path']
export type findCurriculum_Response =
  operations['findCurriculum']['responses'][200]['content']['application/json']
export type findCurriculum_Errors =
  'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'CURRICULUM_MATERIAL_NOT_FOUND'

// DELETE /api/v0/curricula/{materialId} — 교안 삭제
export type deleteCurriculum_Path = operations['deleteCurriculum']['parameters']['path']
export type deleteCurriculum_Response = void
export type deleteCurriculum_Errors =
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'CURRICULUM_MATERIAL_NOT_FOUND'
  | 'CURRICULUM_MATERIAL_IN_USE'

// GET /api/v0/curricula/{materialId}/sections — 교안 섹션·개념 조회
export type findSections_Path = operations['findSections']['parameters']['path']
export type findSections_Response =
  operations['findSections']['responses'][200]['content']['application/json']
export type findSections_Errors =
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'CURRICULUM_MATERIAL_NOT_FOUND'
  | 'CURRICULUM_ANALYSIS_NOT_COMPLETED'

// GET /api/v0/curricula/{materialId}/projects — 쓰인 회차
export type findUsedProjects_Path = operations['findUsedProjects']['parameters']['path']
export type findUsedProjects_Response =
  operations['findUsedProjects']['responses'][200]['content']['application/json']
export type findUsedProjects_Errors =
  'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'CURRICULUM_MATERIAL_NOT_FOUND'

// GET /api/v0/curricula/comparable-cohorts — 비교 가능한 기수 목록
export type findComparableCohorts_Query = NonNullable<
  operations['findComparableCohorts']['parameters']['query']
>
export type findComparableCohorts_Response =
  operations['findComparableCohorts']['responses'][200]['content']['application/json']
export type findComparableCohorts_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'COHORT_NOT_FOUND'

// GET /api/v0/cohorts/{cohortId}/linked-curricula — 기수에 연결된 교안 목록
export type findCohortLinkedCurricula_Path =
  operations['findCohortLinkedCurricula']['parameters']['path']
export type findCohortLinkedCurricula_Response =
  operations['findCohortLinkedCurricula']['responses'][200]['content']['application/json']
export type findCohortLinkedCurricula_Errors =
  'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'COHORT_NOT_FOUND'

// GET /api/v0/cohorts/{cohortId}/curricula — 회차에 연결할 수 있는 교안 후보
export type findLinkableCurricula_Path = operations['findLinkableCurricula']['parameters']['path']
export type findLinkableCurricula_Response =
  operations['findLinkableCurricula']['responses'][200]['content']['application/json']
export type findLinkableCurricula_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'COHORT_NOT_FOUND'
