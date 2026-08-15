/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MutationOptions } from '@/api/_contract'
import {
  saveInterviewBrief,
  createInterviewBrief,
  excludeInterviewCase,
  reincludeInterviewCase,
} from './interventionApi'
import { interventionKeys } from './interventionKeys'
import type {
  saveInterviewBrief_Path,
  saveInterviewBrief_Body,
  saveInterviewBrief_Response,
  createInterviewBrief_Path,
  createInterviewBrief_Response,
  excludeInterviewCase_Path,
  excludeInterviewCase_Response,
  reincludeInterviewCase_Path,
  reincludeInterviewCase_Response,
} from './interventionTypes'

/*
  쓰기가 성공하면 **이 도메인의 조회를 전부 무효화한다.** 무엇을 다시 읽어야 하는지는
  스펙에 없는 도메인 지식이라 생성기가 정확히 알 수 없다 — 넓게 지우면 틀리지 않는다.
  더 좁히고 싶으면 `options.onSuccess`에서 직접 무효화하고, 기본 동작은 그대로 둔다.
*/
/** [면담 상세] 브리프 저장하고 면담 종결 */
export function useSaveInterviewBrief(
  options?: MutationOptions<
    saveInterviewBrief_Response,
    { path: saveInterviewBrief_Path; body: saveInterviewBrief_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: saveInterviewBrief_Path; body: saveInterviewBrief_Body }) =>
      saveInterviewBrief(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: interventionKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** [면담 목록] 면담 브리프 생성 (AI) */
export function useCreateInterviewBrief(
  options?: MutationOptions<createInterviewBrief_Response, { path: createInterviewBrief_Path }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: createInterviewBrief_Path }) => createInterviewBrief(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: interventionKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** [면담 목록] 면담 대상 제외 */
export function useExcludeInterviewCase(
  options?: MutationOptions<excludeInterviewCase_Response, { path: excludeInterviewCase_Path }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: excludeInterviewCase_Path }) => excludeInterviewCase(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: interventionKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** [면담 목록] 면담 대상 제외 되돌리기 */
export function useReincludeInterviewCase(
  options?: MutationOptions<reincludeInterviewCase_Response, { path: reincludeInterviewCase_Path }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: reincludeInterviewCase_Path }) => reincludeInterviewCase(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: interventionKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}
