/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Response · _Item · _Errors
*/

// GET /api/v0/reports/class-diagnosis — 수업 진단 리포트 조회
export type findClassDiagnosis_Query = NonNullable<
  operations['findClassDiagnosis']['parameters']['query']
>
export type findClassDiagnosis_Response =
  operations['findClassDiagnosis']['responses'][200]['content']['application/json']
