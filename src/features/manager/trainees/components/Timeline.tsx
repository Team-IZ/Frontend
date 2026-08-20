import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ArrowUp,
  Minus,
  FileOutput,
  MessageSquare,
  BookOpenIcon,
  CircleSlashIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { RoundBadge } from './RoundBadge'
import { REACH_STYLE } from '@/components/common/reach'
import { useManagedTraineeReport, useTraineeEvaluation } from '../_/api/api'
import type {
  ManagedReportConcept,
  ManagedRoundReport,
  RoundBadgeKind,
  TimelineEvent,
  TimelineGroup,
  TimelineKind,
  TraineeEvaluation,
} from '../_/api/types'

/*
  단일 타임라인 — 탭을 쓰지 않는다(§3). 이해도 확인·다시 보기·리포트·면담은 같은
  시간축의 이벤트 유형일 뿐이라 탭으로 가르면 순서가 사라진다. 유형은 필터(토글)로만
  거르고, 이벤트는 한 번만 정의해 필터로 뽑는다.

  ⚠ **서버가 「다시 보기」를 두 사건으로 나눠 준다** — `REVIEW`(답해서 도달이 바뀐 것)와
  `REVIEW_CLOSED`(창이 닫힐 때까지 답하지 않은 것). 목은 한 종류에 `closed` 불리언을
  달아 뒀는데, 서버 쪽이 맞다: 두 사건은 시각이 다르다(응답 시점 vs 마감 시각).
  필터 한 칸(`다시 보기`)에 둘을 같이 담는다.
*/

type EventFilter = 'ALL' | TimelineKind

const FILTER_OPTIONS: { value: EventFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'ASSESSMENT', label: '이해도 확인' },
  { value: 'REVIEW', label: '다시 보기' },
  { value: 'REPORT', label: '리포트' },
  { value: 'INTERVIEW', label: '면담' },
]
const FILTER_LABEL: Record<Exclude<EventFilter, 'ALL'>, string> = {
  ASSESSMENT: '이해도 확인',
  REVIEW: '다시 보기',
  REVIEW_CLOSED: '다시 보기',
  REPORT: '리포트',
  INTERVIEW: '면담',
}

/** `다시 보기` 한 칸이 `REVIEW`·`REVIEW_CLOSED` 둘을 담는다 */
function matchesFilter(kind: TimelineKind, filter: EventFilter) {
  if (filter === 'ALL') return true
  if (filter === 'REVIEW') return kind === 'REVIEW' || kind === 'REVIEW_CLOSED'
  return kind === filter
}

/** 되짚어 물은 횟수 → 화면 문구. 0회는 `자력`이라 배지를 그린다 */
function hintLabel(count: number | null) {
  if (count === null) return undefined
  return count === 0 ? '자력' : `재진술 ${count}회`
}

/**
 * 요약 줄에 얹을 힌트 한 건 — 도달이 가장 낮은 문항의 것이다. 세션 총합이 아니라
 * "가장 눈에 띄는 한 건"이다(§4 "힌트는 개념별로 붙인다 · 총합 금지").
 */
