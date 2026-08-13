#!/usr/bin/env node
/**
 * 비동기 상태 가드 — `npm run check:async` (CI에서도 실행)
 *
 * 표준은 `docs/dev/async-states.md`가 갖는다. **문서는 지켜지지 않으므로**(지금 상태가
 * 그 결과다) 되돌아가면 아픈 두 가지만 여기서 막는다.
 *
 *   1) 조회 분기에 `isPending` — `enabled: false`인 조회는 요청이 나가지도 않았는데
 *      영원히 참이다. 그대로 그리면 **끝나지 않는 스피너**가 된다(§1-9).
 *   2) `<Empty>`를 `variant` 없이 — 기본값이 `pending`(점선)이라 화면이 *"기다리면
 *      채워집니다"* 라고 잘못 말한다. 실제로 운영 관리 열 곳이 전부 그랬다(§2-2).
 *
 * ⚠ **`isPending` 자체는 죄가 아니다.** 쓰기(`useMutation`)에서는 *"요청이 떠 있다"* 가
 * 맞는 뜻이고 `disabled=`·`&& <Spinner`가 그 자리다. 그래서 **분기 모양만** 잡는다 —
 * 조회를 그리는 자리와 쓰기를 막는 자리는 코드 모양이 다르다.
 *
 * 검사 대상은 `src/features/operator`뿐이다. 다른 역할은 다른 레포가 들고 있고,
 * 남의 화면을 우리 규칙으로 막으면 그쪽 작업이 이유 없이 멈춘다.
 * (검사 방식은 check-design.mjs와 같다 — 러너를 따로 들이지 않는다)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const SCAN_DIR = join(ROOT, 'src/features/operator')

/** 조회 결과를 **그리는** 자리. 쓰기의 `disabled=`·`&&`는 여기 안 걸린다 */
const QUERY_BRANCH = [
  /\.isPending\s*\?/, //            {q.isPending ? ( … )
  /if\s*\([^)]*\.isPending/, //     if (q.isPending) return …
  /loading\w*=\{[^}]*\.isPending/, // loading={q.isPending}
]

/** `<Empty>` 또는 `<Empty className=…>` — variant 없이 열리는 것 */
const BARE_EMPTY = /<Empty(\s+className=(\{[^}]*\}|"[^"]*"))?\s*>/

const files = (function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return path.endsWith('.tsx') || path.endsWith('.ts') ? [path] : []
  })
})(SCAN_DIR)

const hits = { pending: [], empty: [] }

for (const file of files) {
  const where = relative(ROOT, file)
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const at = `${where}:${i + 1}`
      if (QUERY_BRANCH.some((re) => re.test(line))) hits.pending.push(`${at}  ${line.trim()}`)
      if (BARE_EMPTY.test(line)) hits.empty.push(`${at}  ${line.trim()}`)
    })
}

let failed = false
const fail = (title, why, lines) => {
  failed = true
  console.error(`\n✗ ${title}`)
  console.error(`    ${why}`)
  for (const l of lines) console.error(`    ${l}`)
}

if (hits.pending.length)
  fail(
    '조회 분기에 isPending을 썼습니다',
    'isPending은 "데이터가 없다"이지 "불러오는 중"이 아닙니다 — enabled:false면 영원히 참이라 스피너가 안 끝납니다. isLoading을 쓰세요(async-states §1-9).',
    hits.pending,
  )

if (hits.empty.length)
  fail(
    '<Empty>에 variant가 없습니다',
    '기본값이 pending(점선)이라 "기다리면 채워집니다"라고 말하게 됩니다. pending · empty · failed 중 하나를 고르세요(async-states §2).',
    hits.empty,
  )

if (failed) process.exit(1)
console.log('✓ 비동기 상태 가드 통과 (조회 분기 · 빈 상태 variant)')
