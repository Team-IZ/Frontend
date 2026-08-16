import { isApiError } from '@/api/_contract/errors'
import {
  useFindCohortLinkedCurricula,
  useFindCurriculum,
  useFindSections,
  useFindUsedProjects,
} from '@/api/curriculum/useCurriculumQueries'

/*
  MG-09가 서버에 닿는 유일한 자리. 읽기만 있다 — 등록·재분석은 오퍼레이터
  소관이라 이 화면에 쓰기 액션이 없다(정의서 §6, 스펙도 같은 말을 한다).

  **목록과 상세가 다른 축을 쓴다.**
  · 목록 `GET /cohorts/{cohortId}/linked-curricula` — 이 기수 회차가 실제로 연결한
    교안만. 30차 Q2로 새로 생긴 조회다(그전에는 이 목록을 주는 API가 없어 회차
    수만큼 상세를 불러야 했다)
  · 상세 셋은 전부 `materialId`(버전이 바뀌어도 유지되는 고정 식별자)를 받는다.
    **`versionId`를 넣으면 늘 빈 배열이 된다**(13차 R1에서 실제로 겪은 사고다)
*/

export function useLinkedCurricula(cohortId: string | undefined) {
  return useFindCohortLinkedCurricula(
    { path: { cohortId: cohortId ?? '' } },
    { enabled: !!cohortId },
  )
}

export function useCurriculumHead(materialId: string) {
  return useFindCurriculum({ path: { materialId } }, { enabled: !!materialId })
}

/**
 * 섹션 트리.
 *
 * 🔴 **분석 전 교안은 409다**(`CURRICULUM_ANALYSIS_NOT_COMPLETED`, 18차 R1) —
 * 실패가 아니라 「아직 분석이 안 끝났다」는 뜻이다. 재시도해도 달라지지 않으므로
 * 재시도를 끄고, 화면은 이 상태를 **빈 상태로** 그린다(에러 문구가 아니다).
 */
export function useSections(materialId: string) {
  return useFindSections(
    { path: { materialId } },
    {
      enabled: !!materialId,
      retry: (_count, error) => !isAnalysisIncomplete(error),
    },
  )
}

export function isAnalysisIncomplete(error: unknown): boolean {
  return isApiError(error) && error.code === 'CURRICULUM_ANALYSIS_NOT_COMPLETED'
}

export function useUsedProjects(materialId: string) {
  return useFindUsedProjects({ path: { materialId } }, { enabled: !!materialId })
}
