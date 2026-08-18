import { ChevronRightIcon, ChevronDownIcon } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils/cn'
import type { CodePane as Code, Highlight } from '../_/api/types'

type Props = {
  title: string
  code: Code
  /** 지금 질문이 가리키는 구간. 질문마다 옮겨간다 */
  highlight: Highlight | null
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

  ## 서버는 줄 배열이 아니라 **파일 전체**를 준다

  목은 `{ line, text }[]`를 들고 있었지만 서버의 `snippet`은 **문제를 낸 파일 전체**다
  (스펙 원문). 그래서 **첫 줄이 파일 1번 줄이다.**

  ⚠️ `code.lineStart`는 스니펫이 시작하는 줄이 **아니다** — 스펙이 *"강조할 구간 시작
  (파일 기준 절대 줄 번호)"* 이라고 적어 두었다. 그것을 시작 줄로 오해해 번호를 매겼더니
  243줄짜리 실제 파일에서 **모든 줄이 47칸 밀렸다**(실측). 번호는 1부터 매긴다.
*/
export default function CodePane({
  title,
  code,
  highlight,
  dimmed,
  callersExpanded,
  onToggleCallers,
}: Props) {
  const lines = useMemo(() => toLines(code), [code])
  const callers = useMemo(() => callerBlocks(code, lines), [code, lines])

  /*
    **강조된 줄로 데려간다.** 파일 전체가 오므로 실제로 243줄짜리가 온다(실측) —
    질문이 가리키는 곳이 화면 밖에 있으면 학생이 스크롤로 찾아야 하고, 그 시간이
    첫 타이핑 지연으로 기록된다.

    질문이 바뀔 때마다 다시 맞춘다. `scrollIntoView`가 아니라 이 패널만 직접 움직인다 —
    전체화면 레이아웃에서 조상까지 따라 움직이면 화면이 통째로 밀린다(QuestionThread에서
    같은 이유로 겪었다).
  */
  const preRef = useRef<HTMLPreElement>(null)
  const target = highlight?.lineStart ?? code.lineStart
  useEffect(() => {
    const pre = preRef.current
    const row = pre?.querySelector<HTMLElement>(`[data-line="${target}"]`)
    if (!pre || !row) return
    // 강조 줄을 위에서 1/4 지점에 둔다 — 딱 맨 위면 앞뒤 문맥이 안 보인다
    pre.scrollTop = Math.max(0, row.offsetTop - pre.clientHeight / 4)
  }, [target])

  return (
    <div className={dimmed ? 'flex h-full flex-col opacity-45' : 'flex h-full flex-col'}>
      <div className="flex items-baseline gap-2 border-b border-border px-4 py-3">
        <span className="font-semibold text-fg">{title}</span>
        <span className="font-mono text-xs text-fg-subtle">{code.path}</span>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <pre
          ref={preRef}
          className="h-full overflow-auto rounded-md bg-code py-3 font-mono text-sm leading-relaxed text-code-fg"
        >
          {lines.map((row) => (
            <div
              key={row.line}
              data-line={row.line}
              className={cn(
                'px-4',
                inRange(row.line, highlight) && 'border-l-2 border-primary bg-primary/34',
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

        호출부가 없는 문제도 있다 — 그때는 버튼 자체를 안 그린다. 눌러도 빈 칸이
        열리는 버튼은 고장으로 읽힌다.
      */}
      {callers.length > 0 && (
        <>
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
            <span className="truncate">
              이 코드를 부르는 곳 {callers.length > 1 && `${callers.length}곳`}
            </span>
          </button>
          {/* max-h로 상한을 둔다 — 스니펫이 길어도 코드 영역을 잠식하지 않는다 */}
          {callersExpanded && (
            <div className="max-h-32 shrink-0 overflow-auto border-t border-border bg-surface-2">
              {callers.map((c, i) => (
                <div key={i} className="p-3">
                  <div className="font-mono text-[11px] text-fg-subtle">{c.label}</div>
                  {c.snippet && (
                    <pre className="mt-1 font-mono text-xs whitespace-pre-wrap text-fg-muted">
                      {c.snippet}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** 파일 전체를 줄로 쪼갠다 — 첫 줄이 파일 1번 줄이다 */
function toLines(code: Code) {
  return code.snippet.split('\n').map((text, i) => ({ line: i + 1, text }))
}

const inRange = (line: number, h: Highlight | null) =>
  h != null && line >= h.lineStart && line <= h.lineEnd

/*
  호출부는 **본문이 아니라 구간 참조로 온다.** 같은 파일 안이면 위에서 쪼갠 줄에서
  잘라 쓰고, 다른 파일이면 본문이 없으므로 파일 이름만 말한다 — 그 파일을 주는 경로가
  없다.

  ⚠️ **줄 번호를 못 믿는다.** 실제로 받은 `CALLER`는 다른 파일을 가리키면서 `1~1`로
  온다(실측) — 그대로 그리면 `CohortController.java:1`이 되어 없는 위치를 가리킨다.
  구간이 한 줄뿐이면 위치를 말하지 않는다.

  ⚠️ **필드가 `null`로 온다.** `CURRICULUM_EVIDENCE`는 `path`·`lineStart`·`lineEnd`가
  전부 비어 있다(스키마상 필수인데도). `CALLER`만 골라 쓰지만 그쪽도 비어 있을 수
  있으므로 값이 없으면 버린다.
*/
type Caller = { label: string; snippet: string | null }

function callerBlocks(code: Code, lines: { line: number; text: string }[]): Caller[] {
  return code.references
    .filter((r) => r.type === 'CALLER' && r.path)
    .map((r) => {
      const file = r.path.split('/').pop() ?? r.path
      const sameFile = r.path === code.path
      const hasRange = r.lineStart > 0 && r.lineEnd > r.lineStart
      return {
        label: sameFile && hasRange ? `${file}:${r.lineStart}~${r.lineEnd}` : file,
        snippet:
          sameFile && hasRange
            ? lines
                .filter((l) => l.line >= r.lineStart && l.line <= r.lineEnd)
                .map((l) => l.text)
                .join('\n')
            : null,
      }
    })
}
