import assert from 'node:assert'
import { getPageRange } from '../src/components/ui/paginationRange.ts'

const eq = (a: unknown, b: unknown, msg: string) =>
  assert.deepStrictEqual(a, b, `${msg}\n  실제: ${JSON.stringify(a)}\n  기대: ${JSON.stringify(b)}`)

// 접을 게 없는 경우 — 전부 나열
eq(getPageRange(1, 1), [1], '1쪽')
eq(getPageRange(1, 4), [1, 2, 3, 4], '4쪽')
eq(getPageRange(3, 7), [1, 2, 3, 4, 5, 6, 7], '7쪽(임계값)')

// 200개 / 20개씩 = 10쪽
eq(getPageRange(1, 10), [1, 2, 3, 4, 5, '…', 10], '10쪽·현재1')
eq(getPageRange(3, 10), [1, 2, 3, 4, 5, '…', 10], '10쪽·현재3')
eq(getPageRange(4, 10), [1, '…', 3, 4, 5, '…', 10], '10쪽·현재4')
eq(getPageRange(5, 10), [1, '…', 4, 5, 6, '…', 10], '10쪽·현재5')
eq(getPageRange(8, 10), [1, '…', 6, 7, 8, 9, 10], '10쪽·현재8')
eq(getPageRange(10, 10), [1, '…', 6, 7, 8, 9, 10], '10쪽·현재10')

eq(getPageRange(50, 100), [1, '…', 49, 50, 51, '…', 100], '100쪽·현재50')

// 핵심 성질: 어느 쪽에 있든 칸 수가 같아야 페이저가 좌우로 움직이지 않는다
for (const total of [10, 25, 100, 999]) {
  const lengths = new Set<number>()
  for (let p = 1; p <= total; p++) {
    const r = getPageRange(p, total)
    lengths.add(r.length)
    assert.strictEqual(r[0], 1, `총${total}·현재${p}: 첫 쪽이 항상 보여야 함`)
    assert.strictEqual(r[r.length - 1], total, `총${total}·현재${p}: 마지막 쪽이 항상 보여야 함`)
    assert.ok(r.includes(p), `총${total}·현재${p}: 현재 쪽이 목록에 있어야 함`)
    assert.ok(
      !r.some((x, i) => x === '…' && r[i + 1] === '…'),
      `총${total}·현재${p}: '…'가 연달아 나오면 안 됨`,
    )
    const nums = r.filter((x): x is number => x !== '…')
    assert.deepStrictEqual(
      nums,
      [...nums].sort((a, b) => a - b),
      `총${total}·현재${p}: 번호가 오름차순이어야 함`,
    )
    assert.strictEqual(new Set(nums).size, nums.length, `총${total}·현재${p}: 번호 중복 금지`)
  }
  assert.strictEqual(lengths.size, 1, `총${total}: 칸 수가 ${[...lengths]}로 달라짐 — 하나여야 함`)
}

// 범위를 벗어난 입력도 깨지지 않는다
eq(getPageRange(0, 10), getPageRange(1, 10), '현재<1은 1로 보정')
eq(getPageRange(99, 10), getPageRange(10, 10), '현재>total은 total로 보정')
eq(getPageRange(1, 0), [], '0쪽')

console.log('✓ getPageRange 통과 (1134쪽분 단언)')
