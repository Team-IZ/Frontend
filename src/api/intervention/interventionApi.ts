/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  findInterviewBrief_Path,
  findInterviewBrief_Response,
  saveInterviewBrief_Path,
  saveInterviewBrief_Body,
  saveInterviewBrief_Response,
  createInterviewBrief_Path,
  createInterviewBrief_Response,
  excludeInterviewCase_Path,
  excludeInterviewCase_Response,
  reincludeInterviewCase_Path,
  reincludeInterviewCase_Response,
  findInterviews_Query,
  findInterviews_Response,
  findInterviewRoundOptions_Response,
} from './interventionTypes'

/** [면담 상세] 면담 브리프 조회 — `GET /api/v0/interviews/{caseId}/brief` */
export const findInterviewBrief = (params: { path: findInterviewBrief_Path } & RequestOptions) =>
  unwrap<findInterviewBrief_Response>(
    izClient.GET('/api/v0/interviews/{caseId}/brief', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** [면담 상세] 브리프 저장하고 면담 종결 — `PUT /api/v0/interviews/{caseId}/brief` */
export const saveInterviewBrief = (
  params: { path: saveInterviewBrief_Path; body: saveInterviewBrief_Body } & RequestOptions,
) =>
  unwrap<saveInterviewBrief_Response>(
    izClient.PUT('/api/v0/interviews/{caseId}/brief', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** [면담 목록] 면담 브리프 생성 (AI) — `POST /api/v0/interviews/{caseId}/brief` */
export const createInterviewBrief = (
  params: { path: createInterviewBrief_Path } & RequestOptions,
) =>
  unwrap<createInterviewBrief_Response>(
    izClient.POST('/api/v0/interviews/{caseId}/brief', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** [면담 목록] 면담 대상 제외 — `POST /api/v0/interviews/{caseId}/exclusion` */
export const excludeInterviewCase = (
  params: { path: excludeInterviewCase_Path } & RequestOptions,
) =>
  unwrap<excludeInterviewCase_Response>(
    izClient.POST('/api/v0/interviews/{caseId}/exclusion', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** [면담 목록] 면담 대상 제외 되돌리기 — `DELETE /api/v0/interviews/{caseId}/exclusion` */
export const reincludeInterviewCase = (
  params: { path: reincludeInterviewCase_Path } & RequestOptions,
) =>
  unwrap<reincludeInterviewCase_Response>(
    izClient.DELETE('/api/v0/interviews/{caseId}/exclusion', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** [면담 목록] 면담 목록 조회 — `GET /api/v0/interviews` */
export const findInterviews = (params: { query?: findInterviews_Query } & RequestOptions = {}) =>
  unwrap<findInterviews_Response>(
    izClient.GET('/api/v0/interviews', {
      params: { query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )

/** [면담 목록] 면담 회차 옵션 조회 — `GET /api/v0/interviews/rounds` */
export const findInterviewRoundOptions = (params: RequestOptions = {}) =>
  unwrap<findInterviewRoundOptions_Response>(
    izClient.GET('/api/v0/interviews/rounds', { signal: params.signal }) as never,
  )
