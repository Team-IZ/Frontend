import { CheckIcon, ClockIcon, LockIcon, TriangleAlertIcon, type LucideIcon } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import type { SubmissionMethod, SubmissionView } from './_/api/types'

/*
  표시 라벨 — **화면 것**(api-boundary §1-⑤). 문구는 목업(trainee/submission.html)
  각 .rpage에서 그대로 옮겼다. `#page-closed`는 목업 자체가 `#page-locked`를 복붙한
  버그라 옮기지 않고 케이스표 문구(`제출 기한이 지났어요 · 미제출로 기록`)로 새로 썼다
  (types.ts 머리 주석 참고).

  아이콘은 lucide-react로 통일한다(trainee/home/labels.ts와 같은 이유 — 사이드바가
  이미 그렇게 하고 있고, 같은 뜻은 화면이 달라도 같은 아이콘을 쓴다).
*/

export type StateTone = 'info' | 'success' | 'warning' | 'danger'

/*
  weight — 4개 상태가 요구하는 반응 수준이 다르다. 분석중·잠김은 "참고만 하면 되는
  진행/과거 사실"이라 카드로 색칠하면 실제 경고(분석 실패)와 같은 무게로 보여 신호가
  죽는다. 완료(다음 행동을 여는 좋은 소식)·실패(진짜 봐야 하는 에러)만 카드를 쓴다
  (실사용 피드백으로 발견 — "알림창 UI/UX 재검토").
*/
export type StateWeight = 'inline' | 'card'

export type StateBannerContent = {
  tone: StateTone
  weight: StateWeight
  icon: LucideIcon
  title: string
  description: string
  sub?: string
}

/** 상태별 상단 배너 — 목업의 `.state`(아이콘·제목·설명·보조문구) 카드 */
export function buildStateBanner(
  view: SubmissionView,
  /*
    분석 조회가 준 **실패 사유 원문**. 회차 요약의 `failureCode`는 15종을 우리 문구로
    갈라 주지만, 사유 둘(`SESSION_PREPARATION_FAILED`·`EXTERNAL_JOB_ID_LOST`)은
    **원장에 없어 그 코드로는 영영 안 온다**(백엔드 권장안 §4.4). 그 경우 화면이
    「코드를 읽지 못했어요」라는 엉뚱한 기본 문구를 쓰게 되므로, 서버가 준 문장을 쓴다 —
    *"화면에 그대로 노출 가능"* 이라고 스펙이 명시한 값이다.
  */
  analysisFailureReason?: string | null,
): StateBannerContent | null {
  switch (view.status) {
    case 'DRAFT':
      return null // 아직 아무것도 안 일어났다 — 배너 대신 폼만 있다
    case 'ANALYZING':
      return {
        tone: 'info',
        weight: 'inline',
        icon: ClockIcon,
        title: '제출됐어요. 코드를 분석하고 있습니다',
        description: '끝나면 알려드릴게요. 이 화면을 켜 두지 않아도 됩니다.',
        // "남은 시간은 알려드리지 않아요 — 정확하지 않은 예상을 드리지 않으려고요"는
        // 지웠다 — description이 이미 같은 사실을 긍정형으로 전달한다. trainee/home
        // 쪽 ANALYZING과 같은 판단이다(labels.ts 머리 주석 참고).
      }
    case 'READY':
      return {
        tone: 'success',
        weight: 'card',
        icon: CheckIcon,
        title: '분석이 끝났어요',
        description: '이해도 확인을 시작할 수 있습니다. 홈에서 시작하면 돼요.',
        // 서버가 응시 창을 아직 안 정했을 수 있다 — 마감을 지어내지 않고 뒷문장만 남긴다
        sub: view.verifyClosesAt
          ? `${formatDateTime(view.verifyClosesAt)}까지 · 시작 전까지는 다시 제출할 수 있어요`
          : '시작 전까지는 다시 제출할 수 있어요',
      }
    case 'LOCKED':
      return {
        tone: 'warning',
        weight: 'inline',
        icon: LockIcon,
        title: '이제 다시 제출할 수 없어요',
        description: '이해도 확인을 시작해서 잠겼습니다.',
        sub: '질문이 지금 제출된 코드로 만들어졌어요. 코드가 바뀌면 질문과 답이 어긋납니다.',
      }
    case 'ANALYSIS_FAILED':
      return {
        tone: 'danger',
        weight: 'card',
        icon: TriangleAlertIcon,
        title: '코드를 분석하지 못했어요',
        // 아는 코드면 우리 문구, 모르는 실패면 서버가 준 문장 — 그것도 없으면 기본값
        description: failureText(view.failureCode, analysisFailureReason),
        sub: '계속 안 되면 매니저에게 알려 주세요.',
      }
    case 'SUBMISSION_CLOSED':
      return null // 폼도 카드도 없이 안내 문단 하나만 — TR-01 `missed`와 같은 모양
  }
}

