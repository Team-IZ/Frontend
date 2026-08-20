import { useEffect, useRef } from 'react'
import { REACH_STYLE, NA_PATTERN } from '@/components/common/reach'
import { cn } from '@/lib/utils/cn'
import type { DetailRound } from '../_/api/types'

const LEGEND_BG: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-reach-0',
  1: 'bg-reach-1',
  2: 'bg-reach-2',
  3: 'bg-reach-3',
  4: 'bg-reach-4',
}

/*
  헤더 격자 — MG-02 히트맵의 그 행을 잘라 쓴다(§3).

  ⚠ **개념 이름이 회차 응답 안에 있다.** 목일 때는 `ROUND_CONCEPTS` 상수(회차 → 개념
  3건)를 따로 뒀는데, 서버는 회차마다 `concepts[]`를 통째로 준다 — 사람마다 문항이
  다를 수 있어서(코드에 근거가 없으면 안 만들어진다) 회차 단위 상수로는 애초에 표현이
  안 된다. 칸 수도 3 고정이 아니다.

  ponytail: "이 회차 반에서 보기 ↗"(MG-02로 가는 링크)는 히트맵이 붙으면 그때 단다.

  🔴 **예전 회차를 `slice(-3)`로 아예 잘라 냈었다** — 최근 3회차만 그리고 그 앞은
  DOM에도 없어서 스크롤해도 볼 수 없었다(사용자 지적). 컨테이너가 이미
  `overflow-x-auto`라 스크롤은 있었는데 자를 데이터가 없었던 것 — 전부 그리고
  **스크롤 위치만 오른쪽 끝(최신)으로** 맞춰서, 처음 보는 화면은 그대로 최근
  3회차이되 왼쪽으로 스크롤하면 이전 회차가 나오게 한다.
*/
export function RoundReachGrid({ rounds }: { rounds: DetailRound[] }) {
  const attended = rounds.filter((r) => r.attended)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 처음 그릴 때(그리고 회차 수가 바뀔 때) 오른쪽 끝(최신 회차)으로 스크롤해 둔다
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [attended.length])

  if (attended.length === 0) {
    return (
      <div className="mb-4 rounded-md border border-border bg-surface p-5">
        <p className="mb-1.5 text-sm font-bold">회차별 도달 단계</p>
        <p className="text-sm text-fg-subtle">
          아직 응시한 회차가 없습니다 — 이해도 확인이 끝나면 여기에 쌓입니다.
        </p>
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-md border border-border bg-surface p-5">
      <div className="mb-3 flex items-baseline gap-2">
        <p className="text-sm font-bold">회차별 도달 단계</p>
        <p className="text-xs text-fg-subtle">
          · 전체 {attended.length}회차{attended.length > 3 && ' · ← 스크롤하면 이전 회차'}
        </p>
        <div className="ml-auto flex items-center gap-1 text-2xs text-fg-subtle">
          <span>취약</span>
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <span key={l} className={cn('h-2.5 w-4 rounded-xs', LEGEND_BG[l])} aria-hidden="true" />
          ))}
          <span>양호</span>
          <span style={NA_PATTERN} className="h-2.5 w-4 rounded-xs" aria-hidden="true" />
          <span>문항 없음</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex items-start overflow-x-auto">
        {attended.map((round, i) => {
          const isCurrent = i === attended.length - 1
          return (
            <div
              key={round.assessmentRoundId}
              className={cn(
                'shrink-0 px-5 first:pl-0 last:pr-0',
                i > 0 && 'border-l border-dashed border-border-strong',
              )}
            >
              <p
                className={cn(
                  'mb-1.5 text-center text-xs text-fg-subtle',
                  isCurrent && 'font-bold text-fg',
                )}
              >
                {round.label}
              </p>
              <div className="flex gap-1">
                {round.concepts.map((c) =>
                  /* null은 0단이 아니다 — 문항이 없거나 한 축도 답하지 않은 것이다 */
                  c.level === null ? (
                    <span
                      key={c.problemNo}
                      title={
                        c.notGenerated
                          ? `${c.conceptName} · 코드에 근거가 없어 못 물었습니다`
                          : c.conceptName
                      }
                      style={NA_PATTERN}
                      className="flex h-10 w-[78px] items-center justify-center rounded-md text-sm text-fg-subtle"
                    >
                      ―
                    </span>
                  ) : (
                    <span
                      key={c.problemNo}
                      title={c.conceptName}
                      className={cn(
                        'flex h-10 w-[78px] items-center justify-center rounded-md text-sm font-bold tabular-nums',
                        REACH_STYLE[c.level],
                      )}
                    >
                      {c.level}단
                    </span>
                  ),
                )}
              </div>
              <div className="mt-1 flex gap-1">
                {round.concepts.map((c) => (
                  <span
                    key={c.problemNo}
                    title={c.conceptName}
                    className="w-[78px] truncate text-center text-2xs text-fg-subtle"
                  >
                    {c.conceptName}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-2xs text-fg-subtle">
        · 회차마다 검증 개념도 과제도 다릅니다. 3단 → 1단은 같은 것이 나빠진 게 아니라 다른 것을
        물은 결과일 수 있습니다.
      </p>
    </div>
  )
}
