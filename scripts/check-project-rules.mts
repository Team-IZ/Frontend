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
  addRequirements,
  canCreate,
  canDelete,
  canEditConfig,
  canEditSchedule,
  canOnlyExtendDue,
  canUnlinkCurriculum,
  CONCEPT_COUNT,
  dropOrphanConcepts,
  dueLabel,
  formatDue,
  lockedReason,
  toSchedule,
  toggleConcept,
} from '../src/features/operator/projects/rules.ts'
import { withParticle } from '../src/features/operator/projects/labels.ts'

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

assert.deepStrictEqual(at('2026-07-21'), { text: '5일 남음', overdue: false, urgent: true })
assert.deepStrictEqual(at('2026-09-26'), { text: '72일 남음', overdue: false, urgent: false })
assert.deepStrictEqual(at('2026-07-14'), { text: '지남', overdue: true, urgent: false })

// 마감 당일은 `지남`이 아니다 — 그날 자정까지가 마감인데 아침에 지났다고 쓰면 거짓말이다
assert.deepStrictEqual(at('2026-07-16'), { text: '0일 남음', overdue: false, urgent: true })

// 하드코딩 테이블을 없앤 이유 — 표에 없는 날짜가 조용히 사라지면 안 된다
assert.notStrictEqual(at('2027-03-01'), null, '새 날짜도 계산돼야 한다')
assert.strictEqual(dueLabel(null, '2026-07-16'), null, '마감 미설정')

// 해를 넘겨도 일수가 맞아야 한다(문자열 비교로는 안 되는 자리)
assert.strictEqual(dueLabel('2027-01-01', '2026-12-25')!.text, '7일 남음')

/*
  **연도를 자르지 않는다.** 한때 `07-21`이었는데, 기수가 해를 넘겨 이어지고 종료 회차는
  몇 달 전 것이라 목록·상세·타임라인이 전부 **어느 해인지 모를 `07-21`**을 말하고 있었다.
  좁은 자리에서만 `compact`로 줄인다.

  **시각은 여전히 빠져 있다.** 서버 컬럼이 `DATE`라 마감 시각이 존재하지 않는다 —
  화면이 시각을 말하면 서버가 뒷받침하지 않는 주장을 하게 된다(9차 회신 §15).
  `submissionDueAt`을 요청해 뒀고, 오면 이 자리가 바뀐다.
*/
assert.strictEqual(formatDue('2026-07-21'), '2026-07-21')
assert.strictEqual(formatDue('2026-07-21', true), '07-21', '좁은 자리에서만 줄인다')

// ── 개념 토글 — 생성·변경 모달이 같은 규칙을 쓴다 ──────────────
const eq = (a: unknown, b: unknown, msg: string) =>
  assert.deepStrictEqual(a, b, `${msg}\n  실제: ${JSON.stringify(a)}`)

eq(toggleConcept([], 'a'), ['a'], '빈 상태에서 켜기')
eq(toggleConcept(['a'], 'a'), [], '켜진 것 끄기')
eq(toggleConcept(['a', 'b'], 'c'), ['a', 'b', 'c'], '3건까지는 켜진다')

// 3건을 넘기면 **아무 일도 일어나지 않는다** — 저장 시점에 막으면 무엇을 뺄지 모른다
eq(toggleConcept(['a', 'b', 'c'], 'd'), ['a', 'b', 'c'], '4번째는 안 켜진다')
// 다만 이미 켜진 것은 3건이어도 꺼져야 한다(바꾸려면 먼저 빼야 하므로)
eq(toggleConcept(['a', 'b', 'c'], 'b'), ['a', 'c'], '3건일 때도 끄기는 된다')

