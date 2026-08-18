import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatClock } from '@/lib/format'
import { cn } from '@/lib/utils/cn'
import { buildStatusContent, WARNING_LABELS, type StripTone } from '../labels'
import type { CurrentRound } from '../_/api/types'
import { useCountdown } from '../useCountdown'
import StepTracker from './StepTracker'

/** 훅은 조건 없이 불러야 해서, 카운트다운이 없는 상태에는 절대 안 닿는 더미 마감을 준다 */
const FAR_FUTURE = '2999-01-01T00:00:00Z'

const STRIP_TONE_CLASS: Record<StripTone, string> = {
  warn: 'bg-warning-soft text-warning',
  go: 'bg-success-soft text-success',
  stop: 'bg-danger-soft text-danger',
}

/** 끝난 회차는 카드를 죽인다 — 할 일이 아니라 기록이다 */
const MUTE_STATUSES: CurrentRound['status'][] = [
  'SUBMISSION_MISSED',
  'ASSESSMENT_WINDOW_CLOSED',
  'NO_ACTIVE_ROUND',
]

type Props = {
  round: CurrentRound
  /** 응시 창이 화면을 띄워 둔 채로 닫히는 순간 한 번 호출된다 — 서버 재조회 트리거 */
  onVerifyWindowExpire: () => void
}

/**
 * TR-01 "지금 할 일" 카드 — 서버가 준 대표 상태 하나로 전부 갈린다.
 *
 * **회차가 없어도 이 카드를 그린다.** 서버가 `NO_ACTIVE_ROUND` 합성 카드를 만들어 주므로
 * 화면에 "회차 없음" 분기가 따로 없다.
 */
export default function StatusCard({ round, onVerifyWindowExpire }: Props) {
  const isLive = round.status === 'ASSESSMENT_AVAILABLE' && !!round.assessmentCloseAt
  const liveMs = useCountdown(
    isLive ? round.assessmentCloseAt! : FAR_FUTURE,
    isLive ? onVerifyWindowExpire : undefined,
  )
  const content = buildStatusContent(round, Date.now())
  const isMute = MUTE_STATUSES.includes(round.status)

  return (
    <div className="flex flex-col gap-3">
      {content.steps && <StepTracker steps={content.steps} />}

      <Card className={cn('gap-0 py-0', isMute && 'bg-surface-2')}>
        {content.strip && (
          <div
            className={cn(
              'flex items-center justify-between px-5 py-2.5 text-sm font-medium',
              STRIP_TONE_CLASS[content.strip.tone],
            )}
          >
            <span>
              <span className="text-base font-bold">
                {isLive ? formatClock(liveMs) : content.strip.big}
              </span>{' '}
              남음
            </span>
            <span className="text-xs font-normal opacity-80">{content.strip.at}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 p-5">
          {/*
            회차·소속 줄 — 합성 카드(NO_ACTIVE_ROUND)에서는 회차가 없어 소속만 뜬다.
            서버가 null을 주는 자리라 있는 것만 이어 붙인다.
          */}
          {(round.roundName || round.classTeam) && (
            <div className="text-sm text-fg-subtle">
              {round.roundName}
              {round.classTeam && <span> · {round.classTeam}</span>}
              {round.curriculumNames.length > 0 && (
                <span> · 교안 {round.curriculumNames.join(' · ')}</span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-fg">{content.title}</h3>
            {/*
              경고 배지 — **배열이라 여러 개가 동시에 온다.** 대표 상태 하나로는 못 담는
              사실(마감 지남 + 분석 실패)이 여기 실린다.
            */}
            {round.warnings.map((w) => (
              <span
                key={w}
                className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning"
              >
                {WARNING_LABELS[w]}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-2 text-sm text-fg-muted">
            {content.guide.map((line, i) => (
              <div key={i} className="flex gap-2">
                <line.icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
                <span>{line.text}</span>
              </div>
            ))}
          </div>

          {/*
            **버튼은 항상 오른쪽 끝이다.** `justify-between`만 쓰면 보조 문구가 없는
            상태에서 버튼이 혼자 남아 왼쪽으로 간다 — 상태에 따라 버튼 위치가 옮겨
            다니면 매번 눈으로 찾아야 한다. 문구를 `mr-auto`로 밀어 둔다.
          */}
          {content.cta && (
            <div className="mt-1 flex flex-wrap items-center justify-end gap-3">
              {content.cta.aside && (
                <span className="mr-auto text-xs text-fg-subtle">{content.cta.aside}</span>
              )}
              {content.cta.to ? (
                <Button nativeButton={false} render={<Link to={content.cta.to} />}>
                  {content.cta.label}
                </Button>
              ) : (
                <Button disabled>{content.cta.label}</Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
