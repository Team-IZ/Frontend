import { ROUND_OPTIONS, ROUND_CONCEPTS, type RoundId, type RoundRecord } from '../mockData'
import { REACH_STYLE, NA_PATTERN } from '../lib/reach'
import { cn } from '@/lib/utils/cn'

const LEGEND_BG: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-reach-0',
  1: 'bg-reach-1',
  2: 'bg-reach-2',
  3: 'bg-reach-3',
  4: 'bg-reach-4',
}

/*
  헤더 격자 — MG-02 히트맵의 그 행을 잘라 쓴다(§3). 여기서 회차×개념을 새로 그리지
  않는다 — TraineeRow.rounds가 유일한 정보원이라 REACH_STYLE·roundBadgeKind와 함께
  lib/reach.ts에 둔 스케일을 그대로 쓴다.

  ponytail: "이 회차 반에서 보기 ↗"(MG-02로 가는 링크)는 MG-02 화면이 아직 없어
  뺐다 — 갈 곳이 생기면 그때 붙인다.
*/
export function RoundReachGrid({ rounds }: { rounds: Partial<Record<RoundId, RoundRecord>> }) {
  const attended = ROUND_OPTIONS.filter((o) => rounds[o.value]?.status === 'ATTENDED').slice(-3)

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
        <p className="text-xs text-fg-subtle">· 최근 {attended.length}회차</p>
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

      <div className="flex items-start overflow-x-auto">
        {attended.map((o, i) => {
          const record = rounds[o.value]
          const levels = record?.status === 'ATTENDED' ? record.levels : [null, null, null]
          const concepts = ROUND_CONCEPTS[o.value]
          const isCurrent = i === attended.length - 1
          return (
            <div
              key={o.value}
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
                {o.label}
              </p>
              <div className="flex gap-1">
                {levels.map((level, j) =>
                  level === null ? (
                    <span
                      key={j}
                      title={concepts[j]}
                      style={NA_PATTERN}
                      className="flex h-10 w-[78px] items-center justify-center rounded-md text-sm text-fg-subtle"
                    >
                      ―
                    </span>
                  ) : (
                    <span
                      key={j}
                      title={concepts[j]}
                      className={cn(
                        'flex h-10 w-[78px] items-center justify-center rounded-md text-sm font-bold tabular-nums',
                        REACH_STYLE[level],
                      )}
                    >
                      {level}단
                    </span>
                  ),
                )}
              </div>
              <div className="mt-1 flex gap-1">
                {concepts.map((c) => (
                  <span
                    key={c}
                    title={c}
                    className="w-[78px] truncate text-center text-2xs text-fg-subtle"
                  >
                    {c}
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
