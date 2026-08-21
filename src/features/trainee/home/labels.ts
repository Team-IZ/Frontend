import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  EyeOffIcon,
  InfoIcon,
  MessageCircleIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
  UploadIcon,
  XCircleIcon,
  type LucideIcon,
} from 'lucide-react'
import { formatClock, formatCoarse, formatDate, formatDateTime } from '@/lib/format'
import type { ActionCode, CurrentRound, RoundStatus, WarningCode } from './_/api/types'

/*
  표시 라벨 — **화면 것**(api-boundary §1-⑤).

  ## 서버가 상태를 정하고 화면이 문장을 정한다
  `representativeStatus` 10종·`defaultActionCode` 11종·`warningCodes[]` 4종이 서버에서
  온다. 화면은 그 코드를 **문장으로 옮기기만** 한다 — 어느 상태인지 다시 판단하지 않는다.

  문구를 서버에서 받지 않는 이유(A7): 백엔드가 문구를 다듬는 순간 화면 톤이 조용히
  바뀌고, 같은 코드를 쓰는 다른 화면과 갈린다.

  ## 아이콘은 lucide-react로 통일
  사이드바가 이미 그렇게 하고 있고(sidebarConfig.ts — 유니코드 글리프는 폰트마다 다르게
  그려지고 접근성 트리에도 의미 없는 문자로 잡힌다), 같은 뜻은 화면이 달라도 같은
  아이콘이어야 한다.
*/

/*
  세션 규칙(tr-03-session.md) 중 **홈이 미리 말해 주는 값**.

  ⚠️ 세션 화면에 같은 값이 또 있다 — features 간 교차 import를 린트가 막아서 복제한다.
  **한쪽만 고치면 홈과 세션이 다른 시간을 말하게 된다**(실제로 그랬다).
  ponytail: 세 번째 화면이 같은 값을 말하게 되면 `lib/`로 올린다.
*/
const CONCEPT_LIMIT_MIN = 20
/** 문구용 — 세션 인트로가 "전체 1시간"이라고 하므로 홈도 같은 말을 쓴다("60분" ✗) */
const SESSION_LIMIT_LABEL = '1시간'
const SESSION_LIMIT_MIN = 60

export type GuideLine = { icon: LucideIcon; text: string }
export type StepState = 'done' | 'now' | 'pending'
export type StripTone = 'warn' | 'go' | 'stop'

export const STEP_LABELS = ['코드 제출', '코드 분석', '이해도 확인', '리포트'] as const

/*
  4단계 진행 바 — 상태가 어느 칸에 있는지. `null`이면 스트립을 안 그린다(마감·회차 없음).
  서버 상태에서 곧장 나오므로 화면이 제출·분석 여부를 조합하지 않는다.
*/
const STEPS: Partial<Record<RoundStatus, StepState[]>> = {
  SUBMISSION_REQUIRED: ['now', 'pending', 'pending', 'pending'],
  ANALYZING: ['done', 'now', 'pending', 'pending'],
  ANALYSIS_FAILED: ['done', 'now', 'pending', 'pending'],
  ASSESSMENT_AVAILABLE: ['done', 'done', 'now', 'pending'],
  ASSESSMENT_IN_PROGRESS: ['done', 'done', 'now', 'pending'],
  ASSESSMENT_COMPLETED: ['done', 'done', 'done', 'now'],
  REVIEW_REQUIRED: ['done', 'done', 'done', 'now'],
}

/** 카드 제목 — 상태 하나당 하나 */
const TITLES: Record<RoundStatus, string> = {
  SUBMISSION_REQUIRED: '코드를 제출할 차례예요',
  ANALYZING: '코드 분석이 진행 중이에요',
  ANALYSIS_FAILED: '코드를 분석하지 못했어요',
  ASSESSMENT_AVAILABLE: '이해도 확인을 시작할 차례예요',
  ASSESSMENT_IN_PROGRESS: '이해도 확인이 진행 중이에요',
  ASSESSMENT_COMPLETED: '리포트를 기다리는 중이에요',
  REVIEW_REQUIRED: '다시 볼 수 있는 문제가 있어요',
  SUBMISSION_MISSED: '제출 기한이 지났어요',
  ASSESSMENT_WINDOW_CLOSED: '응시 기한이 지났어요',
  NO_ACTIVE_ROUND: '지금은 예정된 일정이 없어요',
}

