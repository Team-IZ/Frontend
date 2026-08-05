/*
  TR-02 계약(api-boundary.md 갈래③). `trainee/home/types.ts`의 `RoundMeta`를 import하지
  않는다 — `.oxlintrc.json`의 `no-restricted-imports`가 features 아래 도메인 간 교차
  import를 막는다(trainee/home과 trainee/submission은 서로 다른 도메인 폴더). 3줄짜리라
  로컬 복제가 싸다.

  `#page-closed`가 `#page-locked`를 그대로 복붙해 "마감 지남"인데 "세션 시작 후 잠김"
  문구를 보여주는 목업 버그가 있었다 — 케이스표(`DEADLINE_PASSED`="미제출로 기록")를
  계약으로 채택해 LOCKED와 SUBMISSION_CLOSED를 별개 상태로 뗀다.

  저장소 확인(REPO_NOT_FOUND)·ZIP 용량초과(FILE_TOO_LARGE)는 상태 머신에 넣지 않는다
  — "제출 버튼을 누르기 전" 막는 폼 검증이라 회차 상태가 아니라 폼 컴포넌트의 로컬
  상태다(정의서 §6 "막을 것은 누르기 전에 막는다").
*/

export type SubmissionMethod = 'GITHUB' | 'ZIP'

export type SubmittedContent = {
  repoUrl: string
  branch: string
  lastCommit: { sha: string; message: string; at: string }
}

type Base = { roundLabel: string; submissionDueAt: string }

export type SubmissionView =
  | (Base & { status: 'DRAFT' })
  | (Base & { status: 'ANALYZING'; submittedAt: string; content: SubmittedContent })
  | (Base & {
      status: 'READY'
      analyzedAt: string
      verifyClosesAt: string
      content: SubmittedContent
    })
  | (Base & { status: 'LOCKED'; analyzedAt: string; content: SubmittedContent })
  | (Base & {
      status: 'ANALYSIS_FAILED'
      content: SubmittedContent
      failureReason: string
    })
  | { status: 'SUBMISSION_CLOSED'; roundLabel: string; submissionDueAt: string }

export type RepoCheckResult = { ok: true } | { ok: false; code: 'REPO_NOT_FOUND'; message: string }

export type ZipCheckResult = { ok: true } | { ok: false; code: 'FILE_TOO_LARGE'; message: string }

export type SubmitInput =
  { method: 'GITHUB'; repoUrl: string; branch: string } | { method: 'ZIP'; file: File }
