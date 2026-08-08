/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Response · _Item · _Errors
*/

// POST /api/v0/curricula/{materialId}/analyses — 재분석 요청
export type requestAnalysis_Path = operations['requestAnalysis']['parameters']['path']
export type requestAnalysis_Response = void
export type requestAnalysis_Errors = 'UNAUTHENTICATED' | 'CURRICULUM_MATERIAL_NOT_FOUND'

// GET /api/v0/curricula/{materialId}/sections — 교안 섹션·개념 조회
export type findSections_Path = operations['findSections']['parameters']['path']
export type findSections_Response =
  operations['findSections']['responses'][200]['content']['application/json']
export type findSections_Errors =
  'UNAUTHENTICATED' | 'CURRICULUM_MATERIAL_NOT_FOUND' | 'CURRICULUM_ANALYSIS_NOT_COMPLETED'

// GET /api/v0/curricula/{materialId}/projects — 쓰인 회차
export type findUsedProjects_Path = operations['findUsedProjects']['parameters']['path']
export type findUsedProjects_Response =
  operations['findUsedProjects']['responses'][200]['content']['application/json']
export type findUsedProjects_Errors =
  'BIG_PROJECT_HAS_NO_ROUND_LABEL' | 'UNAUTHENTICATED' | 'PROJECT_NOT_FOUND'

// GET /api/v0/curricula/comparable-cohorts — 비교 가능한 기수 목록
export type findComparableCohorts_Query = NonNullable<
  operations['findComparableCohorts']['parameters']['query']
>
export type findComparableCohorts_Response =
  operations['findComparableCohorts']['responses'][200]['content']['application/json']
export type findComparableCohorts_Errors = 'UNAUTHENTICATED'

// GET /api/v0/cohorts/{cohortId}/curricula — 기수 연결 교안 목록
export type findLinkableCurricula_Path = operations['findLinkableCurricula']['parameters']['path']
export type findLinkableCurricula_Response =
  operations['findLinkableCurricula']['responses'][200]['content']['application/json']
export type findLinkableCurricula_Errors = 'UNAUTHENTICATED'
