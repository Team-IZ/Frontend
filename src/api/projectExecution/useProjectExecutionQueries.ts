/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import {
  findProjects,
  findProject,
  findRounds,
  findConceptCandidates,
  findProjectClassProgress,
} from './projectExecutionApi'
import { projectExecutionKeys } from './projectExecutionKeys'
import type {
  findProjects_Path,
  findProjects_Response,
  findProject_Path,
  findProject_Response,
  findRounds_Path,
  findRounds_Response,
  findConceptCandidates_Path,
  findConceptCandidates_Response,
  findProjectClassProgress_Path,
  findProjectClassProgress_Query,
  findProjectClassProgress_Response,
} from './projectExecutionTypes'

/** 기수 프로젝트 목록 */
export function useFindProjects(
  params: { path: findProjects_Path },
  options?: QueryOptions<findProjects_Response>,
) {
  return useQuery({
    queryKey: projectExecutionKeys.findProjects(params),
    queryFn: ({ signal }) => findProjects({ ...params, signal }),
    ...options,
  })
}

/** 프로젝트 상세 조회 */
export function useFindProject(
  params: { path: findProject_Path },
  options?: QueryOptions<findProject_Response>,
) {
  return useQuery({
    queryKey: projectExecutionKeys.findProject(params),
    queryFn: ({ signal }) => findProject({ ...params, signal }),
    ...options,
  })
}

/** 프로젝트 회차 목록 */
export function useFindRounds(
  params: { path: findRounds_Path },
  options?: QueryOptions<findRounds_Response>,
) {
  return useQuery({
    queryKey: projectExecutionKeys.findRounds(params),
    queryFn: ({ signal }) => findRounds({ ...params, signal }),
    ...options,
  })
}

/** 검증개념 후보 조회 */
export function useFindConceptCandidates(
  params: { path: findConceptCandidates_Path },
  options?: QueryOptions<findConceptCandidates_Response>,
) {
  return useQuery({
    queryKey: projectExecutionKeys.findConceptCandidates(params),
    queryFn: ({ signal }) => findConceptCandidates({ ...params, signal }),
    ...options,
  })
}

/** 반별 제출·분석·응시 현황 조회 */
export function useFindProjectClassProgress(
  params: { path: findProjectClassProgress_Path; query?: findProjectClassProgress_Query },
  options?: QueryOptions<findProjectClassProgress_Response>,
) {
  return useQuery({
    queryKey: projectExecutionKeys.findProjectClassProgress(params),
    queryFn: ({ signal }) => findProjectClassProgress({ ...params, signal }),
    ...options,
  })
}
