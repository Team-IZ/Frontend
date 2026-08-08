/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import { findProjectClassProgress } from './projectApi'
import { projectKeys } from './projectKeys'
import type {
  findProjectClassProgress_Path,
  findProjectClassProgress_Query,
  findProjectClassProgress_Response,
} from './projectTypes'

/** 반별 제출·분석·응시 현황 조회 */
export function useFindProjectClassProgress(
  params: { path: findProjectClassProgress_Path; query?: findProjectClassProgress_Query },
  options?: QueryOptions<findProjectClassProgress_Response>,
) {
  return useQuery({
    queryKey: projectKeys.findProjectClassProgress(params),
    queryFn: ({ signal }) => findProjectClassProgress({ ...params, signal }),
    ...options,
  })
}
