/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Header · _Response · _Item · _Errors
*/

// GET /api/v0/organizations — 기관 목록 조회
export type findOrganizations_Query = NonNullable<
  operations['findOrganizations']['parameters']['query']
>
export type findOrganizations_Response =
  operations['findOrganizations']['responses'][200]['content']['application/json']
export type findOrganizations_Item = NonNullable<findOrganizations_Response['content']>[number]
export type findOrganizations_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'

// POST /api/v0/organizations — 기관 생성 및 기본 운영 정책 초기화
export type createOrganization_Body = NonNullable<
  operations['createOrganization']['requestBody']
>['content']['application/json']
export type createOrganization_Response =
  operations['createOrganization']['responses'][201]['content']['application/json']
export type createOrganization_Item = NonNullable<createOrganization_Response['operators']>[number]
export type createOrganization_Errors =
  'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'ORG_NAME_TAKEN' | 'ORG_IDEMPOTENCY_CONFLICT'

// POST /api/v0/organizations/{organizationId}/restore — 기관 복구
export type restoreOrganization_Path = operations['restoreOrganization']['parameters']['path']
export type restoreOrganization_Response =
  operations['restoreOrganization']['responses'][200]['content']['application/json']
export type restoreOrganization_Item = NonNullable<
  restoreOrganization_Response['operators']
>[number]
export type restoreOrganization_Errors =
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'ORG_NOT_FOUND'
  | 'ORG_NOT_DELETED'
  | 'ORG_ALREADY_DELETED'
  | 'ORG_NAME_TAKEN'

// POST /api/v0/organizations/{organizationId}/operators/invitations — 오퍼레이터 초대
export type inviteOperator_Path = operations['inviteOperator']['parameters']['path']
export type inviteOperator_Body = NonNullable<
  operations['inviteOperator']['requestBody']
>['content']['application/json']
export type inviteOperator_Response =
  operations['inviteOperator']['responses'][201]['content']['application/json']
export type inviteOperator_Errors =
  'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'NOT_FOUND' | 'ALREADY_INVITED' | 'INVITE_MAIL_FAILED'

// POST /api/v0/organizations/{organizationId}/operators/invitations/{tokenId}/resend — 오퍼레이터 초대 재발송
export type resendOperatorInvitation_Path =
  operations['resendOperatorInvitation']['parameters']['path']
export type resendOperatorInvitation_Response =
  operations['resendOperatorInvitation']['responses'][200]['content']['application/json']
export type resendOperatorInvitation_Item = NonNullable<
  resendOperatorInvitation_Response['content']
>[number]
export type resendOperatorInvitation_Errors =
  'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'OPERATOR_INVITATION_NOT_FOUND' | 'INVITE_MAIL_FAILED'

// GET /api/v0/organizations/{organizationId} — 기관 상세 조회
export type findOrganization_Path = operations['findOrganization']['parameters']['path']
export type findOrganization_Response =
  operations['findOrganization']['responses'][200]['content']['application/json']
export type findOrganization_Item = NonNullable<findOrganization_Response['operators']>[number]
export type findOrganization_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'

// DELETE /api/v0/organizations/{organizationId} — 기관 soft-delete
export type deleteOrganization_Path = operations['deleteOrganization']['parameters']['path']
export type deleteOrganization_Body = NonNullable<
  operations['deleteOrganization']['requestBody']
>['content']['application/json']
export type deleteOrganization_Response =
  operations['deleteOrganization']['responses'][200]['content']['application/json']
export type deleteOrganization_Errors =
  | 'ORG_DELETE_CONFIRM_MISMATCH'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'ORG_NOT_FOUND'
  | 'ORG_ALREADY_DELETED'
  | 'ORG_POLICY_NOT_FOUND'
  | 'ORG_IDEMPOTENCY_CONFLICT'

// PATCH /api/v0/organizations/{organizationId} — 기관 이름 또는 운영 상태 변경
export type updateOrganization_Path = operations['updateOrganization']['parameters']['path']
export type updateOrganization_Body = NonNullable<
  operations['updateOrganization']['requestBody']
>['content']['application/json']
export type updateOrganization_Response =
  operations['updateOrganization']['responses'][200]['content']['application/json']
export type updateOrganization_Item = NonNullable<updateOrganization_Response['operators']>[number]
export type updateOrganization_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'

// PATCH /api/v0/organizations/{organizationId}/operators/{memberId}/status — 오퍼레이터 계정 정지 / 재활성
export type updateOperatorStatus_Path = operations['updateOperatorStatus']['parameters']['path']
export type updateOperatorStatus_Body = NonNullable<
  operations['updateOperatorStatus']['requestBody']
>['content']['application/json']
export type updateOperatorStatus_Response =
  operations['updateOperatorStatus']['responses'][200]['content']['application/json']
export type updateOperatorStatus_Item = NonNullable<
  updateOperatorStatus_Response['content']
>[number]
export type updateOperatorStatus_Errors =
  | 'VALIDATION_FAILED'
  | 'BAD_REQUEST'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'OPERATOR_NOT_FOUND'
  | 'LAST_OPERATOR'

// GET /api/v0/organizations/{organizationId}/operators — 기관 오퍼레이터 계정 목록 조회
export type findOperators_Path = operations['findOperators']['parameters']['path']
export type findOperators_Response =
  operations['findOperators']['responses'][200]['content']['application/json']
export type findOperators_Item = NonNullable<findOperators_Response['content']>[number]
export type findOperators_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'

// GET /api/v0/organizations/{organizationId}/cohorts — 기관 기수 목록 조회 (읽기전용)
export type findOrganizationCohorts_Path =
  operations['findOrganizationCohorts']['parameters']['path']
export type findOrganizationCohorts_Response =
  operations['findOrganizationCohorts']['responses'][200]['content']['application/json']
export type findOrganizationCohorts_Item = NonNullable<
  findOrganizationCohorts_Response['content']
>[number]
export type findOrganizationCohorts_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'

// GET /api/v0/organizations/summary — 플랫폼 전체 집계 조회
export type findPlatformSummary_Response =
  operations['findPlatformSummary']['responses'][200]['content']['application/json']
export type findPlatformSummary_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'

// GET /api/v0/organizations/name-availability — 기관명 중복 확인
export type checkNameAvailability_Query = NonNullable<
  operations['checkNameAvailability']['parameters']['query']
>
export type checkNameAvailability_Response =
  operations['checkNameAvailability']['responses'][200]['content']['application/json']
export type checkNameAvailability_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'

// DELETE /api/v0/organizations/{organizationId}/operators/invitations/{tokenId} — 오퍼레이터 초대 취소
export type cancelInvitation_Path = operations['cancelInvitation']['parameters']['path']
export type cancelInvitation_Response =
  operations['cancelInvitation']['responses'][200]['content']['application/json']
export type cancelInvitation_Item = NonNullable<cancelInvitation_Response['content']>[number]
export type cancelInvitation_Errors =
  'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'OPERATOR_INVITATION_NOT_FOUND'
