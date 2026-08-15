#!/usr/bin/env node
/*
  스펙에서 코드를 생성한다 — `npm run api:gen`

  ## 이 스크립트의 형태가 곧 설계 결정이다
  스펙을 한 번 읽어 **중간표현(IR)** 을 만들고, 모든 렌더러가 그 배열 하나만 본다.
  참고했던 기존 툴킷은 생성한 .ts 파일을 정규식으로 다시 파싱하고(`export const (\w+) = async`),
  query냐 mutation이냐를 **함수 이름 접두어**로 판정했다 — HTTP 메서드가 스펙에 있는데도.
  그 구조 때문에 응답 타입이 `any`로 폴백되고 경로가 뭉개졌다(api-codegen.md 1-3).
  여기서는 `method`를 보면 되고 `$ref`를 따라가면 된다. **텍스트를 다시 읽는 단계가 없다.**

  ## 경로·이름은 전부 api/codegen.config.json에 있다
  이 파일에 경로 문자열을 박지 않는다. 배치를 바꾸고 싶으면 설정만 고친다.

  ## 만드는 것 (OpenAPI 태그 = 도메인 = 폴더)
    src/api/schema.d.ts             openapi-typescript 원본 (스펙이 하나라 한 벌)
    src/api/errorCodes.ts           전역 에러 코드 유니온
    src/api/PENDING.md              아직 못 쓰는 API
    src/api/{tag}/{tag}Types.ts     operationId별 별칭 (login_Body · login_Response …)
    src/api/{tag}/{tag}Api.ts       호출 함수
    src/api/{tag}/{tag}Keys.ts      쿼리 키
    src/api/{tag}/use{Tag}Queries.ts    GET 훅
    src/api/{tag}/use{Tag}Mutations.ts  쓰기 훅 (도메인 무효화 기본 포함)

  ## 화면 폴더에 넣지 않는 이유
  태그가 화면과 1:1이 아니다 — `Usage Metering`은 SA-02와 OP-06이 같이 쓰고,
  `Reporting`은 TR-04와 OP-05가 같이 쓴다. 화면 폴더에 넣으면 어느 쪽에 둘지 근거가 없고,
  다른 역할이 쓸 때 레이어 린트(features/A → features/B 금지)에 막힌다.
  화면은 어차피 `features/…/api.ts` 어댑터를 통해 쓰므로(D5) 옆에 있을 필요가 없다.
*/
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const CONFIG = 'api/codegen.config.json'
const BANNER = `/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */\n`

// ── 이름 규칙 ────────────────────────────────────────────────────────────────

const pascal = (s) => s.charAt(0).toUpperCase() + s.slice(1)
/** 'Academic Operations' → 'academicOperations' (설정의 tagAliases가 우선한다) */
const camelize = (s) =>
  s
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase())

/** 경로·파일명 치환 */
const fill = (template, vars) => template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)

// ── IR ───────────────────────────────────────────────────────────────────────

/**
 * 스펙 → 오퍼레이션 배열. 이 함수 아래로는 스펙 JSON을 다시 열지 않는다.
 * 렌더러가 필요로 하는 것만 담는다 — 여기 없는 필드가 필요해지면 IR을 넓힌다.
 */
export function buildIR(spec, tags = {}) {
  const ops = []
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(item)) {
      if (!op || typeof op !== 'object' || !op.responses) continue

      const success = Object.keys(op.responses)
        .map(Number)
        .filter((c) => c >= 200 && c < 300)
        .sort((a, b) => a - b)[0]

      const errorCodes = Object.entries(op.responses)
        .filter(([c]) => Number(c) >= 400)
        .flatMap(([, r]) => Object.keys(r.content?.['application/json']?.examples ?? {}))

      const params = op.parameters ?? []
      const bodyTypes = Object.keys(op.requestBody?.content ?? {})
      const tag = op.tags?.[0] ?? 'default'

      ops.push({
        id: op.operationId,
        method: method.toUpperCase(),
        path,
        tag,
        /** 폴더·파일 이름이 되는 짧은 이름 */
        tagName: tags[tag] ?? camelize(tag),
        readiness: op['x-readiness'] ?? 'available',
        summary: (op.summary ?? '').split('|')[0].trim(),
        hasPath: params.some((p) => p.in === 'path'),
        hasQuery: params.some((p) => p.in === 'query'),
        /*
          **필수 헤더만 노출한다.** 선택 헤더는 시그니처에 넣지 않는다.

          헤더는 대개 **전송 계층의 것**이다 — `Authorization`은 `_contract/client.ts`가
          붙이고, 쿠키는 브라우저가 싣는다(아래 `hasCookie`). 그래서 스펙에 `in: header`가
          있다고 전부 호출자에게 묻는 것은 층을 뒤섞는 일이다. 실제로 스펙이 그렇게 말한다.

            X-Request-Id             "생략 시 서버가 생성합니다"          (13곳)
            X-Swagger-Client-Origin  "일반 프론트 요청에서는 생략합니다"   ← 노출하면 안 된다
            X-Trace-Id               관측용
            Idempotency-Key          "제출 버튼을 누른 순간 하나 만들어
                                      끝날 때까지 보관. 재시도는 같은 값"  ← 화면만 아는 값

          **필수인 것만 남는 이유**는 타입이 강제하기 때문이기도 하다 — `required: true`면
          `schema.d.ts`가 `'Idempotency-Key': string`(물음표 없음)으로 내서, 안 넘기면
          **생성물 자체가 컴파일되지 않는다.**

          값의 **수명**(재시도는 같은 키 · 재제출은 새 키)은 화면 상태만 알 수 있어
          전송 계층이 대신 만들 수 없다. 그래서 이 한 갈래만 호출자에게 묻는다.
          다만 **화면이 헤더 이름을 알 필요는 없다** — 도메인 어댑터가 가린다(A1의 「변환」).
        */
        hasHeader: params.some((p) => p.in === 'header' && p.required),
        /** 필수 쿼리 파라미터가 하나라도 있으면 인자를 optional로 만들면 안 된다 */
        queryRequired: params.some((p) => p.in === 'query' && p.required),
        /**
         * 쿠키 파라미터는 브라우저가 싣는다(httpOnly라 JS가 만질 수도 없다).
         * 그런데 스펙이 required로 선언하면 타입이 값을 요구하므로 생성기가 채워 준다.
         */
        hasCookie: params.some((p) => p.in === 'cookie'),
        hasBody: Boolean(op.requestBody),
        /** multipart(파일 업로드)는 openapi-fetch 밖에서 손으로 쓴다 — api-codegen.md B1 */
        isMultipart: bodyTypes.some((t) => t.startsWith('multipart/')),
        successCode: success,
        // 204처럼 본문이 없는 응답 — 반환 타입이 void가 된다
        hasResponseBody: Boolean(op.responses[success]?.content?.['application/json']),
        /** 목록 응답이면 항목 타입도 별칭으로 뽑는다 — 화면이 스키마 이름을 몰라도 되게 */
        listProp: listPropertyOf(spec, op.responses[success]),
        errorCodes: [...new Set(errorCodes)],
      })
    }
  }
  return ops
}

/** 성공 응답이 목록 봉투면 배열 속성 이름을 돌려준다 (`content` 등). 아니면 null */
function listPropertyOf(spec, response) {
  const ref = response?.content?.['application/json']?.schema?.$ref
  if (!ref) return null
  const schema = spec.components?.schemas?.[ref.split('/').pop()]
  const arrays = Object.entries(schema?.properties ?? {}).filter(([, p]) => p.type === 'array')
  return arrays.length === 1 ? arrays[0][0] : null
}

// ── 렌더러 ───────────────────────────────────────────────────────────────────

/*
  타입 별칭 이름은 `operationId_접미사`다 — 팀 컨벤션이고, 규칙이라 **스키마 이름을 몰라도
  화면에서 바로 찾을 수 있다**는 것이 목적이다. PascalCase로 이어 붙이면 길어져 읽기 나쁘다.
*/
const alias = (op, suffix) => `${op.id}_${suffix}`

