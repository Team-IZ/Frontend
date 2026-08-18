/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  replaceManagerClassrooms_Path,
  replaceManagerClassrooms_Body,
  replaceManagerClassrooms_Response,
  getMyCommitEmail_Response,
  updateMyCommitEmail_Body,
  updateMyCommitEmail_Response,
  inviteManager_Path,
  inviteManager_Body,
  inviteManager_Response,
  resendManagerInvitation_Path,
  resendManagerInvitation_Response,
  findTraineeRoster_Path,
  findTraineeRoster_Query,
  findTraineeRoster_Response,
  registerTrainees_Path,
  registerTrainees_Body,
  registerTrainees_Response,
  resendTraineeInvitations_Path,
  resendTraineeInvitations_Body,
  resendTraineeInvitations_Response,
  previewTrainees_Path,
  previewTrainees_Body,
  previewTrainees_Response,
  updateLoginLock_Path,
  updateLoginLock_Body,
  updateLoginLock_Response,
  updateManagerStatus_Path,
  updateManagerStatus_Body,
  updateManagerStatus_Response,
  updateTraineeStatus_Path,
  updateTraineeStatus_Body,
  updateTraineeStatus_Response,
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
  cancelManagerInvitation_Path,
  cancelManagerInvitation_Response,
} from './memberTypes'

/** 매니저 담당 반 전체 교체 — `PUT /api/v0/members/organizations/{organizationId}/managers/{managerId}/classrooms` */
export const replaceManagerClassrooms = (
  params: {
    path: replaceManagerClassrooms_Path
    body: replaceManagerClassrooms_Body
  } & RequestOptions,
) =>
  unwrap<replaceManagerClassrooms_Response>(
    izClient.PUT('/api/v0/members/organizations/{organizationId}/managers/{managerId}/classrooms', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 내 커밋 이메일 조회 — `GET /api/v0/members/me/commit-email` */
export const getMyCommitEmail = (params: RequestOptions = {}) =>
  unwrap<getMyCommitEmail_Response>(
    izClient.GET('/api/v0/members/me/commit-email', { signal: params.signal }) as never,
  )

/** 내 커밋 이메일 등록·변경 — `PUT /api/v0/members/me/commit-email` */
export const updateMyCommitEmail = (params: { body: updateMyCommitEmail_Body } & RequestOptions) =>
  unwrap<updateMyCommitEmail_Response>(
    izClient.PUT('/api/v0/members/me/commit-email', {
      body: params.body,
      signal: params.signal,
    }) as never,
  )

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

/** 매니저 초대 재발송 — `POST /api/v0/members/organizations/{organizationId}/manager-invitations/{tokenId}/resend` */
export const resendManagerInvitation = (
  params: { path: resendManagerInvitation_Path } & RequestOptions,
) =>
  unwrap<resendManagerInvitation_Response>(
    izClient.POST(
      '/api/v0/members/organizations/{organizationId}/manager-invitations/{tokenId}/resend',
      { params: { path: params.path }, signal: params.signal },
    ) as never,
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

/** 교육생 초대 재발송 — `POST /api/v0/cohorts/{cohortId}/trainees/invitations/resend` */
export const resendTraineeInvitations = (
  params: {
    path: resendTraineeInvitations_Path
    body: resendTraineeInvitations_Body
  } & RequestOptions,
) =>
  unwrap<resendTraineeInvitations_Response>(
    izClient.POST('/api/v0/cohorts/{cohortId}/trainees/invitations/resend', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 직접 입력 교육생 명단 사전 검증(드라이런) — `POST /api/v0/cohorts/{cohortId}/trainees/invitations/preview` */
export const previewTrainees = (
  params: { path: previewTrainees_Path; body: previewTrainees_Body } & RequestOptions,
) =>
  unwrap<previewTrainees_Response>(
    izClient.POST('/api/v0/cohorts/{cohortId}/trainees/invitations/preview', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 계정 로그인 차단 / 해제 — `PATCH /api/v0/members/organizations/{organizationId}/users/{userId}/login-lock` */
export const updateLoginLock = (
  params: { path: updateLoginLock_Path; body: updateLoginLock_Body } & RequestOptions,
) =>
  unwrap<updateLoginLock_Response>(
    izClient.PATCH('/api/v0/members/organizations/{organizationId}/users/{userId}/login-lock', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 매니저 계정 정지 / 재활성 — `PATCH /api/v0/members/organizations/{organizationId}/managers/{managerId}/status` */
export const updateManagerStatus = (
  params: { path: updateManagerStatus_Path; body: updateManagerStatus_Body } & RequestOptions,
) =>
  unwrap<updateManagerStatus_Response>(
    izClient.PATCH('/api/v0/members/organizations/{organizationId}/managers/{managerId}/status', {
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

/** 교육생 상세 조회 — `GET /api/v0/cohorts/{cohortId}/trainees/{traineeId}` */
export const findManagerTraineeDetail = (
  params: { path: findManagerTraineeDetail_Path } & RequestOptions,
) =>
  unwrap<findManagerTraineeDetail_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/trainees/{traineeId}', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 교육생 통합 타임라인 조회 — `GET /api/v0/cohorts/{cohortId}/trainees/{traineeId}/timeline` */
export const findManagerTraineeTimeline = (
  params: {
    path: findManagerTraineeTimeline_Path
    query?: findManagerTraineeTimeline_Query
  } & RequestOptions,
) =>
  unwrap<findManagerTraineeTimeline_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/trainees/{traineeId}/timeline', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )

/** 교육생 일괄 등록 진행률 조회 — `GET /api/v0/cohorts/{cohortId}/trainees/registrations/{batchRequestId}` */
export const findTraineeRegistrationProgress = (
  params: { path: findTraineeRegistrationProgress_Path } & RequestOptions,
) =>
  unwrap<findTraineeRegistrationProgress_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/trainees/registrations/{batchRequestId}', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 매니저 초대 취소 — `DELETE /api/v0/members/organizations/{organizationId}/manager-invitations/{tokenId}` */
export const cancelManagerInvitation = (
  params: { path: cancelManagerInvitation_Path } & RequestOptions,
) =>
  unwrap<cancelManagerInvitation_Response>(
    izClient.DELETE(
      '/api/v0/members/organizations/{organizationId}/manager-invitations/{tokenId}',
      { params: { path: params.path }, signal: params.signal },
    ) as never,
  )
