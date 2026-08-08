/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import { findConsents } from './consentApi'
import { consentKeys } from './consentKeys'
import type { findConsents_Query, findConsents_Response } from './consentTypes'

/** 약관 목록 조회 */
export function useFindConsents(
  params: { query?: findConsents_Query } = {},
  options?: QueryOptions<findConsents_Response>,
) {
  return useQuery({
    queryKey: consentKeys.findConsents(params),
    queryFn: ({ signal }) => findConsents({ ...params, signal }),
    ...options,
  })
}