/**
 * 버튼 문구 — **`defaultActionCode`가 정한다.**
 *
 * 화면이 상태에서 CTA를 유추하지 않는다. 서버가 `canSubmit`·`canResubmit`까지 보고
 * 정한 값이라, 여기서 다시 판단하면 그 규칙이 두 곳에 생긴다.
 */
const ACTION_LABELS: Record<ActionCode, string> = {
  SUBMIT_CODE: '코드 제출',
  RESUBMIT_REPOSITORY: '다시 제출',
  RESUBMIT_ZIP: 'ZIP으로 다시 제출',
  START_ASSESSMENT: '이해도 확인 시작하기 →',
  RESUME_ASSESSMENT: '이어서 하기',
  START_REVIEW: '다시 보기',
  VIEW_REPORT: '내 리포트',
  WAIT_FOR_ANALYSIS: '이해도 확인',
  WAIT_FOR_REPORT: '내 리포트',
  CONTACT_MANAGER: '',
  NONE: '',
}

/** 어느 화면으로 가나. 없으면 버튼이 비활성이다 */
const ACTION_ROUTES: Partial<Record<ActionCode, string>> = {
  SUBMIT_CODE: '/trainee/submission',
  RESUBMIT_REPOSITORY: '/trainee/submission',
  RESUBMIT_ZIP: '/trainee/submission',
  START_ASSESSMENT: '/trainee/session',
  /*
    🔴 **다시 보기는 여기서 경로를 주지 않는다.** 예전에는 `/trainee/session?retry=1`이
    었는데 세션 화면이 그 쿼리를 읽지 않아 곧장 막다른 화면으로 갔다.

    다시 보기 응시를 만드는 것은 `POST /assessment-sessions/reviews`뿐이고 그것을 부르는
    버튼은 리포트 화면에 있다. 그래서 홈은 **리포트로 보낸다**(`buildCta` 참고) —
    개설과 시작이 항상 붙어 다니게 된다.
  */
  /*
    **이어하기를 연다.** 예전에는 일부러 경로를 안 줬다 — "시작하면 중간에 나갈 수
    없어요"라는 약속을 지키려고. 그런데 실제로 일어나는 일은 학생이 *약속을 어기는* 것이
    아니라 **사고로 끊기는** 것이다(창을 닫음·네트워크 끊김).

    그때 막아 봐야 시계는 서버에서 계속 돈다. 못 들어오게 하면 남은 시간을 그대로
    잃고 미응시로 기록될 뿐이라, 막는 쪽이 오히려 약속을 깨뜨린다.

    서버는 이미 돌려줄 준비가 돼 있다 — `GET /current`가 `IN_PROGRESS`와 커서를 주고,
    문제 조회가 지난 문답과 이미 연 힌트까지 복원한다(실측).
  */
  RESUME_ASSESSMENT: '/trainee/session',
}

/*
  버튼이 있어도 못 누르는 경우의 설명. 경로가 있는 액션은 여기 없다 — 누를 수 있으니까.
*/
const ACTION_ASIDES: Partial<Record<ActionCode, string>> = {
  WAIT_FOR_ANALYSIS: '분석이 끝나면 열려요',
  /*
    「발행되면 알려드릴게요」에서 바꿨다. **알림이 없다** — 학생이 홈을 다시 열어야
    안다. 없는 알림을 기다리게 하면 그만큼 늦게 본다.
  */
  WAIT_FOR_REPORT: '다 되면 여기서 볼 수 있어요',
}

/** 경고 배지 — 배열이라 여러 개가 동시에 온다 */
export const WARNING_LABELS: Record<WarningCode, string> = {
  SUBMISSION_DEADLINE_PASSED: '제출 마감 지남',
  ANALYSIS_FAILED: '분석 실패',
  ASSESSMENT_WINDOW_CLOSED: '응시 창 닫힘',
  PROBLEM_NOT_GENERATED: '문항 일부 미생성',
}

export type StatusContent = {
  title: string
  steps: StepState[] | null
  strip: { tone: StripTone; big: string; at: string } | null
  guide: GuideLine[]
  cta: { label: string; to?: string; disabled?: boolean; aside?: string } | null
}

