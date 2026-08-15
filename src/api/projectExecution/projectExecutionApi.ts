/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  replaceRequirements_Path,
  replaceRequirements_Body,
  replaceRequirements_Response,
  confirmConcepts_Path,
  confirmConcepts_Body,
  confirmConcepts_Response,
  findTeams_Path,
  findTeams_Response,
  createTeam_Path,
  createTeam_Body,
  createTeam_Response,
  assignTeamMember_Path,
  assignTeamMember_Body,
  assignTeamMember_Response,
  confirmTeams_Path,
  confirmTeams_Response,
  autoAssignTeams_Path,
  autoAssignTeams_Body,
  autoAssignTeams_Response,
  linkCurriculum_Path,
  linkCurriculum_Body,
  linkCurriculum_Response,
  findProjects_Path,
  findProjects_Query,
  findProjects_Response,
  createProject_Path,
  createProject_Body,
  createProject_Response,
  findProject_Path,
  findProject_Response,
  deleteProject_Path,
  deleteProject_Response,
  updateSchedule_Path,
  updateSchedule_Body,
  updateSchedule_Response,
  updateTeam_Path,
  updateTeam_Body,
  updateTeam_Response,
  reopenTeams_Path,
  reopenTeams_Response,
  updateRoundSchedule_Path,
  updateRoundSchedule_Body,
  updateRoundSchedule_Response,
  findProjectsForManager_Query,
  findProjectsForManager_Response,
  findRounds_Path,
  findRounds_Response,
  findConceptCandidates_Path,
  findConceptCandidates_Response,
  findProjectClassProgress_Path,
  findProjectClassProgress_Query,
  findProjectClassProgress_Response,
  findCurrentProject_Path,
  findCurrentProject_Response,
  findCurrentRound_Response,
  removeTeamMember_Path,
  removeTeamMember_Response,
  unlinkCurriculum_Path,
  unlinkCurriculum_Response,
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

/** 팀 목록 조회 — `GET /api/v0/projects/{projectId}/teams` */
export const findTeams = (params: { path: findTeams_Path } & RequestOptions) =>
  unwrap<findTeams_Response>(
    izClient.GET('/api/v0/projects/{projectId}/teams', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 팀 생성 — `POST /api/v0/projects/{projectId}/teams` */
export const createTeam = (
  params: { path: createTeam_Path; body: createTeam_Body } & RequestOptions,
) =>
  unwrap<createTeam_Response>(
    izClient.POST('/api/v0/projects/{projectId}/teams', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 팀원 배정 — `POST /api/v0/projects/{projectId}/teams/{teamId}/members` */
export const assignTeamMember = (
  params: { path: assignTeamMember_Path; body: assignTeamMember_Body } & RequestOptions,
) =>
  unwrap<assignTeamMember_Response>(
    izClient.POST('/api/v0/projects/{projectId}/teams/{teamId}/members', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 팀 편성 확정 — `POST /api/v0/projects/{projectId}/teams/confirm` */
export const confirmTeams = (params: { path: confirmTeams_Path } & RequestOptions) =>
  unwrap<confirmTeams_Response>(
    izClient.POST('/api/v0/projects/{projectId}/teams/confirm', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 팀 자동 배분 실행 — `POST /api/v0/projects/{projectId}/teams/auto-assign` */
export const autoAssignTeams = (
  params: { path: autoAssignTeams_Path; body: autoAssignTeams_Body } & RequestOptions,
) =>
  unwrap<autoAssignTeams_Response>(
    izClient.POST('/api/v0/projects/{projectId}/teams/auto-assign', {
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
export const findProjects = (
  params: { path: findProjects_Path; query?: findProjects_Query } & RequestOptions,
) =>
  unwrap<findProjects_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/projects', {
      params: { path: params.path, query: params.query ?? {} },
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

/** 프로젝트(회차) 삭제 — `DELETE /api/v0/projects/{projectId}` */
export const deleteProject = (params: { path: deleteProject_Path } & RequestOptions) =>
  unwrap<deleteProject_Response>(
    izClient.DELETE('/api/v0/projects/{projectId}', {
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

/** 팀 정보 수정 — `PATCH /api/v0/projects/{projectId}/teams/{teamId}` */
export const updateTeam = (
  params: { path: updateTeam_Path; body: updateTeam_Body } & RequestOptions,
) =>
  unwrap<updateTeam_Response>(
    izClient.PATCH('/api/v0/projects/{projectId}/teams/{teamId}', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 팀 편성 다시 열기 — `PATCH /api/v0/projects/{projectId}/teams/reopen` */
export const reopenTeams = (params: { path: reopenTeams_Path } & RequestOptions) =>
  unwrap<reopenTeams_Response>(
    izClient.PATCH('/api/v0/projects/{projectId}/teams/reopen', {
      params: { path: params.path },
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

/** 담당 반 프로젝트 목록 — `GET /api/v0/projects` */
export const findProjectsForManager = (
  params: { query?: findProjectsForManager_Query } & RequestOptions = {},
) =>
  unwrap<findProjectsForManager_Response>(
    izClient.GET('/api/v0/projects', {
      params: { query: params.query ?? {} },
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

/** 기수의 이번 회차 조회 — `GET /api/v0/cohorts/{cohortId}/projects/current` */
export const findCurrentProject = (params: { path: findCurrentProject_Path } & RequestOptions) =>
  unwrap<findCurrentProject_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/projects/current', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 이번 회차 상태 판정 조회 (지금 할 일 하나) — `GET /api/v0/api/v0/bff/me/current-round` */
export const findCurrentRound = (params: RequestOptions = {}) =>
  unwrap<findCurrentRound_Response>(
    izClient.GET('/api/v0/api/v0/bff/me/current-round', { signal: params.signal }) as never,
  )

/** 팀원 제외 — `DELETE /api/v0/projects/{projectId}/teams/{teamId}/members/{traineeId}` */
export const removeTeamMember = (params: { path: removeTeamMember_Path } & RequestOptions) =>
  unwrap<removeTeamMember_Response>(
    izClient.DELETE('/api/v0/projects/{projectId}/teams/{teamId}/members/{traineeId}', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 프로젝트 교안 연결 해제 — `DELETE /api/v0/projects/{projectId}/curricula/{projectCurriculumId}` */
export const unlinkCurriculum = (params: { path: unlinkCurriculum_Path } & RequestOptions) =>
  unwrap<unlinkCurriculum_Response>(
    izClient.DELETE('/api/v0/projects/{projectId}/curricula/{projectCurriculumId}', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )
