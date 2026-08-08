/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Response · _Item · _Errors
*/

// GET /api/v0/organizations/{organizationId}/operations/settings — 기관 운영 설정 조회
export type findOrganizationOperationSettings_Path =
  operations['findOrganizationOperationSettings']['parameters']['path']
export type findOrganizationOperationSettings_Response =
  operations['findOrganizationOperationSettings']['responses'][200]['content']['application/json']

// PUT /api/v0/organizations/{organizationId}/operations/settings — 기관 운영 설정 변경
export type updateOrganizationOperationSettings_Path =
  operations['updateOrganizationOperationSettings']['parameters']['path']
export type updateOrganizationOperationSettings_Body = NonNullable<
  operations['updateOrganizationOperationSettings']['requestBody']
>['content']['application/json']
export type updateOrganizationOperationSettings_Response =
  operations['updateOrganizationOperationSettings']['responses'][200]['content']['application/json']

// GET /api/v0/organizations/{organizationId}/operations/usage — 기관 월별 저장량·활동·AI 비용 조회
export type findUsage_Path = operations['findUsage']['parameters']['path']
export type findUsage_Query = NonNullable<operations['findUsage']['parameters']['query']>
export type findUsage_Response =
  operations['findUsage']['responses'][200]['content']['application/json']

// GET /api/v0/organizations/{organizationId}/operations/cost — 기수 비용 조회 (OP-06 ⑤)
export type findCohortCost_Path = operations['findCohortCost']['parameters']['path']
export type findCohortCost_Query = NonNullable<operations['findCohortCost']['parameters']['query']>
export type findCohortCost_Response =
  operations['findCohortCost']['responses'][200]['content']['application/json']
export type findCohortCost_Item = findCohortCost_Response['classes'][number]
