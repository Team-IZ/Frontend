import type { Report } from './types'
import { useFindClassDiagnosis } from '@/api/reporting/useReportingQueries'

/*
  리포트 조회 — **생성 훅을 그대로 쓴다**(OP-01~04·06과 같다).

  전에는 생성된 **호출 함수**(`reportingApi.findClassDiagnosis`)를 로컬 `useAsync`로
  감쌌다. 층 하나를 건너뛴 것이라 이 화면만 캐시·무효화·`isFetching`이 없었다 —
  재시도 버튼이 자기 대기를 보여주지 못한 것도 그래서다.

  이 파일에 남는 일은 **타입 좁히기 하나뿐**이다. 조회·캐시·재시도는 생성물이 갖는다.
*/

/**
 * `GET /api/v0/reports/class-diagnosis?cohortId=` — 발행 시점에 얼린 스냅샷이라
 * 쿼리 파라미터가 cohortId 하나뿐이다(필터·드릴다운 없음, OP-05-report.md §4).
 *
 * ⚠ 경로가 `/reports/{cohortId}`가 아니라 `/reports/class-diagnosis?cohortId=`다
 * (백엔드 스펙이 직접 지적) — `/reports`는 이미 `hasRole('TRAINEE')`가 점유하고
 * 있어 같은 경로에 역할별로 다른 응답을 줄 수 없다.
 *
 * 404 `COHORT_REPORT_NOT_FOUND`는 **실패가 아니다** — 아직 발행 전이다.
 * `lib/errorCopy`가 그 판정을 갖고 있어 화면은 「없는 것」 유형 1로 그린다.
 *
 * **기수가 정해지기 전에는 조회하지 않는다** — 없는 기수로 부르면 실패 화면이 잠깐
 * 스쳤다 사라진다.
 */
export function useReport(cohortId: string | undefined) {
  const res = useFindClassDiagnosis(
    { query: { cohortId: cohortId ?? '' } },
    { enabled: !!cohortId },
  )

  return {
    ...res,
    data: res.data
      ? ({
          ...res.data,
          /*
            생성 타입은 `status`가 `string`으로 넓어져 있다(스펙에 enum 제약이 없다).
            서버 구현이 `CONFIRMED` · `IN_PROGRESS` 둘만 낸다고 확정돼 있어 좁혀서 준다
            (`CohortReportServiceImpl`: `confirmed ? "CONFIRMED" : "IN_PROGRESS"`).
          */
          status: res.data.status as Report['status'],
        } satisfies Report)
      : undefined,
  }
}
