/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import {
  getMyCommitEmail,
  findTraineeRoster,
  getCurrentMember,
  findManagers,
  findManagerTraineeDetail,
  findManagerTraineeTimeline,
  findTraineeRegistrationProgress,
} from './memberApi'
import { memberKeys } from './memberKeys'
import type {
  getMyCommitEmail_Response,
  findTraineeRoster_Path,
  findTraineeRoster_Query,
  findTraineeRoster_Response,
  getCurrentMember_Response,
  findManagers_Query,
  findManagers_Response,
  findManagerTraineeDetail_Path,
  findManagerTraineeDetail_Response,
  findManagerTraineeTimeline_Path,
  findManagerTraineeTimeline_Query,
  findManagerTraineeTimeline_Response,
  findTraineeRegistrationProgress_Path,
  findTraineeRegistrationProgress_Response,
} from './memberTypes'

/** 내 커밋 이메일 조회 */
export function useGetMyCommitEmail(options?: QueryOptions<getMyCommitEmail_Response>) {
  return useQuery({
    queryKey: memberKeys.getMyCommitEmail(),
    queryFn: ({ signal }) => getMyCommitEmail({ signal }),
    ...options,
  })
}

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

/** 교육생 상세 조회 */
export function useFindManagerTraineeDetail(
  params: { path: findManagerTraineeDetail_Path },
  options?: QueryOptions<findManagerTraineeDetail_Response>,
) {
  return useQuery({
    queryKey: memberKeys.findManagerTraineeDetail(params),
    queryFn: ({ signal }) => findManagerTraineeDetail({ ...params, signal }),
    ...options,
  })
}

/** 교육생 통합 타임라인 조회 */
export function useFindManagerTraineeTimeline(
  params: { path: findManagerTraineeTimeline_Path; query?: findManagerTraineeTimeline_Query },
  options?: QueryOptions<findManagerTraineeTimeline_Response>,
) {
  return useQuery({
    queryKey: memberKeys.findManagerTraineeTimeline(params),
    queryFn: ({ signal }) => findManagerTraineeTimeline({ ...params, signal }),
    ...options,
  })
}

/** 교육생 일괄 등록 진행률 조회 */
export function useFindTraineeRegistrationProgress(
  params: { path: findTraineeRegistrationProgress_Path },
  options?: QueryOptions<findTraineeRegistrationProgress_Response>,
) {
  return useQuery({
    queryKey: memberKeys.findTraineeRegistrationProgress(params),
    queryFn: ({ signal }) => findTraineeRegistrationProgress({ ...params, signal }),
    ...options,
  })
}
