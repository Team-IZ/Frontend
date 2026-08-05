import type { HomeView, RoundStatus } from './types'
import { buildHomeFixture } from './mockDb'

/*
  경계 — 화면이 유일하게 의존하는 곳(api-boundary.md §3). 실제 시그니처 그대로 두고
  내부만 목이다. 연동 시 이 파일만 고친다.
*/

const LATENCY_MS = 250

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

/**
 * @param previewStatus 개발 중 상태 9종 + 조회 실패를 확인하기 위한 dev 전용
 *   오버라이드(`/trainee/home?state=ready`, `?state=error`). 연동 시 이 파라미터와
 *   함께 지운다 — 상태는 서버가 정한다(api-boundary.md §1 ②).
 */
export function getHome(previewStatus?: RoundStatus | 'NONE' | 'ERROR'): Promise<HomeView> {
  // ===== Mock 버전 (현재 활성) =====
  if (previewStatus === 'ERROR') {
    return Promise.reject(new Error('HOME_FETCH_FAILED'))
  }
  return delay(buildHomeFixture(previewStatus ?? 'NOT_SUBMITTED', Date.now()))
  // return http<HomeView>('/home')
}
