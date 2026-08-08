/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  findCohorts_Query,
  findCohorts_Response,
  createCohort_Body,
  createCohort_Response,
  findClassrooms_Path,
  findClassrooms_Response,
  createClassroom_Path,
  createClassroom_Body,
  createClassroom_Response,
  endCohort_Path,
  endCohort_Body,
  endCohort_Response,
  updateManagers_Path,
  updateManagers_Body,
  updateManagers_Response,
  assignTrainees_Path,
  assignTrainees_Body,
  assignTrainees_Response,
  rollbackAssignment_Path,
  rollbackAssignment_Body,
  rollbackAssignment_Response,
  findMyEnrollments_Response,
  findCohort_Path,
  findCohort_Response,
} from './academicTypes'

/** 기관 기수 목록 조회 — `GET /api/v0/cohorts` */
export const findCohorts = (params: { query?: findCohorts_Query } & RequestOptions = {}) =>
  unwrap<findCohorts_Response>(
    izClient.GET('/api/v0/cohorts', {
      params: { query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )

/** 기수 생성 — `POST /api/v0/cohorts` */
export const createCohort = (params: { body: createCohort_Body } & RequestOptions) =>
  unwrap<createCohort_Response>(
    izClient.POST('/api/v0/cohorts', { body: params.body, signal: params.signal }) as never,
  )

/** 기수 반 목록 조회 — `GET /api/v0/cohorts/{cohortId}/classrooms` */
export const findClassrooms = (params: { path: findClassrooms_Path } & RequestOptions) =>
  unwrap<findClassrooms_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/classrooms', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 반 생성 — `POST /api/v0/cohorts/{cohortId}/classrooms` */
export const createClassroom = (
  params: { path: createClassroom_Path; body: createClassroom_Body } & RequestOptions,
) =>
  unwrap<createClassroom_Response>(
    izClient.POST('/api/v0/cohorts/{cohortId}/classrooms', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 기수 종료 — `PATCH /api/v0/cohorts/{cohortId}/end` */
export const endCohort = (
  params: { path: endCohort_Path; body: endCohort_Body } & RequestOptions,
) =>
  unwrap<endCohort_Response>(
    izClient.PATCH('/api/v0/cohorts/{cohortId}/end', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 반 담당 매니저 변경 — `PATCH /api/v0/cohorts/{cohortId}/classrooms/{classroomId}/managers` */
export const updateManagers = (
  params: { path: updateManagers_Path; body: updateManagers_Body } & RequestOptions,
) =>
  unwrap<updateManagers_Response>(
    izClient.PATCH('/api/v0/cohorts/{cohortId}/classrooms/{classroomId}/managers', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 교육생 일괄 반 배정 — `PATCH /api/v0/cohorts/{cohortId}/classrooms/trainee-assignments` */
export const assignTrainees = (
  params: { path: assignTrainees_Path; body: assignTrainees_Body } & RequestOptions,
) =>
  unwrap<assignTrainees_Response>(
    izClient.PATCH('/api/v0/cohorts/{cohortId}/classrooms/trainee-assignments', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 교육생 반 배정 되돌리기 — `PATCH /api/v0/cohorts/{cohortId}/classrooms/trainee-assignments/rollback` */
export const rollbackAssignment = (
  params: { path: rollbackAssignment_Path; body: rollbackAssignment_Body } & RequestOptions,
) =>
  unwrap<rollbackAssignment_Response>(
    izClient.PATCH('/api/v0/cohorts/{cohortId}/classrooms/trainee-assignments/rollback', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 내 소속 기수·반 조회 — `GET /api/v0/members/me/enrollments` */
export const findMyEnrollments = (params: RequestOptions = {}) =>
  unwrap<findMyEnrollments_Response>(
    izClient.GET('/api/v0/members/me/enrollments', { signal: params.signal }) as never,
  )

/** 기수 상세 조회 — `GET /api/v0/cohorts/{cohortId}` */
export const findCohort = (params: { path: findCohort_Path } & RequestOptions) =>
  unwrap<findCohort_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )
