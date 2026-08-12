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
import {
  formatClock,
  formatCoarse,
  formatDate,
  formatDateKorean,
  formatDateTime,
} from '@/lib/format'
import type { CurrentRound } from './types'

/*
  표시 라벨 — **화면 것**(api-boundary §1-⑤). 연동해도 남는다.

  상태별 문구를 Record 여러 벌(제목·가이드·CTA...)로 흩어두지 않고 `buildStatusContent`
  하나의 switch로 모았다 — Record<RoundStatus, (round: CurrentRound) => T> 형태로 짜면
  TS가 함수 내부에서 round를 그 상태로 좁혀주지 않아 각 함수가 다시 `if (round.status !== ...)`
  가드를 반복해야 한다. switch 한 곳이면 case별로 자동으로 좁혀진다.

  문구는 목업(trainee/home.html) 각 .rpage에서 그대로 옮겼다 — 문구는 계약이다(00-index).
  굵게(<b>) 표시는 타이포그래피라 여기서는 안 옮기고 컴포넌트가 필요하면 얹는다.

  아이콘은 유니코드 손글씨 글리프(↥ ◇ – 등) 대신 lucide-react를 쓴다 — 사이드바가
  이미 그렇게 하고 있고(sidebarConfig.ts "폰트마다 다르게 그려지고 접근성 트리에도
  의미 없는 문자로 잡힌다"), 같은 뜻은 화면이 달라도 같은 아이콘이어야 한다("잠김"은
  어디서나 LockIcon, "숨김"은 어디서나 EyeOffIcon).

  ANALYZING의 "남은 시간은 알려드리지 않아요 — 정확하지 않은 예상을 드리지 않으려고요"
  줄은 지웠다 — 바로 위 줄("끝나면 알려드릴게요")이 이미 같은 사실을 긍정형으로
  전달한다. 이 줄은 그 사실의 **이유**(왜 안 보여주는지, 내부 정책)를 사용자에게
  설명하는 것이었는데, 사용자가 알아야 할 것은 "무슨 일이 일어나는가"이지 "우리가
  왜 그렇게 결정했는가"가 아니다(실사용 피드백으로 발견).
*/

/*
  세션 규칙(tr-03-session.md) 중 **홈이 미리 말해 주는 값**만 여기 둔다.

  ⚠️ 세션 화면(`features/trainee/session/`)에 같은 값이 또 있다 — features 간 교차
  import를 린트가 막아서(oxlintrc) 상수 셋을 복제한다. **한쪽만 고치면 홈과 세션이
  다른 시간을 말하게 된다.** 실제로 그랬다 — 세션을 1시간으로 고친 뒤에도 홈은
  "보통 30~40분"이라고 해서, 학생이 홈을 보고 시작하면 인트로에서 다른 숫자를 봤다.

  ponytail: 값이 하나 더 늘거나 세 번째 화면이 같은 것을 말하게 되면 `lib/`로 올린다.
  지금은 두 곳뿐이라 복제가 싸고, 서버가 이 값을 주기 시작하면 어차피 둘 다 지운다.
*/
const CONCEPT_COUNT = 3
const CONCEPT_LIMIT_MIN = 20
const SESSION_LIMIT_MIN = 60
/** 문구용 — 세션 인트로가 "전체 1시간"이라고 하므로 홈도 같은 말을 쓴다("60분" ✗) */
const SESSION_LIMIT_LABEL = '1시간'

export type GuideLine = { icon: LucideIcon; text: string }
export type StepState = 'done' | 'now' | 'pending'
export type StripTone = 'warn' | 'go' | 'stop'

export const STEP_LABELS = ['코드 제출', '코드 분석', '이해도 확인', '리포트'] as const

export type StatusContent = {
  title: string
  steps: StepState[] | null
  strip: { tone: StripTone; big: string; at: string } | null
  guide: GuideLine[]
  cta: {
    label: string
    to?: string
    variant?: 'primary' | 'ghost'
    disabled?: boolean
    aside?: string
  } | null
}

