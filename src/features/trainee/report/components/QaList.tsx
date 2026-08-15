import { ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import type { QaEntry } from '../_/api/types'

/*
  질문·답변이 같은 회색 박스에 같은 굵기로 쌓이면 뭘 먼저 읽어야 할지 안 보인다
  (실사용 피드백으로 발견) — 질문은 맥락이라 작고 옅게, 내 답변은 실제로 읽어야 할
  내용이라 라벨을 따로 얹고 본문 대비를 올렸다.

  토글 버튼은 원래 맨 텍스트라 눌러야 하는 요소로 안 읽혔다(실사용 피드백으로 발견)
  — 배경·테두리를 얹어 "행"으로 만들고, 회전하는 화살표(아코디언 관용구)로 지금
  열림/닫힘 상태를 즉시 보이게 한다.

  ## 한 벌이다
  목은 재시험 문답을 따로 쌓았는데 **서버는 문답을 한 벌로만 준다** — 다시 본 결과는
  전후 도달 단계(`comparedReach`)로 오고 카드 배지 옆에서 말한다. 질문과 힌트가 같은
  배열에 섞여 오고 `questionLabel`이 어느 쪽인지 알려준다(`L3 질문` · `L3 힌트 1`).
*/
export default function QaList({ entries }: { entries: QaEntry[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-3 border-t border-border pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        /*
          **누르는 것**이라 흰 면 + 테두리로 둔다. 위의 교안 알약(info 톤)과 색으로도
          형태로도 갈린다 — 예전엔 둘 다 회색 면이라 형제처럼 보였다(실사용 피드백).
        */
        className="flex w-full items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg-muted transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-fg"
      >
        <ChevronRightIcon
          aria-hidden="true"
          className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-90')}
        />
        <span className="flex-1 text-left">
          내 답변 <span className="text-fg-subtle">{entries.length}개</span>
        </span>
        <span className="text-xs">{open ? '접기' : '펼치기'}</span>
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-3">
          {entries.map((row, i) => (
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
        </div>
      )}
    </div>
  )
}
