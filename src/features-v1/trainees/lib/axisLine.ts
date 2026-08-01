export type LinePoint = { x: number; y: number }

/**
 * 회차별 값을 (x,y) 좌표 세그먼트로 바꾼다. null(결측 회차)은 좌표를 만들지 않고
 * 그 지점에서 세그먼트를 끊는다 — 보간 없이 표시(T-2, D-2).
 */
export function toLineSegments(
  values: (number | null)[],
  opts: { width: number; height: number; min?: number; max?: number },
): LinePoint[][] {
  const { width, height, min = 0, max = 5 } = opts
  const stepX = values.length > 1 ? width / (values.length - 1) : 0
  const segments: LinePoint[][] = []
  let current: LinePoint[] = []

  values.forEach((v, i) => {
    if (v == null) {
      if (current.length) segments.push(current)
      current = []
      return
    }
    const x = values.length > 1 ? i * stepX : width / 2
    const y = height - ((v - min) / (max - min)) * height
    current.push({ x, y })
  })
  if (current.length) segments.push(current)
  return segments
}

export function pointsToPolyline(points: LinePoint[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ')
}