export function buildStatusContent(round: CurrentRound, now: number): StatusContent {
  switch (round.status) {
    case 'NOT_SUBMITTED': {
      const dueMs = new Date(round.submissionDueAt).getTime() - now
      return {
        title: '코드를 제출할 차례예요',
        steps: ['now', 'pending', 'pending', 'pending'],
        strip: {
          tone: 'warn',
          big: formatCoarse(dueMs),
          at: `제출 마감 ${formatDateTime(round.submissionDueAt)}`,
        },
        guide: [
          { icon: UploadIcon, text: 'GitHub 저장소 주소나 ZIP 파일로 제출해요.' },
          {
            icon: ArrowRightIcon,
            text: '제출하면 코드 분석이 시작돼요. 분석이 끝난 시각부터 24시간 안에 이해도 확인을 하면 됩니다.',
          },
        ],
        cta: { label: '코드 제출', to: '/trainee/submission', variant: 'primary' },
      }
    }

    case 'ANALYZING':
      return {
        title: '코드 분석이 진행 중이에요',
        steps: ['done', 'now', 'pending', 'pending'],
        strip: null,
        guide: [{ icon: ClockIcon, text: '끝나면 알려드릴게요. 이 화면을 켜 두지 않아도 됩니다.' }],
        cta: { label: '이해도 확인', disabled: true, aside: '분석이 끝나면 열려요' },
      }

    case 'ANALYSIS_FAILED': {
      const dueMs = new Date(round.submissionDueAt).getTime() - now
      return {
        title: '코드를 분석하지 못했어요',
        steps: ['done', 'now', 'pending', 'pending'],
        strip: {
          tone: 'stop',
          big: formatCoarse(dueMs),
          at: `제출 마감 ${formatDateTime(round.submissionDueAt)}`,
        },
        guide: [
          { icon: TriangleAlertIcon, text: round.failureReason },
          {
            icon: ArrowRightIcon,
            text: '조직 밖 저장소라면 ZIP으로 올리면 됩니다. 계속 안 되면 매니저에게 알려 주세요.',
          },
        ],
        cta: { label: '다시 제출', to: '/trainee/submission', variant: 'primary' },
      }
    }

    case 'READY_TO_VERIFY': {
      const closesMs = new Date(round.verifyClosesAt).getTime() - now
      // ponytail: "지금 시작하면 새벽 3시 전에 끝나요"의 새벽/오전 같은 한국어 하루 표현은
      // 만들지 않는다 — 24시간제 시각만 보여줘도 같은 정보를 준다. 하루 구간 이름이
      // 필요해지면 그때 넣는다.
      const finishBy = new Date(now + SESSION_LIMIT_MIN * 60_000)
      return {
        title: '이해도 확인을 시작할 차례예요',
        steps: ['done', 'done', 'now', 'pending'],
        strip: {
          tone: 'go',
          big: formatClock(closesMs),
          at: `${formatDateTime(round.verifyClosesAt)}까지`,
        },
        guide: [
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
        ],
        cta: {
          label: '이해도 확인 시작하기 →',
          to: '/trainee/session',
          variant: 'primary',
          // 최대치 기준이다 — 일찍 끝날 수는 있어도 이 시각을 넘지는 않는다
          aside: `늦어도 ${String(finishBy.getHours()).padStart(2, '0')}:${String(finishBy.getMinutes()).padStart(2, '0')}까지 끝나요`,
        },
      }
    }

    case 'VERIFY_DONE':
      return {
        title: '리포트를 기다리는 중이에요',
        steps: ['done', 'done', 'done', 'now'],
        strip: null,
        guide: [
          {
            icon: CheckIcon,
            text: `이해도 확인이 끝났어요. ${formatDateTime(round.verifiedAt)} 제출됨.`,
          },
          {
            icon: ArrowRightIcon,
            text: '리포트는 회차 마감 후 한꺼번에 발행됩니다. 발행되면 알려드릴게요.',
          },
        ],
        cta: {
          label: '내 리포트',
          disabled: true,
          aside: `발행 예정 ${formatDate(round.reportAfter)} 이후`,
        },
      }

    /*
      `retryConcepts`는 **도달 2단 미만인 개념**만 담는다(tr-03-session.md §2-5).
      문항 없음은 못한 것이 아니라 안 물어본 것이라 여기 안 들어간다 — TR-04의
      `다시 볼 문제 N개`와 같은 기준이어야 두 화면의 숫자가 안 갈린다.
    */
    case 'RETRY_AVAILABLE':
      return {
        title: `다시 볼 수 있는 문제가 ${round.retryConcepts.length}개 있어요`,
        steps: ['done', 'done', 'done', 'now'],
        strip: {
          tone: 'warn',
          big: formatCoarse(new Date(round.retryDueAt).getTime() - now),
          at: `${formatDate(round.retryDueAt)}까지`,
        },
        guide: [
          {
            icon: RotateCcwIcon,
            text: `${round.retryConcepts.join(' · ')} — 처음 단계부터 다시 봐요. 리포트에서 안내한 교안을 보고 오면 됩니다.`,
          },
          {
            icon: InfoIcon,
            // "한 번뿐"은 되돌릴 수 없는 사실이라 누르기 전에 말한다(체크리스트 B5)
            text: '기회는 한 번이에요. 기존 결과는 그대로이고 다시 본 것은 기록에만 남아요.',
          },
        ],
        cta: {
          label: '다시 보기',
          to: '/trainee/session?retry=1',
          variant: 'primary',
          aside: `${formatDateKorean(round.retryDueAt)}까지`,
        },
      }

    case 'SUBMISSION_CLOSED':
      return {
        title: '제출 기한이 지났어요',
        steps: null,
        strip: null,
        guide: [
          {
            icon: XCircleIcon,
            text: `제출 마감은 ${formatDateTime(round.submissionDueAt)}이었어요. 이번 회차는 미제출로 기록됩니다.`,
          },
          {
            icon: ArrowRightIcon,
            text: '제출하지 않아 이해도 확인도 열리지 않습니다. 사정이 있었다면 매니저에게 알려 주세요.',
          },
        ],
        // ponytail: 매니저 문의 채널이 기획에 없다 — 안내 텍스트로 대신하고 버튼은 만들지 않는다.
        cta: null,
      }

    case 'VERIFICATION_CLOSED':
      return {
        title: '응시 기한이 지났어요',
        steps: null,
        strip: null,
        guide: [
          {
            icon: XCircleIcon,
            text: `응시 창은 ${formatDateTime(round.verifyClosedAt)}에 닫혔어요. 이번 회차는 미응시로 기록됩니다.`,
          },
          { icon: ArrowRightIcon, text: '사정이 있었다면 매니저에게 알려 주세요.' },
        ],
        cta: null,
      }
  }
}
