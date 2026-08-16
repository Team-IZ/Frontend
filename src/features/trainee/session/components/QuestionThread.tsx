import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils/cn'
import type { AnsweredQuestion, Question, SessionMode, ThreadItem } from '../types'

type Props = {
  mode: SessionMode
  /** 이 개념에서 답이 끝난 질문들 */
  answered: AnsweredQuestion[]
  /** null이면 채점 대기 중이다 */
  currentQuestion: Question | null
  /** 지금 질문의 타임라인 — 답변·힌트가 섞여 있다 */
  current: ThreadItem[]
  waiting: boolean
}

/*
  질문·답변이 누적되는 대화 스레드.

  - 질문(.qb): 흰 배경 · 얇은 테두리 · 좌상단만 각짐 · 왼쪽 정렬
  - 내 답변(.ab): primary-soft · 우상단만 각짐 · 오른쪽 정렬
  - 힌트(.again): info-soft · 왼쪽 정렬

  **한 질문 아래 답변이 여러 개 쌓인다.** 한 단계에서 최대 세 번 답하고 그 사이에 힌트가
  끼기 때문이다(types.ts `ThreadItem` 주석). 답변 배열과 힌트 배열을 따로 두지 않고
  타임라인 하나를 순서대로 그리므로, 버튼으로 먼저 받은 힌트든 미달로 받은 힌트든
  실제로 일어난 순서 그대로 보인다.

  개념이 끝날 때까지 지워지지 않는다(정의서 §3 "코드는 개념 내내 고정, 대화만 아래로 흐른다").
*/
export default function QuestionThread({
  mode,
  answered,
  currentQuestion,
  current,
  waiting,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  /*
    새 질문·답변·힌트가 붙으면 **맨 아래로 따라간다.** 대화가 길어지면 새로 온 것이
    보이는 영역 밖으로 밀려나는데, 이 화면은 스크롤바가 코드 패널·대화 패널 두 곳이라
    학생이 어느 쪽을 내려야 하는지도 바로 안 보인다(실사용 피드백으로 발견).

    **앵커에 `scrollIntoView`를 쓰지 않는다.** 그 방식은 ① 컨테이너의 아래쪽 padding
    만큼 덜 내려가고(실측 15px) ② 조상 스크롤 컨테이너까지 함께 움직일 수 있다 —
    전체화면 레이아웃에서는 그게 화면 전체를 밀어 버린다. 이 패널만 직접 내린다.

    `behavior: 'smooth'`도 안 쓴다 — 답변 직후 눈이 입력칸으로 돌아가야 하는데 화면이
    천천히 흐르면 그 시선을 붙잡는다.

    의존성이 셋인 이유: 답이 끝난 질문(answered)·지금 질문의 타임라인(current)·
    대기 인디케이터(waiting)가 각각 따로 늘어난다.
  */
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [answered.length, current.length, waiting])

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto p-4">
      <div className="flex flex-col gap-4">
        {answered.map((q, i) => (
          <div key={i} className="flex flex-col gap-2">
            <QuestionBubble mode={mode} level={q.level} question={q.text} refText={q.ref} />
            <Timeline items={q.items} />
          </div>
        ))}

        {currentQuestion && (
          <div className="flex flex-col gap-2">
            <QuestionBubble
              mode={mode}
              level={currentQuestion.level}
              question={currentQuestion.text}
              refText={currentQuestion.ref}
              active
            />
            <Timeline items={current} />
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

function Timeline({ items }: { items: ThreadItem[] }) {
  return (
    <>
      {items.map((item, i) =>
        item.kind === 'answer' ? (
          <AnswerBubble key={i}>{item.text}</AnswerBubble>
        ) : (
          <HintBubble key={i}>{item.text}</HintBubble>
        ),
      )}
    </>
  )
}

function Dot() {
  return <span className="inline-block size-1.5 animate-pulse rounded-full bg-fg-subtle" />
}

/*
  라벨이 `질문 N`이 아니라 **단계 이름**이다 — 질문 하나가 단계 하나이고, 학생이 지금
  어느 깊이에 있는지가 순번보다 쓸모 있다. 점수는 절대 안 보인다(A5).
*/
const LEVEL_LABEL = {
  1: '코드 이해',
  2: '설계 논리',
  3: '대안 비교',
  4: '반례 대응',
} as const

function QuestionBubble({
  mode,
  level,
  question,
  refText,
  active,
}: {
  mode: SessionMode
  level: 1 | 2 | 3 | 4
  question: string
  refText: string
  active?: boolean
}) {
  const label = mode === 'REVIEW' ? `다시 보기 · ${LEVEL_LABEL[level]}` : LEVEL_LABEL[level]
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
