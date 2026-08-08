/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import {
  findSections,
  findUsedProjects,
  findComparableCohorts,
  findLinkableCurricula,
} from './curriculumApi'
import { curriculumKeys } from './curriculumKeys'
import type {
  findSections_Path,
  findSections_Response,
  findUsedProjects_Path,
  findUsedProjects_Response,
  findComparableCohorts_Query,
  findComparableCohorts_Response,
  findLinkableCurricula_Path,
  findLinkableCurricula_Response,
} from './curriculumTypes'

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

/** 기수 연결 교안 목록 */
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
