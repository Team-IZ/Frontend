import { useEffect, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils/cn'
import type { CurrentQuestion, Turn } from '../_/api/types'
import type { Level, SessionMode } from '../types'

type Props = {
  mode: SessionMode
  /** 이 문제에서 이미 답이 끝난 턴들. 같은 질문에 여러 번 답했으면 여러 줄로 온다 */
  turns: Turn[]
  /** 지금 답해야 하는 질문. 문제가 닫혔으면 `null` */
  current: CurrentQuestion | null
  /** 방금 보낸 답변 — 채점이 끝나기 전까지 자리를 지킨다 */
  pendingAnswer: string | null
  waiting: boolean
  /** 무엇을 기다리는지 — 답변 채점과 힌트가 다르다 */
  waitingLabel: string
}

/*
  질문·답변이 누적되는 대화 스레드.

  - 질문(.qb): 흰 배경 · 얇은 테두리 · 좌상단만 각짐 · 왼쪽 정렬
  - 내 답변(.ab): primary-soft · 우상단만 각짐 · 오른쪽 정렬
  - 힌트(.again): info-soft · 왼쪽 정렬

  문제가 끝날 때까지 지워지지 않는다(정의서 §3 "코드는 문제 내내 고정, 대화만 아래로 흐른다").

  ## 서버 턴을 질문 단위로 묶는다

  **한 질문에 여러 번 답할 수 있다.** 미달이면 힌트가 열리고 같은 질문에 다시 답하는데
  (`RETRY_WITH_HINT`), 서버는 그 시도들을 각각 한 턴으로 준다 — `sequenceNo`가 같다.
  그대로 그리면 **같은 질문이 세 번 나온다.** 순번으로 묶어 질문은 한 번만 그리고 그
  아래에 답변·힌트를 시간순으로 쌓는다.

  힌트가 답변보다 먼저 오기도 하고 나중에 오기도 한다 — 버튼으로 먼저 열면 `힌트 →
  답변`이고 미달로 열리면 `답변 → 힌트`다. 서버의 `hintText`가 **그 턴 직전에 보여준
  힌트**라 이 순서가 이미 정해져 있다: 힌트를 먼저 붙이고 답변을 붙이면 맞는다.
*/
export default function QuestionThread({
  mode,
  turns,
  current,
  pendingAnswer,
  waiting,
  waitingLabel,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const groups = useMemo(() => groupByQuestion(turns, current), [turns, current])

  /*
    새 질문·답변·힌트가 붙으면 **맨 아래로 따라간다.** 대화가 길어지면 새로 온 것이
    보이는 영역 밖으로 밀려나는데, 이 화면은 스크롤바가 코드 패널·대화 패널 두 곳이라
    학생이 어느 쪽을 내려야 하는지도 바로 안 보인다(실사용 피드백으로 발견).

    **앵커에 `scrollIntoView`를 쓰지 않는다.** 그 방식은 ① 컨테이너의 아래쪽 padding
    만큼 덜 내려가고(실측 15px) ② 조상 스크롤 컨테이너까지 함께 움직일 수 있다 —
    전체화면 레이아웃에서는 그게 화면 전체를 밀어 버린다. 이 패널만 직접 내린다.

    `behavior: 'smooth'`도 안 쓴다 — 답변 직후 눈이 입력칸으로 돌아가야 하는데 화면이
    천천히 흐르면 그 시선을 붙잡는다.
  */
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns.length, current?.shownHints.length, pendingAnswer, waiting])

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto p-4">
      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g.sequenceNo} className="flex flex-col gap-2">
            <QuestionBubble
              mode={mode}
              level={levelOf(g.sequenceNo)}
              question={g.questionText}
              refText={g.refText}
              active={g.active}
            />
            {g.items.map((item, i) =>
              item.kind === 'answer' ? (
                <AnswerBubble key={i}>{item.text}</AnswerBubble>
              ) : (
                <HintBubble key={i}>{item.text}</HintBubble>
              ),
            )}
            {/* 방금 보낸 답변은 채점 전이라 서버에 없다 — 보낸 자리를 비워 두지 않는다 */}
            {g.active && pendingAnswer && <AnswerBubble>{pendingAnswer}</AnswerBubble>}
          </div>
        ))}

        {waiting && (
          <div className="ml-1 flex items-center gap-2 text-sm text-fg-subtle">
            <span className="flex gap-0.5">
              <Dot /> <Dot /> <Dot />
            </span>
            {waitingLabel}
          </div>
        )}
      </div>
    </div>
  )
}