/*
  분석 실패 사유 — **서버는 코드만 준다.** `failureReason`도 오지만 그건 개발자용 문구라
  그대로 띄우지 않는다(F3 — 백엔드가 문구를 다듬는 순간 화면 톤이 조용히 바뀐다).

  15종 전부를 갈라 쓰지 않는다. **학생이 할 수 있는 일이 같으면 같은 문장**이다 —
  `SOURCE_UNREACHABLE`과 `REPO_NOT_FOUND`는 원인이 달라도 "주소를 확인하라"로 같다.
  모르는 코드가 오면 마지막 문장으로 떨어진다(스펙이 늘 최신은 아니다).
*/
const FAILURE_TEXT: Record<string, string> = {
  EMPTY_CODE: '압축 파일 안에서 분석할 코드를 찾지 못했어요.',
  ARCHIVE_INVALID: '압축 파일을 열지 못했어요. 다시 압축해서 올려 주세요.',
  FILE_TOO_LARGE: '파일이 너무 커요. 50MB 아래로 줄여 주세요.',
  GIT_LOG_MISSING: 'git log가 없어요. 저장소 폴더째 압축했는지 확인해 주세요.',
  PROHIBITED_FILE: '올릴 수 없는 파일이 들어 있어요.',
  UNSUPPORTED_LANGUAGE: '아직 분석할 수 없는 언어예요.',
  ANALYSIS_TIMEOUT: '분석이 시간 안에 끝나지 않았어요. 다시 제출해 주세요.',
  TEMPORARY_ERROR: '일시적인 문제가 있었어요. 다시 제출해 주세요.',
  MODEL_ERROR: '분석 중 문제가 생겼어요. 다시 제출해 주세요.',
}

const failureText = (code: string | null, serverReason?: string | null) =>
  (code && FAILURE_TEXT[code]) ??
  serverReason ??
  '제출한 코드를 읽지 못했어요. 파일을 확인하고 다시 올려 주세요.'

/*
  🔴 **서버 상한과 정확히 같은 값이다** — `app.submission.max-zip-bytes` 기본값이고,
  넘으면 `413 FILE_TOO_LARGE`다. 화면 상한이 더 크면 "올린 뒤에 거절"이 생기고, 더 작으면
  올릴 수 있는 파일을 막는다. 50MB를 `50 * 1024 * 1024`로 쓰면 같은 값이지만, 스펙이
  바이트로 못박은 값이라 그대로 적는다.

  톰캣 상한(60MB)이 그 앞에 하나 더 있는데 **일부러 넉넉하게 잡은 것**이다 — 톰캣이 먼저
  끊으면 우리 에러 코드가 안 실려 화면이 사유를 알 수 없기 때문이다(스펙 명시).
*/
export const MAX_ZIP_BYTES = 52_428_800

export type ZipCheckResult = { ok: true } | { ok: false; message: string }

/** 순수 계산 — 네트워크가 필요 없다. **업로드 전에** 막는 것이 목적이다 */
export function validateZipSize(file: File): ZipCheckResult {
  if (file.size > MAX_ZIP_BYTES) {
    /*
      **올림한다.** 반올림하면 상한을 1바이트 넘긴 파일이 `50MB — 50MB를 넘어…`로 나와
      제 말과 부딪힌다(실제로 그렇게 보였다). 올림하면 표시값이 상한과 같아지는 일이
      없어 문구가 늘 성립하고, 실제로 큰 파일에서는 어차피 같은 수가 나온다.
    */
    const mb = Math.ceil(file.size / (1024 * 1024))
    return { ok: false, message: `${file.name} · ${mb}MB — 50MB를 넘어 제출할 수 없어요` }
  }
  return { ok: true }
}

