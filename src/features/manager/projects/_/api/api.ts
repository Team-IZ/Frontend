import {
  useFindProject,
  useFindTeams,
  useFindProjectClassProgress,
} from '@/api/projectExecution/useProjectExecutionQueries'
import { useFindProjectSubmissionStatus } from '@/api/submission/useSubmissionQueries'
import {
  useCreateTeam,
  useUpdateTeam,
  useAssignTeamMember,
  useRemoveTeamMember,
  useAutoAssignTeams,
  useConfirmTeams,
  useReopenTeams,
  useDisbandTeam,
} from '@/api/projectExecution/useProjectExecutionMutations'
import {
  useFindProjectEvaluationSummary,
  useFindTraineeEvaluationDetail,
} from '@/api/evaluation/useEvaluationQueries'

/*
  MG-08이 서버에 닿는 유일한 자리.

  **회차(`roundNo`)를 안 보낸다.** 네 조회 다 `roundNo`가 선택이고 생략하면 서버가
  현재 회차를 고른다 — URL이 `projectId` 하나뿐인 화면이라 화면에 회차 선택기가
  없고, 없는 선택을 흉내 내려고 `findRounds`를 한 번 더 부를 이유가 없다.

  **`classId`도 안 보낸다.** 생략하면 담당 반 전체이며 그것이 이 화면의 범위다.

  ⚠ 쓰기는 전부 생성 훅을 그대로 쓴다 — `projectExecutionKeys.all`을 무효화하도록
  이미 만들어져 있어 화면이 `reload`를 들고 다닐 필요가 없다(목은 `useAsync`의
  `reload`를 탭마다 내려보냈다).

  🔴 **서버에 없는 액션 셋** — 팀 삭제 · 다시 보기 활성화/취소 · 리포트 발행.
  목에는 있었다(`deleteTeam`·`sendRetry`·`cancelRetry`·`publishReport`). 32차
  요청서로 올리고, 그때까지 화면은 그 버튼을 잠근다. 여기서 흉내 내지 않는다 —
  화면이 지어낸 성공은 새로 고치면 사라진다.
*/

export function useProject(projectId: string) {
  return useFindProject({ path: { projectId } }, { enabled: !!projectId })
}

/*
  두 조회의 `classId`는 **좁힐 때만 싣는다.**

  생략하면 서버가 담당 반 전체를 준다. 담당 반이 하나뿐이면 그 값이 이미 그 반의
  것이라, `classId`를 실으면 **같은 데이터를 다른 쿼리 키로 한 번 더** 받는다
  (`?? null`로 키를 만드는데 `{ classId: undefined }`는 `null`이 아니다).

  그래서 호출부는 **반이 둘 이상일 때만** 값을 넘긴다 — 그때는 좁히는 것이 실제로
  결과를 바꾸므로 요청이 하나 느는 것이 맞다.
*/
export function useTeams(projectId: string, classId?: string) {
  return useFindTeams(
    { path: { projectId }, query: classId ? { classId } : undefined },
    { enabled: !!projectId },
  )
}

export function useSubmissionStatus(projectId: string, classId?: string) {
  return useFindProjectSubmissionStatus(
    { path: { projectId }, query: classId ? { classId } : undefined },
    { enabled: !!projectId },
  )
}

export function useClassProgress(projectId: string) {
  return useFindProjectClassProgress({ path: { projectId } }, { enabled: !!projectId })
}

export function useEvaluationSummary(projectId: string) {
  return useFindProjectEvaluationSummary({ path: { projectId } }, { enabled: !!projectId })
}

/** 사람을 고른 뒤에만 부른다 — 사람 수 × 개념 수 × 4배라 목록에 실리지 않는 값이다 */
export function useTraineeEvaluation(projectId: string, userId: string | null) {
  return useFindTraineeEvaluationDetail(
    { path: { projectId, userId: userId ?? '' } },
    { enabled: !!projectId && !!userId },
  )
}

export {
  useCreateTeam,
  useUpdateTeam,
  useAssignTeamMember,
  useRemoveTeamMember,
  useAutoAssignTeams,
  useConfirmTeams,
  useReopenTeams,
  useDisbandTeam,
}
