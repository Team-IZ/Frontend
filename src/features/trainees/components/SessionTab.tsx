import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import type { SessionDataPoint, SessionRound } from '../mockData'

/*
  세션(근거 흡수) — DP별 접힘 카드. 펼치면 질답 전문 + 근거 구간(ENG-01, 별도 탭
  아님). 접힘·펼침은 네이티브 <details>/<summary>를 쓴다 — 별도 상태·ARIA 없이
  키보드로 바로 열고 닫힌다.
*/
const UNDERSTANDING_LABEL = { solid: '견고', partial: '부분', surface: '표면' } as const
const UNDERSTANDING_VARIANT = { solid: 'success', partial: 'warning', surface: 'danger' } as const
const LEVELS = ['L1', 'L2', 'L3'] as const

function Pips({ dp }: { dp: SessionDataPoint }) {
  return (
    <span className="flex gap-1" aria-hidden="true">
      {LEVELS.map((level) => {
        const broke = dp.brokeAt === level
        const done = dp.depthReached.includes(level)
        return (
          <span
            key={level}
            className={cn(
              'inline-flex h-5 w-6 items-center justify-center rounded-[5px] text-[10px] font-bold',
              broke && 'bg-danger-soft text-danger',
              !broke && done && 'bg-success-soft text-success',
              !broke && !done && 'bg-surface-2 text-fg-subtle',
            )}
          >
            {level}
          </span>
        )
      })}
    </span>
  )
}

function DpCard({ dp }: { dp: SessionDataPoint }) {
  return (
    <details
      className={cn(
        'mb-2 overflow-hidden rounded-md border border-border bg-surface',
        dp.understanding === 'surface' && 'border-danger-border',
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:content-none">
        <span className="flex-1 text-sm font-semibold">{dp.topic}</span>
        <span className="font-mono text-[11px] text-primary">{dp.ref}</span>
        <Pips dp={dp} />
        <Badge variant={UNDERSTANDING_VARIANT[dp.understanding]}>
          {UNDERSTANDING_LABEL[dp.understanding]}
        </Badge>
      </summary>
      <div className="border-t border-border bg-surface-2 p-4">
        {dp.turn ? (
          <div>
            <p className="text-sm font-semibold">{dp.turn.question}</p>
            <p className="mt-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg-muted">
              {dp.turn.answer}
            </p>
            <p className="mt-1 text-[11px] text-fg-subtle">
              ↳ <b className="text-fg-muted">{dp.turn.evidenceNote}</b>
            </p>
          </div>
        ) : (
          <p className="text-sm text-fg-subtle">질문·답변 전문 없음(D-3).</p>
        )}
      </div>
    </details>
  )
}

export function SessionTab({ sessions }: { sessions: SessionRound[] }) {
  const [round, setRound] = useState(sessions.at(-1)?.round ?? 1)
  const current = sessions.find((s) => s.round === round)

  if (sessions.length === 0) {
    return (
      <Empty>
        <EmptyTitle>세션 전문 없음</EmptyTitle>
        <EmptyDescription>이 교육생의 세션 데이터가 아직 없습니다(D-3).</EmptyDescription>
      </Empty>
    )
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-fg-muted">
        <Select
          value={String(round)}
          onValueChange={(v) => setRound(Number(v))}
          items={Object.fromEntries(sessions.map((s) => [String(s.round), `${s.round}회차`]))}
        >
          <SelectTrigger className="h-9 min-w-28" aria-label="회차 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sessions.map((s) => (
              <SelectItem key={s.round} value={String(s.round)}>
                {s.round}회차
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {current && (
          <span className="text-xs text-fg-subtle">
            질문 {current.questionBudget}개(회차 설정값 · SC-M03) · 소요 {current.durationMin}분
          </span>
        )}
        <span className="ml-auto flex flex-wrap gap-4 text-[11px] text-fg-subtle">
          <span>
            <b className="text-fg-muted">도달 depth</b> L1 기본 › L2 대안 › L3 반례 (멈춘 곳)
          </span>
          <span className="flex items-center gap-1.5">
            <b className="text-fg-muted">이해</b>
            <Badge variant="success">견고</Badge>
            <Badge variant="warning">부분</Badge>
            <Badge variant="danger">표면</Badge>
          </span>
        </span>
      </div>

      {current?.dataPoints.map((dp) => (
        <DpCard key={dp.id} dp={dp} />
      ))}

      <p className="mt-2 text-[11px] text-fg-subtle">
        · depth는 적응형: 견고하면 조기 종료, 약하면 심화. 표면 지점이 경고색으로 튀어 "어디서
        막혔나"를 즉시 스캔할 수 있다. 판정·근거는 매니저 전용(교육생 비노출).
      </p>
    </div>
  )
}
