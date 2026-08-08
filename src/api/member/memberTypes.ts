/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Response · _Item · _Errors
*/

// POST /api/v0/members/organizations/{organizationId}/manager-invitations — 매니저 초대
export type inviteManager_Path = operations['inviteManager']['parameters']['path']
export type inviteManager_Body = NonNullable<
  operations['inviteManager']['requestBody']
>['content']['application/json']
export type inviteManager_Response =
  operations['inviteManager']['responses'][201]['content']['application/json']
export type inviteManager_Errors =
  | 'EMAIL_FORMAT_INVALID'
  | 'MANAGER_COHORT_REQUIRED'
  | 'COHORT_NOT_IN_ORGANIZATION'
  | 'INVITER_NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'INVITE_ROLE_NOT_ALLOWED'
  | 'INVITE_CROSS_ORGANIZATION'
  | 'INVITER_NOT_ACTIVE'
  | 'ACCESS_DENIED'
  | 'ORGANIZATION_NOT_FOUND'
  | 'ALREADY_INVITED'
  | 'INVITATION_SAVE_FAILED'
  | 'INVITE_MAIL_FAILED'

// GET /api/v0/cohorts/{cohortId}/trainees — 기수 교육생 명단 조회
export type findTraineeRoster_Path = operations['findTraineeRoster']['parameters']['path']
export type findTraineeRoster_Query = NonNullable<
  operations['findTraineeRoster']['parameters']['query']
>
export type findTraineeRoster_Response =
  operations['findTraineeRoster']['responses'][200]['content']['application/json']
export type findTraineeRoster_Item = findTraineeRoster_Response['content'][number]
export type findTraineeRoster_Errors =
  | 'ROSTER_FILTER_CONFLICT'
  | 'ACCOUNT_STATUS_FILTER_NOT_SUPPORTED'
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'COHORT_NOT_FOUND'
  | 'ORGANIZATION_CONTEXT_MISSING'

// POST /api/v0/cohorts/{cohortId}/trainees/invitations — 직접 입력 교육생 등록 및 초대
export type registerTrainees_Path = operations['registerTrainees']['parameters']['path']
export type registerTrainees_Body = NonNullable<
  operations['registerTrainees']['requestBody']
>['content']['application/json']
export type registerTrainees_Response =
  operations['registerTrainees']['responses'][201]['content']['application/json']
export type registerTrainees_Item = registerTrainees_Response['failures'][number]
export type registerTrainees_Errors =
  | 'VALIDATION_FAILED'
  | 'TRAINEE_NAME_INVALID'
  | 'EMAIL_FORMAT_INVALID'
  | 'INVITER_NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'INVITE_ROLE_NOT_ALLOWED'
  | 'INVITER_NOT_ACTIVE'
  | 'INVITE_CROSS_ORGANIZATION'
  | 'ACCESS_DENIED'
  | 'COHORT_NOT_INVITABLE'

// PATCH /api/v0/cohorts/{cohortId}/trainees/{traineeId}/status — 교육생 계정 상태 변경
export type updateTraineeStatus_Path = operations['updateTraineeStatus']['parameters']['path']
export type updateTraineeStatus_Body = NonNullable<
  operations['updateTraineeStatus']['requestBody']
>['content']['application/json']
export type updateTraineeStatus_Response =
  operations['updateTraineeStatus']['responses'][200]['content']['application/json']
export type updateTraineeStatus_Errors =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'COHORT_NOT_FOUND'
  | 'TRAINEE_NOT_FOUND'
  | 'TRAINEE_STATUS_NOT_MUTABLE'
  | 'ORGANIZATION_CONTEXT_MISSING'

// GET /api/v0/members/me — 내 정보 조회
export type getCurrentMember_Response =
  operations['getCurrentMember']['responses'][200]['content']['application/json']
export type getCurrentMember_Errors = 'MEMBER_NOT_FOUND' | 'UNAUTHENTICATED'

// GET /api/v0/managers — 매니저 목록 조회
export type findManagers_Query = NonNullable<operations['findManagers']['parameters']['query']>
export type findManagers_Response =
  operations['findManagers']['responses'][200]['content']['application/json']
export type findManagers_Item = findManagers_Response['content'][number]
export type findManagers_Errors =
  | 'ACCOUNT_STATUS_FILTER_NOT_SUPPORTED'
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'ORGANIZATION_CONTEXT_MISSING'
