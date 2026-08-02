/**
 * 검증 개념 3건 규칙 — `npm run check:project`
 *
 * 이 규칙이 깨지면 문항이 안 만들어지거나(3건 미만) 회차 간 비교 축이 무너진다
 * (14번 Tier1-4 — 검증 개념 3건은 프로젝트 단위로 고정되고, 반·팀·개인이 달라도
 * 같은 3건이라 이것이 유일한 비교 축이다).
 *
 * 화면 렌더는 검사하지 않는다. 여기 있는 것은 **숫자로 판정되는 규칙** 하나뿐이다.
 * (검사 방식은 check-pagination-range.mts와 같다 — 러너를 따로 들이지 않는다)
 */
import assert from 'node:assert'
import {
  canCreate,
  CONCEPT_COUNT,
  dueLabel,
  formatDue,
} from '../src/features/operator/projects/rules.ts'

const ok = (actual: boolean, expected: boolean, msg: string) =>
  assert.strictEqual(actual, expected, `${msg}\n  실제: ${actual} / 기대: ${expected}`)

assert.strictEqual(CONCEPT_COUNT, 3, '검증 개념은 3건 고정이다')

// 교안이 없으면 후보 자체가 안 나온다 — 개념이 3건이어도 만들 수 없다(14번 4-3)
ok(canCreate([], ['a', 'b', 'c']), false, '교안 0개')

// 3건 미만·초과는 저장 차단(OP-03 §5)
ok(canCreate(['ai-llmops'], []), false, '개념 0건')
ok(canCreate(['ai-llmops'], ['a', 'b']), false, '개념 2건')
ok(canCreate(['ai-llmops'], ['a', 'b', 'c', 'd']), false, '개념 4건')

// 교안 1개 이상 + 정확히 3건일 때만 통과
ok(canCreate(['ai-llmops'], ['a', 'b', 'c']), true, '교안 1 · 개념 3')
ok(canCreate(['ai-llmops', 'streamlit'], ['a', 'b', 'c']), true, '교안 2 · 개념 3')

// ── 마감 라벨 ───────────────────────────────────────────────
// 목업 값 재현 — 07-16 기준으로 미프 4차가 `5일 남음`, 빅프가 `72일 남음`이다
const at = (iso: string) => dueLabel(iso, '2026-07-16')

assert.deepStrictEqual(at('2026-07-21T23:59'), { text: '5일 남음', overdue: false, urgent: true })
assert.deepStrictEqual(at('2026-09-26T23:59'), { text: '72일 남음', overdue: false, urgent: false })
assert.deepStrictEqual(at('2026-07-14T23:59'), { text: '지남', overdue: true, urgent: false })

// 마감 당일은 `지남`이 아니다 — 그날 자정까지가 마감인데 아침에 지났다고 쓰면 거짓말이다
assert.deepStrictEqual(at('2026-07-16T23:59'), { text: '0일 남음', overdue: false, urgent: true })

// 하드코딩 테이블을 없앤 이유 — 표에 없는 날짜가 조용히 사라지면 안 된다
assert.notStrictEqual(at('2027-03-01T09:00'), null, '새 날짜도 계산돼야 한다')
assert.strictEqual(dueLabel(null, '2026-07-16'), null, '마감 미설정')

// 해를 넘겨도 일수가 맞아야 한다(문자열 비교로는 안 되는 자리)
assert.strictEqual(dueLabel('2027-01-01T00:00', '2026-12-25')!.text, '7일 남음')

assert.strictEqual(formatDue('2026-07-21T23:59'), '07-21 23:59')

console.warn('✓ 검증 개념 3건 · 마감 라벨 규칙 통과')
