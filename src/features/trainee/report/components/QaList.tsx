import { ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import type { ConceptAttempt } from '../types'

/*
  질문·답변이 같은 회색 박스에 같은 굵기로 쌓이면 뭘 먼저 읽어야 할지 안 보인다
  (실사용 피드백으로 발견) — 질문은 맥락이라 작고 옅게, 내 답변은 실제로 읽어야 할
  내용이라 라벨을 따로 얹고 본문 대비를 올렸다.

  토글 버튼은 원래 맨 텍스트라 눌러야 하는 요소로 안 읽혔다(실사용 피드백으로 발견)
  — 배경·테두리를 얹어 "행"으로 만들고, 회전하는 화살표(아코디언 관용구)로 지금
  열림/닫힘 상태를 즉시 보이게 한다.

  ## 재시험을 봤으면 두 벌이 된다
  **처음 것이 위, 다시 본 것이 아래다.** 원점수가 정본이라 그것을 먼저 읽어야 하고,
  시간 순서도 그렇다. 구분선과 라벨로 어느 쪽인지 말한다 — 안 그러면 같은 개념에
  질문이 두 배로 늘어난 것처럼 보인다.
*/
export default function QaList({
  first,
  retry,
}: {
  first: ConceptAttempt
  retry?: ConceptAttempt
}) {
  const [open, setOpen] = useState(false)
  const total = first.qa.length + (retry?.qa.length ?? 0)

  return (
    <div className="mt-3 border-t border-border pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-fg-subtle transition-colors hover:border-border-strong hover:bg-canvas hover:text-fg"
      >
        <ChevronRightIcon
          aria-hidden="true"
          className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-90')}
        />
        <span className="flex-1 text-left">
          내 답변 <span className="text-fg-subtle">{total}개</span>
        </span>
        <span className="text-xs">{open ? '접기' : '펼치기'}</span>
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-3">
          {retry && <AttemptLabel>처음 봤을 때</AttemptLabel>}
          <QaGroup attempt={first} />
          {retry && (
            <>
              <AttemptLabel>다시 봤을 때</AttemptLabel>
              <QaGroup attempt={retry} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function AttemptLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-fg-subtle">
      {children}
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  )
}

function QaGroup({ attempt }: { attempt: ConceptAttempt }) {
  return (
    <>
      {attempt.qa.map((row, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-md bg-surface-2 p-3">
          <p className="text-xs text-fg-subtle">
            <span className="font-medium">{row.questionLabel}</span> {row.question}
          </p>
          <div>
            <div className="mb-0.5 text-xs font-semibold text-fg-subtle">내 답변</div>
            <p className="text-sm leading-relaxed text-fg">{row.answer}</p>
          </div>
        </div>
      ))}
    </>
  )
}