// ── 교안 해제 — 생성은 드롭, 확정된 회차는 차단 ─────────────────
/*
  같은 상황에 규칙이 둘인 것이 의도다. 생성(OP-03)은 저장 전이라 개념이 빠지는 것이
  고르는 화면에 바로 보이고, 확정된 회차(OP-04 §5)는 조용히 3건이 2건이 되면 **학생에게
  낼 문항이 사라진다.** **한쪽 규칙을 다른 쪽에 쓰면 안 된다.**
*/
/*
  키가 서버 이름으로 바뀌었다 — 후보는 `mappingId`로 고르고 출처는 `curriculumVersionId`다.
  개념 확정(`PUT /concepts`)이 `mappingIds`를 받으므로 고른 것을 그대로 보낼 수 있다.
*/
const CAND = [
  { mappingId: 'x1', curriculumVersionId: 'x' },
  { mappingId: 'x2', curriculumVersionId: 'x' },
  { mappingId: 'y1', curriculumVersionId: 'y' },
]
eq(dropOrphanConcepts(['x1', 'y1'], CAND, ['x', 'y']), ['x1', 'y1'], '교안 둘 다 유지')
eq(dropOrphanConcepts(['x1', 'y1'], CAND, ['x']), ['x1'], 'y를 빼면 y1도 빠진다')
eq(dropOrphanConcepts(['x1', 'y1'], CAND, []), [], '교안을 다 빼면 개념도 없다')

const FIXED = [
  { curriculumVersionId: 'x' },
  { curriculumVersionId: 'x' },
  { curriculumVersionId: 'y' },
]
ok(canUnlinkCurriculum(FIXED, 'x'), false, '개념 2건이 쓰는 교안은 못 뺀다')
ok(canUnlinkCurriculum(FIXED, 'y'), false, '개념 1건이라도 쓰면 못 뺀다')
ok(canUnlinkCurriculum(FIXED, 'z'), true, '아무 개념도 안 쓰는 교안은 뺄 수 있다')
// 미확정(0건) 회차는 아직 끊길 출처가 없다 — 이때는 자유롭게 바꾼다
ok(canUnlinkCurriculum([], 'x'), true, '개념 미확정이면 제약이 없다')

// ── 요구사항 — 항목 하나가 판정 단위다 ──────────────────────────
/*
  MG-08이 항목마다 `✓`/`✗`를 붙이므로(`✓ 2 · ✗ 1`) **중복이 곧 분모 부풀리기**다.
  같은 것을 두 번 판정하면 매니저가 서로 다른 두 항목이라고 읽는다. 정리를 저장이 아니라
  **입력 시점에** 하는 이유도 그것이다 — 저장된 것과 화면에 보이는 것이 갈리면 안 된다.
*/
eq(addRequirements([], '좋아요 버튼'), ['좋아요 버튼'], '빈 목록에 하나')
eq(addRequirements(['a'], 'b'), ['a', 'b'], '뒤에 붙는다')
eq(addRequirements(['a'], 'a'), ['a'], '중복은 안 들어간다')
eq(addRequirements([], '  a  '), ['a'], '앞뒤 공백을 버린다')
eq(addRequirements([], '   '), [], '공백뿐이면 안 들어간다')
eq(addRequirements([], ''), [], '빈 문자열')

// 과제 문서에서 통째로 붙여 넣는 것이 실제 동선이다 — 그때 한 덩어리가 되면 항목이 아니다
eq(addRequirements([], 'a\n\nb\n'), ['a', 'b'], '여러 줄 붙여넣기 · 빈 줄 무시')
eq(addRequirements(['a'], 'a\nb'), ['a', 'b'], '붙여넣기 안의 중복도 걸러진다')
eq(addRequirements([], 'a\na'), ['a'], '붙여넣기 안에서 서로 중복')

// ── 상태별 편집 정책 ───────────────────────────────────────
/*
  가르는 축은 **학생 데이터가 이미 붙었나** 하나다. 화면마다 `status === 'RUNNING'`을
  쓰면 상태가 늘 때 갈리므로 `rules.ts` 한 곳에 모았고, 여기서 그 표를 고정한다.

  일정만 예외로 진행 중에 열린다 — 장애·공지 지연으로 **미루는 것**은 실무에 있다.
  대신 **당기는 것**은 막는다: 학생은 이미 "언제까지"를 알고 있다.
*/
for (const st of ['PREP', 'READY'] as const) {
  ok(canEditConfig(st), true, `${st}: 교안·개념·요구사항 편집 가능`)
  ok(canEditSchedule(st), true, `${st}: 일정 편집 가능`)
  ok(canOnlyExtendDue(st), false, `${st}: 마감을 자유롭게 잡는다`)
  ok(canDelete(st), true, `${st}: 학생 데이터가 없으니 삭제 가능`)
}

