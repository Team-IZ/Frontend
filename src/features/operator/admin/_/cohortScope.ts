import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { useFindCohorts } from '@/api/academic/useAcademicQueries'
import type { findCohorts_Item } from '@/api/academic/academicTypes'

/*
  지금 보고 있는 기수 — **탭 다섯이 이 값으로 범위를 정한다.**

  전에는 `export const COHORT_ID = '7'` 한 줄이었다. 실제 기수 id가 UUID라 목 문자열로는
  아무 조회도 못 부른다.

  ## 왜 URL인가 — useState가 아니라
  탭이 이미 경로에 있다(OP-01 `조치 필요`가 서로 다른 탭으로 딥링크한다). 기수가 화면
  상태면 **그 링크가 어느 기수를 가리키는지 말할 수 없다** — `?cohort=`가 붙어야 링크
  하나가 "9기의 매니저 탭"을 가리킨다. 새로고침·뒤로가기도 따라온다.

  ## 전량을 한 번에 받는다
  스위처가 고를 수 있는 것을 다 그려야 하므로 **필터 없이 전량**이다(size=100). 기수 탭의
  목록과는 다른 조회다 — 그쪽은 검색·상태로 걸러진 결과이고, 이쪽은 모집단이다.
  그래서 기수 탭의 `진행 2 · 종료 1` 내역도 이 목록에서 나온다(걸러진 목록에서는 못 센다).

  ⚠ **기관 기수가 100개를 넘으면 스위처가 잘린다.** 부트캠프 한 기수가 반년이라 실무에서
  닿지 않는 수지만, 넘는 순간 조용히 사라지는 자리라 적어 둔다.
*/

export type Cohort = findCohorts_Item

/** 스위처가 다룰 수 있는 최대 기수 수 — 넘으면 뒤가 잘린다 */
const MAX_COHORTS = 100

/**
 * 아무것도 안 고른 사람에게 보여줄 기수.
 *
 * **진행 중 > 예정 > 아무거나** 순이다. 오퍼레이터가 매일 여는 화면의 답은 "지금 돌고
 * 있는 기수"이고, 그런 게 없으면 곧 시작할 기수다. 종료된 기수를 기본으로 열면
 * 아무것도 바꿀 수 없는 화면이 첫 화면이 된다.
 */
function pickDefault(cohorts: readonly Cohort[]): Cohort | undefined {
  return (
    cohorts.find((c) => c.status === 'RUNNING') ??
    cohorts.find((c) => c.status === 'PLANNED') ??
    cohorts[0]
  )
}

export function useCohortScope() {
  const [params, setParams] = useSearchParams()
  const query = useFindCohorts({ query: { size: MAX_COHORTS } })

  const cohorts = query.data?.content ?? []
  const requested = params.get('cohort')
  /*
    **URL 값이 목록에 없으면 기본값으로 떨어진다.** 남이 보낸 링크의 기수가 그 사이
    지워졌거나 다른 기관 것일 수 있다 — 그때 빈 화면 대신 볼 수 있는 것을 연다.
  */
  const current = cohorts.find((c) => c.cohortId === requested) ?? pickDefault(cohorts)

  const setCohort = useCallback(
    (cohortId: string) => {
      const next = new URLSearchParams(params)
      next.set('cohort', cohortId)
      // 기수를 바꾼 것은 화면 이동이 아니다 — 뒤로가기가 기수 변경을 되짚게 두지 않는다
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  return {
    /** 지금 범위. **아직 안 왔으면 undefined** — 이 값으로 조회하는 훅은 그동안 멈춰 있어야 한다 */
    cohortId: current?.cohortId,
    current,
    /** 스위처가 그릴 전량. 기수 탭의 상태별 내역도 여기서 센다 */
    cohorts,
    isPending: query.isPending,
    isError: query.isError,
    setCohort,
  }
}
