/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MutationOptions } from '@/api/_contract'
import {
  startSession,
  openSessionHint,
  submitSessionAnswer,
  recordSessionActivity,
  openReviewSession,
} from './assessmentApi'
import { assessmentKeys } from './assessmentKeys'
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
  openReviewSession_Body,
  openReviewSession_Response,
} from './assessmentTypes'

/*
  쓰기가 성공하면 **이 도메인의 조회를 전부 무효화한다.** 무엇을 다시 읽어야 하는지는
  스펙에 없는 도메인 지식이라 생성기가 정확히 알 수 없다 — 넓게 지우면 틀리지 않는다.
  더 좁히고 싶으면 `options.onSuccess`에서 직접 무효화하고, 기본 동작은 그대로 둔다.
*/
/** 세션 시작(인트로 동의) */
export function useStartSession(
  options?: MutationOptions<startSession_Response, { path: startSession_Path }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: startSession_Path }) => startSession(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 다시 설명(힌트) 요청 */
export function useOpenSessionHint(
  options?: MutationOptions<openSessionHint_Response, { path: openSessionHint_Path }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: openSessionHint_Path }) => openSessionHint(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 답변 제출 → 채점 → 다음 질문 */
export function useSubmitSessionAnswer(
  options?: MutationOptions<
    submitSessionAnswer_Response,
    { path: submitSessionAnswer_Path; body: submitSessionAnswer_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: submitSessionAnswer_Path; body: submitSessionAnswer_Body }) =>
      submitSessionAnswer(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 응시 중 관찰 신호 기록 */
export function useRecordSessionActivity(
  options?: MutationOptions<
    recordSessionActivity_Response,
    { path: recordSessionActivity_Path; body: recordSessionActivity_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: recordSessionActivity_Path; body: recordSessionActivity_Body }) =>
      recordSessionActivity(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 다시 보기 개설(리포트에서 파생) */
export function useOpenReviewSession(
  options?: MutationOptions<openReviewSession_Response, { body: openReviewSession_Body }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: openReviewSession_Body }) => openReviewSession(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}
