/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Header · _Response · _Item · _Errors
*/

// POST /api/v0/assessment-sessions/{sessionId}/start — 세션 시작(인트로 동의)
export type startSession_Path = operations['startSession']['parameters']['path']
export type startSession_Response =
  operations['startSession']['responses'][200]['content']['application/json']
export type startSession_Errors =
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'SESSION_NOT_ACCESSIBLE'
  | 'SESSION_ALREADY_ENDED'
  | 'ASSESSMENT_WINDOW_CLOSED'
  | 'REVIEW_DUE_AT_PASSED'
  | 'STAGE_NOT_FOUND'

// POST /api/v0/assessment-sessions/{sessionId}/hints — 다시 설명(힌트) 요청
export type openSessionHint_Path = operations['openSessionHint']['parameters']['path']
export type openSessionHint_Response =
  operations['openSessionHint']['responses'][200]['content']['application/json']
export type openSessionHint_Errors =
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'SESSION_NOT_ACCESSIBLE'
  | 'HINT_EXHAUSTED'
  | 'HINT_NOT_AVAILABLE'
  | 'SESSION_NOT_STARTED'
  | 'SESSION_TIMEOUT'

// POST /api/v0/assessment-sessions/{sessionId}/answers — 답변 제출 → 채점 → 다음 질문
export type submitSessionAnswer_Path = operations['submitSessionAnswer']['parameters']['path']
export type submitSessionAnswer_Body = NonNullable<
  operations['submitSessionAnswer']['requestBody']
>['content']['application/json']
export type submitSessionAnswer_Response =
  operations['submitSessionAnswer']['responses'][200]['content']['application/json']
export type submitSessionAnswer_Errors =
  | 'ANSWER_TEXT_REQUIRED'
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'SESSION_NOT_ACCESSIBLE'
  | 'SESSION_NOT_STARTED'
  | 'ASSESSMENT_WINDOW_CLOSED'
  | 'REVIEW_DUE_AT_PASSED'
  | 'SESSION_TIMEOUT'
  | 'ANSWER_ALREADY_SUBMITTED'
  | 'PROBLEM_TIME_LIMIT_EXCEEDED'
  | 'GRADING_FAILED'

// POST /api/v0/assessment-sessions/{sessionId}/activity — 응시 중 관찰 신호 기록
export type recordSessionActivity_Path = operations['recordSessionActivity']['parameters']['path']
export type recordSessionActivity_Body = NonNullable<
  operations['recordSessionActivity']['requestBody']
>['content']['application/json']
export type recordSessionActivity_Response = void
export type recordSessionActivity_Errors =
  | 'ACTIVITY_SIGNAL_REQUIRED'
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'SESSION_NOT_ACCESSIBLE'
  | 'SESSION_NOT_STARTED'
  | 'SESSION_TIMEOUT'
  | 'SESSION_ALREADY_ENDED'

// POST /api/v0/assessment-sessions/reviews — 다시 보기 개설(리포트에서 파생)
export type openReviewSession_Body = NonNullable<
  operations['openReviewSession']['requestBody']
>['content']['application/json']
export type openReviewSession_Response =
  operations['openReviewSession']['responses'][201]['content']['application/json']
export type openReviewSession_Errors =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'REVIEW_REPORT_NOT_ACCESSIBLE'
  | 'REVIEW_SOURCE_NOT_READY'
  | 'REVIEW_NOT_ELIGIBLE'
  | 'REVIEW_ALREADY_COMPLETED'

// GET /api/v0/assessment-sessions/{sessionId}/problems/{problemNo} — 문제 하나의 코드·질문·문답 조회
export type findSessionProblem_Path = operations['findSessionProblem']['parameters']['path']
export type findSessionProblem_Response =
  operations['findSessionProblem']['responses'][200]['content']['application/json']
export type findSessionProblem_Item = NonNullable<findSessionProblem_Response['turns']>[number]
export type findSessionProblem_Errors =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'SESSION_NOT_ACCESSIBLE'
  | 'PROBLEM_NOT_FOUND'
  | 'PROBLEM_ALREADY_CLOSED'

// GET /api/v0/assessment-sessions/current — 지금 이어서 할 세션 조회
export type findCurrentSession_Response =
  operations['findCurrentSession']['responses'][200]['content']['application/json']
export type findCurrentSession_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'

// GET /api/v0/assessment-rounds — 교육생 홈 3구획 조회
export type getMyAssessmentRounds_Response =
  operations['getMyAssessmentRounds']['responses'][200]['content']['application/json']
export type getMyAssessmentRounds_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'
