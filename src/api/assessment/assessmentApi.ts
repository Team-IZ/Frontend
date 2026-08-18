/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  startSession_Path,
  startSession_Response,
  openSessionHint_Path,
  openSessionHint_Response,
  submitSessionAnswer_Path,
  submitSessionAnswer_Body,
  submitSessionAnswer_Response,
  recordSessionActivity_Path,
  recordSessionActivity_Body,
  recordSessionActivity_Response,
  recordSessionActivityEvent_Path,
  recordSessionActivityEvent_Body,
  recordSessionActivityEvent_Response,
  openReviewSession_Body,
  openReviewSession_Response,
  findSessionProblem_Path,
  findSessionProblem_Response,
  findCurrentSession_Response,
  getMyAssessmentRounds_Response,
  findAssessmentAttemptActivityEvents_Path,
  findAssessmentAttemptActivityEvents_Response,
} from './assessmentTypes'

/** 세션 시작(인트로 동의) — `POST /api/v0/assessment-sessions/{sessionId}/start` */
export const startSession = (params: { path: startSession_Path } & RequestOptions) =>
  unwrap<startSession_Response>(
    izClient.POST('/api/v0/assessment-sessions/{sessionId}/start', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 다시 설명(힌트) 요청 — `POST /api/v0/assessment-sessions/{sessionId}/hints` */
export const openSessionHint = (params: { path: openSessionHint_Path } & RequestOptions) =>
  unwrap<openSessionHint_Response>(
    izClient.POST('/api/v0/assessment-sessions/{sessionId}/hints', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 답변 제출 → 채점 → 다음 질문 — `POST /api/v0/assessment-sessions/{sessionId}/answers` */
export const submitSessionAnswer = (
  params: { path: submitSessionAnswer_Path; body: submitSessionAnswer_Body } & RequestOptions,
) =>
  unwrap<submitSessionAnswer_Response>(
    izClient.POST('/api/v0/assessment-sessions/{sessionId}/answers', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 응시 중 관찰 신호 기록 — `POST /api/v0/assessment-sessions/{sessionId}/activity` */
export const recordSessionActivity = (
  params: { path: recordSessionActivity_Path; body: recordSessionActivity_Body } & RequestOptions,
) =>
  unwrap<recordSessionActivity_Response>(
    izClient.POST('/api/v0/assessment-sessions/{sessionId}/activity', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 관찰 신호 이벤트 1건 기록 — `POST /api/v0/assessment-sessions/{sessionId}/activity-events` */
export const recordSessionActivityEvent = (
  params: {
    path: recordSessionActivityEvent_Path
    body: recordSessionActivityEvent_Body
  } & RequestOptions,
) =>
  unwrap<recordSessionActivityEvent_Response>(
    izClient.POST('/api/v0/assessment-sessions/{sessionId}/activity-events', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 다시 보기 개설(리포트에서 파생) — `POST /api/v0/assessment-sessions/reviews` */
export const openReviewSession = (params: { body: openReviewSession_Body } & RequestOptions) =>
  unwrap<openReviewSession_Response>(
    izClient.POST('/api/v0/assessment-sessions/reviews', {
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 문제 하나의 코드·질문·문답 조회 — `GET /api/v0/assessment-sessions/{sessionId}/problems/{problemNo}` */
export const findSessionProblem = (params: { path: findSessionProblem_Path } & RequestOptions) =>
  unwrap<findSessionProblem_Response>(
    izClient.GET('/api/v0/assessment-sessions/{sessionId}/problems/{problemNo}', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 지금 이어서 할 세션 조회 — `GET /api/v0/assessment-sessions/current` */
export const findCurrentSession = (params: RequestOptions = {}) =>
  unwrap<findCurrentSession_Response>(
    izClient.GET('/api/v0/assessment-sessions/current', { signal: params.signal }) as never,
  )

/** 교육생 홈 3구획 조회 — `GET /api/v0/assessment-rounds` */
export const getMyAssessmentRounds = (params: RequestOptions = {}) =>
  unwrap<getMyAssessmentRounds_Response>(
    izClient.GET('/api/v0/assessment-rounds', { signal: params.signal }) as never,
  )

/** 이벤트 로그 조회 (매니저) — `GET /api/v0/assessment-attempts/{attemptId}/activity-events` */
export const findAssessmentAttemptActivityEvents = (
  params: { path: findAssessmentAttemptActivityEvents_Path } & RequestOptions,
) =>
  unwrap<findAssessmentAttemptActivityEvents_Response>(
    izClient.GET('/api/v0/assessment-attempts/{attemptId}/activity-events', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )
