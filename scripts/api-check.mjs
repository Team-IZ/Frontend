#!/usr/bin/env node
/*
  받아 둔 OpenAPI 스펙이 **코드 생성을 감당할 품질인가**를 검사한다 — `npm run api:check`

  이 검사들은 추상적인 모범사례가 아니라 **실제로 우리를 물었던 것들**이다.
  전부 docs/dev/backend/backend-api-requests.md(1차)·backend-api-requests-2.md(2차)에서 왔고,
  거기서 손으로 세던 것을 그대로 코드로 옮긴 것이다. 목적 둘:

    ① 백엔드가 "고쳤어요" 했을 때 눈으로 99건을 다시 세지 않는다
    ② 위반 목록이 그대로 다음 요청서가 된다 — 문서를 손으로 다시 쓰지 않는다

  등급
    error  계약이 깨진다. 이 상태로 생성하면 타입이 거짓말을 한다 → 종료코드 1
    warn   개선 요청 중이거나 우리가 흡수하는 것 → 종료코드 0 (보이기만 한다)

  사용
    node scripts/api-check.mjs                    api/openapi.json 검사
    node scripts/api-check.mjs --spec <경로>       다른 파일 검사(옛 스펙으로 역검증할 때)
    node scripts/api-check.mjs --verbose          위반 전량 출력(기본은 앞 8건)
*/
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SPEC = 'api/openapi.json'
const HEAD = 8

/*
  HTTP 상태를 그대로 옮긴 코드들. 상태코드에 이미 있는 정보라 화면 분기에 쓸 수 없다.
  "이 코드들만 있는 오퍼레이션"이 2차 요청서의 유일한 요청 항목이다.
*/
const GENERIC_CODES = new Set([
  'BAD_REQUEST',
  'VALIDATION_FAILED',
  'CONFLICT',
  'FORBIDDEN',
  'NOT_FOUND',
  'GONE',
  'UNAUTHORIZED',
  'UNAUTHENTICATED',
  'INTERNAL_SERVER_ERROR',
  'BAD_GATEWAY',
  'UNPROCESSABLE_ENTITY',
  'ACCESS_DENIED',
])

/*
  required에서 의도적으로 빠진 스키마 — 백엔드가 @JsonInclude(NON_NULL)로 키 자체를 빼는
  응답이라 정말로 optional이다(1차 요청 회신에서 확인). 프론트 타입도 `?`가 맞다.
  ⚠️ 새 스키마가 여기 들어오려면 근거가 있어야 한다. 늘어나기 시작하면 규칙이 무력해진다.

  ⓘ 리포트 스키마 셋(ReportDisclosureResponse·RoundReportResponse·ConceptReportResponse)이
    여기 있었는데 뺐다. 그것들은 합의된 예외가 아니라 **아직 생성하지 않는 API의 스키마**였고,
    이제 `reachableFromAvailable`이 자동으로 걸러 준다 — 백엔드가 available로 바꾸면
    이름을 지우는 것을 기억하지 않아도 검사가 저절로 켜진다.
*/
const REQUIRED_EXEMPT = new Set(['UpdateModelPricingRequest'])

/*
  `available`인 오퍼레이션에서 실제로 도달하는 스키마 이름 — `$ref`를 재귀로 따라간다.

  **생성하지 않는 API의 스키마는 검사하지 않는다.** 등급 기준이 "이 상태로 코드를 생성해도
  되나"인데, 호출 함수를 만들지 않는 API의 스키마는 우리 타입을 거짓말시키지 않는다.
  (`x-readiness`가 `available`이 아니면 생성기가 건너뛴다 — api-gen.mjs와 같은 기준)
*/
export function reachableFromAvailable(spec) {
  const schemas = spec.components?.schemas ?? {}
  const refsOf = (json) =>
    (JSON.stringify(json ?? {}).match(/schemas\/(\w+)/g) ?? []).map((x) => x.slice(8))

  const queue = []
  for (const item of Object.values(spec.paths ?? {})) {
    for (const op of Object.values(item)) {
      if (op?.responses && (op['x-readiness'] ?? 'available') === 'available')
        queue.push(...refsOf(op))
    }
  }
  const seen = new Set()
  while (queue.length) {
    const name = queue.pop()
    if (seen.has(name)) continue
    seen.add(name)
    queue.push(...refsOf(schemas[name]))
  }
  return seen
}

