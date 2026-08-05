/** "nodes.py:14, 17" · "nodes.py:12–20" → [14,17] · [12..20] — 질문마다 하이라이트가 옮겨간다 */
export function parseRefLines(ref: string): Set<number> {
  const afterColon = ref.split(':')[1] ?? ''
  const lines = new Set<number>()
  for (const part of afterColon.split(',')) {
    const trimmed = part.trim()
    if (trimmed.includes('–')) {
      const [start, end] = trimmed.split('–').map(Number)
      for (let i = start; i <= end; i++) lines.add(i)
    } else if (trimmed) {
      lines.add(Number(trimmed))
    }
  }
  return lines
}
