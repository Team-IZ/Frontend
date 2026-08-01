import { cn } from '@/lib/utils/cn'
import { AXIS_LABELS, AXIS_ORDER, type AxisData, type AxisKey } from '../mockData'
import { toLineSegments, pointsToPolyline } from '../lib/axisLine'

/*
  ⑥ 5축 통합표 — 유일한 5축(여긴 4축) 정보원(D107). 레이더·별도 총점 그래프는 없다.

  스코프 축소: 자기수정 축 제외 — 정의서 SC-M06은 5축(코드이해·설계논리·대안비교·
  반례대응·자기수정)이지만 이슈 #40 범위에서 자기수정 축을 뺀 4축만 다룬다.
  AXIS_ORDER가 4축이라 이 표도 자연히 4행만 그린다.
*/
function gapClass(gap: number | null) {
  if (gap == null) return 'text-fg-subtle'
  if (gap >= 1) return 'text-success'
  if (gap <= -1) return 'text-danger'
  return 'text-fg-subtle'
}

function deltaLabel(delta: number | null) {
  if (delta == null) return '—'
  if (delta > 0) return `▲${delta}`
  if (delta < 0) return `▼${Math.abs(delta)}`
  return '0'
}

function deltaClass(delta: number | null) {
  if (delta == null) return 'text-fg-subtle'
  if (delta > 0) return 'text-success'
  if (delta < 0) return 'text-danger'
  return 'text-fg-subtle'
}

function Sparkline({
  history,
  highlight,
}: {
  history: AxisData['history']
  highlight?: AxisData['highlight']
}) {
  const segments = toLineSegments(history, { width: 54, height: 16, min: 0, max: 5 })
  const stroke =
    highlight === 'bad'
      ? 'var(--color-danger)'
      : highlight === 'good'
        ? 'var(--color-success)'
        : 'var(--color-fg-subtle)'
  const last = segments.at(-1)?.at(-1)

  return (
    <svg viewBox="0 0 60 20" className="h-5 w-15 shrink-0" aria-hidden="true">
      {segments.map((seg, i) => (
        <polyline
          key={i}
          points={pointsToPolyline(seg.map((p) => ({ x: p.x + 3, y: p.y + 2 })))}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
        />
      ))}
      {last && <circle cx={last.x + 3} cy={last.y + 2} r={2.3} fill={stroke} />}
    </svg>
  )
}

export function AxisTable({
  round,
  axes,
  headNote,
}: {
  round: number
  axes: Record<AxisKey, AxisData>
  /** 표 헤더 우측에 붙는 요약 문구(예: "전 축 기수 평균 이상") */
  headNote?: { text: string; tone: 'success' | 'danger' | 'neutral' }
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between text-xs font-bold tracking-[.03em] text-fg-subtle uppercase">
        <span>4축 상세 · {round}회차</span>
        {headNote && (
          <span
            className={cn(
              'text-xs font-normal normal-case tracking-normal',
              headNote.tone === 'success' && 'text-success',
              headNote.tone === 'danger' && 'text-danger',
              headNote.tone === 'neutral' && 'text-fg-subtle',
            )}
          >
            {headNote.text}
          </span>
        )}
      </div>

      <div className="flex flex-col">
        {AXIS_ORDER.map((key) => {
          const axis = axes[key]
          const gap = axis.cohortAvg == null ? null : axis.score - axis.cohortAvg
          return (
            <div
              key={key}
              className={cn(
                'flex items-center gap-3 border-b border-border py-2.5 last:border-0',
                axis.highlight === 'bad' && '-mx-3 rounded-lg bg-danger-soft px-3',
                axis.highlight === 'good' && '-mx-3 rounded-lg bg-success-soft px-3',
              )}
            >
              <span
                className={cn(
                  'w-19 shrink-0 text-sm font-semibold',
                  axis.highlight === 'bad' && 'text-danger',
                  axis.highlight === 'good' && 'text-success',
                )}
              >
                {AXIS_LABELS[key]}
              </span>
              <span
                className={cn(
                  'w-11 text-right text-xl font-bold tabular-nums',
                  axis.highlight === 'bad' && 'text-danger',
                  axis.highlight === 'good' && 'text-success',
                )}
              >
                {axis.score}
                <span className="text-xs font-normal text-fg-subtle">/5</span>
              </span>
              <span className={cn('w-8 text-sm font-semibold', deltaClass(axis.delta))}>
                {deltaLabel(axis.delta)}
              </span>
              <Sparkline history={axis.history} highlight={axis.highlight} />
              <span className="ml-auto w-33 text-right text-xs text-fg-subtle">
                {axis.cohortAvg == null ? (
                  '표본 부족 — 대비 미산출'
                ) : (
                  <>
                    평균 {axis.cohortAvg}
                    <b className={cn('ml-1', gapClass(gap))}>
                      {gap == null ? '—' : gap >= 0 ? `+${gap.toFixed(1)}` : gap.toFixed(1)}
                    </b>
                  </>
                )}
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-2.5 text-[11px] text-fg-subtle">
        · Δ=직전 회차 대비. 오른쪽 기수평균은 {round}회차 스냅샷(B1)과의 차이, 같은 5점 단위. 회차
        2개부터 계산(표본 부족 시 "—").
      </p>
    </div>
  )
}
