/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import { findTraineeRoster, getCurrentMember, findManagers } from './memberApi'
import { memberKeys } from './memberKeys'
import type {
  findTraineeRoster_Path,
  findTraineeRoster_Query,
  findTraineeRoster_Response,
  getCurrentMember_Response,
  findManagers_Query,
  findManagers_Response,
} from './memberTypes'

/** 기수 교육생 명단 조회 */
export function useFindTraineeRoster(
  params: { path: findTraineeRoster_Path; query?: findTraineeRoster_Query },
  options?: QueryOptions<findTraineeRoster_Response>,
) {
  return useQuery({
    queryKey: memberKeys.findTraineeRoster(params),
    queryFn: ({ signal }) => findTraineeRoster({ ...params, signal }),
    ...options,
  })
}

/** 내 정보 조회 */
export function useGetCurrentMember(options?: QueryOptions<getCurrentMember_Response>) {
  return useQuery({
    queryKey: memberKeys.getCurrentMember(),
    queryFn: ({ signal }) => getCurrentMember({ signal }),
    ...options,
  })
}

/** 매니저 목록 조회 */
export function useFindManagers(
  params: { query?: findManagers_Query } = {},
  options?: QueryOptions<findManagers_Response>,
) {
  return useQuery({
    queryKey: memberKeys.findManagers(params),
    queryFn: ({ signal }) => findManagers({ ...params, signal }),
    ...options,
  })
}
