import { cn } from '@/lib/utils/cn'
import type { ReachDistribution } from '../api/types'
import { REACH_LEVEL_LABEL, UNASKED_LABEL } from '../labels'

const SEGMENT_COLOR: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-reach-0 text-white',
  1: 'bg-reach-1 text-reach-fg',
  2: 'bg-reach-2 text-reach-fg',
  3: 'bg-reach-3 text-reach-fg',
  4: 'bg-reach-4 text-white',
}

/**
 * 도달 단계 분포 막대 — 개념별·회차별·성장 카드가 같이 쓴다.
 *
 * 구간 폭이 좁으면(예: 6%) 숫자가 안 들어가 값이 안 보인다 — F4("색만으로 상태를
 * 구분하지 않는다")를 실질적으로 어기게 되므로, 폭과 상관없이 모든 구간에 `title`
 * 호버를 달아 정확한 값을 준다(E11 — OP-02 격자 칸의 호버와 같은 패턴).
 */
export default function DistributionBar({
  distribution,
  className,
}: {
  distribution: ReachDistribution
  className?: string
}) {
  const total =
    distribution.level0 +
    distribution.level1 +
    distribution.level2 +
    distribution.level3 +
    distribution.level4 +
    distribution.unasked
  if (total === 0) return null

  const segments = [
    { level: 0 as const, count: distribution.level0 },
    { level: 1 as const, count: distribution.level1 },
    { level: 2 as const, count: distribution.level2 },
    { level: 3 as const, count: distribution.level3 },
    { level: 4 as const, count: distribution.level4 },
  ]

  return (
    <div className={cn('flex h-[26px] w-full min-w-60 overflow-hidden rounded-md', className)}>
      {segments.map(
        ({ level, count }) =>
          count > 0 && (
            <div
              key={level}
              className={cn(
                'flex items-center justify-center text-2xs font-bold',
                SEGMENT_COLOR[level],
              )}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${level}단 · ${REACH_LEVEL_LABEL[level]} · ${count}명`}
            >
              {/*
                10% 미만 구간은 숫자를 안 넣는다 — 좁은 조각에 2~3자리 숫자를 욱여넣으면
                옆 조각으로 삐져나온다. `title` 호버가 항상 있어 정확한 값은 어디서나
                확인된다(B4 — 값 자체를 숨기지 않는다, E11).
              */}
              {count / total >= 0.1 ? count : ''}
            </div>
          ),
      )}
      {distribution.unasked > 0 && (
        <div
          className="text-fg-subtle flex items-center justify-center bg-[repeating-linear-gradient(45deg,var(--color-reach-na-bg),var(--color-reach-na-bg)_4px,var(--color-border)_4px,var(--color-border)_8px)] text-2xs"
          style={{ width: `${(distribution.unasked / total) * 100}%` }}
          title={`${UNASKED_LABEL} · ${distribution.unasked}명`}
        />
      )}
    </div>
  )
}

/**
 * 도달 단계 범례.
 *
 * **작은 색 점 + 글자**다. 한 번은 네 칸을 붙여 막대 모양으로 그려 봤는데(범례가 곧
 * 막대 읽는 법이 되게), 바로 아래에 진짜 분포 막대가 줄줄이 있는 화면에서는 **똑같이
 * 생긴 긴 색 띠가 하나 더 얹힌 꼴**이라 어느 쪽이 데이터인지 눈이 먼저 헷갈렸다 —
 * 범례는 데이터와 닮지 않아야 데이터를 설명한다. 되돌렸다.
 */
export function DistributionLegend() {
  return (
    <div className="text-fg-subtle flex flex-wrap items-center gap-x-3 gap-y-1.5 text-2xs">
      {([0, 1, 2, 3, 4] as const).map((level) => (
        <span key={level} className="flex items-center gap-1">
          <i className={cn('inline-block h-[9px] w-[11px] rounded-sm', SEGMENT_COLOR[level])} />
          {level}단 {REACH_LEVEL_LABEL[level]}
        </span>
      ))}
      <span className="ml-auto flex items-center gap-1">
        <i className="inline-block h-[9px] w-[11px] shrink-0 rounded-sm bg-[repeating-linear-gradient(45deg,var(--color-reach-na-bg),var(--color-reach-na-bg)_4px,var(--color-border)_4px,var(--color-border)_8px)]" />
        <b className="text-fg-muted font-semibold">{UNASKED_LABEL}</b> — 그 학생 코드에 이 개념이
        나오는 곳이 없어 문항이 만들어지지 않음
      </span>
    </div>
  )
}
