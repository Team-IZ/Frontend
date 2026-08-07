import { AlertTriangle, Clock, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ResolvedHistoryItem } from '../mockData'

/** 처리됨 펼침 줄 — 목업 `.it.did`. 액션이 없고 전부 55% 흐림(정의서 §6) */

const KIND_LABEL: Record<ResolvedHistoryItem['kind'], string> = {
  INTERVIEW: '면담',
  ABSENT: '미응시',
  INVALID: '무효 응시',
}

const KIND_ICON: Record<ResolvedHistoryItem['kind'], typeof Clock> = {
  INTERVIEW: PenLine,
  ABSENT: Clock,
  INVALID: AlertTriangle,
}

export default function ResolvedRow({ item }: { item: ResolvedHistoryItem }) {
  const Icon = KIND_ICON[item.kind]
  return (
    <div className="bg-surface-2 flex items-center gap-3 border-t border-border px-5 py-3 opacity-55">
      <span
        className={cn(
          'bg-surface border-border text-fg-subtle flex size-6 shrink-0 items-center justify-center rounded-full border',
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="w-[92px] shrink-0 text-sm font-bold">{KIND_LABEL[item.kind]}</span>
      <span className="flex w-[130px] shrink-0 items-baseline gap-1.5 text-sm">
        <span className="font-bold">{item.name}</span>
        <span className="text-fg-subtle text-2xs">{item.className}</span>
      </span>
      <span className="text-fg-muted min-w-0 flex-1 text-sm">
        <b className="text-fg font-bold">{item.roundLabel}</b>
        {item.nextAction && <> · 다음에 할 것 — &quot;{item.nextAction}&quot;</>}
        {item.resultNote && <> · {item.resultNote}</>}
      </span>
      <span className="text-fg-subtle shrink-0 text-xs font-semibold whitespace-nowrap">
        {item.doneFlag}
      </span>
    </div>
  )
}
