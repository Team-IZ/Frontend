/**
 * 실패 문구 규칙 — `npm run check:error-copy`
 *
 * 이 규칙이 깨지면 **화면이 사용자에게 틀린 말을 한다.** 두 가지가 특히 위험하다:
 *
 *   1. 눌러도 결과가 안 바뀌는 것에 「다시 시도」가 붙는다(권한 없음·아직 발행 전)
 *   2. 서버가 500을 주는 동안 "주소가 잘못됐다"고 말한다 → 사용자가 **없는 문제를 고치러 간다**
 *
 * 그래서 검사는 문구 자체가 아니라 **`retry`와 `tone` 판정**을 본다 — 문구는 다듬을 수
 * 있지만 이 둘이 틀리면 사용자가 엉뚱한 행동을 한다.
 * (검사 방식은 check-project-rules.mts와 같다 — 러너를 따로 들이지 않는다)
 */
import assert from 'node:assert'
import { ApiError } from '../src/api/_contract/errors.ts'
import { errorCopy } from '../src/lib/errorCopy.ts'

const api = (status: number, code = String(status), retryAfter?: number) =>
  new ApiError({ message: '', status, code, retryAfter })

const of = (e: unknown, subject = '회차') => errorCopy(e, { subject })

// ── 재시도가 결과를 바꾸는가 ─────────────────────────────────────
assert.strictEqual(of(api(500)).retry, true, '서버 오류는 다시 시도가 의미 있다')
assert.strictEqual(of(api(0, 'NETWORK')).retry, true, '네트워크 끊김은 다시 시도가 의미 있다')
assert.strictEqual(of(api(429, 'TOO_MANY_REQUESTS')).retry, true, '일시 차단은 기다렸다 다시')

assert.strictEqual(of(api(403, 'FORBIDDEN')).retry, false, '권한은 다시 눌러도 안 생긴다')
assert.strictEqual(of(api(404, 'NOT_FOUND')).retry, false, '없는 것은 다시 불러도 없다')
assert.strictEqual(of(api(401, 'UNAUTHORIZED')).retry, false, '만료된 세션은 재로그인이 답이다')

// ── 실패가 늘 유형 3인 것은 아니다 ───────────────────────────────
const pending = of(api(404, 'COHORT_REPORT_NOT_FOUND'), '리포트')
assert.strictEqual(pending.tone, 'pending', '아직 발행 전은 고장이 아니라 「아직」이다')
assert.strictEqual(pending.retry, false, '기다려야 생기는 것에 다시 시도를 붙이지 않는다')
assert.strictEqual(of(api(404, 'NOT_FOUND')).tone, 'failed', '일반 404는 유형 3')

// ── 도메인 코드가 status를 이긴다. 단, 일반 코드는 못 이긴다 ─────
assert.strictEqual(
  of(api(500, 'INTERNAL_SERVER_ERROR')).description,
  '잠시 후 다시 시도해 주세요.',
  '일반 코드는 status로 떨어진다',
)

// ── status마다 다른 말을 한다 (하나로 덮지 않는다) ───────────────
const said = new Set([403, 404, 429, 0, 500].map((s) => of(api(s)).title + of(api(s)).description))
assert.strictEqual(said.size, 5, '다섯 상황이 서로 다른 말을 해야 한다')

// ── 조사는 받침에 맞춘다 ─────────────────────────────────────────
assert.match(of(api(404), '회차').title, /^회차를/, '받침 없음 → 를')
assert.match(of(api(404), '명단').title, /^명단을/, '받침 있음 → 을')

// ── ApiError가 아닌 것(렌더 예외)도 말이 되어야 한다 ─────────────
const crashed = of(new TypeError('x'), '화면')
assert.ok(
  crashed.title.length > 0 && crashed.description.length > 0,
  '알 수 없는 예외도 문구가 있다',
)
assert.strictEqual(crashed.tone, 'failed', '알 수 없는 예외는 유형 3')

console.log('✓ 실패 문구 규칙 통과')
