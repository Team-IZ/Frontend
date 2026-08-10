/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type { findClassDiagnosis_Query, findClassDiagnosis_Response } from './reportingTypes'

/** 수업 진단 리포트 조회 — `GET /api/v0/reports/class-diagnosis` */
export const findClassDiagnosis = (params: { query: findClassDiagnosis_Query } & RequestOptions) =>
  unwrap<findClassDiagnosis_Response>(
    izClient.GET('/api/v0/reports/class-diagnosis', {
      params: { query: params.query },
      signal: params.signal,
    }) as never,
  )
