/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MutationOptions } from '@/api/_contract'
import { submitGithubUrl, checkRepository } from './submissionApi'
import { submissionKeys } from './submissionKeys'
import type {
  submitGithubUrl_Header,
  submitGithubUrl_Body,
  submitGithubUrl_Response,
  checkRepository_Body,
  checkRepository_Response,
} from './submissionTypes'

/*
  쓰기가 성공하면 **이 도메인의 조회를 전부 무효화한다.** 무엇을 다시 읽어야 하는지는
  스펙에 없는 도메인 지식이라 생성기가 정확히 알 수 없다 — 넓게 지우면 틀리지 않는다.
  더 좁히고 싶으면 `options.onSuccess`에서 직접 무효화하고, 기본 동작은 그대로 둔다.
*/
/** GitHub 저장소 URL 제출·재제출 */
export function useSubmitGithubUrl(
  options?: MutationOptions<
    submitGithubUrl_Response,
    { header: submitGithubUrl_Header; body: submitGithubUrl_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { header: submitGithubUrl_Header; body: submitGithubUrl_Body }) =>
      submitGithubUrl(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: submissionKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 저장소 주소 사전 확인 */
export function useCheckRepository(
  options?: MutationOptions<checkRepository_Response, { body: checkRepository_Body }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: checkRepository_Body }) => checkRepository(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: submissionKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}
