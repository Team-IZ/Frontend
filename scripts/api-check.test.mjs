/*
  api-check의 nullable 판정을 고정한다 — `node --test scripts/`

  왜 이 두 함수만 테스트하나: 나머지 규칙은 스펙을 훑어 세는 단순 집계라 틀리면 눈에 띈다.
  반면 nullable 판정은 **정상인 것을 위반으로 잡아도 아무도 모른다** — 실제로 처음 돌렸을 때
  `oneOf: [{$ref}, {type:'null'}]` 5건을 전부 오탐했다. 규칙이 있다는 것과 규칙이 작동한다는
  것은 다르다(decision-log D15).
*/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isNullable, assertsNull } from './api-check.mjs'

test('isNullable — null을 허용하는 네 가지 표기', () => {
  assert.ok(isNullable({ type: 'string', nullable: true }), '3.0 nullable 플래그')
  assert.ok(isNullable({ type: ['string', 'null'] }), '3.1 타입 배열')
  assert.ok(isNullable({ oneOf: [{ $ref: '#/x' }, { type: 'null' }] }), '3.1 oneOf + null')
  assert.ok(isNullable({ anyOf: [{ $ref: '#/x' }, { type: 'null' }] }), '3.1 anyOf + null')
})

test('isNullable — 허용하지 않는 것', () => {
  assert.ok(!isNullable({ type: 'string' }))
  assert.ok(!isNullable({ $ref: '#/components/schemas/DisclosureScope' }))
  assert.ok(!isNullable({ oneOf: [{ $ref: '#/x' }, { type: 'string' }] }), 'null 분기가 없다')
  assert.ok(!isNullable(undefined))
})

test('assertsNull — null일 수 있다고 주장하는 문장', () => {
  assert.ok(assertsNull('지정하지 않은 기관은 null.'))
  assert.ok(assertsNull('아직 배정 전이면 null'))
  assert.ok(assertsNull('활성 정책이 없으면 null'))
})

test('assertsNull — 부정문은 잡지 않는다', () => {
  // 실제 스펙 문장. 이걸 오탐해서 규칙을 고쳤다
  assert.ok(
    !assertsNull(
      '중복은 서버가 제거하고, 빈 배열을 보내면 전체 해제된다. null은 허용하지 않는다(빈 배열로 보낼 것).',
    ),
  )
  assert.ok(!assertsNull('null이 아니다'))
  assert.ok(!assertsNull('null을 보내지 마세요'))
})

test('assertsNull — null 언급이 없으면 대상이 아니다', () => {
  assert.ok(!assertsNull('기관명'))
  assert.ok(!assertsNull(undefined))
})
