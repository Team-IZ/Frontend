/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Response · _Item · _Errors
*/

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
