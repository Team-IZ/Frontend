/**
 * 문서 생성기 두 개(design-doc.mjs · component-doc.mjs)가 공유하는 것.
 *
 * 토큰 읽기와 문서 뼈대(헤더·섹션·접기 요소)를 한곳에 둔다. 두 문서가 각자
 * 베끼면 스타일이 갈라지고, 그러면 "같은 시스템의 두 문서"처럼 안 보인다.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const ROOT = new URL('..', import.meta.url).pathname
export const SOURCE = join(ROOT, 'src/index.css')

/* ── 토큰 읽기 ───────────────────────────────────────── */

/** @theme 블록에서 `--name: value` 를 뽑는다. 주석은 값에 섞이지 않게 먼저 지운다. */
export function readTokens() {
  const css = readFileSync(SOURCE, 'utf8')
  const theme = css.match(/@theme[^{]*\{([\s\S]*?)\n\}/)
  if (!theme) throw new Error('src/index.css에서 @theme 블록을 찾지 못했다')

  const body = theme[1].replace(/\/\*[\s\S]*?\*\//g, '')
  const tokens = []
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    const name = m[1]
    // Tailwind가 자동으로 붙이는 짝 변수는 목록에서 뺀다
    if (name.includes('--line-height')) continue
    tokens.push({ name, value: m[2].trim().replace(/\s+/g, ' ') })
  }
  return tokens
}

export const byPrefix = (tokens, p) =>
  tokens.filter((t) => t.name.startsWith(p)).map((t) => ({ ...t, short: t.name.slice(p.length) }))

export const tokenCssBlock = (tokens) =>
  tokens.map((t) => `    --${t.name}: ${t.value};`).join('\n')

/* ── HTML 조각 ───────────────────────────────────────── */

export const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )

export function rationale(items) {
  if (!items?.length) return ''
  return `<details>
    <summary>왜 이렇게 정했나 <span class="cnt">(${items.length})</span></summary>
    <div class="qa">
      ${items.map((it) => `<div><p class="q">${esc(it.q)}</p><p class="a">${esc(it.a)}</p></div>`).join('\n')}
    </div>
  </details>`
}

export function section(title, count, caption, inner) {
  return `<section>
    <h2>${esc(title)} <span class="cnt">${count}</span></h2>
    ${caption ? `<p class="cap">${esc(caption)}</p>` : ''}
    ${inner}
  </section>`
}

/* ── 문서 뼈대 ───────────────────────────────────────── */

/** 두 문서가 공통으로 쓰는 기본 스타일. 페이지별 스타일은 각 생성기가 이어붙인다. */
export const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0 }
  body {
    font-family: var(--font); font-size: 14px; line-height: 1.5;
    color: var(--color-fg); background: var(--color-canvas);
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 40px 24px }
  code { font-family: var(--mono) }

  header { margin-bottom: 32px }
  .kicker { font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--color-fg-subtle) }
  h1 { font-size: 26px; letter-spacing: -.01em; margin: 8px 0 8px }
  header > p { color: var(--color-fg-muted); max-width: 640px }
  .howto {
    margin-top: 16px; padding: 12px 16px; border-radius: var(--radius-md);
    border: 1px solid var(--color-info-border); background: var(--color-info-soft); color: var(--color-info);
  }
  .doc-nav { display: flex; gap: 8px; margin-top: 16px }
  .doc-nav a {
    font-size: 13px; font-weight: 600; text-decoration: none; padding: 6px 12px;
    border-radius: var(--radius-md); border: 1px solid var(--color-border-strong); color: var(--color-fg-muted);
  }
  .doc-nav a.on { background: var(--color-primary); border-color: var(--color-primary); color: #fff }
  .doc-nav a:not(.on):hover { border-color: var(--color-fg-subtle) }

  section { margin-bottom: 48px }
  h2 { font-size: 18px; display: flex; align-items: baseline; gap: 8px }
  h2 .cnt { font-size: 14px; font-weight: 400; color: var(--color-fg-subtle) }
  .cap { font-size: 12px; color: var(--color-fg-subtle); margin-top: 4px }
  .grp { margin-bottom: 32px }
  h3 { font-size: 14px; margin-bottom: 2px }

  details { border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface-2); margin-top: 8px }
  summary { cursor: pointer; padding: 8px 12px; font-size: 12px; font-weight: 600; color: var(--color-fg-muted) }
  summary .cnt { font-weight: 400; color: var(--color-fg-subtle) }
  .qa { padding: 12px; border-top: 1px solid var(--color-border); display: grid; gap: 12px }
  .qa .q { font-size: 14px; font-weight: 600 }
  .qa .a { font-size: 14px; color: var(--color-fg-muted); margin-top: 4px; line-height: 1.65 }

  footer { border-top: 1px solid var(--color-border); padding-top: 16px; font-size: 12px; color: var(--color-fg-subtle) }
  :focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px }
`

/**
 * 문서 한 장을 완성한다. 생성기 스크립트가 `--check` 모드로 자기 출력과
 * 저장된 파일을 비교하므로, 여기서 만드는 문자열이 곧 진실이다.
 */
export function pageShell({
  title,
  kicker,
  lede,
  howto,
  nav,
  tokenCss,
  pageCss,
  bodyHtml,
  footerNote,
}) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<!--
  이 파일은 생성물이다. 직접 고치지 말고 생성기를 고친 뒤 다시 만든다.
  값은 src/index.css, 명령은 package.json의 doc:* 스크립트를 본다.
-->
<style>
  :root {
${tokenCss}
    --font: -apple-system, 'Apple SD Gothic Neo', system-ui, 'Segoe UI', sans-serif;
    --mono: ui-monospace, Menlo, monospace;
  }
${BASE_CSS}
${pageCss}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <p class="kicker">${esc(kicker)}</p>
    <h1>${esc(title)}</h1>
    <p>${lede}</p>
    ${howto ? `<div class="howto">${howto}</div>` : ''}
    ${nav ? `<div class="doc-nav">${nav}</div>` : ''}
  </header>

  ${bodyHtml}

  <footer>${footerNote}</footer>
</div>
</body>
</html>
`
}
