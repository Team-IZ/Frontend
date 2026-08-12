/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  checkRepository_Body,
  checkRepository_Response,
  getAnalysis_Path,
  getAnalysis_Response,
  getAnalysisResult_Path,
  getAnalysisResult_Response,
  findMySubmission_Path,
  findMySubmission_Response,
} from './submissionTypes'

/** 저장소 주소 사전 확인 — `POST /api/v0/submissions/repository-checks` */
export const checkRepository = (params: { body: checkRepository_Body } & RequestOptions) =>
  unwrap<checkRepository_Response>(
    izClient.POST('/api/v0/submissions/repository-checks', {
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 코드 분석 진행 상태·실패 사유 조회 — `GET /api/v0/submissions/{submissionId}/analysis` */
export const getAnalysis = (params: { path: getAnalysis_Path } & RequestOptions) =>
  unwrap<getAnalysis_Response>(
    izClient.GET('/api/v0/submissions/{submissionId}/analysis', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 코드 분석 결과 조회 — `GET /api/v0/submissions/{submissionId}/analysis/result` */
export const getAnalysisResult = (params: { path: getAnalysisResult_Path } & RequestOptions) =>
  unwrap<getAnalysisResult_Response>(
    izClient.GET('/api/v0/submissions/{submissionId}/analysis/result', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 내 팀의 제출 현황 조회 — `GET /api/v0/projects/{projectId}/my-submission` */
export const findMySubmission = (params: { path: findMySubmission_Path } & RequestOptions) =>
  unwrap<findMySubmission_Response>(
    izClient.GET('/api/v0/projects/{projectId}/my-submission', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )
