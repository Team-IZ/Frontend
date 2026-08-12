/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import { findMyDisclosure } from './disclosureApi'
import { disclosureKeys } from './disclosureKeys'
import type { findMyDisclosure_Path, findMyDisclosure_Response } from './disclosureTypes'

/** 내 리포트 공개 상태 조회 */
export function useFindMyDisclosure(
  params: { path: findMyDisclosure_Path },
  options?: QueryOptions<findMyDisclosure_Response>,
) {
  return useQuery({
    queryKey: disclosureKeys.findMyDisclosure(params),
    queryFn: ({ signal }) => findMyDisclosure({ ...params, signal }),
    ...options,
  })
}
