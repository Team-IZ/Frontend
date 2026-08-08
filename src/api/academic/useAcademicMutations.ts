/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MutationOptions } from '@/api/_contract'
import {
  createCohort,
  createClassroom,
  endCohort,
  updateManagers,
  assignTrainees,
  rollbackAssignment,
} from './academicApi'
import { academicKeys } from './academicKeys'
import type {
  createCohort_Body,
  createCohort_Response,
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
} from './academicTypes'

/*
  쓰기가 성공하면 **이 도메인의 조회를 전부 무효화한다.** 무엇을 다시 읽어야 하는지는
  스펙에 없는 도메인 지식이라 생성기가 정확히 알 수 없다 — 넓게 지우면 틀리지 않는다.
  더 좁히고 싶으면 `options.onSuccess`에서 직접 무효화하고, 기본 동작은 그대로 둔다.
*/
/** 기수 생성 */
export function useCreateCohort(
  options?: MutationOptions<createCohort_Response, { body: createCohort_Body }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { body: createCohort_Body }) => createCohort(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: academicKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 반 생성 */
export function useCreateClassroom(
  options?: MutationOptions<
    createClassroom_Response,
    { path: createClassroom_Path; body: createClassroom_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: createClassroom_Path; body: createClassroom_Body }) =>
      createClassroom(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: academicKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 기수 종료 */
export function useEndCohort(
  options?: MutationOptions<endCohort_Response, { path: endCohort_Path; body: endCohort_Body }>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: endCohort_Path; body: endCohort_Body }) => endCohort(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: academicKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 반 담당 매니저 변경 */
export function useUpdateManagers(
  options?: MutationOptions<
    updateManagers_Response,
    { path: updateManagers_Path; body: updateManagers_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: updateManagers_Path; body: updateManagers_Body }) =>
      updateManagers(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: academicKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 교육생 일괄 반 배정 */
export function useAssignTrainees(
  options?: MutationOptions<
    assignTrainees_Response,
    { path: assignTrainees_Path; body: assignTrainees_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: assignTrainees_Path; body: assignTrainees_Body }) =>
      assignTrainees(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: academicKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}

/** 교육생 반 배정 되돌리기 */
export function useRollbackAssignment(
  options?: MutationOptions<
    rollbackAssignment_Response,
    { path: rollbackAssignment_Path; body: rollbackAssignment_Body }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { path: rollbackAssignment_Path; body: rollbackAssignment_Body }) =>
      rollbackAssignment(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: academicKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}
