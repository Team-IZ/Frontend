import { ChevronRightIcon, ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { parseRefLines } from '../parseRefLines'
import type { Concept } from '../types'

type Props = {
  problem: Concept
  highlightRef: string
  dimmed: boolean
  callersExpanded: boolean
  onToggleCallers: () => void
}

/*
  코드는 문제 내내 고정(sticky)이고, 하이라이트만 질문마다 옮겨간다(정의서 §3). 목업은
  실제 코드 에디터처럼 코드 텍스트 블록만 어둡게 그린다(패널 자체는 흰 면) — GitHub·
  Linear 등에서 이미 익숙한 "코드 블록은 다크"라 여기서도 그대로 따른다(문법 강조
  색상까지는 안 만든다 — 지금 질문의 핵심은 "이 줄을 보라"는 신호이지 문법 분류가
  아니다). 하이라이트는 좌측 강조 바(border-l)를 쓴다 — 카드·리스트를 장식하는
  사이드 스트라이프가 아니라 diff 뷰어처럼 "이 줄이 지금 화제"라는 실제 신호다.
*/
export default function CodePane({
  problem,
  highlightRef,
  dimmed,
  callersExpanded,
  onToggleCallers,
}: Props) {
  const highlighted = parseRefLines(highlightRef)

  return (
    <div className={dimmed ? 'flex h-full flex-col opacity-45' : 'flex h-full flex-col'}>
      <div className="flex items-baseline gap-2 border-b border-border px-4 py-3">
        <span className="font-semibold text-fg">{problem.name}</span>
        <span className="font-mono text-xs text-fg-subtle">{problem.file}</span>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <pre className="h-full overflow-auto rounded-md bg-code py-3 font-mono text-sm leading-relaxed text-code-fg">
          {problem.code.map((row) => (
            <div
              key={row.line}
              className={cn(
                'px-4',
                highlighted.has(row.line) && 'border-l-2 border-primary bg-primary/34',
                row.gap && 'text-code-dim',
              )}
            >
              <span className="mr-3 inline-block w-6 text-right text-code-dim select-none">
                {row.line}
              </span>
              {row.text}
            </div>
          ))}
        </pre>
      </div>
      {/*
        접었을 때 스니펫 첫 줄을 버튼 안에 미리 보여주던 것을 뺐다 — 그 줄이 길면
        버튼(=한 줄 flex)이 통째로 늘어나 코드 영역을 밀어냈다(실사용 피드백으로 발견).
        접힘 상태는 "지금 안 보인다"만 말하면 되고, 내용은 열어서 본다.
      */}
      <button
        type="button"
        onClick={onToggleCallers}
        className="flex shrink-0 items-center gap-1.5 border-t border-border px-4 py-2 text-left text-xs text-fg-subtle hover:text-fg"
      >
        {callersExpanded ? (
          <ChevronDownIcon className="size-3.5 shrink-0" />
        ) : (
          <ChevronRightIcon className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{problem.callers.label}</span>
      </button>
      {/* max-h로 상한을 둔다 — 스니펫이 길어도 코드 영역을 잠식하지 않는다 */}
      {callersExpanded && (
        <pre className="max-h-32 shrink-0 overflow-auto border-t border-border bg-surface-2 p-3 font-mono text-xs text-fg-muted whitespace-pre-wrap">
          {problem.callers.snippet}
        </pre>
      )}
    </div>
  )
}
