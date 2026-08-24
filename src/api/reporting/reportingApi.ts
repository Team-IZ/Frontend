/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  regenerateReport_Path,
  regenerateReport_Response,
  forceGenerateReport_Path,
  forceGenerateReport_Response,
  findMyReports_Response,
  findMyReport_Path,
  findMyReport_Response,
  findManagedTraineeReports_Query,
  findManagedTraineeReports_Response,
  findClassDiagnosis_Query,
  findClassDiagnosis_Response,
} from './reportingTypes'

/** 세션 지정 리포트 재생성 — `POST /api/v0/reports/sessions/{sessionId}/regeneration` */
export const regenerateReport = (params: { path: regenerateReport_Path } & RequestOptions) =>
  unwrap<regenerateReport_Response>(
    izClient.POST('/api/v0/reports/sessions/{sessionId}/regeneration', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** [연동 시험] 세션 지정 리포트 강제 생성 — `POST /api/v0/reports/sessions/{sessionId}/generation` */
export const forceGenerateReport = (params: { path: forceGenerateReport_Path } & RequestOptions) =>
  unwrap<forceGenerateReport_Response>(
    izClient.POST('/api/v0/reports/sessions/{sessionId}/generation', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 내 리포트 전량 조회 — `GET /api/v0/reports` */
export const findMyReports = (params: RequestOptions = {}) =>
  unwrap<findMyReports_Response>(
    izClient.GET('/api/v0/reports', { signal: params.signal }) as never,
  )

/** 리포트 단건 조회 — `GET /api/v0/reports/{reportId}` */
export const findMyReport = (params: { path: findMyReport_Path } & RequestOptions) =>
  unwrap<findMyReport_Response>(
    izClient.GET('/api/v0/reports/{reportId}', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 담당 교육생 리포트 조회 (매니저) — `GET /api/v0/reports/managed` */
export const findManagedTraineeReports = (
  params: { query: findManagedTraineeReports_Query } & RequestOptions,
) =>
  unwrap<findManagedTraineeReports_Response>(
    izClient.GET('/api/v0/reports/managed', {
      params: { query: params.query },
      signal: params.signal,
    }) as never,
  )

/** 수업 진단 리포트 조회 — `GET /api/v0/reports/class-diagnosis` */
export const findClassDiagnosis = (params: { query: findClassDiagnosis_Query } & RequestOptions) =>
  unwrap<findClassDiagnosis_Response>(
    izClient.GET('/api/v0/reports/class-diagnosis', {
      params: { query: params.query },
      signal: params.signal,
    }) as never,
  )
