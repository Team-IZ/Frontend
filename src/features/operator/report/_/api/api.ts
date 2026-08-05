// ─────────────────────────────────────────────────────────────
// 리포트 API 격리 모듈
// 백엔드 준비 시 각 함수의 Mock 블록만 삭제하고 아래 주석의 fetch를 켜면 됩니다.
// (화면·컴포넌트 코드는 수정 불필요 — 시그니처가 이미 실제 모양입니다)
// ─────────────────────────────────────────────────────────────
import type { Report } from './types'

// ───────── Mock 전용 (백엔드 연동 시 이 블록 삭제) ─────────
import { loadReport } from './mockDb'

const LATENCY_MS = 250

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))
// ──────────────────────────────────────────────────────────

/**
 * `GET /reports/{cohortId}` — 발행 시점에 얼린 스냅샷이라 쿼리 파라미터가
 * 없다(필터·드릴다운 없음, OP-05-report.md §4).
 */
export function getReport(cohortId: string): Promise<Report> {
  // ===== Mock 버전 (현재 활성) =====
  void cohortId
  return delay(loadReport())
  // return http<Report>(`/reports/${cohortId}`)
}
