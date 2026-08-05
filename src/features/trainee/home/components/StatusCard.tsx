import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatClock } from '@/lib/format'
import { cn } from '@/lib/utils/cn'
import { buildStatusContent, type StripTone } from '../labels'
import type { CurrentRound } from '../types'
import { useCountdown } from '../useCountdown'
import StepTracker from './StepTracker'

/** 훅은 조건 없이 불러야 해서, 응시 가능이 아닐 때는 절대 안 닿는 더미 마감을 준다 */
const FAR_FUTURE = '2999-01-01T00:00:00Z'

const STRIP_TONE_CLASS: Record<StripTone, string> = {
  warn: 'bg-warning-soft text-warning',
  go: 'bg-success-soft text-success',
  stop: 'bg-danger-soft text-danger',
}

const MUTE_STATUSES: CurrentRound['status'][] = ['SUBMISSION_CLOSED', 'VERIFICATION_CLOSED']

/**
 * TR-01 "지금 할 일" 카드 — 상태 9종(진행 중인 회차 없음 제외)이 전부 이 셸의 variant다.
 * 목업에서도 `missed`·`closed`는 별도 컴포넌트가 아니라 같은 카드의 회색 variant다.
 */
export default function StatusCard({ round, onVerifyWindowExpire }: Props) {
  const isReady = round.status === 'READY_TO_VERIFY'
  const liveMs = useCountdown(
    isReady ? round.verifyClosesAt : FAR_FUTURE,
    isReady ? onVerifyWindowExpire : undefined,
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
                {isReady ? formatClock(liveMs) : content.strip.big}
              </span>{' '}
              남음
            </span>
            <span className="text-xs font-normal opacity-80">{content.strip.at}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 p-5">
          <div className="text-sm text-fg-subtle">
            {round.roundLabel}{' '}
            <span>
              · {round.classTeam} · 교안 {round.curriculum}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-fg">{content.title}</h3>

          <div className="flex flex-col gap-2 text-sm text-fg-muted">
            {content.guide.map((line, i) => (
              <div key={i} className="flex gap-2">
                <line.icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
                <span>{line.text}</span>
              </div>
            ))}
          </div>

          {content.cta && (
            <div className="mt-1 flex items-center justify-between gap-3">
              {content.cta.aside && (
                <span className="text-xs text-fg-subtle">{content.cta.aside}</span>
              )}
              {content.cta.to ? (
                <Button
                  variant={content.cta.variant}
                  nativeButton={false}
                  render={<Link to={content.cta.to} />}
                >
                  {content.cta.label}
                </Button>
              ) : (
                <Button variant={content.cta.variant} disabled={content.cta.disabled}>
                  {content.cta.label}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

type Props = {
  round: CurrentRound
  /** 응시 창이 화면을 띄워 둔 채로 닫히는 순간 한 번 호출된다 — 서버 재조회 트리거 */
  onVerifyWindowExpire: () => void
}