/** 남은 시간 스트립 — 상태마다 가리키는 마감이 다르다 */
function buildStrip(round: CurrentRound, now: number): StatusContent['strip'] {
  const { status } = round
  if (status === 'ASSESSMENT_AVAILABLE' && round.assessmentCloseAt) {
    const ms = new Date(round.assessmentCloseAt).getTime() - now
    return {
      tone: 'go',
      big: formatClock(ms),
      at: `${formatDateTime(round.assessmentCloseAt)}까지`,
    }
  }
  if (!round.submissionDueAt) return null
  if (status === 'SUBMISSION_REQUIRED' || status === 'ANALYSIS_FAILED') {
    const ms = new Date(round.submissionDueAt).getTime() - now
    return {
      tone: status === 'ANALYSIS_FAILED' ? 'stop' : 'warn',
      big: formatCoarse(ms),
      at: `제출 마감 ${formatDateTime(round.submissionDueAt)}`,
    }
  }
  return null
}

/**
 * 다시 볼 것이 있고 **리포트로 갈 수 있는가.**
 *
 * 제목·안내·버튼이 같은 기준을 써야 한다 — 하나만 갈리면 제목은 「3개 있어요」인데
 * 버튼은 딴 데로 가는 카드가 된다. `canViewReport`가 빠지면 발행 전 회차에서 그렇게 된다
 * (`buildCta` 주석 참고).
 */
const showsRetry = (round: CurrentRound) =>
  round.retryState === 'PENDING' && round.retryTargetCount > 0 && round.canViewReport

/** 다시 보기 안내 — 상태로 오는 경우와 `retryState`로 오는 경우가 같은 말을 해야 한다 */
const REVIEW_GUIDE: GuideLine[] = [
  /*
    **얻는 것을 먼저 말한다.** 다시 보기는 성적을 바꾸지 않는다 — 그것만 말하면
    "안 해도 그만"으로 읽힌다. 실제로 달라지는 것은 **막힌 개념의 내 답변과 해설이
    열린다**는 점이고(도달 2단 미만이면 그때까지 가려져 있다), 그게 학생이 움직일
    유일한 이유다.
  */
  {
    icon: RotateCcwIcon,
    text: '다시 보면 그 개념의 내 답변과 자세한 해설이 열려요.',
  },
  {
    icon: InfoIcon,
    text: '처음 단계부터 다시 물어요. 리포트에서 안내한 교안을 보고 오면 됩니다.',
  },
  {
    icon: InfoIcon,
    text: '기회는 한 번이에요. 성적은 그대로이고 다시 본 것은 기록에만 남아요.',
  },
]