type Item = { kind: 'answer' | 'hint'; text: string }
type Group = {
  sequenceNo: number
  questionText: string
  refText: string
  items: Item[]
  active: boolean
}

/**
 * 턴들을 질문 순번으로 묶고, 지금 질문을 마지막에 붙인다.
 *
 * 지금 질문의 순번이 이미 턴에 있으면(= 미달로 다시 답하는 중) **새 그룹을 만들지 않고
 * 그 그룹을 잇는다.** 안 그러면 같은 질문이 두 번 그려진다.
 */
function groupByQuestion(turns: Turn[], current: CurrentQuestion | null): Group[] {
  const groups: Group[] = []
  const byNo = new Map<number, Group>()

  for (const t of turns) {
    let g = byNo.get(t.sequenceNo)
    if (!g) {
      g = {
        sequenceNo: t.sequenceNo,
        questionText: stripAxis(t.questionText),
        refText: refTextOf(t.highlight),
        items: [],
        active: false,
      }
      byNo.set(t.sequenceNo, g)
      groups.push(g)
    }
    // 힌트가 먼저다 — `hintText`는 **이 답변 직전에** 보여준 것이다
    if (t.hintText) g.items.push({ kind: 'hint', text: t.hintText })
    g.items.push({ kind: 'answer', text: t.answerText })
  }

  if (current) {
    const g = byNo.get(current.sequenceNo)
    const shown = current.shownHints.map((text) => ({ kind: 'hint' as const, text }))
    if (g) {
      g.active = true
      // 이미 턴에 붙은 힌트는 빼고 아직 답하지 않은 것만 잇는다
      const already = g.items.filter((i) => i.kind === 'hint').length
      g.items.push(...shown.slice(already))
    } else {
      groups.push({
        sequenceNo: current.sequenceNo,
        questionText: stripAxis(current.questionText),
        refText: refTextOf(current.highlight),
        items: shown,
        active: true,
      })
    }
  }

  return groups
}

/*
  질문 원문에서 **축 접두어를 떼어 낸다.**

  서버가 `[L1] Optional을 활용한…`처럼 붙여 보내는 경우가 있다(실측 — 계정에 따라
  갈린다). 라벨을 `질문 N`으로 바꿔 축을 숨겨 놓고 본문이 `L1`이라고 말하면 소용이 없다.

  맨 앞에 붙어 있을 때만 뗀다. 문장 중간의 `[L1]`은 그대로 둔다 — 서버 문구를 화면이
  고쳐 쓰는 것이 아니라 라벨만 걷어내는 것이다.
*/
const stripAxis = (text: string) => text.replace(/^\s*\[L[1-4]\]\s*/, '')

const refTextOf = (h: { path: string; lineStart: number; lineEnd: number }) =>
  h.lineStart === h.lineEnd
    ? `${fileOf(h.path)}:${h.lineStart}`
    : `${fileOf(h.path)}:${h.lineStart}–${h.lineEnd}`

/** 경로 전체는 길어 말풍선을 두 줄로 만든다 — 파일 이름만 남긴다 */
const fileOf = (path: string) => path.split('/').pop() ?? path

/** 질문은 L1부터 순서대로다 — 순번이 곧 단계다. 범위를 벗어나면 마지막 단계로 접는다 */
const levelOf = (sequenceNo: number): Level =>
  (sequenceNo >= 1 && sequenceNo <= 4 ? sequenceNo : 4) as Level

function Dot() {
  return <span className="inline-block size-1.5 animate-pulse rounded-full bg-fg-subtle" />
}

/*
  라벨은 **순번뿐이다.** 한동안 단계 이름(`코드 이해`·`설계 논리`·`대안 비교`·`반례 대응`)을
  보여줬는데, 그 이름 자체가 **무엇을 답해야 하는지 알려주는 힌트**다 — `대안 비교`라고
  적혀 있으면 질문을 안 읽어도 다른 방법과 비교하면 된다는 것을 안다.

  응시 중에는 숨기고, 어느 축에서 막혔는지는 **리포트에서** 알려준다. 그게 이 제품이
  축을 나눠 둔 이유이기도 하다.

  점수도 절대 안 보인다(A5).
*/

function QuestionBubble({
  mode,
  level,
  question,
  refText,
  active,
}: {
  mode: SessionMode
  level: Level
  question: string
  refText: string
  active?: boolean
}) {
  const label = mode === 'REVIEW' ? `다시 보기 · 질문 ${level}` : `질문 ${level}`
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
