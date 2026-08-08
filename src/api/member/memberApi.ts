/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  inviteManager_Path,
  inviteManager_Body,
  inviteManager_Response,
  findTraineeRoster_Path,
  findTraineeRoster_Query,
  findTraineeRoster_Response,
  registerTrainees_Path,
  registerTrainees_Body,
  registerTrainees_Response,
  updateTraineeStatus_Path,
  updateTraineeStatus_Body,
  updateTraineeStatus_Response,
  getCurrentMember_Response,
  findManagers_Query,
  findManagers_Response,
} from './memberTypes'

/** 매니저 초대 — `POST /api/v0/members/organizations/{organizationId}/manager-invitations` */
export const inviteManager = (
  params: { path: inviteManager_Path; body: inviteManager_Body } & RequestOptions,
) =>
  unwrap<inviteManager_Response>(
    izClient.POST('/api/v0/members/organizations/{organizationId}/manager-invitations', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 기수 교육생 명단 조회 — `GET /api/v0/cohorts/{cohortId}/trainees` */
export const findTraineeRoster = (
  params: { path: findTraineeRoster_Path; query?: findTraineeRoster_Query } & RequestOptions,
) =>
  unwrap<findTraineeRoster_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/trainees', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )

/** 직접 입력 교육생 등록 및 초대 — `POST /api/v0/cohorts/{cohortId}/trainees/invitations` */
export const registerTrainees = (
  params: { path: registerTrainees_Path; body: registerTrainees_Body } & RequestOptions,
) =>
  unwrap<registerTrainees_Response>(
    izClient.POST('/api/v0/cohorts/{cohortId}/trainees/invitations', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 교육생 계정 상태 변경 — `PATCH /api/v0/cohorts/{cohortId}/trainees/{traineeId}/status` */
export const updateTraineeStatus = (
  params: { path: updateTraineeStatus_Path; body: updateTraineeStatus_Body } & RequestOptions,
) =>
  unwrap<updateTraineeStatus_Response>(
    izClient.PATCH('/api/v0/cohorts/{cohortId}/trainees/{traineeId}/status', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 내 정보 조회 — `GET /api/v0/members/me` */
export const getCurrentMember = (params: RequestOptions = {}) =>
  unwrap<getCurrentMember_Response>(
    izClient.GET('/api/v0/members/me', { signal: params.signal }) as never,
  )

/** 매니저 목록 조회 — `GET /api/v0/managers` */
export const findManagers = (params: { query?: findManagers_Query } & RequestOptions = {}) =>
  unwrap<findManagers_Response>(
    izClient.GET('/api/v0/managers', {
      params: { query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )
