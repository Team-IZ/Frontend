import { buildEmptyFixture, buildReportsFixture } from './mockDb'
import type { ReportsData } from './types'

/*
  경계 — 화면이 유일하게 의존하는 곳(api-boundary.md §3).
  @param previewStatus dev 전용 오버라이드(`?state=`) — 연동 시 지운다.
*/
const LATENCY_MS = 250

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

export function getReports(previewStatus?: string, now = Date.now()): Promise<ReportsData> {
  // ===== Mock 버전 (현재 활성) =====
  if (previewStatus === 'error') {
    return Promise.reject(new Error('REPORTS_FETCH_FAILED'))
  }
  if (previewStatus === 'empty') {
    return delay(buildEmptyFixture())
  }
  return delay(buildReportsFixture(now, previewStatus))
  // return http<ReportsData>('/reports')
}
