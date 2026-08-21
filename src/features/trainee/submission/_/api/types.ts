import type { findMySubmission_Response } from '@/api/submission/submissionTypes'

/*
  TR-02 계약 — **서버 모양을 화면 어휘로 옮긴 것**(api-boundary §1-③).

  상태 6종은 **요청한 그대로 왔다**(16차 R2) — 목이 쓰던 이름과 글자까지 같아서
  화면 분기가 그대로 산다. 그래서 여기서 union을 새로 만들지 않고 서버 값을 그대로 쓴다.
*/

type Server = findMySubmission_Response

/** `DRAFT` · `ANALYZING` · `READY` · `LOCKED` · `ANALYSIS_FAILED` · `SUBMISSION_CLOSED` */
export type SubmissionStatus = Server['status']

/** 기관 정책이 허용한 제출 수단 — 서버가 회차마다 정한다 */
export type SubmissionMethod = 'GITHUB_URL' | 'ZIP_WITH_GITLOG'

/** 분석이 성공해야 채워진다 — 그 전에는 두 수단 다 없다 */
export type LastCommit = { sha: string; message: string; at: string }

/**
 * 제출한 내용 — **수단에 따라 둘 중 하나**다(23차 R1).
 *
 * 서버가 `oneOf`로 갈라 줘서 화면도 `'repoUrl' in content`로 갈린다. 한 타입에
 * 다섯 필드를 전부 optional로 두면 *"둘 다 없을 수도 있다"* 가 되어 화면이
 * `?? '알 수 없음'`을 쓰게 되는데, 그 분기는 실제로는 일어나지 않는 경우다.
 */
export type SubmittedContent =
  | { repoUrl: string; branch: string | null; lastCommit: LastCommit | null }
  | { fileName: string; fileSize: number; lastCommit: LastCommit | null }

export type SubmissionView = {
  status: SubmissionStatus
  /** 제출 대상 회차 — ZIP 업로드가 쿼리로 요구한다 */
  assessmentRoundId: string
  roundLabel: string
  submissionDueAt: string

  /**
   * 이번 제출의 식별자. **분석 진행 상태를 물으려면 이 값이 필요하다**
   * (`GET /submissions/{submissionId}/analysis`). 미제출이면 서버가 키를 뺀다.
   */
  submissionId: string | null

  /** 어떤 수단으로 냈나. 미제출이면 없다 */
  method: SubmissionMethod | null
  submittedAt: string | null
  analyzedAt: string | null
  /** 응시 창 마감 — `READY`에서만 온다 */
  verifyClosesAt: string | null
  content: SubmittedContent | null

  /**
   * 분석 실패 사유 코드 15종. **화면 문구는 우리가 정한다**(F3) — 서버 `failureReason`은
   * 개발자용이라 그대로 띄우지 않는다.
   */
  failureCode: string | null

  /**
   * 기관 정책이 허용한 제출 수단.
   *
   * **"실제로 낼 수 있나"와는 다른 축이다** — 서버는 둘 다 허용한다고 하는데
   * 제출 API의 준비 상태가 따로 있다(`SubmissionForm`의 `SUBMIT_API_READY`).
   */
  availableMethods: SubmissionMethod[]
}
