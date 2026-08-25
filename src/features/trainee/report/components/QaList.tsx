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
/** 다시 본 문답은 라벨에 접두어가 붙어 온다 — `다시 보기 · L1 질문` */
const REVIEW_PREFIX = '다시 보기 · '

export default function QaList({ entries }: { entries: QaEntry[] }) {
  /*
    🔴 **1차와 다시 보기를 한 목록에 쌓지 않는다.**

    한때 다시 본 문답을 뒤에 이어 붙이고 라벨 접두어로만 갈랐는데, 펼치면 같은 축의
    질문이 두 번씩 나오면서 **어디까지가 1차인지 경계가 안 보였다**(실사용 피드백).
    응시 자체가 두 번이므로 목록도 둘이어야 한다 — 각자 접고 펼친다.
  */
  const first = entries.filter((e) => !e.questionLabel.startsWith(REVIEW_PREFIX))
  const again = entries.filter((e) => e.questionLabel.startsWith(REVIEW_PREFIX))

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-2">
      {first.length > 0 && <QaGroup label="내 답변" entries={first} />}
      {again.length > 0 && <QaGroup label="다시 보기 답변" entries={again} tone="info" />}
    </div>
  )
}

function QaGroup({
  label,
  entries,
  tone = 'default',
}: {
  label: string
  entries: QaEntry[]
  /** 다시 보기 묶음은 파란 테두리로 갈라 둔다 — 같은 회색이면 형제로 보인다 */
  tone?: 'default' | 'info'
}) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        /*
          **누르는 것**이라 흰 면 + 테두리로 둔다. 위의 교안 알약(info 톤)과 색으로도
          형태로도 갈린다 — 예전엔 둘 다 회색 면이라 형제처럼 보였다(실사용 피드백).
        */
        className={cn(
          'flex w-full items-center gap-2 rounded-md border bg-surface px-3 py-2 text-sm transition-colors hover:bg-surface-2 hover:text-fg',
          tone === 'info'
            ? 'border-info-border text-info hover:border-info'
            : 'border-border text-fg-muted hover:border-border-strong',
        )}
      >
        <ChevronRightIcon
          aria-hidden="true"
          className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-90')}
        />
        <span className="flex-1 text-left">
          {label} <span className="text-fg-subtle">{entries.length}개</span>
        </span>
        <span className="text-xs">{open ? '접기' : '펼치기'}</span>
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {entries.map((row, i) => (
            <div key={i} className="overflow-hidden rounded-md border border-border">
              <div className="bg-surface px-3 py-2.5">
                <div className="mb-1 text-xs font-bold text-primary">
                  {row.questionLabel.replace(REVIEW_PREFIX, '')}
                </div>
                <p className="text-sm leading-relaxed text-fg-muted">{row.question}</p>
              </div>
              {/*
                답변은 **회색 면**이다. 한때 `primary-soft`(파랑)로 뒀는데 카드 위쪽
                「어디서 막혔나」 해설 박스가 이미 그 색이라 둘이 형제로 보였다
                (실사용 피드백: *"배경색 같아서 헷갈린다"*). 질문(흰 면)과는 명도로 갈린다.
              */}
              <div className="border-t border-border bg-surface-2 px-3 py-2.5">
                <div className="mb-1 text-xs font-medium text-fg-subtle">내 답변</div>
                <p className="text-sm leading-relaxed text-fg">{row.answer}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
