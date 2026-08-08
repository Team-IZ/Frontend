/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  updateTierModel_Body,
  updateTierModel_Response,
  updateModelPricing_Path,
  updateModelPricing_Body,
  updateModelPricing_Response,
  updateGradingModel_Body,
  updateGradingModel_Response,
  inviteSuperAdmin_Body,
  inviteSuperAdmin_Response,
  updateSuperAdminStatus_Path,
  updateSuperAdminStatus_Body,
  updateSuperAdminStatus_Response,
  findSuperAdmins_Response,
  findModelSettings_Response,
} from './platformTypes'

/** 티어 ↔ 모델 매핑 변경 — `PUT /api/v0/platform/operations/tier-models` */
export const updateTierModel = (params: { body: updateTierModel_Body } & RequestOptions) =>
  unwrap<updateTierModel_Response>(
    izClient.PUT('/api/v0/platform/operations/tier-models', {
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 모델 단가 수정 — `PUT /api/v0/platform/operations/models/{modelId}/pricing` */
export const updateModelPricing = (
  params: { path: updateModelPricing_Path; body: updateModelPricing_Body } & RequestOptions,
) =>
  unwrap<updateModelPricing_Response>(
    izClient.PUT('/api/v0/platform/operations/models/{modelId}/pricing', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 채점 모델 변경 (전 기관 재캘리브레이션 유발) — `PUT /api/v0/platform/operations/grading-model` */
export const updateGradingModel = (params: { body: updateGradingModel_Body } & RequestOptions) =>
  unwrap<updateGradingModel_Response>(
    izClient.PUT('/api/v0/platform/operations/grading-model', {
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 슈퍼어드민 초대 — `POST /api/v0/platform/operations/super-admins/invitations` */
export const inviteSuperAdmin = (params: { body: inviteSuperAdmin_Body } & RequestOptions) =>
  unwrap<inviteSuperAdmin_Response>(
    izClient.POST('/api/v0/platform/operations/super-admins/invitations', {
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 슈퍼어드민 정지 · 재활성 — `PATCH /api/v0/platform/operations/super-admins/{memberId}/status` */
export const updateSuperAdminStatus = (
  params: { path: updateSuperAdminStatus_Path; body: updateSuperAdminStatus_Body } & RequestOptions,
) =>
  unwrap<updateSuperAdminStatus_Response>(
    izClient.PATCH('/api/v0/platform/operations/super-admins/{memberId}/status', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 슈퍼어드민 계정 목록 — `GET /api/v0/platform/operations/super-admins` */
export const findSuperAdmins = (params: RequestOptions = {}) =>
  unwrap<findSuperAdmins_Response>(
    izClient.GET('/api/v0/platform/operations/super-admins', { signal: params.signal }) as never,
  )

/** 플랫폼 모델·단가 설정 조회 — `GET /api/v0/platform/operations/model-settings` */
export const findModelSettings = (params: RequestOptions = {}) =>
  unwrap<findModelSettings_Response>(
    izClient.GET('/api/v0/platform/operations/model-settings', { signal: params.signal }) as never,
  )
