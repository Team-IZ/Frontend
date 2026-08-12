/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Response · _Item · _Errors
*/

// GET /api/v0/reports/{reportId}/disclosure — 내 리포트 공개 상태 조회
export type findMyDisclosure_Path = operations['findMyDisclosure']['parameters']['path']
export type findMyDisclosure_Response =
  operations['findMyDisclosure']['responses'][200]['content']['application/json']

// PUT /api/v0/reports/{reportId}/disclosure — 리포트 공개 범위 설정
export type updateDisclosure_Path = operations['updateDisclosure']['parameters']['path']
export type updateDisclosure_Body = NonNullable<
  operations['updateDisclosure']['requestBody']
>['content']['application/json']
export type updateDisclosure_Response =
  operations['updateDisclosure']['responses'][200]['content']['application/json']