export function renderDomainTypes(ops, cfg) {
  const lines = [
    BANNER,
    `import type { operations } from '${cfg.imports.schema}'\n`,
    `/*`,
    `  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:`,
    `    {operationId}_Body · _Query · _Path · _Header · _Response · _Item · _Errors`,
    `*/\n`,
  ]
  for (const op of ops) {
    const O = `operations['${op.id}']`
    lines.push(`// ${op.method} ${op.path}${op.summary ? ` — ${op.summary}` : ''}`)
    if (op.hasPath) lines.push(`export type ${alias(op, 'Path')} = ${O}['parameters']['path']`)
    if (op.hasQuery)
      lines.push(`export type ${alias(op, 'Query')} = NonNullable<${O}['parameters']['query']>`)
    if (op.hasHeader)
      lines.push(`export type ${alias(op, 'Header')} = NonNullable<${O}['parameters']['header']>`)
    if (op.hasBody)
      lines.push(
        `export type ${alias(op, 'Body')} = NonNullable<${O}['requestBody']>['content']['${
          op.isMultipart ? 'multipart/form-data' : 'application/json'
        }']`,
      )
    const responseType = op.hasResponseBody
      ? `${O}['responses'][${op.successCode}]['content']['application/json']`
      : 'void'
    lines.push(`export type ${alias(op, 'Response')} = ${responseType}`)
    /*
      목록이면 항목 타입까지 — 표 컴포넌트가 쓰는 것이 이쪽이다.

      **`NonNullable`이 필요하다.** 그 배열 속성이 `required`가 아니면 생성 타입에서
      `T[] | undefined`가 되는데, 거기에 `[number]`로 인덱싱하면 **컴파일이 깨진다**
      (TS2537 — 유니온에는 인덱스 시그니처가 없다). `_Body`가 `requestBody`를 감싸는
      것과 같은 이유다.

      백엔드가 상태별로 키가 빠지는 응답(`RoundReportResponse.concepts?`)을 내면서
      실제로 터졌다. 배열 속성이 항상 오는 스펙에서는 `NonNullable`이 아무 일도 안 한다.
    */
    if (op.listProp)
      lines.push(
        `export type ${alias(op, 'Item')} = NonNullable<${alias(op, 'Response')}['${op.listProp}']>[number]`,
      )
    if (op.errorCodes.length)
      lines.push(
        `export type ${alias(op, 'Errors')} = ${op.errorCodes.map((c) => `'${c}'`).join(' | ')}`,
      )
    lines.push('')
  }
  return lines.join('\n')
}

export function renderErrorCodes(ops) {
  const codes = [...new Set(ops.flatMap((o) => o.errorCodes))].sort()
  return `${BANNER}
/*
  서버가 낼 수 있는 에러 코드 전량. 응답의 \`examples\` 키가 곧 코드명이라는 규약에서 뽑았다.
  오퍼레이션별로 좁힌 유니온은 각 도메인의 \`{tagName}Types.ts\`에 \`{operationId}_Errors\`로 있다 —
  화면 분기는 그쪽을 쓰는 편이 낫다. switch가 exhaustive해져서 **백엔드가 코드를 추가하면 컴파일이 알려준다.**

  ⚠️ 이 유니온이 전부는 아니다 — 스펙이 늘 최신이라는 보장이 없으므로 \`ApiError.code\`는
  이 값들로 **자동완성만** 하고 다른 문자열도 받는다.
*/
export type ApiErrorCode =
${codes.map((c) => `  | '${c}'`).join('\n')}
`
}

export function renderDomainApi(ops, cfg) {
  const { tagName } = ops[0]
  const typeNames = ops
    .flatMap((op) => [
      op.hasPath && alias(op, 'Path'),
      op.hasQuery && alias(op, 'Query'),
      op.hasHeader && alias(op, 'Header'),
      op.hasBody && alias(op, 'Body'),
      alias(op, 'Response'),
    ])
    .filter(Boolean)

  const fns = ops.map((op) => {
    const args = [
      op.hasPath && `path: ${alias(op, 'Path')}`,
      op.hasQuery && `query${op.queryRequired ? '' : '?'}: ${alias(op, 'Query')}`,
      op.hasHeader && `header: ${alias(op, 'Header')}`,
      op.hasBody && `body: ${alias(op, 'Body')}`,
    ].filter(Boolean)

    /*
      인자 순서를 외우지 않게 단일 객체로 받는다(api-codegen.md D3).
      필수 인자가 없으면 객체 자체에 기본값을 준다 — 안 그러면 빈 객체를 넘겨야 하는 함수가 된다.
      `signal`은 React Query가 넘겨주는 취소 신호다. 화면을 떠나면 요청이 실제로 끊긴다.
    */
    const allOptional = !op.hasPath && !op.hasBody && !op.hasHeader && !op.queryRequired
    const sig = args.length
      ? `params: { ${args.join('; ')} } & RequestOptions${allOptional ? ' = {}' : ''}`
      : 'params: RequestOptions = {}'
    const paramParts = [
      op.hasPath && 'path: params.path',
      op.hasQuery && (op.queryRequired ? 'query: params.query' : 'query: params.query ?? {}'),
      op.hasHeader && 'header: params.header',
      // 브라우저가 싣는 값이라 호출자에게 묻지 않는다
      op.hasCookie && 'cookie: undefined as never',
    ].filter(Boolean)
    const init = [
      paramParts.length && `params: { ${paramParts.join(', ')} }`,
      op.hasBody && 'body: params.body',
      'signal: params.signal',
    ].filter(Boolean)

    return `/** ${op.summary || op.id} — \`${op.method} ${op.path}\` */
export const ${op.id} = (${sig}) =>
  unwrap<${alias(op, 'Response')}>(izClient.${op.method}('${op.path}', { ${init.join(', ')} }) as never)`
  })

  return `${BANNER}
import { izClient, unwrap, type RequestOptions } from '${cfg.imports.contract}'
import type {
${typeNames.map((t) => `  ${t},`).join('\n')}
} from '${fill(cfg.imports.domainTypes, { tagName })}'

${fns.join('\n\n')}
`
}

export function renderQueryKeys(ops, cfg) {
  const { tagName } = ops[0]
  const reads = ops.filter((op) => op.method === 'GET')
  const keysName = `${tagName}Keys`
  const typeNames = reads
    .flatMap((op) => [op.hasPath && alias(op, 'Path'), op.hasQuery && alias(op, 'Query')])
    .filter(Boolean)

  const entries = reads.map((op) => {
    const parts = [op.hasPath && 'path', op.hasQuery && 'query'].filter(Boolean)
    const args = [
      op.hasPath && `path: ${alias(op, 'Path')}`,
      op.hasQuery && `query?: ${alias(op, 'Query')}`,
    ].filter(Boolean)
    const sig = args.length ? `(params: { ${args.join('; ')} })` : '()'
    const value = parts.length
      ? `[...${keysName}.all, '${op.id}', ${parts.map((p) => `params.${p} ?? null`).join(', ')}]`
      : `[...${keysName}.all, '${op.id}']`
    return `  ${op.id}: ${sig} => ${value} as const,`
  })

  return `${BANNER}
${typeNames.length ? `import type {\n${typeNames.map((t) => `  ${t},`).join('\n')}\n} from '${fill(cfg.imports.domainTypes, { tagName })}'\n` : ''}
/*
  \`all\`이 이 도메인 전체를 가리킨다 — 쓰기 훅이 성공하면 이 접두어로 한 번에 무효화한다.
  "이 상세가 어느 목록에 속하는가"는 스펙에 없어 생성기가 알 수 없다. **넓게 지우는 것은
  틀리지 않는다**(과잉 재조회일 뿐). 부분 무효화가 필요해지면 그 도메인만 계층을 넣는다.
*/
export const ${keysName} = {
  all: ['${tagName}'] as const,
${entries.join('\n')}
}
`
}

export function renderQueries(ops, cfg) {
  const reads = ops.filter((op) => op.method === 'GET')
  if (!reads.length) return null
  const { tagName } = ops[0]
  const keysName = `${tagName}Keys`

  const typeNames = reads
    .flatMap((op) => [
      op.hasPath && alias(op, 'Path'),
      op.hasQuery && alias(op, 'Query'),
      alias(op, 'Response'),
    ])
    .filter(Boolean)

  const hooks = reads.map((op) => {
    const args = [
      op.hasPath && `path: ${alias(op, 'Path')}`,
      op.hasQuery && `query${op.queryRequired ? '' : '?'}: ${alias(op, 'Query')}`,
    ].filter(Boolean)
    const allOptional = !op.hasPath && !op.queryRequired
    const paramType = args.length ? `{ ${args.join('; ')} }` : 'Record<string, never>'
    const sig = args.length
      ? `params: ${paramType}${allOptional ? ' = {}' : ''}, options?: QueryOptions<${alias(op, 'Response')}>`
      : `options?: QueryOptions<${alias(op, 'Response')}>`
    const keyArg = args.length ? `${keysName}.${op.id}(params)` : `${keysName}.${op.id}()`
    const callArg = args.length ? '{ ...params, signal }' : '{ signal }'

    return `/** ${op.summary || op.id} */
export function use${pascal(op.id)}(${sig}) {
  return useQuery({
    queryKey: ${keyArg},
    queryFn: ({ signal }) => ${op.id}(${callArg}),
    ...options,
  })
}`
  })

  return `${BANNER}
import { useQuery } from '${cfg.imports.reactQuery}'
import type { QueryOptions } from '${cfg.imports.contract}'
import { ${reads.map((o) => o.id).join(', ')} } from '${fill(cfg.imports.domainApi, { tagName })}'
import { ${keysName} } from '${fill(cfg.imports.queryKeys, { tagName })}'
import type {
${[...new Set(typeNames)].map((t) => `  ${t},`).join('\n')}
} from '${fill(cfg.imports.domainTypes, { tagName })}'

${hooks.join('\n\n')}
`
}

export function renderMutations(ops, cfg) {
  const writes = ops.filter((op) => op.method !== 'GET')
  if (!writes.length) return null
  const { tagName } = ops[0]
  const keysName = `${tagName}Keys`

  const typeNames = writes
    .flatMap((op) => [
      op.hasPath && alias(op, 'Path'),
      op.hasQuery && alias(op, 'Query'),
      op.hasHeader && alias(op, 'Header'),
      op.hasBody && alias(op, 'Body'),
      alias(op, 'Response'),
    ])
    .filter(Boolean)

  const hooks = writes.map((op) => {
    const args = [
      op.hasPath && `path: ${alias(op, 'Path')}`,
      op.hasQuery && `query?: ${alias(op, 'Query')}`,
      // 필수 헤더(`Idempotency-Key`)는 화면이 값을 만들어 넘겨야 한다 — 서버가 요구한다
      op.hasHeader && `header: ${alias(op, 'Header')}`,
      op.hasBody && `body: ${alias(op, 'Body')}`,
    ].filter(Boolean)
    const varType = args.length ? `{ ${args.join('; ')} }` : 'void'
    const mutationFn = args.length ? `(vars: ${varType}) => ${op.id}(vars)` : `() => ${op.id}()`

    return `/** ${op.summary || op.id} */
export function use${pascal(op.id)}(options?: MutationOptions<${alias(op, 'Response')}, ${varType}>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ${mutationFn},
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: ${keysName}.all })
      options?.onSuccess?.(...args)
    },
  })
}`
  })

  return `${BANNER}
import { useMutation, useQueryClient } from '${cfg.imports.reactQuery}'
import type { MutationOptions } from '${cfg.imports.contract}'
import { ${writes.map((o) => o.id).join(', ')} } from '${fill(cfg.imports.domainApi, { tagName })}'
import { ${keysName} } from '${fill(cfg.imports.queryKeys, { tagName })}'
import type {
${[...new Set(typeNames)].map((t) => `  ${t},`).join('\n')}
} from '${fill(cfg.imports.domainTypes, { tagName })}'

/*
  쓰기가 성공하면 **이 도메인의 조회를 전부 무효화한다.** 무엇을 다시 읽어야 하는지는
  스펙에 없는 도메인 지식이라 생성기가 정확히 알 수 없다 — 넓게 지우면 틀리지 않는다.
  더 좁히고 싶으면 \`options.onSuccess\`에서 직접 무효화하고, 기본 동작은 그대로 둔다.
*/
${hooks.join('\n\n')}
`
}

export function renderPending(pending, handwritten) {
  const rows = pending
    .map((op) => `| \`${op.readiness}\` | ${op.method} ${op.path} | ${op.summary} |`)
    .join('\n')
  const hand = handwritten.length
    ? `\n## 손으로 쓰는 것 — multipart\n\n\`openapi-fetch\`는 JSON 직렬화를 전제한다. 파일 업로드는 \`FormData\`를 직접 만들어야 하므로\n호출 함수를 생성하지 않는다. **타입(\`{tagName}Types.ts\`)은 생성돼 있으니 그것을 쓴다.**\n\n${handwritten
        .map((op) => `- \`${op.method} ${op.path}\` — ${op.summary}`)
        .join('\n')}\n`
    : ''
  return `# 아직 생성하지 않은 API

\`x-readiness\`가 \`available\`이 아니어서 **호출 함수를 만들지 않았다.**
함수가 있으면 누군가 쓰기 때문이다 — 그 화면은 목 데이터로 계속 돈다.

배포 환경 제약(메일 발송 불가 등)으로 막힌 것이 많다. **구현이 없는 게 아니라 환경이 막은
것**이라, 백엔드가 \`available\`로 바꾸면 \`npm run api:gen\`만 다시 돌리면 된다.

| readiness | 엔드포인트 | |
|---|---|---|
${rows}
${hand}
> 이 파일은 자동 생성물이다. 손으로 고치지 마세요.
`
}

