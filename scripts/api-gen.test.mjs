/*
  생성기의 분기를 고정한다 — `node --test scripts/api-gen.test.mjs`

  ## 왜 전체 스펙 스냅샷이 아닌가
  실제 스펙을 스냅샷으로 잡으면 **백엔드가 뭘 고칠 때마다 깨진다.** 그러면 사람들이
  내용을 안 보고 갱신하게 되고, 그 순간 테스트가 아니라 의식(儀式)이 된다.
  고정 입력을 쓰면 깨지는 이유가 하나뿐이다 — **생성기가 바뀐 것.**

  ## 왜 문자열 전량 비교가 아닌가
  주석 한 줄만 다듬어도 깨진다. 대신 **결정이 걸려 있는 지점**만 확인한다:
  경로·인자 모양·필수 여부·제외 규칙. 실제로 이 넷에서 전부 버그가 났었다.
*/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildIR,
  renderDomainApi,
  renderQueryKeys,
  renderDomainTypes,
  renderErrorCodes,
} from './api-gen.mjs'

/** 분기를 하나씩 대표하는 최소 스펙 */
const SPEC = {
  paths: {
    '/api/v0/things': {
      // ① 선택 쿼리만 — 인자 없이 부를 수 있어야 한다
      get: {
        operationId: 'findThings',
        tags: ['Thing Domain'],
        summary: '목록 | ✅ 사용 가능',
        'x-readiness': 'available',
        parameters: [{ name: 'q', in: 'query', required: false, schema: { type: 'string' } }],
        responses: {
          200: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ThingList' } } },
          },
          409: {
            content: {
              'application/json': { schema: {}, examples: { THING_NAME_TAKEN: {}, CONFLICT: {} } },
            },
          },
        },
      },
      // ② 바디 — 필수
      post: {
        operationId: 'createThing',
        tags: ['Thing Domain'],
        'x-readiness': 'available',
        requestBody: { content: { 'application/json': { schema: {} } } },
        responses: { 201: { content: { 'application/json': { schema: {} } } } },
      },
    },
    // ③ 경로 파라미터
    '/api/v0/things/{thingId}': {
      get: {
        operationId: 'findThing',
        tags: ['Thing Domain'],
        'x-readiness': 'available',
        parameters: [{ name: 'thingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { content: { 'application/json': { schema: {} } } } },
      },
      // ④ 본문 없는 성공 응답
      delete: {
        operationId: 'removeThing',
        tags: ['Thing Domain'],
        'x-readiness': 'available',
        parameters: [{ name: 'thingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: {} },
      },
    },
    // ⑤ 필수 쿼리 — 선택으로 만들면 안 된다
    '/api/v0/things/availability': {
      get: {
        operationId: 'checkThing',
        tags: ['Thing Domain'],
        'x-readiness': 'available',
        parameters: [{ name: 'name', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { content: { 'application/json': { schema: {} } } } },
      },
    },
    // ⑥ 준비 안 됨 — 생성 대상에서 빠져야 한다
    '/api/v0/things/secret': {
      get: {
        operationId: 'findSecret',
        tags: ['Thing Domain'],
        'x-readiness': 'unavailable',
        responses: { 200: { content: { 'application/json': { schema: {} } } } },
      },
    },
    // ⑦ 쿠키 파라미터 — 브라우저가 싣는다
    '/api/v0/auth/refresh': {
      post: {
        operationId: 'refreshThing',
        tags: ['Thing Domain'],
        'x-readiness': 'available',
        parameters: [
          { name: 'refresh_token', in: 'cookie', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { content: { 'application/json': { schema: {} } } } },
      },
    },
    // ⑧ multipart — 손으로 쓴다
    '/api/v0/things/upload': {
      post: {
        operationId: 'uploadThings',
        tags: ['Thing Domain'],
        'x-readiness': 'available',
        requestBody: { content: { 'multipart/form-data': { schema: {} } } },
        responses: { 200: { content: { 'application/json': { schema: {} } } } },
      },
    },
  },
  components: { schemas: {} },
}

/** 실제 설정과 같은 모양. 렌더러가 경로를 하드코딩하지 않는다는 것도 여기서 검증된다 */
const CFG = {
  imports: {
    contract: '@/api/_contract',
    schema: '@/api/schema',
    domainTypes: './{tagName}Types',
    domainApi: './{tagName}Api',
    queryKeys: './{tagName}Keys',
    reactQuery: '@tanstack/react-query',
  },
}
const TAGS = { 'Thing Domain': 'thing' }

const ir = buildIR(SPEC, TAGS)
const byId = Object.fromEntries(ir.map((op) => [op.id, op]))
const callable = ir.filter((op) => op.readiness === 'available' && !op.isMultipart)
const code = renderDomainApi(callable, CFG)
const keys = renderQueryKeys(callable, CFG)

test('IR — 스펙에서 읽어야 하는 것들', () => {
  assert.equal(ir.length, 8)
  assert.equal(byId.findThings.method, 'GET')
  assert.equal(byId.findThings.queryRequired, false)
  assert.equal(byId.checkThing.queryRequired, true, '필수 쿼리를 인식해야 한다')
  assert.equal(byId.refreshThing.hasCookie, true)
  assert.equal(byId.uploadThings.isMultipart, true)
  assert.equal(byId.removeThing.hasResponseBody, false, '204는 본문이 없다')
  assert.equal(byId.findSecret.readiness, 'unavailable')
  assert.equal(byId.findThings.summary, '목록', 'summary에서 준비 상태 표시는 뗀다')
  assert.equal(byId.findThings.tagName, 'thing', '설정의 짧은 이름을 쓴다')
})

test('제외 규칙 — 준비 안 된 것과 multipart는 호출 함수를 만들지 않는다', () => {
  assert.ok(!code.includes('findSecret'), 'unavailable이 새어 나왔다')
  assert.ok(!code.includes('uploadThings'), 'multipart가 새어 나왔다')
  assert.ok(code.includes('findThings'), 'available은 있어야 한다')
})

test('인자 모양 — 필수가 없으면 인자 없이 부를 수 있다', () => {
  assert.match(
    code,
    /findThings = \(params: \{ query\?: findThings_Query \} & RequestOptions = \{\}\)/,
  )
  assert.match(code, /checkThing = \(params: \{ query: checkThing_Query \} & RequestOptions\)/)
  assert.match(code, /findThing = \(params: \{ path: findThing_Path \} & RequestOptions\)/)
  assert.match(code, /createThing = \(params: \{ body: createThing_Body \} & RequestOptions\)/)
})

test('경로는 스펙 문자열 그대로 — 뭉개지 않는다', () => {
  assert.ok(
    code.includes("izClient.GET('/api/v0/things/{thingId}'"),
    '{thingId}가 살아 있어야 한다',
  )
  assert.ok(code.includes("izClient.DELETE('/api/v0/things/{thingId}'"))
})

test('쿠키 파라미터는 호출자에게 묻지 않는다', () => {
  assert.match(
    code,
    /refreshThing = \(params: RequestOptions = \{\}\)/,
    '호출자에게 쿠키를 묻지 않는다',
  )
  assert.ok(code.includes('cookie: undefined as never'))
})

test('쿼리 키 — 읽기(GET)만, 도메인 접두어로 묶인다', () => {
  assert.ok(keys.includes("all: ['thing'] as const"))
  assert.ok(keys.includes('findThings:'))
  assert.ok(!keys.includes('createThing:'), '쓰기는 쿼리 키가 없다')
})

test('타입 별칭 — operationId_접미사 규칙 · 본문 없는 응답은 void', () => {
  const types = renderDomainTypes(callable, CFG)
  assert.ok(types.includes('export type removeThing_Response = void'))
  assert.ok(
    types.includes("export type findThing_Path = operations['findThing']['parameters']['path']"),
  )
  assert.ok(types.includes('export type findThings_Errors ='), '오퍼레이션별 에러 코드 유니온')
  assert.ok(types.includes("from '@/api/schema'"), '경로는 설정에서 온다')
})

test('에러 코드 — examples 키에서 뽑아 정렬한다', () => {
  const out = renderErrorCodes(callable)
  assert.ok(out.includes("| 'CONFLICT'"))
  assert.ok(out.includes("| 'THING_NAME_TAKEN'"))
  assert.ok(out.indexOf("'CONFLICT'") < out.indexOf("'THING_NAME_TAKEN'"), '정렬되어야 한다')
})
