/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import {
  findOrganizationCurricula,
  findCurriculum,
  findSections,
  findUsedProjects,
  findComparableCohorts,
  findCohortLinkedCurricula,
  findLinkableCurricula,
} from './curriculumApi'
import { curriculumKeys } from './curriculumKeys'
import type {
  findOrganizationCurricula_Path,
  findOrganizationCurricula_Query,
  findOrganizationCurricula_Response,
  findCurriculum_Path,
  findCurriculum_Response,
  findSections_Path,
  findSections_Response,
  findUsedProjects_Path,
  findUsedProjects_Response,
  findComparableCohorts_Query,
  findComparableCohorts_Response,
  findCohortLinkedCurricula_Path,
  findCohortLinkedCurricula_Response,
  findLinkableCurricula_Path,
  findLinkableCurricula_Response,
} from './curriculumTypes'

/** 기관 교안 목록 */
export function useFindOrganizationCurricula(
  params: { path: findOrganizationCurricula_Path; query?: findOrganizationCurricula_Query },
  options?: QueryOptions<findOrganizationCurricula_Response>,
) {
  return useQuery({
    queryKey: curriculumKeys.findOrganizationCurricula(params),
    queryFn: ({ signal }) => findOrganizationCurricula({ ...params, signal }),
    ...options,
  })
}

/** 교안 단건 상세 */
export function useFindCurriculum(
  params: { path: findCurriculum_Path },
  options?: QueryOptions<findCurriculum_Response>,
) {
  return useQuery({
    queryKey: curriculumKeys.findCurriculum(params),
    queryFn: ({ signal }) => findCurriculum({ ...params, signal }),
    ...options,
  })
}

/** 교안 섹션·개념 조회 */
export function useFindSections(
  params: { path: findSections_Path },
  options?: QueryOptions<findSections_Response>,
) {
  return useQuery({
    queryKey: curriculumKeys.findSections(params),
    queryFn: ({ signal }) => findSections({ ...params, signal }),
    ...options,
  })
}

/** 쓰인 회차 */
export function useFindUsedProjects(
  params: { path: findUsedProjects_Path },
  options?: QueryOptions<findUsedProjects_Response>,
) {
  return useQuery({
    queryKey: curriculumKeys.findUsedProjects(params),
    queryFn: ({ signal }) => findUsedProjects({ ...params, signal }),
    ...options,
  })
}

/** 비교 가능한 기수 목록 */
export function useFindComparableCohorts(
  params: { query: findComparableCohorts_Query },
  options?: QueryOptions<findComparableCohorts_Response>,
) {
  return useQuery({
    queryKey: curriculumKeys.findComparableCohorts(params),
    queryFn: ({ signal }) => findComparableCohorts({ ...params, signal }),
    ...options,
  })
}

/** 기수에 연결된 교안 목록 */
export function useFindCohortLinkedCurricula(
  params: { path: findCohortLinkedCurricula_Path },
  options?: QueryOptions<findCohortLinkedCurricula_Response>,
) {
  return useQuery({
    queryKey: curriculumKeys.findCohortLinkedCurricula(params),
    queryFn: ({ signal }) => findCohortLinkedCurricula({ ...params, signal }),
    ...options,
  })
}

/** 회차에 연결할 수 있는 교안 후보 */
export function useFindLinkableCurricula(
  params: { path: findLinkableCurricula_Path },
  options?: QueryOptions<findLinkableCurricula_Response>,
) {
  return useQuery({
    queryKey: curriculumKeys.findLinkableCurricula(params),
    queryFn: ({ signal }) => findLinkableCurricula({ ...params, signal }),
    ...options,
  })
}
