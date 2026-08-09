/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MutationOptions } from '@/api/_contract'
import {
  replaceRequirements,
  confirmConcepts,
  linkCurriculum,
  createProject,
  deleteProject,
  updateSchedule,
  updateRoundSchedule,
  unlinkCurriculum,
} from './projectExecutionApi'
import { projectExecutionKeys } from './projectExecutionKeys'
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
  createProject_Path,
  createProject_Body,
  createProject_Response,
  deleteProject_Path,
  deleteProject_Response,
  updateSchedule_Path,
  updateSchedule_Body,
  updateSchedule_Response,
  updateRoundSchedule_Path,
  updateRoundSchedule_Body,
  updateRoundSchedule_Response,
  unlinkCurriculum_Path,
  unlinkCurriculum_Response,
} from './projectExecutionTypes'

/*
  쓰기가 성공하면 **이 도메인의 조회를 전부 무효화한다.** 무엇을 다시 읽어야 하는지는
  스펙에 없는 도메인 지식이라 생성기가 정확히 알 수 없다 — 넓게 지우면 틀리지 않는다.
  더 좁히고 싶으면 `options.onSuccess`에서 직접 무효화하고, 기본 동작은 그대로 둔다.
*/
/** 프로젝트 요구사항 전체 교체 */
export function useReplaceRequirements(
  options?: MutationOptions<
    replaceRequirements_Response,
    { path: replaceRequirements_Path; body: replaceRequirements_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: replaceRequirements_Path; body: replaceRequirements_Body }) =>
      replaceRequirements(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: projectExecutionKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 검증개념 확정 */
export function useConfirmConcepts(
  options?: MutationOptions<
    confirmConcepts_Response,
    { path: confirmConcepts_Path; body: confirmConcepts_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: confirmConcepts_Path; body: confirmConcepts_Body }) =>
      confirmConcepts(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: projectExecutionKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 프로젝트 교안 연결 */
export function useLinkCurriculum(
  options?: MutationOptions<
    linkCurriculum_Response,
    { path: linkCurriculum_Path; body: linkCurriculum_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: linkCurriculum_Path; body: linkCurriculum_Body }) =>
      linkCurriculum(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: projectExecutionKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 프로젝트 생성 */
export function useCreateProject(
  options?: MutationOptions<
    createProject_Response,
    { path: createProject_Path; body: createProject_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: createProject_Path; body: createProject_Body }) =>
      createProject(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: projectExecutionKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 프로젝트(회차) 삭제 */
export function useDeleteProject(
  options?: MutationOptions<deleteProject_Response, { path: deleteProject_Path }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: deleteProject_Path }) => deleteProject(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: projectExecutionKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 프로젝트 일정 수정 */
export function useUpdateSchedule(
  options?: MutationOptions<
    updateSchedule_Response,
    { path: updateSchedule_Path; body: updateSchedule_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: updateSchedule_Path; body: updateSchedule_Body }) =>
      updateSchedule(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: projectExecutionKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 프로젝트 회차 일정 수정 */
export function useUpdateRoundSchedule(
  options?: MutationOptions<
    updateRoundSchedule_Response,
    { path: updateRoundSchedule_Path; body: updateRoundSchedule_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: updateRoundSchedule_Path; body: updateRoundSchedule_Body }) =>
      updateRoundSchedule(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: projectExecutionKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 프로젝트 교안 연결 해제 */
export function useUnlinkCurriculum(
  options?: MutationOptions<unlinkCurriculum_Response, { path: unlinkCurriculum_Path }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: unlinkCurriculum_Path }) => unlinkCurriculum(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: projectExecutionKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}