function glanceHint(problems: TimelineEvent['problems']) {
  const answered = problems.filter((p) => p.level !== null)
  if (answered.length === 0) return undefined
  const worst = answered.reduce((a, b) => ((b.level ?? 0) < (a.level ?? 0) ? b : a))
  return hintLabel(worst.hintUsedCount)
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

function DateCell({ label }: { label: string }) {
  return <span className="w-11 shrink-0 pt-0.5 text-xs tabular-nums text-fg-subtle">{label}</span>
}

function AssessmentRow({
  event,
  projectId,
  traineeId,
}: {
  event: TimelineEvent
  projectId: string
  traineeId: string
}) {
  /*
    **펼칠 때만 부른다.** 회차가 여섯이면 눈으로 보는 것은 보통 한둘이라, 미리 다 받으면
    안 볼 것까지 6콜이 나간다. react-query가 캐시하므로 접었다 펴도 다시 안 나간다.
  */
  const [opened, setOpened] = useState(false)
  const evaluation = useTraineeEvaluation(projectId, traineeId, opened)

  const hint = glanceHint(event.problems)
  const summary = (
    <>
      <b className="font-bold">이해도 확인</b>
      <span className="text-fg-muted">
        {event.problems.map((p) => (p.level === null ? '―' : `${p.level}단`)).join(' · ')}
      </span>
      {hint && (
        <span className="rounded-full border border-border px-2 py-0.5 text-2xs text-fg-subtle">
          {hint}
        </span>
      )}
    </>
  )

  /*
    답한 문항이 하나도 없으면 펼칠 것이 없다 — 요약 줄과 같은 내용만 반복된다.
    서버가 세션을 안 준 경우(`sessionId` 없음)도 같다.
  */
  const hasDetail = event.problems.some((p) => p.level !== null)
  if (!hasDetail) {
    return (
      <div className="flex items-start gap-4 border-t border-border px-5 py-3">
        <DateCell label={event.dateLabel} />
        <EventIcon tone="primary">
          <ClipboardCheck className="size-3" />
        </EventIcon>
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2 text-sm">
          {summary}
        </span>
      </div>
    )
  }

  return (
    <details
      className="group/ev border-t border-border"
      onToggle={(e) => setOpened((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-3 marker:content-none hover:bg-surface-2 group-open/ev:bg-primary-soft">
        <DateCell label={event.dateLabel} />
        <EventIcon tone="primary">
          <ClipboardCheck className="size-3" />
        </EventIcon>
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2 text-sm">
          {summary}
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
        {event.problems.map((p) => {
          if (p.level === null) return null
          const hintText = hintLabel(p.hintUsedCount)
          return (
            <div key={p.problemNo} className="mb-2.5 last:mb-0">
              <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <span
                  className={cn('rounded-[5px] px-1.5 py-0.5 text-[11px]', REACH_STYLE[p.level])}
                >
                  {p.level}단
                </span>
                {p.conceptName}
                {hintText && (
                  <span className="border-border text-fg-subtle rounded-full border px-2 py-0.5 text-2xs font-semibold">
                    {hintText}
                  </span>
                )}
              </p>
              {/* 개념별 채점 근거 — 축(L1~L4)별로 무엇은 말했고 무엇은 못 했는지 */}
              <StepNotes concept={p.conceptName} evaluation={evaluation.data} />
            </div>
          )
        })}
        {evaluation.isPending && (
          <p className="text-fg-subtle mt-2 text-2xs">채점 근거를 불러오는 중…</p>
        )}
        {/*
          발행 전에는 `note`가 전부 null이다 — 비워 두면 매니저가 "이 사람은 근거가
          없구나"로 읽으므로 왜 없는지를 말한다.
        */}
        {evaluation.data && !evaluation.data.reportPublished && (
          <p className="border-primary-border text-fg-subtle mt-3 border-t pt-2.5 text-2xs">
            채점 근거는 회차 리포트가 발행된 뒤에 나옵니다.
          </p>
        )}
      </div>
    </details>
  )
}

/**
 * 축별 채점 근거 — **개념 이름으로 맞춘다.**
 *
 * 타임라인 `problems[]`와 채점 상세 `concepts[]`가 서로의 id를 안 갖는다(앞은
 * `conceptId`가 개인 기여 문항에서 null이고, 뒤는 `problemNo`가 없다). 이름은 같은
 * 원장에서 나오므로 이 자리에서는 맞는다 — 못 찾으면 조용히 아무것도 안 그린다.
 */
function StepNotes({
  concept,
  evaluation,
}: {
  concept: string
  evaluation: TraineeEvaluation | undefined
}) {
  const found = evaluation?.concepts.find((c) => c.concept === concept)
  const notes = (found?.steps ?? []).filter((s) => s.note)
  if (notes.length === 0) return null
  return (
    <ul className="mt-1 space-y-1">
      {notes.map((s) => (
        <li key={s.stepNo} className="flex items-baseline gap-1.5 text-xs text-fg-muted">
          <span
            className={cn(
              'shrink-0 text-2xs font-bold',
              s.passed ? 'text-success' : 'text-fg-subtle',
            )}
          >
            {s.axisCode}
          </span>
          <span className="leading-relaxed">{s.note}</span>
        </li>
      ))}
    </ul>
  )
}

function ReviewRow({ event }: { event: TimelineEvent }) {
  const closed = event.kind === 'REVIEW_CLOSED'
  const label = closed
    ? event.missedConcepts.join(' · ') || '답하지 않은 문항 없음'
    : event.reviewChanges
        .map((c) => `${c.conceptName} ${c.from ?? '―'}단 → ${c.to ?? '―'}단`)
        .join(' · ')
  /* 하나라도 오른 것이 있으면 ↑ — 다시 봤지만 그대로면 －다 */
  const improved = !closed && event.reviewChanges.some((c) => c.improved)

  return (
    <div
      className={cn(
        'flex items-start gap-4 border-t border-border px-5 py-3',
        closed && 'opacity-40',
      )}
    >
      <DateCell label={event.dateLabel} />
      <EventIcon tone="success">
        {improved ? <ArrowUp className="size-3" /> : <Minus className="size-3" />}
      </EventIcon>
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2 text-sm">
        <b className="font-bold">{closed ? '다시 보기 창 마감' : '다시 보기'}</b>
        <span className="text-fg-muted">{label}</span>
        {closed && event.missedConcepts.length > 0 && (
          <span className="rounded-full border border-border px-2 py-0.5 text-2xs text-fg-subtle">
            미응시 {event.missedConcepts.length}건
          </span>
        )}
      </span>
    </div>
  )
}

/**
 * MG-06 리포트 라인 — 펼치면 그 회차 리포트 본문을 그린다(교육생이 보는 것과 같은
 * 내용, 잠금만 없다). `AssessmentRow`와 같은 지연 조회 관례 — 펼칠 때만 부른다.
 */
function ReportRow({
  event,
  traineeId,
  roundId,
}: {
  event: TimelineEvent
  traineeId: string
  roundId: string
}) {
  const [opened, setOpened] = useState(false)
  const report = useManagedTraineeReport(traineeId, roundId, opened)

  const summary = (
    <>
      <b className="font-bold">리포트 발행</b>
      <span className="text-fg-muted">
        {event.reviewTargetCount ? `다시 보기 ${event.reviewTargetCount}건 지정` : '다시 보기 없음'}
      </span>
    </>
  )

  return (
    <details
      className="group/ev border-t border-border"
      onToggle={(e) => setOpened((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-3 marker:content-none hover:bg-surface-2 group-open/ev:bg-primary-soft">
        <DateCell label={event.dateLabel} />
        <EventIcon tone="info">
          <FileOutput className="size-3" />
        </EventIcon>
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2 text-sm">
          {summary}
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
        {report.isPending && <p className="text-2xs text-fg-subtle">리포트를 불러오는 중…</p>}
        {/*
          🔴 **「불러오지 못했습니다」한 줄로 뭉개지 않는다** — 조회 자체가 실패한 것과
          (네트워크·서버 오류) 회차가 아직 리포트를 안 가진 것(생성 중 등)은 다른
          사건이다. 후자는 서버가 준 `status`로 정확히 말할 수 있는데 뭉개면 매니저가
          "장애인가, 기다리면 되는 건가"를 판단할 근거가 없어진다.
        */}
        {report.isError && (
          <p className="flex items-center gap-2 text-2xs text-danger">
            리포트를 불러오지 못했어요 — 네트워크나 서버 오류입니다
            <button
              type="button"
              onClick={() => void report.refetch()}
              className="font-semibold underline underline-offset-2"
            >
              다시 시도
            </button>
          </p>
        )}
        {report.data && report.data.status !== 'PUBLISHED' && (
          <p className="text-2xs text-fg-subtle">{REPORT_STATUS_REASON[report.data.status]}</p>
        )}
        {report.data?.status === 'PUBLISHED' && (
          <>
            {report.data.missingConceptCount > 0 && (
              <p className="mb-2.5 text-2xs text-warning">
                개념 {report.data.missingConceptCount}개는 생성에 실패해 결과가 없습니다
              </p>
            )}
            {report.data.concepts.map((c, i) => (
              <ReportConceptRow key={i} concept={c} />
            ))}
          </>
        )}
      </div>
    </details>
  )
}

/** `RoundReportResponse.status` 표(스펙)를 그대로 옮긴다 — 화면이 새로 판정하지 않는다 */
const REPORT_STATUS_REASON: Record<Exclude<ManagedRoundReport['status'], 'PUBLISHED'>, string> = {
  PENDING_PUBLISH: '이해도 확인까지 마쳤어요 — 리포트는 회차 마감 후 한꺼번에 발행됩니다.',
  /*
    **`PENDING_PUBLISH`와 갈라야 한다**(2026-08-20 추가). 백엔드가 응시 미완료(코드
    제출·분석·이해도 확인 세션 준비/진행 중)를 전부 그쪽으로 보내던 것을 갈라낸 값이라,
    같은 문구를 쓰면 **아직 안 끝난 회차를 「마쳤다」고 말하게 된다.**
    매니저가 이 줄을 보는 이유는 「누구를 챙겨야 하나」라서 그 구분이 곧 행동을 가른다.
  */
  IN_PROGRESS: '아직 응시가 끝나지 않았어요 — 제출·분석·이해도 확인이 진행 중입니다.',
  NOT_STARTED: '아직 응시 기록이 없어요 — 제출 마감 전입니다.',
  NOT_ATTEMPTED: '마감이 지나도록 응시하지 않았어요.',
  VOID_ATTEMPT: '무효 응시로 확인이 필요해요.',
  STOPPED: '세션을 시작했지만 끝내지 못했어요.',
  /** 정상 스펙엔 없는 경우 — 회차 id가 리포트 목록에 아예 없을 때만 */
  NOT_FOUND: '이 회차의 리포트를 찾을 수 없어요.',
}

function ReportConceptRow({ concept }: { concept: ManagedReportConcept }) {
  const [qaOpen, setQaOpen] = useState(false)

  if (!concept.asked) {
    return (
      <div className="mb-2.5 flex items-start gap-1.5 text-xs text-fg-subtle last:mb-0">
        <CircleSlashIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        {concept.name} — 코드에 이 개념이 없어 묻지 못했습니다
      </div>
    )
  }

  return (
    <div className="mb-3 last:mb-0">
      <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
        <span
          className={cn(
            'rounded-[5px] px-1.5 py-0.5 text-[11px]',
            REACH_STYLE[concept.reachedLevel],
          )}
        >
          {concept.reachedLevel}단
        </span>
        {concept.name}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-fg-muted">{concept.said}</p>
      {concept.curriculumRef && (
        <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-info-border bg-info-soft px-2 py-0.5 text-2xs text-info">
          <BookOpenIcon aria-hidden="true" className="size-3 shrink-0" />
          <span>
            교안 {concept.curriculumRef.chapter} · {concept.curriculumRef.pages} ·{' '}
            {concept.curriculumRef.title}
          </span>
        </div>
      )}
      {concept.qa && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => setQaOpen((v) => !v)}
            aria-expanded={qaOpen}
            className="flex items-center gap-1 text-2xs font-semibold text-primary"
          >
            <ChevronRight
              className={cn('size-3 transition-transform', qaOpen && 'rotate-90')}
              aria-hidden="true"
            />
            문답 {concept.qa.length}건 {qaOpen ? '접기' : '보기'}
          </button>
          {qaOpen && (
            <div className="mt-1.5 flex flex-col gap-1.5">
              {concept.qa.map((row, i) => (
                <div key={i} className="rounded-md bg-surface p-2">
                  <p className="text-2xs text-fg-subtle">
                    <span className="font-medium">{row.questionLabel}</span> {row.question}
                  </p>
                  <p className="mt-0.5 text-xs text-fg">{row.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InterviewRow({ event }: { event: TimelineEvent }) {
  const iv = event.interview

  /*
    기록 전(`PENDING`)은 실제로 온다 — 면담 자리는 잡혔는데 아직 안 썼다는 뜻이다.
    작성은 MG-04 소관이라 여기서는 사실만 말한다(§8).
  */
  if (!iv?.recorded) {
    return (
      <div className="flex items-start gap-4 border-t border-border px-5 py-3">
        <DateCell label={event.dateLabel} />
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

  /* 다음에 할 것이 없으면 확인할 약속도 없다 — 미확인 경고를 띄우지 않는다 */
  const unconfirmed = !!iv.nextAction && !iv.nextActionConfirmedAt

  return (
    <details className="group/ev border-t border-border">
      <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-3 marker:content-none hover:bg-surface-2 group-open/ev:bg-primary-soft">
        <DateCell label={event.dateLabel} />
        <EventIcon tone="warning">
          <MessageSquare className="size-3" />
        </EventIcon>
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2 text-sm">
          <b className="font-bold">면담</b>
          <span className="text-fg-muted">{iv.cause ?? iv.note ?? '기록됨'}</span>
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
          <p className="text-xs text-fg">{iv.cause ?? '―'}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-2.5">
          <p className="mb-0.5 text-2xs text-fg-subtle">매니저 기록</p>
          <p className="text-xs text-fg">{iv.note ?? '―'}</p>
        </div>
        <div
          className={cn(
            'rounded-md border p-2.5',
            unconfirmed ? 'border-warning-border bg-warning-soft' : 'border-border bg-surface',
          )}
        >
          <p className="mb-0.5 text-2xs text-fg-subtle">다음에 할 것</p>
          <p className={cn('text-xs', unconfirmed ? 'font-semibold text-warning' : 'text-fg')}>
            {iv.nextAction ?? '―'}
            {iv.nextAction &&
              (unconfirmed
                ? ' — 아직 확인 안 됨'
                : ` — ${iv.nextActionConfirmedAt?.slice(5, 10).replace('-', '.')} 확인`)}
          </p>
        </div>
      </div>
    </details>
  )
}

function EventRow({
  event,
  projectId,
  traineeId,
  roundId,
}: {
  event: TimelineEvent
  projectId: string
  traineeId: string
  roundId: string
}) {
  switch (event.kind) {
    case 'ASSESSMENT':
      return <AssessmentRow event={event} projectId={projectId} traineeId={traineeId} />
    case 'REVIEW':
    case 'REVIEW_CLOSED':
      return <ReviewRow event={event} />
    case 'REPORT':
      return <ReportRow event={event} traineeId={traineeId} roundId={roundId} />
    case 'INTERVIEW':
      return <InterviewRow event={event} />
  }
}

function RoundGroup({
  group,
  badge,
  traineeId,
  filter,
  expanded,
  onToggle,
}: {
  group: TimelineGroup
  badge: RoundBadgeKind | null
  traineeId: string
  filter: EventFilter
  expanded: boolean
  onToggle: () => void
}) {
  /* 서버가 이미 발생 시각 오름차순으로 준다 — 화면이 다시 정렬하지 않는다 */
  const events = group.events.filter((e) => matchesFilter(e.kind, filter))

  return (
    // 선 색으로 구분을 시도했던 것을 사용자 지시로 되돌린다 — 대신 회차 줄(1차~6차)
    // 자체의 배경을 bg-surface-2(#fafbfc, 거의 흰색)에서 bg-border-strong(#cfd4dc,
    // 뚜렷한 회색)으로 올려 탭 영역 자체가 진한 회색 띠로 보이게 한다. 선은 다시
    // 기본값(border-border, 1px)으로 낮춘다 — 배경 자체가 대비를 만드므로 접힌 줄
    // 사이 경계도 옅은 선 하나로 충분히 읽힌다.
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 border-t border-border bg-border-strong px-5 py-2.5 text-left text-sm font-bold first:border-t-0"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 text-fg-subtle" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-3.5 text-fg-subtle" aria-hidden="true" />
        )}
        {group.label}
        {/* bg-border-strong 위에서 fg-subtle(3.39:1)은 AA 본문 기준(4.5:1)에
            못 미친다 — Table.tsx 헤더 셀(bg-surface-2)이 fg-muted를 쓰는 것과
            같은 이유로 여기서도 fg-muted(4.2:1)로 올린다. */}
        <span className="font-normal text-fg-muted">
          {[group.teamName, group.dateRange].filter(Boolean).map((s) => ` · ${s}`)}
        </span>
        {badge && (
          <span className="ml-auto">
            <RoundBadge kind={badge} />
          </span>
        )}
      </button>
      {expanded &&
        events.map((e) => (
          <EventRow
            key={e.id}
            event={e}
            projectId={group.projectId}
            traineeId={traineeId}
            roundId={group.assessmentRoundId}
          />
        ))}
    </div>
  )
}

export function Timeline({
  groups,
  badges,
  traineeId,
}: {
  /** **최신 차수부터** — 서버 순서 그대로다 */
  groups: TimelineGroup[]
  /** 회차 줄에 얹을 배지 — 상세 조회의 회차별 판정을 회차 id로 찾는다 */
  badges: Record<string, RoundBadgeKind | null>
  /** 「자세히」가 채점 근거를 부를 때 쓴다 */
  traineeId: string
}) {
  const [filter, setFilter] = useState<EventFilter>('ALL')
  // 기본값은 전부 펼침(사용자 지시 — 예전엔 최근 2회차만 펼치고 나머지는 접었다).
  // 아래 "모두 열기·모두 닫기"로 직접 조절한다.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  const total = groups.flatMap((g) => g.events).filter((e) => matchesFilter(e.kind, filter)).length
  const allExpanded = collapsed.size === 0
  const allCollapsed = collapsed.size === groups.length

  function toggle(roundId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(roundId)) next.delete(roundId)
      else next.add(roundId)
      return next
    })
  }

  function expandAll() {
    setCollapsed(new Set())
  }

  function collapseAll() {
    setCollapsed(new Set(groups.map((g) => g.assessmentRoundId)))
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold">이력</p>
        <p className="text-xs text-fg-subtle">
          {filter === 'ALL' ? '이벤트' : FILTER_LABEL[filter]} {total}건
        </p>
        {/* 누를 수 없는 컨트롤은 장식이다(E7) — 이미 전부 펼쳐/접혀 있으면 그 버튼은 끈다 */}
        <Button variant="ghost" size="sm" onClick={expandAll} disabled={allExpanded}>
          전체 열기
        </Button>
        <Button variant="ghost" size="sm" onClick={collapseAll} disabled={allCollapsed}>
          전체 닫기
        </Button>
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
            이해도 확인·다시 보기·면담이 생기면 여기에 시간 순으로 쌓입니다.
          </EmptyDescription>
        </Empty>
      ) : total === 0 ? (
        /*
          🔴 **필터에 걸린 것이 없으면 회차 껍데기만 남았다.** 면담이 없는 교육생에게
          `면담` 칩을 누르면 회차 줄 6개가 그대로 있고 그 아래가 전부 비었다 — 「면담 0건」
          이라는 작은 회색 글씨 하나뿐이라 **고장으로 읽힌다**(실측).

          아무것도 없는 회차 줄은 정보가 아니다. 그 자리에 이유를 적는다. 되돌리는 버튼은
          두지 않는다 — 칩이 바로 위에 있고, 규칙 F("고를 수 있는 것만")대로 이미 눌린
          칩이 무엇인지 보인다.
        */
        <Empty>
          <EmptyTitle>
            {FILTER_LABEL[filter as Exclude<EventFilter, 'ALL'>]} 기록이 없어요
          </EmptyTitle>
          <EmptyDescription>
            이 교육생에게는 아직 없습니다. 위에서 <b className="text-fg-muted">전체</b>를 누르면
            다른 기록을 볼 수 있어요.
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          {groups.map((g) => (
            <RoundGroup
              key={g.assessmentRoundId}
              group={g}
              badge={badges[g.assessmentRoundId] ?? null}
              traineeId={traineeId}
              filter={filter}
              expanded={!collapsed.has(g.assessmentRoundId)}
              onToggle={() => toggle(g.assessmentRoundId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
