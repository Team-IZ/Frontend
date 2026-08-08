/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type { findConsents_Query, findConsents_Response } from './consentTypes'

/** 약관 목록 조회 — `GET /api/v0/consents` */
export const findConsents = (params: { query?: findConsents_Query } & RequestOptions = {}) =>
  unwrap<findConsents_Response>(
    izClient.GET('/api/v0/consents', {
      params: { query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )
