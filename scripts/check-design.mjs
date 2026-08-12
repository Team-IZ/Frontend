#!/usr/bin/env node
/**
 * 디자인 토큰 가드 — `npm run check:design` (CI에서도 실행)
 *
 * 1) 하드코딩된 색: src/ 안에서 hex를 직접 쓰면 실패. 토큰 정의 파일만 예외.
 *    토큰을 만들어놔도 옆에서 #3a4db8을 적으면 시스템이 무너진다.
 * 2) 대비(WCAG AA 4.5:1): 글자로 쓰이는 토큰이 배경 위에서 읽히는지 계산.
 *    색을 추가할 때 눈대중으로 고르면 접근성이 조용히 깨진다.
 *
 * 검사 대상이 아닌 것: 정적 목업(docs/)은 설계 산출물이라 건드리지 않는다.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/*
  `new URL('..', import.meta.url).pathname`이 아니라 `fileURLToPath`를 쓴다 — Windows에서
  `.pathname`은 드라이브 문자 앞에 슬래시가 남고(`/C:/Users/...`) 퍼센트 인코딩(한글 경로 등)도
  안 풀린다. 그 값을 그대로 `path.join`에 넘기면 `C:\C:\Users\...`처럼 겹쳐서 `readdirSync`가
  ENOENT로 죽는다(실제로 겪음). `fileURLToPath`는 두 문제 다 없는 네이티브 경로를 돌려준다.
*/
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const TOKEN_FILE = 'src/index.css' // 토큰이 정의되는 유일한 곳
const SCAN_DIR = join(ROOT, 'src')
const SCAN_EXT = new Set(['.ts', '.tsx', '.css'])

let failed = false
const fail = (title, lines) => {
  failed = true
  console.error(`\n✗ ${title}`)
  for (const l of lines) console.error(`    ${l}`)
}

// ── 1. 하드코딩 색 ──────────────────────────────────────────
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : SCAN_EXT.has(extname(p)) ? [p] : []
  })

/*
  문서에서 "이렇게 쓰지 마라"를 보여주려면 그 나쁜 예를 적어야 한다. 그 줄에만
  이 표시를 붙여 검사를 건너뛴다. 표시가 눈에 보이고 grep으로 셀 수 있어야,
  예외가 필요할 때 사람들이 규칙 자체를 약화시키지 않는다.
*/
const ALLOW = 'design-token-allow'

const hardcoded = []
for (const file of walk(SCAN_DIR)) {
  // Windows는 path.join이 `\`로 붙인다 — TOKEN_FILE·리포트 문구는 `/` 기준이라 맞춰 정규화
  const rel = file.slice(ROOT.length).split(sep).join('/')
  if (rel === TOKEN_FILE) continue
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (line.includes(ALLOW)) return
      // #fff·#3a4db8 형태. url(#id) 같은 SVG 참조는 제외
      const m = line.match(/#[0-9a-fA-F]{3,8}\b/g)?.filter((h) => !line.includes(`url(${h}`))
      if (m?.length)
        hardcoded.push(`${rel}:${i + 1}  ${m.join(' ')}  → ${line.trim().slice(0, 60)}`)
    })
}
if (hardcoded.length) {
  fail(`하드코딩된 색 ${hardcoded.length}건 (${TOKEN_FILE}의 토큰을 쓸 것)`, hardcoded)
}

// ── 2. 대비 ────────────────────────────────────────────────
const css = readFileSync(join(ROOT, TOKEN_FILE), 'utf8')
const tokens = Object.fromEntries(
  [...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]),
)

const luminance = (hex) => {
  const c = hex
    .slice(1)
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// 글자로 쓰이는 토큰 → 실제로 깔리는 배경. 새 색을 추가하면 여기에도 짝을 추가한다.
const PAIRS = [
  ['fg', 'canvas'],
  ['fg', 'surface'],
  ['fg-muted', 'canvas'],
  ['fg-muted', 'surface'],
  ['fg-subtle', 'canvas'],
  ['fg-subtle', 'surface'],
  ['primary', 'surface'],
  ['primary', 'primary-soft'],
  ['danger', 'surface'],
  ['danger', 'danger-soft'],
  ['warning', 'surface'],
  ['warning', 'warning-soft'],
  ['success', 'surface'],
  ['success', 'success-soft'],
  ['info', 'surface'],
  ['info', 'info-soft'],
  // 어두운 면 — 좌측 네비게이션. 밝은 배경만 검사하면 이 조합이 통째로 빠진다.
  ['nav-fg', 'nav'],
  ['nav-fg', 'nav-active'],
  ['nav-accent', 'nav'],
  // 코드 패널 — 코드 텍스트 블록만 어두운 면이다(TR-03).
  ['code-fg', 'code'],
  ['code-dim', 'code'],
]

const AA = 4.5
const lowContrast = []
for (const [fg, bg] of PAIRS) {
  if (!tokens[fg] || !tokens[bg]) {
    lowContrast.push(`토큰 없음: --color-${fg} / --color-${bg}`)
    continue
  }
  const r = contrast(tokens[fg], tokens[bg])
  if (r < AA) lowContrast.push(`${r.toFixed(2)}:1  --color-${fg} on --color-${bg} (${AA} 필요)`)
}
if (lowContrast.length) {
  fail(`대비 AA 미달 ${lowContrast.length}건`, lowContrast)
}

if (failed) {
  console.error(`\n토큰 목록과 규칙: ${TOKEN_FILE}`)
  console.error('값의 근거: docs/plan/screen/definition/_source/design-tokens.md\n')
  process.exit(1)
}
console.log(`✓ 디자인 토큰 가드 통과 (색 ${Object.keys(tokens).length}개 · 대비 ${PAIRS.length}쌍)`)
