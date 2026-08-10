/*
  api-check의 nullable 판정을 고정한다 — `node --test scripts/`

  왜 이 두 함수만 테스트하나: 나머지 규칙은 스펙을 훑어 세는 단순 집계라 틀리면 눈에 띈다.
  반면 nullable 판정은 **정상인 것을 위반으로 잡아도 아무도 모른다** — 실제로 처음 돌렸을 때
  `oneOf: [{$ref}, {type:'null'}]` 5건을 전부 오탐했다. 규칙이 있다는 것과 규칙이 작동한다는
  것은 다르다(decision-log D15).
*/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isNullable, assertsNull, reachableFromAvailable, rules } from './api-check.mjs'

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

test('assertsNull — 부정문의 마크다운 강조에 속지 않는다', () => {
  // 9차 실제 스펙 문장. 백엔드가 같은 뜻을 백틱으로 다시 쓰자 단어와 조사 사이에
  // 백틱이 끼어 부정문 판정이 빗나갔고, 정상인 필드가 error로 잡혔다
  assert.ok(
    !assertsNull(
      '최종 담당 반 ID 목록. **빈 배열 허용**(전체 해제).\n`null`은 허용하지 않는다 — 빈 배열과 구분되지 않기 때문이다.',
    ),
  )
  assert.ok(!assertsNull('*null*은 허용하지 않는다'))
  // 강조가 붙어도 주장문은 여전히 잡아야 한다
  assert.ok(assertsNull('배정 전이면 `null`'))
})

test('assertsNull — 부정을 다르게 쓴 문장도 잡는다', () => {
  // 11차 반영본 실제 문장. `null`이라는 단어 없이 null을 부정한다
  assert.ok(!assertsNull('종료일. 항상 값이 있다(생성·수정 모두 필수이며 DB도 NOT NULL이다)'))
  assert.ok(!assertsNull('개념 이름. 항상 값이 있다 — 출처 매핑이 NOT NULL이다'))
  assert.ok(!assertsNull('계정이 INACTIVE일 때만 값이 있으며 그때는 항상 채워져 있습니다'))
})

test('assertsNull — 남의 필드를 지목한 문장은 이 필드 얘기가 아니다', () => {
  /*
    실제로 걸렸다 — `traineeIds`(배열, null 불가) 설명이 **다른 필드**의 null 조건을
    안내하고 있었다. 설명문 전체를 한 덩어리로 보면 어느 필드 얘기인지 알 수 없다.
  */
  const desc =
    '재발송할 교육생 ID 목록입니다. 재발송 버튼은 `pendingInvitationTokenId`가 `null`이 아닌 행에서만 켜면 됩니다.'
  assert.ok(!assertsNull(desc, 'traineeIds'))

  // 자기 이름이 섞여 있으면 자기 얘기다
  assert.ok(assertsNull('`className`은 반 배정이 없으면 null', 'className'))
})

test('assertsNull — null 언급이 없으면 대상이 아니다', () => {
  assert.ok(!assertsNull('기관명'))
  assert.ok(!assertsNull(undefined))
})

/*
  `reachableFromAvailable`이 생성 대상 스키마를 정확히 고르는가.

  이 함수가 조용히 빈 집합을 돌려주면 **required 규칙 전체가 무력해진다** — 위반이 없어서가
  아니라 검사 대상이 없어서 통과한다. 실제로 `'schemas/'.slice(9)`로 첫 글자를 잘라
  아무것도 못 찾는 버그를 냈고, 탐침을 심어보고서야 알았다.
*/
test('reachableFromAvailable — available에서 $ref를 재귀로 따라간다', () => {
  const spec = {
    paths: {
      '/live': {
        get: {
          responses: {
            200: {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Live' } } },
            },
          },
        },
      },
      '/pending': {
        get: {
          'x-readiness': 'unavailable',
          responses: {
            200: {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Hidden' } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Live: { type: 'object', properties: { child: { $ref: '#/components/schemas/Nested' } } },
        Nested: { type: 'object', properties: { x: { type: 'string' } } },
        Hidden: { type: 'object', properties: { y: { type: 'string' } } },
      },
    },
  }
  const live = reachableFromAvailable(spec)

  assert.ok(live.has('Live'), '직접 참조를 못 찾으면 규칙 전체가 무력해진다')
  assert.ok(live.has('Nested'), '중첩 $ref도 따라가야 한다')
  assert.ok(!live.has('Hidden'), 'unavailable에서만 쓰는 스키마는 생성하지 않으므로 대상이 아니다')
})

/*
  enum-inline이 **값 순서가 다른 복사본**도 같은 집합으로 보는가.

  원래는 `v.enum.join('|')`로 비교해서 순서만 다르면 못 잡았다. 실제 스펙에서
  DisclosureScope(SUMMARY·PRIVATE·FULL)와 Item.scope(PRIVATE·SUMMARY·FULL)를
  놓쳤고, 손으로 세어보고서야 알았다. 규칙이 위반을 못 알아보면 없는 것과 같다.
*/
test('enum-inline — 값 순서가 달라도 같은 집합으로 본다', () => {
  const rule = rules.find((r) => r.id === 'enum-inline')
  const spec = {
    components: {
      schemas: {
        Shared: { type: 'string', enum: ['B', 'A', 'C'] },
        Copied: { type: 'object', properties: { x: { type: 'string', enum: ['A', 'C', 'B'] } } },
      },
    },
  }
  const hits = rule.run(spec)
  assert.equal(hits.length, 1, '순서만 다른 복사본을 놓치면 규칙이 반쪽이 된다')
  assert.match(hits[0], /A\|B\|C/, '정렬된 키로 보고해야 사람이 대조할 수 있다')
})

/*
  PATCH 요청 본문은 전부 선택인 것이 **맞다** — 부분 수정의 계약이다.

  우리가 운영 설정을 PUT→PATCH로 바꿔 달라고 요청해서 필수가 0/11이 됐는데(6차 R1),
  그때 required 규칙이 그것을 결함으로 잡았다. 이름을 예외 목록에 넣는 대신 구조로 갈랐다 —
  **응답 스키마와 POST·PUT 본문은 그대로 검사한다.**
*/
test('required — PATCH 본문은 전부 선택이어도 통과, 응답은 아니다', () => {
  const rule = rules.find((r) => r.id === 'required')
  const spec = {
    paths: {
      '/things/{id}': {
        patch: {
          responses: {
            200: {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Thing' } } },
            },
          },
          requestBody: {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PatchThing' } },
            },
          },
        },
      },
      '/others': {
        post: {
          responses: {
            200: {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Thing' } } },
            },
          },
          requestBody: {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CreateThing' } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Thing: { type: 'object', properties: { a: { type: 'string' } } }, // 응답 — 잡아야 한다
        PatchThing: { type: 'object', properties: { a: { type: 'string' } } }, // PATCH 본문 — 통과
        CreateThing: { type: 'object', properties: { a: { type: 'string' } } }, // POST 본문 — 잡아야 한다
      },
    },
  }
  const hits = rule.run(spec)
  assert.ok(hits.includes('Thing'), '응답 스키마는 계속 검사해야 한다')
  assert.ok(hits.includes('CreateThing'), 'POST 본문은 계속 검사해야 한다')
  assert.ok(!hits.includes('PatchThing'), 'PATCH 본문이 전부 선택인 것은 부분 수정의 계약이다')
})
