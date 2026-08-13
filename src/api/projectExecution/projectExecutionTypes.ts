/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Response · _Item · _Errors
*/

// PUT /api/v0/projects/{projectId}/requirements — 프로젝트 요구사항 전체 교체
export type replaceRequirements_Path = operations['replaceRequirements']['parameters']['path']
export type replaceRequirements_Body = NonNullable<
  operations['replaceRequirements']['requestBody']
>['content']['application/json']
export type replaceRequirements_Response = void
export type replaceRequirements_Errors =
  'VALIDATION_FAILED' | 'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'PROJECT_NOT_FOUND'

// PUT /api/v0/projects/{projectId}/concepts — 검증개념 확정
export type confirmConcepts_Path = operations['confirmConcepts']['parameters']['path']
export type confirmConcepts_Body = NonNullable<
  operations['confirmConcepts']['requestBody']
>['content']['application/json']
export type confirmConcepts_Response = void
export type confirmConcepts_Errors =
  | 'CONCEPT_MAPPING_NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'PROJECT_NOT_FOUND'

// POST /api/v0/projects/{projectId}/curricula — 프로젝트 교안 연결
export type linkCurriculum_Path = operations['linkCurriculum']['parameters']['path']
export type linkCurriculum_Body = NonNullable<
  operations['linkCurriculum']['requestBody']
>['content']['application/json']
export type linkCurriculum_Response =
  operations['linkCurriculum']['responses'][201]['content']['application/json']
export type linkCurriculum_Errors =
  | 'CURRICULUM_NOT_APPLICABLE_TO_BIG_PROJECT'
  | 'CURRICULUM_ANALYSIS_NOT_SUCCEEDED'
  | 'CURRICULUM_MAPPING_NOT_APPROVED'
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'PROJECT_NOT_FOUND'
  | 'CURRICULUM_VERSION_NOT_FOUND'
  | 'CURRICULUM_ALREADY_LINKED'

// GET /api/v0/cohorts/{cohortId}/projects — 기수 프로젝트 목록
export type findProjects_Path = operations['findProjects']['parameters']['path']
export type findProjects_Query = NonNullable<operations['findProjects']['parameters']['query']>
export type findProjects_Response =
  operations['findProjects']['responses'][200]['content']['application/json']
export type findProjects_Item = NonNullable<findProjects_Response['projects']>[number]
export type findProjects_Errors = 'VALIDATION_FAILED' | 'UNAUTHENTICATED' | 'ACCESS_DENIED'

// POST /api/v0/cohorts/{cohortId}/projects — 프로젝트 생성
export type createProject_Path = operations['createProject']['parameters']['path']
export type createProject_Body = NonNullable<
  operations['createProject']['requestBody']
>['content']['application/json']
export type createProject_Response =
  operations['createProject']['responses'][201]['content']['application/json']
export type createProject_Errors =
  'VALIDATION_FAILED' | 'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'PROJECT_NAME_DUPLICATED'

// GET /api/v0/projects/{projectId} — 프로젝트 상세 조회
export type findProject_Path = operations['findProject']['parameters']['path']
export type findProject_Response =
  operations['findProject']['responses'][200]['content']['application/json']
export type findProject_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'PROJECT_NOT_FOUND'

// DELETE /api/v0/projects/{projectId} — 프로젝트(회차) 삭제
export type deleteProject_Path = operations['deleteProject']['parameters']['path']
export type deleteProject_Response = void
export type deleteProject_Errors =
  'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'PROJECT_NOT_FOUND' | 'PROJECT_NOT_DELETABLE'

// PATCH /api/v0/projects/{projectId} — 프로젝트 일정 수정
export type updateSchedule_Path = operations['updateSchedule']['parameters']['path']
export type updateSchedule_Body = NonNullable<
  operations['updateSchedule']['requestBody']
>['content']['application/json']
export type updateSchedule_Response =
  operations['updateSchedule']['responses'][200]['content']['application/json']
export type updateSchedule_Errors =
  'VALIDATION_FAILED' | 'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'PROJECT_NOT_FOUND'

// PATCH /api/v0/projects/{projectId}/rounds/{roundId} — 프로젝트 회차 일정 수정
export type updateRoundSchedule_Path = operations['updateRoundSchedule']['parameters']['path']
export type updateRoundSchedule_Body = NonNullable<
  operations['updateRoundSchedule']['requestBody']
>['content']['application/json']
export type updateRoundSchedule_Response =
  operations['updateRoundSchedule']['responses'][200]['content']['application/json']
export type updateRoundSchedule_Errors =
  'VALIDATION_FAILED' | 'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'PROJECT_NOT_FOUND'

// GET /api/v0/projects/{projectId}/rounds — 프로젝트 회차 목록
export type findRounds_Path = operations['findRounds']['parameters']['path']
export type findRounds_Response =
  operations['findRounds']['responses'][200]['content']['application/json']
export type findRounds_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'PROJECT_NOT_FOUND'

// GET /api/v0/projects/{projectId}/concept-candidates — 검증개념 후보 조회
export type findConceptCandidates_Path = operations['findConceptCandidates']['parameters']['path']
export type findConceptCandidates_Response =
  operations['findConceptCandidates']['responses'][200]['content']['application/json']
export type findConceptCandidates_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'PROJECT_NOT_FOUND'

// GET /api/v0/projects/{projectId}/class-progress — 반별 제출·분석·응시 현황 조회
export type findProjectClassProgress_Path =
  operations['findProjectClassProgress']['parameters']['path']
export type findProjectClassProgress_Query = NonNullable<
  operations['findProjectClassProgress']['parameters']['query']
>
export type findProjectClassProgress_Response =
  operations['findProjectClassProgress']['responses'][200]['content']['application/json']
export type findProjectClassProgress_Errors =
  | 'ROUND_NO_INVALID'
  | 'ANALYTICS_VIEWER_NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'ANALYTICS_VIEWER_NOT_ACTIVE'
  | 'ANALYTICS_ORGANIZATION_NOT_ACTIVE'
  | 'ANALYTICS_ROLE_NOT_ALLOWED'
  | 'PROJECT_CROSS_ORGANIZATION'
  | 'ACCESS_DENIED'
  | 'PROJECT_ROUND_NOT_FOUND'

// GET /api/v0/cohorts/{cohortId}/projects/current — 기수의 이번 회차 조회
export type findCurrentProject_Path = operations['findCurrentProject']['parameters']['path']
export type findCurrentProject_Response =
  operations['findCurrentProject']['responses'][200]['content']['application/json']
export type findCurrentProject_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'

// DELETE /api/v0/projects/{projectId}/curricula/{projectCurriculumId} — 프로젝트 교안 연결 해제
export type unlinkCurriculum_Path = operations['unlinkCurriculum']['parameters']['path']
export type unlinkCurriculum_Response = void
export type unlinkCurriculum_Errors =
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'PROJECT_NOT_FOUND'
  | 'CURRICULUM_LINK_NOT_FOUND'
  | 'CURRICULUM_IN_USE_BY_CONCEPTS'
