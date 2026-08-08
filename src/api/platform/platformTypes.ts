/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Response · _Item · _Errors
*/

// PUT /api/v0/platform/operations/tier-models — 티어 ↔ 모델 매핑 변경
export type updateTierModel_Body = NonNullable<
  operations['updateTierModel']['requestBody']
>['content']['application/json']
export type updateTierModel_Response =
  operations['updateTierModel']['responses'][200]['content']['application/json']
export type updateTierModel_Errors = 'AI_MODEL_NOT_AVAILABLE'

// PUT /api/v0/platform/operations/models/{modelId}/pricing — 모델 단가 수정
export type updateModelPricing_Path = operations['updateModelPricing']['parameters']['path']
export type updateModelPricing_Body = NonNullable<
  operations['updateModelPricing']['requestBody']
>['content']['application/json']
export type updateModelPricing_Response =
  operations['updateModelPricing']['responses'][200]['content']['application/json']
export type updateModelPricing_Errors = 'AI_MODEL_NOT_AVAILABLE'

// PUT /api/v0/platform/operations/grading-model — 채점 모델 변경 (전 기관 재캘리브레이션 유발)
export type updateGradingModel_Body = NonNullable<
  operations['updateGradingModel']['requestBody']
>['content']['application/json']
export type updateGradingModel_Response =
  operations['updateGradingModel']['responses'][200]['content']['application/json']
export type updateGradingModel_Errors =
  'AI_MODEL_NOT_AVAILABLE' | 'CALIBRATION_IN_PROGRESS' | 'CALIBRATION_VERSION_CODE_TAKEN'

// POST /api/v0/platform/operations/super-admins/invitations — 슈퍼어드민 초대
export type inviteSuperAdmin_Body = NonNullable<
  operations['inviteSuperAdmin']['requestBody']
>['content']['application/json']
export type inviteSuperAdmin_Response =
  operations['inviteSuperAdmin']['responses'][201]['content']['application/json']
export type inviteSuperAdmin_Errors =
  'VALIDATION_FAILED' | 'BAD_REQUEST' | 'ACCESS_DENIED' | 'ALREADY_INVITED' | 'INVITE_MAIL_FAILED'

// PATCH /api/v0/platform/operations/super-admins/{memberId}/status — 슈퍼어드민 정지 · 재활성
export type updateSuperAdminStatus_Path = operations['updateSuperAdminStatus']['parameters']['path']
export type updateSuperAdminStatus_Body = NonNullable<
  operations['updateSuperAdminStatus']['requestBody']
>['content']['application/json']
export type updateSuperAdminStatus_Response =
  operations['updateSuperAdminStatus']['responses'][200]['content']['application/json']
export type updateSuperAdminStatus_Item = updateSuperAdminStatus_Response['content'][number]
export type updateSuperAdminStatus_Errors = 'SUPER_ADMIN_NOT_FOUND' | 'LAST_SUPER_ADMIN'

// GET /api/v0/platform/operations/super-admins — 슈퍼어드민 계정 목록
export type findSuperAdmins_Response =
  operations['findSuperAdmins']['responses'][200]['content']['application/json']
export type findSuperAdmins_Item = findSuperAdmins_Response['content'][number]

// GET /api/v0/platform/operations/model-settings — 플랫폼 모델·단가 설정 조회
export type findModelSettings_Response =
  operations['findModelSettings']['responses'][200]['content']['application/json']