/** 서버 enum을 학생이 읽는 말로 — 폼의 탭 이름과 같은 단어를 쓴다 */
export const METHOD_LABEL: Record<SubmissionMethod, string> = {
  GITHUB_URL: 'GitHub 저장소',
  ZIP_WITH_GITLOG: 'ZIP 업로드',
}

export const REPO_HELP =
  '우리 기관 GitHub 조직 안의 저장소는 따로 권한을 주지 않아도 돼요.\n조직 밖이거나 비공개라면 ZIP으로 올려 주세요.'
export const ZIP_HELP = '최대 50MB · node_modules, .venv 같은 폴더는 빼고 압축해 주세요.'
export const REPO_NOT_FOUND_HELP =
  '비공개 저장소이거나 우리 기관 조직 밖에 있으면 열 수 없어요 — 그럴 땐 ZIP으로 올리면 됩니다.'

/*
  제출이 **접수되지 못한** 이유 — 분석 실패(`failureCode`)와 다른 축이다.

  | | 언제 | 무엇이 다른가 |
  |---|---|---|
  | 접수 실패 | 요청이 거절됐다 | 서버가 파일을 받지도 않았다 |
  | 분석 실패 | 접수는 됐다 | 받아서 열어 보니 분석할 수 없었다 |

  13종이 오는데 화면이 하나로 뭉치면 **학생이 무엇을 해야 하는지 모른다.** 압축을 다시
  하면 되는 경우와 기다려야 하는 경우와 매니저를 찾아야 하는 경우가 섞인다.

  그래서 **다음 행동으로 갈라** 세 갈래만 만든다. 코드를 그대로 노출하지 않는 이유는
  그것이 개발자용 문자열이기 때문이다(F3).
*/
export type SubmitFailure = {
  message: string
  /** 같은 파일로 다시 눌러 볼 만한가 — 아니면 버튼을 다시 강조하지 않는다 */
  retryable: boolean
}

const SUBMIT_FAILURE: Record<string, SubmitFailure> = {
  // 학생이 고칠 수 있다 — 파일을 바꿔 다시 낸다
  ARCHIVE_INVALID: {
    message: '압축 파일을 열지 못했어요. 다시 압축해서 올려 주세요.',
    retryable: false,
  },
  FILE_TOO_LARGE: { message: '파일이 너무 커요. 50MB 아래로 줄여 주세요.', retryable: false },

  // 기다리면 된다 — 같은 파일로 다시 눌러도 된다
  ARTIFACT_STORE_FAILED: {
    message: '파일을 저장하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
    retryable: true,
  },
  AI_SERVER_UNAVAILABLE: {
    message: '분석 서버를 깨우는 중이에요. 최대 2분쯤 걸릴 수 있어요 — 잠시 후 다시 시도해 주세요.',
    retryable: true,
  },

  // 상황이 끝났다 — 다시 눌러도 같다
  SUBMISSION_DEADLINE_PASSED: {
    message: '제출 마감이 지나 더 이상 낼 수 없어요.',
    retryable: false,
  },
  SUBMISSION_ROUND_NOT_OPEN: {
    message: '지금은 제출할 수 있는 회차가 아니에요.',
    retryable: false,
  },
  SUBMISSION_ROUND_NOT_ACCESSIBLE: {
    message: '제출할 회차를 찾지 못했어요. 매니저에게 알려 주세요.',
    retryable: false,
  },
  SUBMISSION_METHOD_NOT_ALLOWED: {
    message: '이 방식으로는 제출할 수 없어요. 매니저에게 알려 주세요.',
    retryable: false,
  },
}

/**
 * 제출 실패를 학생이 읽는 말로.
 *
 * 모르는 코드는 **재시도 가능**으로 둔다 — 멱등키 충돌이나 일시적 오류가 그쪽에 많고,
 * 다시 눌러 볼 수 있다고 말하는 편이 "매니저를 찾으세요"보다 먼저 시도해 볼 것을 준다.
 */
export function submitFailureOf(code: string | null | undefined): SubmitFailure {
  if (code && SUBMIT_FAILURE[code]) return SUBMIT_FAILURE[code]
  return { message: '제출하지 못했어요. 잠시 후 다시 시도해 주세요.', retryable: true }
}
