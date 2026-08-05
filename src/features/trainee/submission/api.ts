import type { RepoCheckResult, SubmissionView, SubmitInput, ZipCheckResult } from './types'
import { buildSubmissionFixture } from './mockDb'

/*
  경계 — 화면이 유일하게 의존하는 곳(api-boundary.md §3).

  저장소 확인·ZIP 용량 체크는 "제출 버튼을 누르기 전에" 막는 폼 검증이라 조회 상태
  머신과 분리했다(types.ts 머리 주석). ZIP 용량은 `File.size`만 보면 되는 순수 계산이라
  네트워크가 필요 없다 — 지연 없이 동기 반환한다.
*/

const LATENCY_MS = 250
const MAX_ZIP_BYTES = 50 * 1024 * 1024

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

/** @param previewStatus dev 전용 오버라이드(`?state=`). 연동 시 지운다 */
export function getSubmission(
  previewStatus?: SubmissionView['status'] | 'ERROR',
): Promise<SubmissionView> {
  // ===== Mock 버전 (현재 활성) =====
  if (previewStatus === 'ERROR') {
    return Promise.reject(new Error('SUBMISSION_FETCH_FAILED'))
  }
  return delay(buildSubmissionFixture(previewStatus ?? 'DRAFT', Date.now()))
  // return http<SubmissionView>('/submissions/current')
}

/**
 * 제출 버튼을 누르기 전에 막는다(정의서 §6). ponytail: 데모용 트리거 —
 * url에 "notfound"가 있으면 실패를 재현한다. 실제 검증은 서버가 저장소 접근을 시도한다.
 */
export function checkRepoUrl(repoUrl: string): Promise<RepoCheckResult> {
  // ===== Mock 버전 (현재 활성) =====
  if (repoUrl.includes('notfound')) {
    return delay({
      ok: false,
      code: 'REPO_NOT_FOUND',
      message: '저장소를 찾지 못했어요. 주소를 다시 확인해 주세요.',
    })
  }
  return delay({ ok: true })
  // return http<RepoCheckResult>('/submissions/check-repo', { method: 'POST', body: { repoUrl } })
}

/** 순수 계산 — 네트워크가 필요 없다. 실제 서버도 같은 상한을 검증한다(기획 상수) */
export function validateZipSize(file: File): ZipCheckResult {
  if (file.size > MAX_ZIP_BYTES) {
    const mb = Math.round(file.size / (1024 * 1024))
    return {
      ok: false,
      code: 'FILE_TOO_LARGE',
      message: `${file.name} · ${mb}MB — 50MB를 넘어 제출할 수 없어요`,
    }
  }
  return { ok: true }
}

export function submitCode(input: SubmitInput): Promise<void> {
  // ===== Mock 버전 (현재 활성) =====
  void input
  return delay(undefined)
  // return http<void>('/submissions', { method: 'POST', body: toFormData(input) })
}
