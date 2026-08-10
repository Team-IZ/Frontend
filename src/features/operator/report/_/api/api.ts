// ─────────────────────────────────────────────────────────────
// 리포트 API 격리 모듈 — 실서버 연동 완료(이슈 170)
// ─────────────────────────────────────────────────────────────
import type { Report } from './types'
import { findClassDiagnosis } from '@/api/reporting/reportingApi'

/**
 * `GET /api/v0/reports/class-diagnosis?cohortId=` — 발행 시점에 얼린 스냅샷이라
 * 쿼리 파라미터가 cohortId 하나뿐이다(필터·드릴다운 없음, OP-05-report.md §4).
 *
 * ⚠ 경로가 `/reports/{cohortId}`가 아니라 `/reports/class-diagnosis?cohortId=`다
 * (백엔드 스펙이 직접 지적) — `/reports`는 이미 `hasRole('TRAINEE')`가 점유하고
 * 있어 같은 경로에 역할별로 다른 응답을 줄 수 없다.
 *
 * 404(`COHORT_REPORT_NOT_FOUND`)는 기수가 없거나 수업 진단 리포트가 아직 안
 * 만들어진 것 — `useAsync`가 일반 실패로 잡아 재시도 버튼을 보여준다. "아직 발행
 * 전"과 "진짜 실패"를 구분해 보여주는 건 이번 범위 밖(추후 필요하면 에러 코드로 분기).
 */
export function getReport(cohortId: string): Promise<Report> {
  return findClassDiagnosis({ query: { cohortId } }).then((res) => ({
    ...res,
    // 생성 타입은 status가 string으로 넓어져 있다(스펙에 enum 제약이 없다) — 서버
    // 구현이 'CONFIRMED' | 'IN_PROGRESS' 둘만 낸다고 확정돼 있어 좁혀서 반환한다
    // (CohortReportServiceImpl: `confirmed ? "CONFIRMED" : "IN_PROGRESS"`).
    status: res.status as Report['status'],
  }))
}
