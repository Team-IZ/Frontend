import { useFindCohorts } from '@/api/academic/useAcademicQueries'

/**
 * 지금 보고 있는 기수 — **화면이 아니라 여기가 갖는다.**
 *
 * 목록·상세 두 파일이 각각 `const COHORT_ID = '7'`을 들고 있었다. 기수 스위처가 붙는
 * 순간 **두 곳이 서로 다른 기수를 볼 수 있는** 상태였고, 그때 화면은 아무 경고도 안 낸다.
 *
 * ─── 상수에서 조회로 바뀐 이유 ─────────────────────────────────
 * 목일 때는 `'7'`이면 됐지만 서버는 **UUID**를 받는다. 상수를 UUID로 바꿔 적으면 그
 * 계정·그 환경에서만 도는 화면이 되고, 시드가 바뀌면 조용히 깨진다.
 *
 * 그래서 **서버에 물어본다.** 진행 중인 기수를 고르고, 없으면 목록의 첫 기수를 쓴다 —
 * 오퍼레이터가 지금 손대는 기수가 진행 중인 것이라는 근거다.
 *
 * ⚠ **여전히 임시다.** 실제로는 **상단 기수 스위처가 정하는 앱 상태**여야 한다(점검표
 * H5 — 컨텍스트 스위처는 상단 고정). 스위처가 붙으면 **이 파일만** 스토어 조회로 바뀌고
 * 화면은 안 바뀐다. 지금 형태가 그 교체를 이미 견디는 모양이다(훅이라 동기 상수가 아니다).
 *
 * ─── 왜 `stores/`인가 ────────────────────────────────────────
 * **세 번째 도메인이 나와서 올렸다**(D14). OP-03/04와 OP-01이 같은 값을 물었고,
 * `features/A → features/B` import는 레이어 린트가 막는다(도메인은 서로를 모른다).
 *
 * 자리는 frontend-architecture가 이미 정해 뒀다 — `stores/`는 **앱 전역 상태**다.
 * 지금은 서버에 물어보는 훅이지만 **묻는 질문이 앱 상태 그 자체**라("지금 어느 기수를
 * 보고 있나") 스위처가 붙으면 이 파일이 그대로 스토어가 된다. 화면은 안 바뀐다.
 *
 * **조회는 react-query가 한다.** 손으로 `useEffect`를 돌렸더니 이 훅을 부르는 화면마다
 * 요청이 따로 나갔다 — 목록과 상세를 오갈 때마다 기수를 다시 물었다. 같은 쿼리 키를
 * 쓰면 한 번만 나가고 캐시된다.
 *
 * `features/operator/admin/_/cohortScope.ts`가 아직 자기 상수를 갖고 있다 — **남의
 * 도메인 파일이라 건드리지 않는다.** 그쪽이 연동될 때 여기로 합친다.
 */
export function useCohortId(): {
  cohortId: string | undefined
  /** 표시명(`9기`). 상단 스위처가 이 값을 그린다 — 이름 때문에 조회를 더 하지 않는다 */
  cohortName: string | undefined
  /** 기수가 하나도 없거나 조회가 실패했다 — 화면이 그 자리에 무엇을 그릴지 정한다 */
  failed: boolean
} {
  const { data, isError } = useFindCohorts({ query: { page: 0, size: 50 } })
  const list = data?.content ?? []
  const picked = list.find((c) => c.status === 'RUNNING') ?? list[0]

  return {
    cohortId: picked?.cohortId,
    cohortName: picked?.name,
    failed: isError || (!!data && list.length === 0),
  }
}
