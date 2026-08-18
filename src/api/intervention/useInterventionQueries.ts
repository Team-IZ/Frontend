/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import { findInterviewBrief, findInterviews, findInterviewRoundOptions } from './interventionApi'
import { interventionKeys } from './interventionKeys'
import type {
  findInterviewBrief_Path,
  findInterviewBrief_Response,
  findInterviews_Query,
  findInterviews_Response,
  findInterviewRoundOptions_Response,
} from './interventionTypes'

/** [면담 상세] 면담 브리프 조회 */
export function useFindInterviewBrief(
  params: { path: findInterviewBrief_Path },
  options?: QueryOptions<findInterviewBrief_Response>,
) {
  return useQuery({
    queryKey: interventionKeys.findInterviewBrief(params),
    queryFn: ({ signal }) => findInterviewBrief({ ...params, signal }),
    ...options,
  })
}

/** [면담 목록] 면담 목록 조회 */
export function useFindInterviews(
  params: { query?: findInterviews_Query } = {},
  options?: QueryOptions<findInterviews_Response>,
) {
  return useQuery({
    queryKey: interventionKeys.findInterviews(params),
    queryFn: ({ signal }) => findInterviews({ ...params, signal }),
    ...options,
  })
}

/** [면담 목록] 면담 회차 옵션 조회 */
export function useFindInterviewRoundOptions(
  options?: QueryOptions<findInterviewRoundOptions_Response>,
) {
  return useQuery({
    queryKey: interventionKeys.findInterviewRoundOptions(),
    queryFn: ({ signal }) => findInterviewRoundOptions({ signal }),
    ...options,
  })
}
