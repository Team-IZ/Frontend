/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Header · _Response · _Item · _Errors
*/

// POST /api/v0/submissions — GitHub 저장소 URL 제출·재제출
export type submitGithubUrl_Header = NonNullable<
  operations['submitGithubUrl']['parameters']['header']
>
export type submitGithubUrl_Body = NonNullable<
  operations['submitGithubUrl']['requestBody']
>['content']['application/json']
export type submitGithubUrl_Response =
  operations['submitGithubUrl']['responses'][201]['content']['application/json']
export type submitGithubUrl_Errors =
  | 'IDEMPOTENCY_KEY_REQUIRED'
  | 'IDEMPOTENCY_KEY_INVALID'
  | 'INVALID_REPOSITORY_URL'
  | 'UNSUPPORTED_HOST'
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'SUBMISSION_ROUND_NOT_ACCESSIBLE'
  | 'SUBMISSION_ROUND_NOT_OPEN'
  | 'SUBMISSION_DEADLINE_PASSED'
  | 'SUBMISSION_METHOD_NOT_ALLOWED'
  | 'IDEMPOTENCY_KEY_CONFLICT'
  | 'AI_SERVER_UNAVAILABLE'

// POST /api/v0/submissions/repository-checks — 저장소 주소 사전 확인
export type checkRepository_Body = NonNullable<
  operations['checkRepository']['requestBody']
>['content']['application/json']
export type checkRepository_Response =
  operations['checkRepository']['responses'][200]['content']['application/json']
export type checkRepository_Errors =
  'INVALID_REPOSITORY_URL' | 'UNSUPPORTED_HOST' | 'UNAUTHENTICATED' | 'ACCESS_DENIED'

// GET /api/v0/submissions/{submissionId}/analysis — 코드 분석 진행 상태·실패 사유 조회
export type getSubmissionAnalysis_Path = operations['getSubmissionAnalysis']['parameters']['path']
export type getSubmissionAnalysis_Response =
  operations['getSubmissionAnalysis']['responses'][200]['content']['application/json']
export type getSubmissionAnalysis_Errors =
  'UNAUTHENTICATED' | 'SUBMISSION_ACCESS_DENIED' | 'ACCESS_DENIED' | 'SUBMISSION_NOT_FOUND'

// GET /api/v0/submissions/{submissionId}/analysis/result — 코드 분석 결과 조회
export type getSubmissionAnalysisResult_Path =
  operations['getSubmissionAnalysisResult']['parameters']['path']
export type getSubmissionAnalysisResult_Response =
  operations['getSubmissionAnalysisResult']['responses'][200]['content']['application/json']
export type getSubmissionAnalysisResult_Errors =
  | 'UNAUTHENTICATED'
  | 'SUBMISSION_ACCESS_DENIED'
  | 'ACCESS_DENIED'
  | 'SUBMISSION_NOT_FOUND'
  | 'ANALYSIS_RESULT_NOT_FOUND'

// GET /api/v0/projects/{projectId}/submissions — [프로젝트 상세 - 제출현황 탭] 프로젝트 회차 제출 현황 조회 (매니저)
export type findProjectSubmissionStatus_Path =
  operations['findProjectSubmissionStatus']['parameters']['path']
export type findProjectSubmissionStatus_Query = NonNullable<
  operations['findProjectSubmissionStatus']['parameters']['query']
>
export type findProjectSubmissionStatus_Response =
  operations['findProjectSubmissionStatus']['responses'][200]['content']['application/json']
export type findProjectSubmissionStatus_Errors =
  | 'VALIDATION_FAILED'
  | 'MANAGER_VIEWER_NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'MANAGER_VIEWER_NOT_ACTIVE'
  | 'MANAGER_ROLE_REQUIRED'
  | 'PROJECT_ROUND_NOT_FOUND'
  | 'MANAGER_SCOPE_NOT_FOUND'

// GET /api/v0/projects/{projectId}/my-submission — 내 팀의 제출 현황 조회
export type findMySubmission_Path = operations['findMySubmission']['parameters']['path']
export type findMySubmission_Response =
  operations['findMySubmission']['responses'][200]['content']['application/json']
export type findMySubmission_Errors =
  'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'SUBMISSION_ROUND_NOT_ACCESSIBLE'
