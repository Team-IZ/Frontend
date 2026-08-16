import { useSearchParams } from 'react-router'
import { useFindCohorts, useFindMyEnrollments } from '@/api/academic/useAcademicQueries'

/** 기수 스코프를 쓰는 화면이 헤더 스위처에 그대로 넘기는 모양 */
export type CohortScope = {
  cohortId: string | undefined
  /** 표시명(`9기`). 상단 스위처가 이 값을 그린다 — 이름 때문에 조회를 더 하지 않는다 */
  cohortName: string | undefined
  /** 기수가 하나도 없거나 조회가 실패했다 — 화면이 그 자리에 무엇을 그릴지 정한다 */
  failed: boolean
  /** 스위처에 넘길 선택지. 아직 안 왔으면 빈 배열이다 */
  cohorts: { value: string; label: string }[]
  /** 스위처가 부른다 — 주소를 바꾸면 이 훅을 쓰는 화면이 전부 따라온다 */
  selectCohort: (cohortId: string) => void
}

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
 * ─── 스위처가 붙었다 (2026-08-12) ────────────────────────────
 * **고른 값은 주소가 갖는다**(`?cohort=`) — async-states §5. 그래야 새로고침·뒤로가기가
 * 따라오고 링크 하나가 「8기의 리포트」를 가리킨다. 스토어에 두면 그중 아무것도 안 된다.
 *
 * 주소에 없으면 **진행 중 기수**를 고른다 — 오퍼레이터가 지금 손대는 기수라는 근거다.
 * 그래서 기본 주소(`/operator/report`)는 예전과 똑같이 동작한다.
 *
 * **기존 반환값은 그대로 두고 `cohorts`·`selectCohort`만 더했다** — 다섯 화면이 이미
 * 이 훅을 쓰고 있어서, 바꾸면 다 고쳐야 한다.
 *
 * ⚠ **주소에 있는 기수가 목록에 없으면 무시한다.** 남의 조직 기수 id를 주소로 받아도
 * 화면이 그 값으로 조회하지 않는다 — 서버가 막겠지만 화면이 먼저 안 보낸다.
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
export function useCohortId(): CohortScope {
  const { data, isError } = useFindCohorts({ query: { page: 0, size: 50 } })
  const { fromUrl, selectCohort } = useCohortParam()
  const list = data?.content ?? []

  /*
    주소가 먼저다. 없거나 **목록에 없는 값**이면 진행 중 기수로 떨어진다 —
    남의 조직 기수 id가 주소에 실려 와도 그것으로 조회하지 않는다.
  */
  const picked =
    /* `fromUrl &&` 로 쓰면 빈 문자열이 그대로 흘러 타입이 넓어진다 — 조회를 먼저 한다 */
    (fromUrl ? list.find((c) => c.cohortId === fromUrl) : undefined) ??
    list.find((c) => c.status === 'RUNNING') ??
    list[0]

  return {
    cohortId: picked?.cohortId,
    cohortName: picked?.name,
    failed: isError || (!!data && list.length === 0),
    cohorts: list.map((c) => ({ value: c.cohortId, label: c.name })),
    selectCohort,
  }
}

/**
 * 매니저가 보고 있는 기수 — **오퍼레이터와 조회가 다르다.**
 *
 * `GET /cohorts`(위 `useCohortId`)는 **기관에 개설된 기수 전부**를 준다. 실계정으로
 * 확인했다 — 매니저 토큰으로도 200이지만 담당하지 않는 `10기`·`8기`·`7기`까지 왔다.
 * 그걸 스위처에 그리면 **고를 수 있는데 아무것도 안 보이는 기수**가 생긴다: 하위 조회는
 * 전부 담당 반 기준이라 빈 결과로 떨어지고, 화면은 "데이터가 없다"고 말하게 된다.
 *
 * `GET /members/me/enrollments`는 **내가 실제로 속한 기수만** 준다(같은 계정에서 `9기`
 * 하나). 매니저 스코프의 근거는 이쪽이다.
 *
 * **순서를 서버가 정한다**(30차 R9). 종전에는 상태가 안 와서 목록의 첫 기수로 떨어졌고,
 * 담당 기수가 둘 이상이면 그 순서에 근거가 없었다. 지금은 `RUNNING → PLANNED → CLOSED`,
 * 같은 상태 안에서는 시작일 내림차순으로 정렬돼 오므로 **첫 항목을 그대로 연다** —
 * 화면이 다시 고르면 그 규칙이 두 곳에 생기고, 오퍼레이터 쪽(`useCohortId`)이 `RUNNING`을
 * 직접 찾는 것과 달리 여기서는 서버가 이미 답을 줬다.
 *
 * ⚠ **담당 반은 여기서 안 온다.** `enrollments[].classroom`은 매니저에게 늘 `null`이다
 * (반 배정은 교육생 소속이고, 매니저 배정은 `manager_assignment`라는 다른 원장이다).
 * 담당 반이 필요한 화면은 `GET /cohorts/{cohortId}/classrooms`를 부른다 — 그 조회가
 * 매니저에게는 **담당 반만** 돌려준다(실계정: `C반` 하나).
 */
export function useManagerCohort(): CohortScope {
  const { data, isError } = useFindMyEnrollments()
  const { fromUrl, selectCohort } = useCohortParam()
  const list = data?.enrollments ?? []

  const picked = (fromUrl ? list.find((e) => e.cohortId === fromUrl) : undefined) ?? list[0]

  return {
    cohortId: picked?.cohortId,
    cohortName: picked?.cohortName,
    failed: isError || (!!data && list.length === 0),
    cohorts: list.map((e) => ({ value: e.cohortId, label: e.cohortName })),
    selectCohort,
  }
}

/** 고른 기수는 **주소가 갖는다**(`?cohort=`) — 두 역할이 같은 규약을 쓴다 */
function useCohortParam() {
  const [params, setParams] = useSearchParams()
  return {
    fromUrl: params.get('cohort'),
    selectCohort: (cohortId: string) => {
      const next = new URLSearchParams(params)
      next.set('cohort', cohortId)
      /*
        `replace`가 아니다 — 기수를 바꾸는 것은 **다른 것을 보러 가는 것**이라
        뒤로가기로 되돌아올 수 있어야 한다(검색어 타이핑과 다르다).
      */
      setParams(next)
    },
  }
}
