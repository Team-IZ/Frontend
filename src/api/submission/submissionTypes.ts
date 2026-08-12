/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Response · _Item · _Errors
*/

// POST /api/v0/submissions/repository-checks — 저장소 주소 사전 확인
export type checkRepository_Body = NonNullable<
  operations['checkRepository']['requestBody']
>['content']['application/json']
export type checkRepository_Response =
  operations['checkRepository']['responses'][200]['content']['application/json']

// GET /api/v0/submissions/{submissionId}/analysis — 코드 분석 진행 상태·실패 사유 조회
export type getAnalysis_Path = operations['getAnalysis']['parameters']['path']
export type getAnalysis_Response =
  operations['getAnalysis']['responses'][200]['content']['application/json']

// GET /api/v0/submissions/{submissionId}/analysis/result — 코드 분석 결과 조회
export type getAnalysisResult_Path = operations['getAnalysisResult']['parameters']['path']
export type getAnalysisResult_Response =
  operations['getAnalysisResult']['responses'][200]['content']['application/json']

// GET /api/v0/projects/{projectId}/my-submission — 내 팀의 제출 현황 조회
export type findMySubmission_Path = operations['findMySubmission']['parameters']['path']
export type findMySubmission_Response =
  operations['findMySubmission']['responses'][200]['content']['application/json']