ok(canEditConfig('RUNNING'), false, 'RUNNING: 측정 기준을 바꾸면 학생마다 다른 시험이 된다')
ok(canEditSchedule('RUNNING'), true, 'RUNNING: 마감 연장은 열어 둔다')
ok(canOnlyExtendDue('RUNNING'), true, 'RUNNING: 미루는 것만')
ok(canDelete('RUNNING'), false, 'RUNNING: 제출·응시가 매달려 있다')

ok(canEditConfig('DONE'), false, 'DONE: 리포트가 나간 뒤다')
ok(canEditSchedule('DONE'), false, 'DONE: 미룰 대상이 없다')
ok(canDelete('DONE'), false, 'DONE: 끝난 회차는 기록이다')

// 흐린 버튼만 두지 않는다 — 막힌 상태에는 **사유**가 있어야 한다(C1)
ok(lockedReason('PREP') === null, true, 'PREP: 막힌 게 없으니 사유도 없다')
ok(lockedReason('READY') === null, true, 'READY: 〃')
ok(typeof lockedReason('RUNNING') === 'string', true, 'RUNNING: 사유가 있다')
ok(typeof lockedReason('DONE') === 'string', true, 'DONE: 사유가 있다')

// ── 일정 — 날짜만 ──────────────────────────────────────────
/*
  **시각 입력을 뺐다.** 서버 컬럼이 `DATE`이고, 학생에게 나가는 실제 마감
  (`submission_due_at`)은 다른 테이블이며 이 값과 연결돼 있지 않다(9차 회신 §15).
  받아 놓고 버리는 입력은 거짓말이라, 결론이 날 때까지 날짜만 다룬다.

  **같은 날이 허용으로 바뀌었다.** 시각이 없어져 `시작 = 마감`을 막을 근거가 사라졌고,
  하루짜리 회차가 실제로 있다.
*/
const d = (iso: string) => new Date(iso)

eq(
  toSchedule(d('2026-07-07'), d('2026-07-21')),
  { startDate: '2026-07-07', endDate: '2026-07-21' },
  '두 날짜를 그대로 싣는다',
)

assert.strictEqual(toSchedule(undefined, d('2026-07-21')), null, '시작 날짜 없음')
assert.strictEqual(toSchedule(d('2026-07-07'), undefined), null, '마감 날짜 없음')

assert.strictEqual(toSchedule(d('2026-07-21'), d('2026-07-07')), null, '마감이 시작보다 앞')
assert.notStrictEqual(toSchedule(d('2026-07-07'), d('2026-07-07')), null, '같은 날(당일 회차)')

// ── 한글 조사 ──────────────────────────────────────────────
// `을(를)` 표기는 괄호를 건너뛰며 읽어야 한다. 회차 이름이 데이터라 미리 고를 수도 없다
assert.strictEqual(withParticle('미프 4차', '을', '를'), '미프 4차를', '받침 없음')
assert.strictEqual(withParticle('빅프', '을', '를'), '빅프를', '받침 없음(프)')
assert.strictEqual(withParticle('1반', '을', '를'), '1반을', '받침 있음(반)')
assert.strictEqual(
  withParticle('미프 3차 v2', '을', '를'),
  '미프 3차 v2를',
  '영문 끝 — 받침 없음으로',
)
assert.strictEqual(
  withParticle('  미프 4차  ', '을', '를'),
  '  미프 4차  를',
  '앞뒤 공백 무시하고 판정',
)

console.warn('✓ 검증 개념 3건 · 토글 · 마감 라벨 · 교안 해제 · 요구사항 · 일정 · 편집 정책 통과')
