/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Header · _Response · _Item · _Errors
*/

// POST /api/v0/reports/sessions/{sessionId}/regeneration — 세션 지정 리포트 재생성
export type regenerateReport_Path = operations['regenerateReport']['parameters']['path']
export type regenerateReport_Response =
  operations['regenerateReport']['responses'][202]['content']['application/json']
export type regenerateReport_Errors =
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'REPORT_REGENERATION_TARGET_NOT_ELIGIBLE'
  | 'REPORT_SESSION_HAS_NO_PROBLEM'
  | 'REPORT_GENERATION_ALREADY_RUNNING'
  | 'REPORT_MODEL_NOT_CONFIGURED'

// POST /api/v0/reports/sessions/{sessionId}/generation — [연동 시험] 세션 지정 리포트 강제 생성
export type forceGenerateReport_Path = operations['forceGenerateReport']['parameters']['path']
export type forceGenerateReport_Response =
  operations['forceGenerateReport']['responses'][202]['content']['application/json']
export type forceGenerateReport_Errors =
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'REPORT_SESSION_NOT_FOUND'
  | 'REPORT_SESSION_HAS_NO_PROBLEM'
  | 'REPORT_GENERATION_ALREADY_RUNNING'
  | 'REPORT_MODEL_NOT_CONFIGURED'

// GET /api/v0/reports — 내 리포트 전량 조회
export type findMyReports_Response =
  operations['findMyReports']['responses'][200]['content']['application/json']
export type findMyReports_Item = NonNullable<findMyReports_Response['rounds']>[number]
export type findMyReports_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'

// GET /api/v0/reports/{reportId} — 리포트 단건 조회
export type findMyReport_Path = operations['findMyReport']['parameters']['path']
export type findMyReport_Response =
  operations['findMyReport']['responses'][200]['content']['application/json']
export type findMyReport_Item = NonNullable<findMyReport_Response['concepts']>[number]
export type findMyReport_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'

// GET /api/v0/reports/managed — 담당 교육생 리포트 조회 (매니저)
export type findManagedTraineeReports_Query = NonNullable<
  operations['findManagedTraineeReports']['parameters']['query']
>
export type findManagedTraineeReports_Response =
  operations['findManagedTraineeReports']['responses'][200]['content']['application/json']
export type findManagedTraineeReports_Item = NonNullable<
  findManagedTraineeReports_Response['rounds']
>[number]
export type findManagedTraineeReports_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'

// GET /api/v0/reports/class-diagnosis — 수업 진단 리포트 조회
export type findClassDiagnosis_Query = NonNullable<
  operations['findClassDiagnosis']['parameters']['query']
>
export type findClassDiagnosis_Response =
  operations['findClassDiagnosis']['responses'][200]['content']['application/json']
export type findClassDiagnosis_Errors = 'UNAUTHENTICATED' | 'ACCESS_DENIED'