/** 상태별 안내 문장. 서버 코드를 사람 말로 옮기는 유일한 자리 */
function buildGuide(round: CurrentRound): GuideLine[] {
  /*
    **제목·버튼과 같은 기준으로 갈라야 한다.** 다시 볼 것이 있는 학생의 대표 상태는
    보통 `ASSESSMENT_COMPLETED`인데, 상태로만 문구를 고르면 제목이 *"다시 볼 수 있는
    문제가 2개 있어요"* 인 카드 안에서 *"리포트를 만들고 있어요"* 라고 말하게 된다.
    이 화면이 예전에 겪은 어긋남과 같은 자리다(`reportReady` 주석).
  */
  if (showsRetry(round)) return REVIEW_GUIDE

  switch (round.status) {
    case 'SUBMISSION_REQUIRED':
      return [
        { icon: UploadIcon, text: 'GitHub 저장소 주소나 ZIP 파일로 제출해요.' },
        {
          icon: ArrowRightIcon,
          text: '제출하면 코드 분석이 시작돼요. 분석이 끝난 시각부터 24시간 안에 이해도 확인을 하면 됩니다.',
        },
      ]
    case 'ANALYZING':
      return [{ icon: ClockIcon, text: '끝나면 알려드릴게요. 이 화면을 켜 두지 않아도 됩니다.' }]
    case 'ANALYSIS_FAILED':
      /*
        **수단을 단정하지 않는다.** 예전 문구는 *"저장소 주소와 브랜치를 확인해 주세요"* ·
        *"조직 밖 저장소라면 ZIP으로"* 였는데, ZIP으로 낸 학생에게는 있지도 않은 저장소를
        확인하라는 말이 된다(실제로 `trainee-failed`가 그랬다 — ZIP 제출 · 언어 미지원).

        **실패 사유는 여기서 말하지 않는다.** 서버가 `analysisFailureCode` 15종을 주지만
        그 문구표는 TR-02에 있고, 홈에 복제하면 같은 코드가 두 화면에서 다른 말을 하게
        된다. 홈은 "무슨 일이 일어났고 어디로 가면 되는지"까지만 말하고, 정확한 사유는
        CTA가 보내는 제출 화면이 띄운다.
      */
      return [
        {
          icon: TriangleAlertIcon,
          text: '제출한 코드를 분석하지 못했어요. 제출 화면에서 이유를 확인할 수 있어요.',
        },
        {
          icon: ArrowRightIcon,
          text: '고쳐서 다시 제출하면 분석이 다시 시작돼요. 계속 안 되면 매니저에게 알려 주세요.',
        },
      ]
    case 'ASSESSMENT_AVAILABLE':
      return [
        {
          icon: MessageCircleIcon,
          /*
            **문제 수를 서버가 준다** — 스펙이 *"`3`으로 가정하지 말 것"* 이라고 못박았다.
            코드에 근거가 없는 개념은 문항이 안 만들어져 세션에 나오지 않는다(실제로
            2문항인 계정이 있었다).

            ⚠️ **`0`과 `null`은 다른 말이다.** `null`은 아직 안 정해진 것이고, `0`은
            **만들어진 문항이 하나도 없다**는 확정이다. 후자에서 "코드에 대해 이야기하는
            시간"이라고 하면 없는 문제를 기다리게 된다 — 눌러 보고서야 알게 하지 않는다.
          */
          text:
            round.problemCount === 0
              ? '만들어진 문제가 없어요. 매니저에게 알려 주세요.'
              : round.problemCount
                ? `내가 쓴 코드 ${round.problemCount}군데에 대해 왜 그렇게 했는지 이야기하는 시간이에요.`
                : '내가 쓴 코드에 대해 왜 그렇게 했는지 이야기하는 시간이에요.',
        },
        {
          icon: ClockIcon,
          text: `문제마다 ${CONCEPT_LIMIT_MIN}분, 전체 ${SESSION_LIMIT_LABEL}까지 쓸 수 있어요. 시작하면 중간에 나갈 수 없으니 시간이 되는 때에 시작하세요.`,
        },
        {
          icon: EyeOffIcon,
          text: '점수는 표시되지 않아요. 모르면 다시 설명해 달라고 할 수 있고, 그걸 써도 불이익이 없어요.',
        },
      ]
    case 'ASSESSMENT_IN_PROGRESS':
      return [
        {
          icon: InfoIcon,
          text: '이해도 확인이 끝나지 않은 채로 남아 있어요. 연결이 끊겼다면 매니저에게 알려 주세요.',
        },
      ]
    case 'ASSESSMENT_COMPLETED':
      return [
        {
          icon: CheckIcon,
          text: round.submittedAt
            ? `이해도 확인이 끝났어요. ${formatDateTime(round.submittedAt)} 제출됨.`
            : '이해도 확인이 끝났어요.',
        },
        {
          icon: ArrowRightIcon,
          // 이미 열렸으면 기다리라고 하지 않는다 — 버튼이 눌리는데 문장이 말리면 안 누른다
          text: reportReady(round)
            ? '개념별로 어디까지 설명했는지 확인할 수 있어요.'
            : '리포트를 만들고 있어요. 다 되면 여기서 바로 볼 수 있어요.',
        },
      ]
    case 'REVIEW_REQUIRED':
      return REVIEW_GUIDE
    case 'SUBMISSION_MISSED':
      return [
        {
          icon: XCircleIcon,
          text: round.submissionDueAt
            ? `제출 마감은 ${formatDateTime(round.submissionDueAt)}이었어요. 이번 회차는 미제출로 기록됩니다.`
            : '이번 회차는 미제출로 기록됩니다.',
        },
        {
          icon: ArrowRightIcon,
          text: '제출하지 않아 이해도 확인도 열리지 않습니다. 사정이 있었다면 매니저에게 알려 주세요.',
        },
      ]
    case 'ASSESSMENT_WINDOW_CLOSED':
      return [
        {
          icon: XCircleIcon,
          text: round.assessmentCloseAt
            ? `응시 창은 ${formatDateTime(round.assessmentCloseAt)}에 닫혔어요. 이번 회차는 미응시로 기록됩니다.`
            : '응시 창이 닫혀 이번 회차는 미응시로 기록됩니다.',
        },
        { icon: ArrowRightIcon, text: '사정이 있었다면 매니저에게 알려 주세요.' },
      ]
    case 'NO_ACTIVE_ROUND':
      return [{ icon: InfoIcon, text: '다음 프로젝트가 시작되면 여기에 표시됩니다.' }]
  }
}

function buildCta(round: CurrentRound, now: number): StatusContent['cta'] {
  const { action } = round

  /*
    **다시 볼 것이 있으면 무엇보다 먼저 그 버튼을 세운다.**

    액션 코드로는 이 자리를 못 잡는다 — `START_REVIEW`는 다시 보기를 **연 뒤에야**
    오고, 아직 안 연 학생의 액션은 `WAIT_FOR_REPORT`이거나 `NONE`이다. 그러면 정작
    다시 봐야 하는 학생에게 버튼이 없다.

    마감을 함께 말한다. 기회가 한 번뿐이고 창이 3일이라, 날짜를 안 보여주면 남은 시간을
    모른 채 미룬다. 다만 **`null`로 오는 구간이 있어** 있을 때만 붙인다(아래 참고).

    🔴 **`canViewReport`를 함께 본다.** 발행 전인데 `retryState: PENDING`이 오는 회차가
    있다(실측 — `reportPublishStatus: NOT_PUBLISHED`인데 `retryTargetCount: 3`, 그때
    `retryDueAt`은 `null`이다). 그대로 보내면 *"다시 볼 문제가 3개 있어요"* 를 읽고
    누른 학생이 **「리포트를 만들고 있어요」** 빈 화면에 도착한다.

    발행이 곧 열람이므로(공개 단계 폐지) `canViewReport`가 **리포트에 보낼 수 있는지**를
    그대로 말해 준다. 발행되면 이 카드로 저절로 바뀐다.
  */
  if (showsRetry(round) && round.id) {
    return {
      /*
        **버튼 이름은 목적지를 말한다.** 「다시 보기」라고 써 놓고 리포트로 보내면
        작은 거짓말이고, 한 번 어긋난 버튼은 그다음부터 안 믿는다.

        다시 보기는 **리포트를 읽고 들어가야 하는 일**이다 — 기회가 한 번뿐이고 L1부터
        다시 묻는데, 어느 개념이 막혔고 교안 어디를 보면 되는지는 리포트에만 있다.
        홈에서 곧장 응시로 보내면 그 한 번을 준비 없이 태운다.

        그래서 **버튼은 리포트 하나**로 두고, 다시 볼 것이 있다는 사실은 제목·안내·마감이
        말한다(`buildStatusContent`·`REVIEW_GUIDE`).
      */
      label: ACTION_LABELS.VIEW_REPORT,
      to: `/trainee/report?round=${round.id}`,
      aside: round.retryDueAt ? `${formatDate(round.retryDueAt)}까지` : undefined,
    }
  }

  if (action === 'NONE' || action === 'CONTACT_MANAGER') return null

  const to = ACTION_ROUTES[action]
  // 서버가 막은 이유가 있으면 그걸 우선 보여준다 — 우리가 지어낸 설명보다 정확하다
  const aside = round.blockedReason ? BLOCKED_LABELS[round.blockedReason] : ACTION_ASIDES[action]

  /*
    "늦어도 N시까지 끝나요" — **최대치 기준**이다. 일찍 끝날 수는 있어도 이 시각을
    넘지는 않는다. 학생이 지금 시작할지 정하는 데 필요한 값이라 CTA 옆에 둔다.
  */
  if (action === 'START_ASSESSMENT') {
    const by = new Date(now + SESSION_LIMIT_MIN * 60_000)
    const hh = String(by.getHours()).padStart(2, '0')
    const mm = String(by.getMinutes()).padStart(2, '0')
    return { label: ACTION_LABELS[action], to, aside: `늦어도 ${hh}:${mm}까지 끝나요` }
  }

  /*
    **회차 id를 넘긴다** — 리포트 화면은 회차로 찾는다(`reportsById`의 키가 회차 id다).
    `reportId`는 그 회차에 달린 리포트의 식별자라 다른 값이고, 그것을 넘기면 화면이
    `undefined`를 그리다 터진다(실측). 갈 수 있는지 판정은 `canViewReport`가 한다.
  */
  if (action === 'VIEW_REPORT' && round.canViewReport && round.id) {
    return { label: ACTION_LABELS[action], to: `/trainee/report?round=${round.id}` }
  }

  /*
    **이미 연 다시 보기를 이어서 하는 자리.** 위 `retryState` 분기가 아직 안 연 학생을
    잡으므로 여기 걸리는 것은 열어 둔 응시가 있는 경우다. 그때도 리포트로 보낸다 —
    개설 호출이 거기 있고, 이미 열려 있으면 서버가 그것을 그대로 돌려준다(스펙).
  */
  if (action === 'START_REVIEW' && round.id) {
    return { label: ACTION_LABELS[action], to: `/trainee/report?round=${round.id}` }
  }

  return { label: ACTION_LABELS[action], to, disabled: !to, aside }
}

const BLOCKED_LABELS: Record<NonNullable<CurrentRound['blockedReason']>, string> = {
  SUBMISSION_DEADLINE_PASSED: '제출 마감이 지나 더 이상 낼 수 없어요',
  ASSESSMENT_WINDOW_CLOSED: '응시 창이 닫혔어요',
}

/*
  **제목은 상태가 정하고 버튼은 액션이 정한다** — 그래서 둘이 어긋나는 조합이 하나 있다.

  리포트가 발행되면 상태는 `ASSESSMENT_COMPLETED` 그대로인데 액션만 `VIEW_REPORT`로
  바뀐다. 그러면 *"리포트를 기다리는 중이에요 · 발행되면 알려드릴게요"* 라고 말하면서
  **누를 수 있는 「내 리포트」 버튼**을 함께 그린다(실측). 학생은 기다리라는 문장을 읽고
  버튼을 안 누른다.

  상태만으로 제목을 정할 수 없는 자리라 여기서 액션을 함께 본다.
*/
const reportReady = (round: CurrentRound) =>
  round.status === 'ASSESSMENT_COMPLETED' && round.action === 'VIEW_REPORT'

export function buildStatusContent(round: CurrentRound, now: number): StatusContent {
  return {
    /*
      **다시 볼 것이 있으면 상태보다 그것을 먼저 말한다.** 판정은 `retryState` 하나로
      한다 — `REVIEW_REQUIRED`(대표 상태)는 다시 보기를 **연 뒤에야** 붙어서, 아직 안
      연 학생에게는 안 걸린다. 서버가 3일 창까지 보고 준 값이 `retryState`다.
    */
    title: reportReady(round)
      ? '리포트가 나왔어요'
      : showsRetry(round)
        ? `다시 볼 수 있는 문제가 ${round.retryTargetCount}개 있어요`
        : TITLES[round.status],
    steps: STEPS[round.status] ?? null,
    strip: buildStrip(round, now),
    guide: buildGuide(round),
    cta: buildCta(round, now),
  }
}

/** 예정 회차 한 줄 — `제출 07-21 · 이해도 확인 07-22~23` */
export function upcomingSchedule(open: string | null, due: string | null, submitDue: string) {
  const submit = `제출 ${formatDate(submitDue)}`
  if (!open || !due) return `${submit} · 이해도 확인 일정 미정`
  return `${submit} · 이해도 확인 ${formatDate(open)}~${formatDate(due)}`
}

/** 지난 회차 한 줄 보조문구 — 상태에서 계산한다(문장을 서버에서 받지 않는다, A7) */
export function pastSummary(status: RoundStatus, completedReviewCount: number) {
  if (status === 'SUBMISSION_MISSED') return '미제출'
  if (status === 'ASSESSMENT_WINDOW_CLOSED') return '미응시'
  if (completedReviewCount > 0) return `완료 · 다시 보기 ${completedReviewCount}건 완료`
  return '완료'
}
