/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Response · _Item · _Errors
*/

// GET /api/v0/assessment-rounds — 교육생 홈 3구획 조회
export type getMyAssessmentRounds_Response =
  operations['getMyAssessmentRounds']['responses'][200]['content']['application/json']
export type getMyAssessmentRounds_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'