// ── 실행 ─────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) main()

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

function main() {
  const cfg = JSON.parse(readFileSync(CONFIG, 'utf8'))
  const sharedDir = cfg.paths.shared

  if (!existsSync(cfg.spec.file)) {
    console.error(`✗ ${cfg.spec.file}이 없습니다 — 먼저 npm run api:pull`)
    process.exit(1)
  }

  // 1) 스펙 전체를 타입으로. 런타임 코드가 0이라 우리가 얹는 층이 전부 이 위에 선다.
  //    도메인이 나뉘어도 이건 한 벌이다 — 스펙 자체가 하나이기 때문.
  mkdirSync(sharedDir, { recursive: true })
  execFileSync(
    'npx',
    ['openapi-typescript', cfg.spec.file, '-o', `${sharedDir}/${cfg.files.schema}`],
    // Windows에서 npx는 npx.cmd라 shell 없이 execFileSync로 못 찾는다(ENOENT) — 크로스플랫폼 안전.
    { stdio: 'inherit', shell: true },
  )

  const spec = JSON.parse(readFileSync(cfg.spec.file, 'utf8'))
  const ir = buildIR(spec, cfg.tags)

  const missingId = ir.filter((op) => !op.id)
  if (missingId.length) {
    console.error(`✗ operationId가 없는 오퍼레이션 ${missingId.length}건 — npm run api:check`)
    process.exit(1)
  }

  const available = ir.filter((op) => op.readiness === 'available')
  const pending = ir.filter((op) => op.readiness !== 'available')
  /*
    multipart는 호출 함수를 만들지 않는다 — openapi-fetch는 JSON 직렬화를 전제하므로
    파일 업로드는 밖에서 손으로 쓴다. 타입은 남겨 그 손 코드가 쓴다.
  */
  const callable = available.filter((op) => !op.isMultipart)
  const handwritten = available.filter((op) => op.isMultipart)

  write(`${sharedDir}/${cfg.files.errorCodes}`, renderErrorCodes(available))
  write(`${sharedDir}/${cfg.files.pending}`, renderPending(pending, handwritten))

  // 태그별로 묶어 **그 API를 쓰는 화면 폴더 옆에** 만든다
  const byTag = new Map()
  for (const op of callable) byTag.set(op.tagName, [...(byTag.get(op.tagName) ?? []), op])

  const written = []
  for (const [tagName, ops] of byTag) {
    const v = { tagName, TagName: pascal(tagName) }
    const dir = fill(cfg.paths.domain, v)
    write(`${dir}/${fill(cfg.files.domainTypes, v)}`, renderDomainTypes(ops, cfg))
    write(`${dir}/${fill(cfg.files.domainApi, v)}`, renderDomainApi(ops, cfg))
    write(`${dir}/${fill(cfg.files.queryKeys, v)}`, renderQueryKeys(ops, cfg))
    const queries = renderQueries(ops, cfg)
    if (queries) write(`${dir}/${fill(cfg.files.queries, v)}`, queries)
    const mutations = renderMutations(ops, cfg)
    if (mutations) write(`${dir}/${fill(cfg.files.mutations, v)}`, mutations)
    written.push({ tagName, dir, count: ops.length })
  }

  // 생성물은 format:check 대상이지만 사람이 맞출 수는 없으므로 생성 단계에서 포맷한다
  execFileSync(
    'npx',
    [
      'prettier',
      '--write',
      '--log-level',
      'warn',
      `${sharedDir}/*.ts`,
      `${sharedDir}/*.d.ts`,
      ...written.map((w) => `${w.dir}/*.ts`),
    ],
    // Windows에서 npx는 npx.cmd라 shell 없이 execFileSync로 못 찾는다(ENOENT) — 크로스플랫폼 안전.
    { stdio: 'inherit', shell: true },
  )

  console.log(`\n생성`)
  console.log(`  ${sharedDir}/ — schema.d.ts · errorCodes.ts · PENDING.md`)
  for (const w of written) console.log(`  ${w.dir}/ — ${w.tagName} ${w.count}개`)
  console.log(
    `\n  호출 함수 ${callable.length} · 미준비 ${pending.length} · 손으로 쓸 것 ${handwritten.length}`,
  )
}
