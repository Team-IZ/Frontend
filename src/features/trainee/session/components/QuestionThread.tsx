import { cn } from '@/lib/utils/cn'
import type { AnsweredTurn, SessionMode, TurnScript } from '../types'

type Props = {
  mode: SessionMode
  answeredTurns: AnsweredTurn[]
  /** null이면 문제가 끝났다 — 대기 인디케이터만 그린다(WAITING_NEXT) */
  currentTurn: TurnScript | null
  waiting: boolean
  /** 지금까지 쓴 힌트 횟수 — 힌트마다 자기 버블을 갖는다(하나로 갈아끼우지 않는다) */
  hintUsed: 0 | 1 | 2
}

/*
  질문·답변이 누적되는 대화 스레드 — 실제 채팅처럼 좌(시스템 질문)/우(내 답변)로
  갈라야 한다는 지적을 반영해 목업 `.qb`/`.ab`/`.again` 색·모양을 그대로 옮긴다.

  - 질문(.qb): 흰 배경 · 얇은 테두리 · 좌상단만 각짐(rounded-tl-sm) · 왼쪽 정렬
  - 내 답변(.ab): primary-soft 배경 · primary 테두리 · 우상단만 각짐 · 오른쪽 정렬(ml-auto)
  - 힌트(.again): info-soft 배경 · info 테두리 · 질문 바로 아래, 힌트 2회를 쓰면
    같은 자리를 갈아끼우는 게 아니라 각 힌트가 자기 버블로 쌓인다.

  문제가 끝날 때까지 지워지지 않는다(정의서 §3 "코드는 문제 내내 고정, 대화만 아래로
  흐른다"). 다시 보기는 1차 답변을 보여주지 않으므로 애초에 answeredTurns가 비어
  있는 채로 들어온다.
*/
export default function QuestionThread({
  mode,
  answeredTurns,
  currentTurn,
  waiting,
  hintUsed,
}: Props) {
  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="flex flex-col gap-4">
        {answeredTurns.map((turn, i) => (
          <div key={i} className="flex flex-col gap-2">
            <QuestionBubble mode={mode} index={i} question={turn.question} refText={turn.ref} />
            <AnswerBubble>{turn.answer}</AnswerBubble>
          </div>
        ))}

        {currentTurn && (
          <div className="flex flex-col gap-2">
            <QuestionBubble
              mode={mode}
              index={answeredTurns.length}
              question={currentTurn.question}
              refText={currentTurn.ref}
              active
            />
            {currentTurn.hintTexts.slice(0, hintUsed).map((text, i) => (
              <HintBubble key={i}>{text}</HintBubble>
            ))}
          </div>
        )}

        {waiting && (
          <div className="ml-1 flex items-center gap-2 text-sm text-fg-subtle">
            <span className="flex gap-0.5">
              <Dot /> <Dot /> <Dot />
            </span>
            다음 질문을 준비하고 있어요
          </div>
        )}
      </div>
    </div>
  )
}

function Dot() {
  return <span className="inline-block size-1.5 animate-pulse rounded-full bg-fg-subtle" />
}

function QuestionBubble({
  mode,
  index,
  question,
  refText,
  active,
}: {
  mode: SessionMode
  index: number
  question: string
  refText: string
  active?: boolean
}) {
  const label = mode === 'RETRY' ? '지난번에 막혔던 질문' : `질문 ${index + 1}`
  return (
    <div
      className={cn(
        'max-w-[94%] rounded-md rounded-tl-sm border bg-surface p-4 text-sm leading-relaxed',
        active ? 'border-primary-border shadow-[0_1px_2px_rgba(58,77,184,0.10)]' : 'border-border',
      )}
    >
      <div className="mb-1.5 text-xs font-bold text-primary">◆ {label}</div>
      {question}
      <div className="mt-2 inline-block font-mono text-[11px] text-fg-subtle">↳ {refText}</div>
    </div>
  )
}

function AnswerBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-auto max-w-[86%] rounded-md rounded-tr-sm border border-primary-border bg-primary-soft px-4 py-3 text-sm leading-relaxed text-fg">
      <div className="mb-1 text-xs text-fg-subtle">내 답변</div>
      {children}
    </div>
  )
}

function HintBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[94%] rounded-md border border-info-border bg-info-soft px-4 py-3 text-sm leading-relaxed">
      <div className="mb-1 text-xs font-bold text-info">다시 설명하면</div>
      {children}
    </div>
  )
}
