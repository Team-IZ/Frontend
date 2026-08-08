/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  replaceRequirements_Path,
  replaceRequirements_Body,
  replaceRequirements_Response,
  confirmConcepts_Path,
  confirmConcepts_Body,
  confirmConcepts_Response,
  linkCurriculum_Path,
  linkCurriculum_Body,
  linkCurriculum_Response,
  findProjects_Path,
  findProjects_Response,
  createProject_Path,
  createProject_Body,
  createProject_Response,
  findProject_Path,
  findProject_Response,
  updateSchedule_Path,
  updateSchedule_Body,
  updateSchedule_Response,
  updateRoundSchedule_Path,
  updateRoundSchedule_Body,
  updateRoundSchedule_Response,
  findRounds_Path,
  findRounds_Response,
  findConceptCandidates_Path,
  findConceptCandidates_Response,
  findProjectClassProgress_Path,
  findProjectClassProgress_Query,
  findProjectClassProgress_Response,
} from './projectExecutionTypes'

/** 프로젝트 요구사항 전체 교체 — `PUT /api/v0/projects/{projectId}/requirements` */
export const replaceRequirements = (
  params: { path: replaceRequirements_Path; body: replaceRequirements_Body } & RequestOptions,
) =>
  unwrap<replaceRequirements_Response>(
    izClient.PUT('/api/v0/projects/{projectId}/requirements', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 검증개념 확정 — `PUT /api/v0/projects/{projectId}/concepts` */
export const confirmConcepts = (
  params: { path: confirmConcepts_Path; body: confirmConcepts_Body } & RequestOptions,
) =>
  unwrap<confirmConcepts_Response>(
    izClient.PUT('/api/v0/projects/{projectId}/concepts', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 프로젝트 교안 연결 — `POST /api/v0/projects/{projectId}/curricula` */
export const linkCurriculum = (
  params: { path: linkCurriculum_Path; body: linkCurriculum_Body } & RequestOptions,
) =>
  unwrap<linkCurriculum_Response>(
    izClient.POST('/api/v0/projects/{projectId}/curricula', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 기수 프로젝트 목록 — `GET /api/v0/cohorts/{cohortId}/projects` */
export const findProjects = (params: { path: findProjects_Path } & RequestOptions) =>
  unwrap<findProjects_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/projects', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 프로젝트 생성 — `POST /api/v0/cohorts/{cohortId}/projects` */
export const createProject = (
  params: { path: createProject_Path; body: createProject_Body } & RequestOptions,
) =>
  unwrap<createProject_Response>(
    izClient.POST('/api/v0/cohorts/{cohortId}/projects', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 프로젝트 상세 조회 — `GET /api/v0/projects/{projectId}` */
export const findProject = (params: { path: findProject_Path } & RequestOptions) =>
  unwrap<findProject_Response>(
    izClient.GET('/api/v0/projects/{projectId}', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 프로젝트 일정 수정 — `PATCH /api/v0/projects/{projectId}` */
export const updateSchedule = (
  params: { path: updateSchedule_Path; body: updateSchedule_Body } & RequestOptions,
) =>
  unwrap<updateSchedule_Response>(
    izClient.PATCH('/api/v0/projects/{projectId}', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 프로젝트 회차 일정 수정 — `PATCH /api/v0/projects/{projectId}/rounds/{roundId}` */
export const updateRoundSchedule = (
  params: { path: updateRoundSchedule_Path; body: updateRoundSchedule_Body } & RequestOptions,
) =>
  unwrap<updateRoundSchedule_Response>(
    izClient.PATCH('/api/v0/projects/{projectId}/rounds/{roundId}', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 프로젝트 회차 목록 — `GET /api/v0/projects/{projectId}/rounds` */
export const findRounds = (params: { path: findRounds_Path } & RequestOptions) =>
  unwrap<findRounds_Response>(
    izClient.GET('/api/v0/projects/{projectId}/rounds', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 검증개념 후보 조회 — `GET /api/v0/projects/{projectId}/concept-candidates` */
export const findConceptCandidates = (
  params: { path: findConceptCandidates_Path } & RequestOptions,
) =>
  unwrap<findConceptCandidates_Response>(
    izClient.GET('/api/v0/projects/{projectId}/concept-candidates', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 반별 제출·분석·응시 현황 조회 — `GET /api/v0/projects/{projectId}/class-progress` */
export const findProjectClassProgress = (
  params: {
    path: findProjectClassProgress_Path
    query?: findProjectClassProgress_Query
  } & RequestOptions,
) =>
  unwrap<findProjectClassProgress_Response>(
    izClient.GET('/api/v0/projects/{projectId}/class-progress', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )
