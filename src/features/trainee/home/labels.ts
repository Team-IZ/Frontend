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
const CONCEPT_COUNT = 3
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
  RESUME_ASSESSMENT: '이해도 확인',
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
  START_REVIEW: '/trainee/session?retry=1',
}

/*
  버튼이 있어도 못 누르는 경우의 설명.

  ⚠️ `RESUME_ASSESSMENT`는 **일부러 경로를 안 준다.** 서버는 세션 재개를 상정하지만
  이 제품의 규칙은 "한 번에 끝낸다"이고, 이 상태는 네트워크가 끊겨 멈춘 사고 대비다.
  버튼을 열면 "시작하면 중간에 나갈 수 없어요"라는 약속이 화면에서 무너진다 —
  재개 경로는 세션 API가 열릴 때 함께 설계한다.
*/
const ACTION_ASIDES: Partial<Record<ActionCode, string>> = {
  WAIT_FOR_ANALYSIS: '분석이 끝나면 열려요',
  WAIT_FOR_REPORT: '발행되면 알려드릴게요',
  RESUME_ASSESSMENT: '진행 중인 응시가 있어요 — 매니저에게 알려 주세요',
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

/** 상태별 안내 문장. 서버 코드를 사람 말로 옮기는 유일한 자리 */
function buildGuide(round: CurrentRound): GuideLine[] {
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
          text: `내가 쓴 코드 ${CONCEPT_COUNT}군데에 대해 왜 그렇게 했는지 이야기하는 시간이에요.`,
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
          text: '리포트는 회차 마감 후 한꺼번에 발행됩니다. 발행되면 알려드릴게요.',
        },
      ]
    case 'REVIEW_REQUIRED':
      return [
        {
          icon: RotateCcwIcon,
          text: '처음 단계부터 다시 봐요. 리포트에서 안내한 교안을 보고 오면 됩니다.',
        },
        {
          icon: InfoIcon,
          text: '기회는 한 번이에요. 기존 결과는 그대로이고 다시 본 것은 기록에만 남아요.',
        },
      ]
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

  if (action === 'VIEW_REPORT' && round.canViewReport && round.reportId) {
    return { label: ACTION_LABELS[action], to: `/trainee/report?round=${round.reportId}` }
  }

  return { label: ACTION_LABELS[action], to, disabled: !to, aside }
}

const BLOCKED_LABELS: Record<NonNullable<CurrentRound['blockedReason']>, string> = {
  SUBMISSION_DEADLINE_PASSED: '제출 마감이 지나 더 이상 낼 수 없어요',
  ASSESSMENT_WINDOW_CLOSED: '응시 창이 닫혔어요',
}

export function buildStatusContent(round: CurrentRound, now: number): StatusContent {
  return {
    title:
      round.status === 'REVIEW_REQUIRED' && round.reviewPendingCount > 0
        ? `다시 볼 수 있는 문제가 ${round.reviewPendingCount}개 있어요`
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
