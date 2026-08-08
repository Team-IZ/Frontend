/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Response · _Item · _Errors
*/

// GET /api/v0/cohorts — 기관 기수 목록 조회
export type findCohorts_Query = NonNullable<operations['findCohorts']['parameters']['query']>
export type findCohorts_Response =
  operations['findCohorts']['responses'][200]['content']['application/json']
export type findCohorts_Item = findCohorts_Response['content'][number]
export type findCohorts_Errors =
  'VALIDATION_FAILED' | 'UNAUTHENTICATED' | 'ORGANIZATION_CONTEXT_MISSING'

// POST /api/v0/cohorts — 기수 생성
export type createCohort_Body = NonNullable<
  operations['createCohort']['requestBody']
>['content']['application/json']
export type createCohort_Response =
  operations['createCohort']['responses'][201]['content']['application/json']
export type createCohort_Item = createCohort_Response['managers'][number]
export type createCohort_Errors =
  | 'VALIDATION_FAILED'
  | 'COHORT_PERIOD_INVALID'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'COHORT_NAME_TAKEN'
  | 'ORG_POLICY_NOT_FOUND'
  | 'ORGANIZATION_CONTEXT_MISSING'

// GET /api/v0/cohorts/{cohortId}/classrooms — 기수 반 목록 조회
export type findClassrooms_Path = operations['findClassrooms']['parameters']['path']
export type findClassrooms_Response =
  operations['findClassrooms']['responses'][200]['content']['application/json']
export type findClassrooms_Item = findClassrooms_Response['classrooms'][number]
export type findClassrooms_Errors =
  'UNAUTHENTICATED' | 'COHORT_NOT_FOUND' | 'ORGANIZATION_CONTEXT_MISSING'

// POST /api/v0/cohorts/{cohortId}/classrooms — 반 생성
export type createClassroom_Path = operations['createClassroom']['parameters']['path']
export type createClassroom_Body = NonNullable<
  operations['createClassroom']['requestBody']
>['content']['application/json']
export type createClassroom_Response =
  operations['createClassroom']['responses'][201]['content']['application/json']
export type createClassroom_Item = createClassroom_Response['managers'][number]
export type createClassroom_Errors =
  'VALIDATION_FAILED' | 'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'COHORT_NOT_FOUND'

// PATCH /api/v0/cohorts/{cohortId}/end — 기수 종료
export type endCohort_Path = operations['endCohort']['parameters']['path']
export type endCohort_Body = NonNullable<
  operations['endCohort']['requestBody']
>['content']['application/json']
export type endCohort_Response =
  operations['endCohort']['responses'][200]['content']['application/json']
export type endCohort_Item = endCohort_Response['managers'][number]
export type endCohort_Errors =
  'VALIDATION_FAILED' | 'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'COHORT_NOT_FOUND'

// PATCH /api/v0/cohorts/{cohortId}/classrooms/{classroomId}/managers — 반 담당 매니저 변경
export type updateManagers_Path = operations['updateManagers']['parameters']['path']
export type updateManagers_Body = NonNullable<
  operations['updateManagers']['requestBody']
>['content']['application/json']
export type updateManagers_Response =
  operations['updateManagers']['responses'][200]['content']['application/json']
export type updateManagers_Item = updateManagers_Response['managers'][number]
export type updateManagers_Errors =
  'VALIDATION_FAILED' | 'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'CLASSROOM_NOT_FOUND'

// PATCH /api/v0/cohorts/{cohortId}/classrooms/trainee-assignments — 교육생 일괄 반 배정
export type assignTrainees_Path = operations['assignTrainees']['parameters']['path']
export type assignTrainees_Body = NonNullable<
  operations['assignTrainees']['requestBody']
>['content']['application/json']
export type assignTrainees_Response =
  operations['assignTrainees']['responses'][200]['content']['application/json']
export type assignTrainees_Item = assignTrainees_Response['assignedTraineeIds'][number]
export type assignTrainees_Errors =
  | 'VALIDATION_FAILED'
  | 'TRAINEE_NOT_IN_COHORT'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'CLASSROOM_NOT_FOUND'

// PATCH /api/v0/cohorts/{cohortId}/classrooms/trainee-assignments/rollback — 교육생 반 배정 되돌리기
export type rollbackAssignment_Path = operations['rollbackAssignment']['parameters']['path']
export type rollbackAssignment_Body = NonNullable<
  operations['rollbackAssignment']['requestBody']
>['content']['application/json']
export type rollbackAssignment_Response =
  operations['rollbackAssignment']['responses'][200]['content']['application/json']
export type rollbackAssignment_Item = rollbackAssignment_Response['rolledBackTraineeIds'][number]
export type rollbackAssignment_Errors =
  | 'VALIDATION_FAILED'
  | 'TRAINEE_NOT_IN_COHORT'
  | 'ASSIGNMENT_NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'COHORT_NOT_FOUND'

// GET /api/v0/members/me/enrollments — 내 소속 기수·반 조회
export type findMyEnrollments_Response =
  operations['findMyEnrollments']['responses'][200]['content']['application/json']
export type findMyEnrollments_Item = findMyEnrollments_Response['enrollments'][number]
export type findMyEnrollments_Errors = 'UNAUTHENTICATED' | 'ORGANIZATION_CONTEXT_MISSING'

// GET /api/v0/cohorts/{cohortId} — 기수 상세 조회
export type findCohort_Path = operations['findCohort']['parameters']['path']
export type findCohort_Response =
  operations['findCohort']['responses'][200]['content']['application/json']
export type findCohort_Item = findCohort_Response['managers'][number]
export type findCohort_Errors =
  'UNAUTHENTICATED' | 'COHORT_NOT_FOUND' | 'ORGANIZATION_CONTEXT_MISSING'
