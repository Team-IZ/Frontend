/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  findOrganizations_Query,
  findOrganizations_Response,
  createOrganization_Body,
  createOrganization_Response,
  restoreOrganization_Path,
  restoreOrganization_Response,
  findOrganization_Path,
  findOrganization_Response,
  deleteOrganization_Path,
  deleteOrganization_Body,
  deleteOrganization_Response,
  updateOrganization_Path,
  updateOrganization_Body,
  updateOrganization_Response,
  updateOperatorStatus_Path,
  updateOperatorStatus_Body,
  updateOperatorStatus_Response,
  findOperators_Path,
  findOperators_Response,
  findOrganizationCohorts_Path,
  findOrganizationCohorts_Response,
  findPlatformSummary_Response,
  checkNameAvailability_Query,
  checkNameAvailability_Response,
} from './organizationTypes'

/** 기관 목록 조회 — `GET /api/v0/organizations` */
export const findOrganizations = (
  params: { query?: findOrganizations_Query } & RequestOptions = {},
) =>
  unwrap<findOrganizations_Response>(
    izClient.GET('/api/v0/organizations', {
      params: { query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )

/** 기관 생성 및 기본 운영 정책 초기화 — `POST /api/v0/organizations` */
export const createOrganization = (params: { body: createOrganization_Body } & RequestOptions) =>
  unwrap<createOrganization_Response>(
    izClient.POST('/api/v0/organizations', { body: params.body, signal: params.signal }) as never,
  )

/** 기관 복구 — `POST /api/v0/organizations/{organizationId}/restore` */
export const restoreOrganization = (params: { path: restoreOrganization_Path } & RequestOptions) =>
  unwrap<restoreOrganization_Response>(
    izClient.POST('/api/v0/organizations/{organizationId}/restore', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 기관 상세 조회 — `GET /api/v0/organizations/{organizationId}` */
export const findOrganization = (params: { path: findOrganization_Path } & RequestOptions) =>
  unwrap<findOrganization_Response>(
    izClient.GET('/api/v0/organizations/{organizationId}', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 기관 soft-delete — `DELETE /api/v0/organizations/{organizationId}` */
export const deleteOrganization = (
  params: { path: deleteOrganization_Path; body: deleteOrganization_Body } & RequestOptions,
) =>
  unwrap<deleteOrganization_Response>(
    izClient.DELETE('/api/v0/organizations/{organizationId}', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 기관 이름 또는 운영 상태 변경 — `PATCH /api/v0/organizations/{organizationId}` */
export const updateOrganization = (
  params: { path: updateOrganization_Path; body: updateOrganization_Body } & RequestOptions,
) =>
  unwrap<updateOrganization_Response>(
    izClient.PATCH('/api/v0/organizations/{organizationId}', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 오퍼레이터 계정 정지 / 재활성 — `PATCH /api/v0/organizations/{organizationId}/operators/{memberId}/status` */
export const updateOperatorStatus = (
  params: { path: updateOperatorStatus_Path; body: updateOperatorStatus_Body } & RequestOptions,
) =>
  unwrap<updateOperatorStatus_Response>(
    izClient.PATCH('/api/v0/organizations/{organizationId}/operators/{memberId}/status', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 기관 오퍼레이터 계정 목록 조회 — `GET /api/v0/organizations/{organizationId}/operators` */
export const findOperators = (params: { path: findOperators_Path } & RequestOptions) =>
  unwrap<findOperators_Response>(
    izClient.GET('/api/v0/organizations/{organizationId}/operators', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 기관 기수 목록 조회 (읽기전용) — `GET /api/v0/organizations/{organizationId}/cohorts` */
export const findOrganizationCohorts = (
  params: { path: findOrganizationCohorts_Path } & RequestOptions,
) =>
  unwrap<findOrganizationCohorts_Response>(
    izClient.GET('/api/v0/organizations/{organizationId}/cohorts', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 플랫폼 전체 집계 조회 — `GET /api/v0/organizations/summary` */
export const findPlatformSummary = (params: RequestOptions = {}) =>
  unwrap<findPlatformSummary_Response>(
    izClient.GET('/api/v0/organizations/summary', { signal: params.signal }) as never,
  )

/** 기관명 중복 확인 — `GET /api/v0/organizations/name-availability` */
export const checkNameAvailability = (
  params: { query: checkNameAvailability_Query } & RequestOptions,
) =>
  unwrap<checkNameAvailability_Response>(
    izClient.GET('/api/v0/organizations/name-availability', {
      params: { query: params.query },
      signal: params.signal,
    }) as never,
  )
