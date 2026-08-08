/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  findOrganizationOperationSettings_Path,
  findOrganizationOperationSettings_Response,
  updateOrganizationOperationSettings_Path,
  updateOrganizationOperationSettings_Body,
  updateOrganizationOperationSettings_Response,
  findUsage_Path,
  findUsage_Query,
  findUsage_Response,
  findCohortCost_Path,
  findCohortCost_Query,
  findCohortCost_Response,
} from './usageTypes'

/** 기관 운영 설정 조회 — `GET /api/v0/organizations/{organizationId}/operations/settings` */
export const findOrganizationOperationSettings = (
  params: { path: findOrganizationOperationSettings_Path } & RequestOptions,
) =>
  unwrap<findOrganizationOperationSettings_Response>(
    izClient.GET('/api/v0/organizations/{organizationId}/operations/settings', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 기관 운영 설정 변경 — `PUT /api/v0/organizations/{organizationId}/operations/settings` */
export const updateOrganizationOperationSettings = (
  params: {
    path: updateOrganizationOperationSettings_Path
    body: updateOrganizationOperationSettings_Body
  } & RequestOptions,
) =>
  unwrap<updateOrganizationOperationSettings_Response>(
    izClient.PUT('/api/v0/organizations/{organizationId}/operations/settings', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 기관 월별 저장량·활동·AI 비용 조회 — `GET /api/v0/organizations/{organizationId}/operations/usage` */
export const findUsage = (
  params: { path: findUsage_Path; query?: findUsage_Query } & RequestOptions,
) =>
  unwrap<findUsage_Response>(
    izClient.GET('/api/v0/organizations/{organizationId}/operations/usage', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )

/** 기수 비용 조회 (OP-06 ⑤) — `GET /api/v0/organizations/{organizationId}/operations/cost` */
export const findCohortCost = (
  params: { path: findCohortCost_Path; query: findCohortCost_Query } & RequestOptions,
) =>
  unwrap<findCohortCost_Response>(
    izClient.GET('/api/v0/organizations/{organizationId}/operations/cost', {
      params: { path: params.path, query: params.query },
      signal: params.signal,
    }) as never,
  )
