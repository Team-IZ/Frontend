/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  findCurriculumVersionHistory_Path,
  findCurriculumVersionHistory_Response,
  requestAnalysis_Path,
  requestAnalysis_Query,
  requestAnalysis_Response,
  findOrganizationCurricula_Path,
  findOrganizationCurricula_Query,
  findOrganizationCurricula_Response,
  findCurriculum_Path,
  findCurriculum_Query,
  findCurriculum_Response,
  deleteCurriculum_Path,
  deleteCurriculum_Response,
  findSections_Path,
  findSections_Query,
  findSections_Response,
  findUsedProjects_Path,
  findUsedProjects_Query,
  findUsedProjects_Response,
  findComparableCohorts_Query,
  findComparableCohorts_Response,
  findCohortLinkedCurricula_Path,
  findCohortLinkedCurricula_Response,
  findLinkableCurricula_Path,
  findLinkableCurricula_Response,
} from './curriculumTypes'

/** 교안 버전 이력 — `GET /api/v0/curricula/{materialId}/versions` */
export const findCurriculumVersionHistory = (
  params: { path: findCurriculumVersionHistory_Path } & RequestOptions,
) =>
  unwrap<findCurriculumVersionHistory_Response>(
    izClient.GET('/api/v0/curricula/{materialId}/versions', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 재분석 요청 — `POST /api/v0/curricula/{materialId}/analyses` */
export const requestAnalysis = (
  params: { path: requestAnalysis_Path; query?: requestAnalysis_Query } & RequestOptions,
) =>
  unwrap<requestAnalysis_Response>(
    izClient.POST('/api/v0/curricula/{materialId}/analyses', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )

/** 기관 교안 목록 — `GET /api/v0/organizations/{organizationId}/curricula` */
export const findOrganizationCurricula = (
  params: {
    path: findOrganizationCurricula_Path
    query?: findOrganizationCurricula_Query
  } & RequestOptions,
) =>
  unwrap<findOrganizationCurricula_Response>(
    izClient.GET('/api/v0/organizations/{organizationId}/curricula', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )

/** 교안 단건 상세 — `GET /api/v0/curricula/{materialId}` */
export const findCurriculum = (
  params: { path: findCurriculum_Path; query?: findCurriculum_Query } & RequestOptions,
) =>
  unwrap<findCurriculum_Response>(
    izClient.GET('/api/v0/curricula/{materialId}', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )

/** 교안 삭제 — `DELETE /api/v0/curricula/{materialId}` */
export const deleteCurriculum = (params: { path: deleteCurriculum_Path } & RequestOptions) =>
  unwrap<deleteCurriculum_Response>(
    izClient.DELETE('/api/v0/curricula/{materialId}', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 교안 섹션·개념 조회 — `GET /api/v0/curricula/{materialId}/sections` */
export const findSections = (
  params: { path: findSections_Path; query?: findSections_Query } & RequestOptions,
) =>
  unwrap<findSections_Response>(
    izClient.GET('/api/v0/curricula/{materialId}/sections', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )

/** 쓰인 회차 — `GET /api/v0/curricula/{materialId}/projects` */
export const findUsedProjects = (
  params: { path: findUsedProjects_Path; query?: findUsedProjects_Query } & RequestOptions,
) =>
  unwrap<findUsedProjects_Response>(
    izClient.GET('/api/v0/curricula/{materialId}/projects', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )

/** 비교 가능한 기수 목록 — `GET /api/v0/curricula/comparable-cohorts` */
export const findComparableCohorts = (
  params: { query: findComparableCohorts_Query } & RequestOptions,
) =>
  unwrap<findComparableCohorts_Response>(
    izClient.GET('/api/v0/curricula/comparable-cohorts', {
      params: { query: params.query },
      signal: params.signal,
    }) as never,
  )

/** 기수에 연결된 교안 목록 — `GET /api/v0/cohorts/{cohortId}/linked-curricula` */
export const findCohortLinkedCurricula = (
  params: { path: findCohortLinkedCurricula_Path } & RequestOptions,
) =>
  unwrap<findCohortLinkedCurricula_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/linked-curricula', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 회차에 연결할 수 있는 교안 후보 — `GET /api/v0/cohorts/{cohortId}/curricula` */
export const findLinkableCurricula = (
  params: { path: findLinkableCurricula_Path } & RequestOptions,
) =>
  unwrap<findLinkableCurricula_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/curricula', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )
