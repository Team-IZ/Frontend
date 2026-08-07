import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ArrowUp,
  Minus,
  FileOutput,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { RoundBadge } from './RoundBadge'
import { REACH_STYLE } from '../lib/reach'
import {
  ROUND_OPTIONS,
  ROUND_CONCEPTS,
  type RoundId,
  type RoundRecord,
  type RoundBadgeKind,
  type TimelineRoundGroup,
  type TimelineEvent,
  type SessionEvent,
  type RetryEvent,
  type ReportEvent,
  type InterviewEvent,
} from '../mockData'

/*
  단일 타임라인 — 탭을 쓰지 않는다(§3). 세션·재응시·리포트·면담은 같은 시간축의
  이벤트 유형일 뿐이라 탭으로 가르면 순서가 사라진다. 유형은 필터(토글)로만 거르고,
  이벤트는 한 번만 정의해 필터로 뽑는다 — "면담"만 켰는데 "전체"에 없던 이벤트가
  나오면 필터의 정의가 깨진다(§3).
*/

type EventFilter = 'ALL' | 'SESSION' | 'RETRY' | 'REPORT' | 'INTERVIEW'

const FILTER_OPTIONS: { value: EventFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'SESSION', label: '세션' },
  { value: 'RETRY', label: '재응시' },
  { value: 'REPORT', label: '리포트' },
  { value: 'INTERVIEW', label: '면담' },
]
const FILTER_LABEL: Record<Exclude<EventFilter, 'ALL'>, string> = {
  SESSION: '세션',
  RETRY: '재응시',
  REPORT: '리포트',
  INTERVIEW: '면담',
}

function matchesFilter(kind: TimelineEvent['kind'], filter: EventFilter) {
  return filter === 'ALL' || kind === filter
}

/** 개념별 근거 중 도달 단계가 가장 낮은 것의 힌트만 요약 줄에 얹는다 — 세션 총합이
 *  아니라 "가장 눈에 띄는 한 건"이다(§4 "힌트는 개념별로 붙인다·총합 금지") */
function pickGlanceHint(levels: (number | null)[], evidences: SessionEvent['evidences']) {
  let minIdx = -1
  let min = Infinity
  levels.forEach((l, i) => {
    if (l !== null && l < min) {
      min = l
      minIdx = i
    }
  })
  return minIdx >= 0 ? evidences[minIdx]?.hint : undefined
}

function EventIcon({
  tone,
  children,
}: {
  tone: 'primary' | 'success' | 'info' | 'warning'
  children: React.ReactNode
}) {
  const TONE: Record<typeof tone, string> = {
    primary: 'border-primary-border bg-primary-soft text-primary',
    success: 'border-success-border bg-success-soft text-success',
    info: 'border-info-border bg-info-soft text-info',
    warning: 'border-warning-border bg-warning-soft text-warning',
  }
  return (
    <span
      className={cn(
        'flex size-[22px] shrink-0 items-center justify-center rounded-full border',
        TONE[tone],
      )}
      aria-hidden="true"
    >
      {children}
    </span>
  )
}

function SessionRow({
  event,
  rounds,
}: {
  event: SessionEvent
  rounds: Partial<Record<RoundId, RoundRecord>>
}) {
  const record = rounds[event.roundId]
  const levels = record?.status === 'ATTENDED' ? record.levels : [null, null, null]
  const concepts = ROUND_CONCEPTS[event.roundId]
  const glanceHint = pickGlanceHint(levels, event.evidences)

  return (
    <details className="group/ev border-t border-border">
      <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-3 marker:content-none hover:bg-surface-2 group-open/ev:bg-primary-soft">
        <span className="w-11 shrink-0 pt-0.5 text-xs tabular-nums text-fg-subtle">
          {event.dateLabel}
        </span>
        <EventIcon tone="primary">
          <ClipboardCheck className="size-3" />
        </EventIcon>
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2 text-sm">
          <b className="font-bold">이해도 확인</b>
          <span className="text-fg-muted">
            {levels.map((l) => (l === null ? '―' : `${l}단`)).join(' · ')}
          </span>
          {glanceHint && (
            <span className="rounded-full border border-border px-2 py-0.5 text-2xs text-fg-subtle">
              {glanceHint}
            </span>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-1 text-2xs font-semibold text-primary">
            <span className="group-open/ev:hidden">자세히</span>
            <span className="hidden group-open/ev:inline">접기</span>
            <ChevronRight
              className="size-3 transition-transform duration-150 group-open/ev:rotate-90"
              aria-hidden="true"
            />
          </span>
        </span>
      </summary>
      <div className="border-t border-border bg-primary-soft py-3 pr-5 pl-[84px]">
        {concepts.map((concept, i) => {
          const level = levels[i]
          const evidence = event.evidences[i]
          if (level === null || !evidence) return null
          return (
            <div key={concept} className="mb-2.5 last:mb-0">
              <p className="mb-0.5 flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <span className={cn('rounded-[5px] px-1.5 py-0.5 text-[11px]', REACH_STYLE[level])}>
                  {level}단
                </span>
                {concept}
                {evidence.hint && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-2xs font-semibold text-fg-subtle">
                    {evidence.hint}
                  </span>
                )}
              </p>
              <p className="text-xs text-fg-muted">{evidence.note}</p>
            </div>
          )
        })}
      </div>
    </details>
  )
}

function RetryRow({ event }: { event: RetryEvent }) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 border-t border-border px-5 py-3',
        event.closed && 'opacity-40',
      )}
    >
      <span className="w-11 shrink-0 pt-0.5 text-xs tabular-nums text-fg-subtle">
        {event.dateLabel}
      </span>
      <EventIcon tone="success">
        {event.changed ? <ArrowUp className="size-3" /> : <Minus className="size-3" />}
      </EventIcon>
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2 text-sm">
        <b className="font-bold">{event.closed ? '재응시 창 마감' : '재응시'}</b>
        <span className="text-fg-muted">{event.label}</span>
        {event.tag && (
          <span className="rounded-full border border-border px-2 py-0.5 text-2xs text-fg-subtle">
            {event.tag}
          </span>
        )}
      </span>
    </div>
  )
}

function ReportRow({ event }: { event: ReportEvent }) {
  return (
    <div className="flex items-start gap-4 border-t border-border px-5 py-3">
      <span className="w-11 shrink-0 pt-0.5 text-xs tabular-nums text-fg-subtle">
        {event.dateLabel}
      </span>
      <EventIcon tone="info">
        <FileOutput className="size-3" />
      </EventIcon>
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2 text-sm">
        <b className="font-bold">리포트 발행</b>
        <span className="text-fg-muted">{event.detail}</span>
      </span>
    </div>
  )
}

function InterviewRow({ event }: { event: InterviewEvent }) {
  if (!event.recorded) {
    return (
      <div className="flex items-start gap-4 border-t border-border px-5 py-3">
        <span className="w-11 shrink-0 pt-0.5 text-xs tabular-nums text-fg-subtle">
          {event.dateLabel}
        </span>
        <EventIcon tone="warning">
          <MessageSquare className="size-3" />
        </EventIcon>
        <span className="flex min-w-0 flex-1 items-baseline gap-2 text-sm">
          <b className="font-bold">면담</b>
          <span className="text-fg-subtle">기록 없음</span>
        </span>
      </div>
    )
  }

  const unconfirmed = !event.nextAction.confirmedAt

  return (
    <details className="group/ev border-t border-border">
      <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-3 marker:content-none hover:bg-surface-2 group-open/ev:bg-primary-soft">
        <span className="w-11 shrink-0 pt-0.5 text-xs tabular-nums text-fg-subtle">
          {event.dateLabel}
        </span>
        <EventIcon tone="warning">
          <MessageSquare className="size-3" />
        </EventIcon>
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2 text-sm">
          <b className="font-bold">면담</b>
          <span className="text-fg-muted">{event.summary}</span>
          {unconfirmed && (
            <span className="ml-auto shrink-0 text-2xs font-semibold text-warning">
              ⚠ 약속 미확인
            </span>
          )}
          <span
            className={cn(
              'flex shrink-0 items-center gap-1 text-2xs font-semibold text-primary',
              unconfirmed ? '' : 'ml-auto',
            )}
          >
            <span className="group-open/ev:hidden">기록</span>
            <span className="hidden group-open/ev:inline">접기</span>
            <ChevronRight
              className="size-3 transition-transform duration-150 group-open/ev:rotate-90"
              aria-hidden="true"
            />
          </span>
        </span>
      </summary>
      <div className="grid grid-cols-3 gap-2 border-t border-border bg-primary-soft px-5 py-3 pl-[84px]">
        <div className="rounded-md border border-border bg-surface p-2.5">
          <p className="mb-0.5 text-2xs text-fg-subtle">무엇 때문이라고 했나</p>
          <p className="text-xs text-fg">{event.whatHappened}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-2.5">
          <p className="mb-0.5 text-2xs text-fg-subtle">어디로 보냈나</p>
          <p className="text-xs text-fg">{event.whereSent}</p>
        </div>
        <div
          className={cn(
            'rounded-md border p-2.5',
            unconfirmed ? 'border-warning-border bg-warning-soft' : 'border-border bg-surface',
          )}
        >
          <p className="mb-0.5 text-2xs text-fg-subtle">다음에 할 것</p>
          <p className={cn('text-xs', unconfirmed ? 'font-semibold text-warning' : 'text-fg')}>
            {event.nextAction.text}
            {unconfirmed ? ' — 아직 확인 안 됨' : ` — ${event.nextAction.confirmedAt} 확인`}
          </p>
        </div>
      </div>
    </details>
  )
}

function EventRow({
  event,
  rounds,
}: {
  event: TimelineEvent
  rounds: Partial<Record<RoundId, RoundRecord>>
}) {
  switch (event.kind) {
    case 'SESSION':
      return <SessionRow event={event} rounds={rounds} />
    case 'RETRY':
      return <RetryRow event={event} />
    case 'REPORT':
      return <ReportRow event={event} />
    case 'INTERVIEW':
      return <InterviewRow event={event} />
  }
}

function RoundGroup({
  group,
  badge,
  rounds,
  filter,
  expanded,
  onToggle,
}: {
  group: TimelineRoundGroup
  badge: RoundBadgeKind | null
  rounds: Partial<Record<RoundId, RoundRecord>>
  filter: EventFilter
  expanded: boolean
  onToggle: () => void
}) {
  const roundLabel = ROUND_OPTIONS.find((o) => o.value === group.roundId)?.label ?? group.roundId
  const events = group.events
    .filter((e) => matchesFilter(e.kind, filter))
    .slice()
    .sort((a, b) => a.sortAt.localeCompare(b.sortAt))

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 border-t border-border bg-surface-2 px-5 py-2.5 text-left text-sm font-bold first:border-t-0"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 text-fg-subtle" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-3.5 text-fg-subtle" aria-hidden="true" />
        )}
        {roundLabel}
        <span className="font-normal text-fg-subtle">
          · {group.team} · {group.dateRange}
        </span>
        {badge && (
          <span className="ml-auto">
            <RoundBadge kind={badge} />
          </span>
        )}
      </button>
      {expanded && events.map((e) => <EventRow key={e.id} event={e} rounds={rounds} />)}
    </div>
  )
}

export function Timeline({
  groups,
  rounds,
}: {
  groups: (TimelineRoundGroup & { badge: RoundBadgeKind | null })[]
  rounds: Partial<Record<RoundId, RoundRecord>>
}) {
  const [filter, setFilter] = useState<EventFilter>('ALL')
  // 회차가 늘면 접는다 — 최근 2회차만 펼치고 이전은 접는다(§4)
  const [collapsed, setCollapsed] = useState<Set<RoundId>>(
    () => new Set(groups.slice(2).map((g) => g.roundId)),
  )

  const total = groups.flatMap((g) => g.events).filter((e) => matchesFilter(e.kind, filter)).length

  function toggle(roundId: RoundId) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(roundId)) next.delete(roundId)
      else next.add(roundId)
      return next
    })
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold">이력</p>
        <p className="text-xs text-fg-subtle">
          {filter === 'ALL' ? '이벤트' : FILTER_LABEL[filter]} {total}건
        </p>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setFilter(o.value)}
              aria-pressed={filter === o.value}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs',
                filter === o.value
                  ? 'border-primary-border bg-primary-soft font-semibold text-primary'
                  : 'border-border-strong bg-surface-2 text-fg-muted',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <Empty>
          <EmptyTitle>아직 기록이 없어요</EmptyTitle>
          <EmptyDescription>
            이해도 확인·재응시·면담이 생기면 여기에 시간 순으로 쌓입니다.
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          {groups.map((g) => (
            <RoundGroup
              key={g.roundId}
              group={g}
              badge={g.badge}
              rounds={rounds}
              filter={filter}
              expanded={!collapsed.has(g.roundId)}
              onToggle={() => toggle(g.roundId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
