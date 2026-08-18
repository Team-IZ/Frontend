/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Header · _Response · _Item · _Errors
*/

// GET /api/v0/interviews/{caseId}/brief — [면담 상세] 면담 브리프 조회
export type findInterviewBrief_Path = operations['findInterviewBrief']['parameters']['path']
export type findInterviewBrief_Response =
  operations['findInterviewBrief']['responses'][200]['content']['application/json']
export type findInterviewBrief_Errors =
  'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'INTERVIEW_CASE_NOT_FOUND' | 'INTERVIEW_BRIEF_NOT_CREATED'

// PUT /api/v0/interviews/{caseId}/brief — [면담 상세] 브리프 저장하고 면담 종결
export type saveInterviewBrief_Path = operations['saveInterviewBrief']['parameters']['path']
export type saveInterviewBrief_Body = NonNullable<
  operations['saveInterviewBrief']['requestBody']
>['content']['application/json']
export type saveInterviewBrief_Response =
  operations['saveInterviewBrief']['responses'][200]['content']['application/json']
export type saveInterviewBrief_Errors =
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'INTERVIEW_CASE_NOT_FOUND'
  | 'INTERVIEW_BRIEF_NOT_CREATED'
  | 'BRIEF_HAS_NO_SELECTED_ITEM'
  | 'INTERVIEW_ROW_VERSION_CONFLICT'

// POST /api/v0/interviews/{caseId}/brief — [면담 목록] 면담 브리프 생성 (AI)
export type createInterviewBrief_Path = operations['createInterviewBrief']['parameters']['path']
export type createInterviewBrief_Response =
  operations['createInterviewBrief']['responses'][200]['content']['application/json']
export type createInterviewBrief_Errors =
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'INTERVIEW_CASE_NOT_FOUND'
  | 'VALIDITY_REVIEW_REQUIRED'
  | 'BRIEF_GENERATION_FAILED'
  | 'BRIEF_GENERATION_FAILED_RETRYABLE'

// POST /api/v0/interviews/{caseId}/exclusion — [면담 목록] 면담 대상 제외
export type excludeInterviewCase_Path = operations['excludeInterviewCase']['parameters']['path']
export type excludeInterviewCase_Response = void
export type excludeInterviewCase_Errors =
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'INTERVIEW_CASE_NOT_FOUND'
  | 'INTERVIEW_ALREADY_STARTED'
  | 'INTERVIEW_EXCLUSION_STATE_CONFLICT'
  | 'INTERVIEW_ROW_VERSION_CONFLICT'

// DELETE /api/v0/interviews/{caseId}/exclusion — [면담 목록] 면담 대상 제외 되돌리기
export type reincludeInterviewCase_Path = operations['reincludeInterviewCase']['parameters']['path']
export type reincludeInterviewCase_Response = void
export type reincludeInterviewCase_Errors =
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'INTERVIEW_CASE_NOT_FOUND'
  | 'INTERVIEW_EXCLUSION_STATE_CONFLICT'
  | 'INTERVIEW_ROW_VERSION_CONFLICT'

// GET /api/v0/interviews — [면담 목록] 면담 목록 조회
export type findInterviews_Query = NonNullable<operations['findInterviews']['parameters']['query']>
export type findInterviews_Response =
  operations['findInterviews']['responses'][200]['content']['application/json']
export type findInterviews_Errors =
  'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'MANAGER_SCOPE_NOT_FOUND' | 'ORGANIZATION_CONTEXT_MISSING'

// GET /api/v0/interviews/rounds — [면담 목록] 면담 회차 옵션 조회
export type findInterviewRoundOptions_Response =
  operations['findInterviewRoundOptions']['responses'][200]['content']['application/json']
export type findInterviewRoundOptions_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'
