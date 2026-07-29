import { cn } from '@/lib/utils/cn'
import { AXIS_LABELS, type AxisData, type AxisKey } from '../mockData'
import { toLineSegments, pointsToPolyline } from '../lib/axisLine'

/*
  ③ 포커스 축 그래프 — ①상태 배지가 있을 때만, 헤드라인이 지목한 그 축 하나만
  보여준다(5축을 뭉뚱그린 총점 그래프는 D107에서 폐기됨).

  스코프 축소: 대상 축은 4축(자기수정 제외) 중 하나 — mockData.ts AXIS_ORDER 참고,
  이슈 #40.

  기수 평균선은 회차별 스냅샷이 아니라 현재 회차 값을 가로선으로 표시한다
  (데이터 모델을 회차별 평균 이력까지 갖추는 대신 최신 스냅샷 값으로 단순화).
*/
const W = 460
const H = 100

export function FocusAxisChart({
  axisKey,
  axis,
  variant,
}: {
  axisKey: AxisKey
  axis: AxisData
  variant: 'risk' | 'ace'
}) {
  const isRisk = variant === 'risk'
  const strokeColor = isRisk ? 'var(--color-danger)' : 'var(--color-success)'
  const segments = toLineSegments(axis.history, { width: W, height: H, min: 0, max: 5 })
  const avgY = axis.cohortAvg == null ? null : H - (axis.cohortAvg / 5) * H
  const roundCount = axis.history.length

  return (
    <div className="rounded-md border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-bold tracking-[.03em] text-fg-subtle uppercase">
        <span>
          {AXIS_LABELS[axisKey]} 추이
          <span
            className={cn(
              'ml-2 font-normal normal-case tracking-normal',
              isRisk ? 'text-danger' : 'text-success',
            )}
          >
            · {isRisk ? '위험 신호 축' : '강점 축'}
          </span>
        </span>
        <span className="ml-auto flex gap-4 font-normal normal-case tracking-normal text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 rounded-xs" style={{ background: strokeColor }} />
            학생
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-0.5 w-3.5 rounded-xs"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, var(--color-fg-subtle), var(--color-fg-subtle) 3px, transparent 3px, transparent 6px)',
              }}
            />
            기수 평균
          </span>
        </span>
      </div>

      <svg viewBox={`0 0 ${W + 40} ${H + 30}`} className="w-full max-w-120">
        <g stroke="var(--color-border)" strokeWidth={1}>
          <line x1={36} y1={10} x2={W + 30} y2={10} />
          <line x1={36} y1={H * 0.4 + 10} x2={W + 30} y2={H * 0.4 + 10} />
          <line x1={36} y1={H + 10} x2={W + 30} y2={H + 10} />
        </g>
        <g fontSize={10} fill="var(--color-fg-subtle)">
          <text x={30} y={13} textAnchor="end">
            5
          </text>
          <text x={30} y={H * 0.4 + 13} textAnchor="end">
            3
          </text>
          <text x={30} y={H + 13} textAnchor="end">
            0
          </text>
        </g>
        <g fontSize={11} fill="var(--color-fg-muted)" textAnchor="middle">
          {axis.history.map((_, i) => (
            <text key={i} x={36 + (i * W) / Math.max(roundCount - 1, 1)} y={H + 28}>
              {i + 1}회차
            </text>
          ))}
        </g>

        {avgY != null && (
          <line
            x1={36}
            y1={avgY + 10}
            x2={W + 30}
            y2={avgY + 10}
            stroke="var(--color-fg-subtle)"
            strokeWidth={2}
            strokeDasharray="5 3"
          />
        )}

        {segments.map((seg, i) => (
          <g key={i}>
            <polyline
              points={pointsToPolyline(seg.map((p) => ({ x: p.x + 36, y: p.y + 10 })))}
              fill="none"
              stroke={strokeColor}
              strokeWidth={2.5}
            />
            {seg.map((p, j) => (
              <circle key={j} cx={p.x + 36} cy={p.y + 10} r={4} fill={strokeColor} />
            ))}
          </g>
        ))}
      </svg>
      <p className="mt-1 text-[11px] text-fg-subtle">
        · 결측 회차는 선으로 잇지 않음(T-2). 다른 축은 4축 상세 표에서 확인.
      </p>
    </div>
  )
}