/*
  일반 코드뿐인 것이 **합의된** 오퍼레이션. 2차 요청 회신에서 근거를 받았다.
  ⚠️ 여기 없는 것이 새로 뜨면 그건 진짜 누락이다 — 그래서 "전부 통과"가 의미를 갖는다.
*/
const GENERIC_ONLY_AGREED = new Map([
  [
    'POST /api/v0/auth/password-reset/requests',
    '계정 존재 여부와 무관하게 항상 202 — 응답이 갈리면 그 자체가 계정 확인 수단',
  ],
  ['POST /api/v0/auth/invitations/resend', '위와 같은 이유'],
  ['GET /api/v0/consents', '단순 조회. 검증 실패 외에 실패할 사유가 없다'],
])

/** enum을 공유 스키마로 못 뺀 것 — Java enum이 아니라 int + 커스텀 검증이라 $ref가 안 나온다 */
const ENUM_INLINE_AGREED = new Set(['180|365|90']) // 정렬된 키로 적는다

const PAGE_FIELDS = ['page', 'size', 'totalElements', 'totalPages']

/*
  스키마가 null을 허용하는가 — 표기 방법이 넷이다.

  ⚠️ 이 함수가 이 스크립트에서 가장 틀리기 쉬운 자리다. 처음엔 `nullable`과 `type` 배열만
  봤다가 **정상인 5건을 위반으로 잡았다.** $ref는 형제 키워드가 무시되므로 3.1에서는
  `oneOf: [{$ref}, {type:'null'}]`로 쓰는 것이 정석이고, 백엔드는 그렇게 쓰고 있었다.
  → scripts/api-check.test.mjs가 네 표기를 전부 고정한다.
*/
export function isNullable(schema) {
  if (!schema || typeof schema !== 'object') return false
  if (schema.nullable === true) return true // 3.0 표기
  if (Array.isArray(schema.type) && schema.type.includes('null')) return true // 3.1 타입 배열
  const branches = schema.oneOf ?? schema.anyOf ?? schema.allOf // 3.1 $ref + null 조합
  return Array.isArray(branches) && branches.some((b) => isNullable(b) || b?.type === 'null')
}

/*
  설명문이 "이 값은 null일 수 있다"고 **주장**하는가.

  단순히 'null'이라는 단어를 찾으면 안 된다 — `null은 허용하지 않는다(빈 배열로 보낼 것)`
  같은 문장이 걸린다. 실제로 걸렸다. 부정문을 먼저 걷어낸다.
*/
export function assertsNull(description) {
  if (typeof description !== 'string' || !/\bnull\b/i.test(description)) return false
  const denies =
    /null(을|은|이|가)?\s*(허용하지\s*않|안\s*됨|불가|아니다|아님|보내지\s*(마|말|않))/i
  return !denies.test(description)
}

// ── 스펙 훑기 ────────────────────────────────────────────────────────────────

function operations(spec) {
  const out = []
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(item)) {
      if (!op || typeof op !== 'object' || !op.responses) continue
      out.push({ path, method: method.toUpperCase(), op, at: `${method.toUpperCase()} ${path}` })
    }
  }
  return out
}

/** 4xx·5xx 응답만 */
function* errorResponses(op) {
  for (const [code, res] of Object.entries(op.responses)) {
    if (Number(code) >= 400) yield [code, res]
  }
}

/** 이 응답에서 뽑히는 에러 코드들 — examples의 키가 곧 코드명이다(백엔드와 합의한 규약) */
const codesOf = (res) => Object.keys(res?.content?.['application/json']?.examples ?? {})

// ── 규칙 ─────────────────────────────────────────────────────────────────────

export const rules = [
  {
    id: 'error-schema',
    severity: 'error',
    title: '에러 응답이 성공 응답과 같은 스키마를 가리킨다',
    why: 'springdoc이 content를 안 적으면 핸들러 반환 타입을 물려준다. 생성 타입이 "409에 성공 DTO가 온다"고 말하게 된다.',
    run: (spec) =>
      operations(spec).flatMap(({ op, at }) => {
        const ok = Object.entries(op.responses)
          .filter(([c]) => Number(c) < 400)
          .map(([, r]) => JSON.stringify(r.content))
        return [...errorResponses(op)]
          .filter(([, r]) => ok.includes(JSON.stringify(r.content)))
          .map(([c]) => `${at} ${c}`)
      }),
  },
  {
    id: 'required',
    severity: 'error',
    title: '객체 스키마에 required가 없다',
    why: '전 필드가 optional이 되어 화면이 ?·!를 남발하고, 요청 DTO는 필수 누락이 컴파일에서 안 걸린다.',
    run: (spec) => {
      const live = reachableFromAvailable(spec)
      return Object.entries(spec.components?.schemas ?? {})
        .filter(([name, s]) => s.properties && !s.required?.length)
        .filter(([name]) => live.has(name) && !REQUIRED_EXEMPT.has(name))
        .map(([name]) => name)
    },
  },
  {
    id: 'nullable',
    severity: 'error',
    title: '설명에는 null이라 적혀 있는데 타입이 null을 허용하지 않는다',
    why: 'optional보다 나쁘다. 컴파일러가 null 검사를 요구하지 않는데 런타임에 null이 온다.',
    run: (spec) => {
      const hits = []
      const walk = (props, trail) => {
        for (const [key, value] of Object.entries(props ?? {})) {
          if (!value || typeof value !== 'object') continue
          if (assertsNull(value.description) && !isNullable(value)) hits.push(`${trail}.${key}`)
          walk(value.properties, `${trail}.${key}`)
          walk(value.items?.properties, `${trail}.${key}[]`)
        }
      }
      for (const [name, s] of Object.entries(spec.components?.schemas ?? {}))
        walk(s.properties, name)
      return hits
    },
  },
  {
    id: 'content-type',
    severity: 'error',
    title: '응답 content-type이 application/json이 아니다',
    why: '`*/*`는 produces 미지정 시의 기본값이다. 생성물이 지저분해지고 진짜 다른 타입(CSV·ZIP)과 구분이 안 된다.',
    run: (spec) =>
      operations(spec).flatMap(({ op, at }) =>
        Object.entries(op.responses)
          .flatMap(([code, res]) => Object.keys(res.content ?? {}).map((ct) => [code, ct]))
          .filter(([, ct]) => ct !== 'application/json')
          .map(([code, ct]) => `${at} ${code} → ${ct}`),
      ),
  },
  {
    id: 'operation-id',
    severity: 'error',
    title: 'operationId가 없거나 중복이거나 _N 접미사가 붙었다',
    why: 'operationId가 우리 함수명·타입명·쿼리 키의 원천이다. _N은 springdoc이 중복을 만나 붙인 것이라 다른 API에 옮겨갈 수 있다.',
    run: (spec) => {
      const ops = operations(spec)
      const seen = new Map()
      for (const { op, at } of ops)
        seen.set(op.operationId, [...(seen.get(op.operationId) ?? []), at])
      return ops.flatMap(({ op, at }) => {
        if (!op.operationId) return [`${at} — operationId 없음`]
        if (/_\d+$/.test(op.operationId))
          return [`${at} — ${op.operationId} (자동 중복 회피 접미사)`]
        if (seen.get(op.operationId).length > 1) return [`${at} — ${op.operationId} 중복`]
        return []
      })
    },
  },
  {
    id: 'readiness',
    severity: 'error',
    title: 'x-readiness가 없다',
    why: '준비 안 된 API로 함수를 만들면 누군가 쓴다. 코드가 아니라 데이터로 걸러야 배포 환경이 바뀔 때 저절로 풀린다.',
    run: (spec) =>
      operations(spec)
        .filter(({ op }) => !['available', 'hold', 'unavailable'].includes(op['x-readiness']))
        .map(({ at, op }) => `${at} → ${op['x-readiness'] ?? '(없음)'}`),
  },
  {
    id: 'security',
    severity: 'error',
    title: '전역 security 표기가 없다',
    why: '표기가 없으면 "인증이 필요 없다"와 구분이 안 된다.',
    run: (spec) => (spec.security?.length ? [] : ['루트에 security가 없다']),
  },
  {
    id: 'error-examples',
    severity: 'warn',
    title: '에러 응답에서 코드를 추출할 수 없다 (examples 없음)',
    why: 'examples의 키가 곧 에러 코드다. 없으면 ApiErrorCode 유니온에서 빠져 화면이 그 분기를 못 만든다.',
    run: (spec) =>
      operations(spec).flatMap(({ op, at }) =>
        [...errorResponses(op)]
          .filter(([, r]) => codesOf(r).length === 0)
          .map(([c]) => `${at} ${c}`),
      ),
  },
  {
    id: 'generic-only',
    severity: 'warn',
    title: '에러 코드가 HTTP 상태를 옮긴 일반 코드뿐이다',
    why: '화면이 케이스를 못 가른다 — 원인이 달라도 같은 코드로 오면 분기할 근거가 없다.',
    run: (spec) =>
      operations(spec).flatMap(({ op, at }) => {
        const codes = [...errorResponses(op)].flatMap(([, r]) => codesOf(r))
        if (!codes.length || codes.some((c) => !GENERIC_CODES.has(c))) return []
        if (GENERIC_ONLY_AGREED.has(at)) return [] // 합의된 예외
        return [`[${op.tags?.[0] ?? '?'}] ${at} → ${[...new Set(codes)].join(',')}`]
      }),
  },
  {
    id: 'enum-inline',
    severity: 'warn',
    title: '같은 enum 값 집합이 여러 곳에 복사돼 있다',
    why: '같은 개념이 서로 다른 타입이 된다. 한쪽에만 값이 추가되면 아무도 모른다.',
    run: (spec) => {
      // 정렬해서 비교한다 — 값 순서만 다른 복사본을 놓치면 규칙이 반쪽이 된다.
      // 실제로 DisclosureScope(SUMMARY·PRIVATE·FULL)와 Item.scope(PRIVATE·SUMMARY·FULL)를
      // 같은 집합으로 못 보고 지나쳤다.
      const counts = new Map()
      JSON.stringify(spec.components?.schemas ?? {}, (k, v) => {
        if (v?.enum) {
          const key = [...v.enum].sort().join('|')
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
        return v
      })
      return [...counts]
        .filter(([vals, n]) => n > 1 && !ENUM_INLINE_AGREED.has(vals))
        .map(([vals, n]) => `${n}회 — ${vals}`)
    },
  },
  {
    id: 'list-envelope',
    severity: 'warn',
    title: '목록 응답 봉투 — 생성기가 정규화하는 대상',
    why: '우리가 흡수한다(D4-2). 다만 페이징 필드가 일부만 있으면 total을 어느 쪽으로 읽을지 정할 수 없다.',
    run: (spec) =>
      Object.entries(spec.components?.schemas ?? {})
        .filter(([, s]) => Object.values(s.properties ?? {}).some((p) => p.type === 'array'))
        .flatMap(([name, s]) => {
          const keys = Object.keys(s.properties)
          const has = PAGE_FIELDS.filter((f) => keys.includes(f))
          if (has.length === 0 || has.length === PAGE_FIELDS.length) return []
          return [`${name} — 페이징 필드가 일부만 있다 (${has.join(',')})`]
        }),
  },
]

// ── 실행 ─────────────────────────────────────────────────────────────────────

// 테스트가 isNullable·assertsNull만 import할 수 있게, 직접 실행일 때만 검사를 돌린다
if (process.argv[1] !== fileURLToPath(import.meta.url)) {
  // import된 경우 — 아무것도 하지 않는다
} else main()

function main() {
  const args = process.argv.slice(2)
  const specPath = args.includes('--spec') ? args[args.indexOf('--spec') + 1] : SPEC
  const verbose = args.includes('--verbose')

  let spec
  try {
    spec = JSON.parse(readFileSync(specPath, 'utf8'))
  } catch (e) {
    console.error(`✗ 스펙을 읽지 못했습니다 (${specPath}) — 먼저 npm run api:pull\n  ${e.message}`)
    process.exit(1)
  }

  console.log(`${specPath} — ${spec.info?.title ?? '?'} ${spec.info?.version ?? ''}`)
  console.log(
    `오퍼레이션 ${operations(spec).length} · 스키마 ${Object.keys(spec.components?.schemas ?? {}).length}\n`,
  )

  let errors = 0
  let warns = 0

  for (const rule of rules) {
    const hits = rule.run(spec)
    const mark = hits.length === 0 ? '✅' : rule.severity === 'error' ? '❌' : '⚠️ '
    console.log(`${mark} [${rule.id}] ${rule.title} — ${hits.length}건`)
    if (hits.length) {
      if (rule.severity === 'error') errors += hits.length
      else warns += hits.length
      console.log(`     ${rule.why}`)
      for (const h of verbose ? hits : hits.slice(0, HEAD)) console.log(`     · ${h}`)
      if (!verbose && hits.length > HEAD)
        console.log(`     … 그 외 ${hits.length - HEAD}건 (--verbose)`)
    }
    console.log()
  }

  console.log(`error ${errors}건 · warn ${warns}건`)
  if (errors) {
    console.log('\nerror가 남아 있으면 생성 타입이 실제와 어긋납니다. 백엔드에 전달하세요.')
    process.exit(1)
  }
  console.log(
    warns
      ? '\n생성 가능합니다. warn은 개선 요청 중이거나 우리가 흡수하는 항목입니다.'
      : '\n전부 통과했습니다.',
  )
}
