/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import { getCurrentMember } from './memberApi'
import { memberKeys } from './memberKeys'
import type { getCurrentMember_Response } from './memberTypes'

/** 내 정보 조회 */
export function useGetCurrentMember(options?: QueryOptions<getCurrentMember_Response>) {
  return useQuery({
    queryKey: memberKeys.getCurrentMember(),
    queryFn: ({ signal }) => getCurrentMember({ signal }),
    ...options,
  })
}
