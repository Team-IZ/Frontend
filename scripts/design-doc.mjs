#!/usr/bin/env node
/**
 * 디자인 시스템 문서 생성 — `npm run doc:design`
 *
 * src/index.css의 @theme을 읽어 docs/dev/design-system.html을 만든다.
 * 값을 HTML에 손으로 적으면 토큰이 바뀔 때 문서가 조용히 거짓말을 한다.
 * 설명은 design-doc-content.mjs에서만 온다 — 값과 설명 모두 출처가 하나다.
 *
 * `--check`를 주면 생성 결과가 커밋된 파일과 다를 때 실패한다(CI용).
 * 토큰을 고치고 문서를 안 만들면 팀이 낡은 문서를 보게 되므로 기계가 잡는다.
 *
 * 결과물은 빌드 없이 브라우저로 바로 열 수 있어야 한다(팀 공유용).
 * 따라서 CSS·JS를 전부 인라인하고 외부 자원을 참조하지 않는다.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { TOKEN_DOCS, GROUP_RATIONALE } from './design-doc-content.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const SOURCE = join(ROOT, 'src/index.css')
const OUT = join(ROOT, 'docs/dev/design-system.html')

/* ── 토큰 읽기 ───────────────────────────────────────── */

/** @theme 블록에서 `--name: value` 를 뽑는다. 주석은 값에 섞이지 않게 먼저 지운다. */
function readTokens() {
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

const byPrefix = (tokens, p) =>
  tokens.filter((t) => t.name.startsWith(p)).map((t) => ({ ...t, short: t.name.slice(p.length) }))

/* ── 색 분류 ─────────────────────────────────────────── */

const COLOR_GROUPS = [
  { title: '표면', note: '무엇이 무엇 위에 얹히는지를 정한다', re: /^(canvas|surface|border)/ },
  { title: '전경 (글자)', note: '이름이 곧 역할이다. 번호가 아니다', re: /^fg/ },
  { title: '브랜드', note: '액센트는 하나뿐이다', re: /^(primary|brand)/ },
  {
    title: '의미 색',
    note: '같은 의미 = 항상 같은 색. 화면에서 임의 색을 신설하지 않는다',
    re: /^(danger|warning|success|info|neutral)/,
  },
  {
    title: '어두운 면 (좌측 네비)',
    note: '밝은 배경용 색은 어두운 면에서 통하지 않는다',
    re: /^nav/,
  },
]

/* ── HTML 조각 ───────────────────────────────────────── */

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )

function swatch(t) {
  const doc = TOKEN_DOCS[t.short]
  const mark = doc?.adjusted
    ? `<span class="mark" title="값이 조정된 토큰" aria-label="값이 조정된 토큰">✎</span>`
    : ''
  const pop = doc
    ? `<div class="pop">
        <p>${esc(doc.use)}</p>
        ${doc.example ? `<p class="ex">예 · <span>${esc(doc.example)}</span></p>` : ''}
        ${doc.note ? `<p class="note">${esc(doc.note)}</p>` : ''}
      </div>`
    : ''
  return `<div class="sw" tabindex="0">
    <div class="swbox">
      <i style="background:var(--${t.name})"></i>
      <div class="swtxt">
        <code class="n">${esc(t.short)}${mark}</code>
        <code class="v">${esc(t.value)}</code>
      </div>
    </div>${pop}
  </div>`
}

function rationale(items) {
  if (!items?.length) return ''
  return `<details>
    <summary>왜 이렇게 정했나 <span class="cnt">(${items.length})</span></summary>
    <div class="qa">
      ${items.map((it) => `<div><p class="q">${esc(it.q)}</p><p class="a">${esc(it.a)}</p></div>`).join('\n')}
    </div>
  </details>`
}

function section(title, count, caption, inner) {
  return `<section>
    <h2>${esc(title)} <span class="cnt">${count}</span></h2>
    ${caption ? `<p class="cap">${esc(caption)}</p>` : ''}
    ${inner}
  </section>`
}

/* ── 문서 조립 ───────────────────────────────────────── */

function build() {
  const tokens = readTokens()
  const colors = byPrefix(tokens, 'color-')
  const radii = byPrefix(tokens, 'radius-')
  const texts = byPrefix(tokens, 'text-')
  const fonts = byPrefix(tokens, 'font-')
  const adjusted = colors.filter((c) => TOKEN_DOCS[c.short]?.adjusted).length

  const used = new Set()
  const colorSections = COLOR_GROUPS.map((g) => {
    const items = colors.filter((c) => {
      if (used.has(c.short) || !g.re.test(c.short)) return false
      used.add(c.short)
      return true
    })
    return `<div class="grp">
      <h3>${esc(g.title)}</h3><p class="cap">${esc(g.note)}</p>
      <div class="grid">${items.map(swatch).join('')}</div>
      ${rationale(GROUP_RATIONALE[g.title])}
    </div>`
  }).join('\n')

  const rest = colors.filter((c) => !used.has(c.short))
  const restSection = rest.length
    ? `<div class="grp">
        <h3>그 외</h3>
        <p class="cap">위 분류에 속하지 않는 것. 우리가 정의한 토큰이 여기 나타나면 분류가 빠진 것이다.</p>
        <div class="grid">${rest.map(swatch).join('')}</div>
      </div>`
    : ''

  return page({
    colorCount: colors.length,
    adjusted,
    colorSections: colorSections + restSection,
    texts,
    fonts,
    radii,
    hasShadow: tokens.some((t) => t.name.startsWith('shadow-')),
    tokenCss: tokens.map((t) => `    --${t.name}: ${t.value};`).join('\n'),
  })
}

function page(d) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>IZ-Get · 디자인 시스템</title>
<!--
  이 파일은 생성물이다. 직접 고치지 말고 아래를 고친 뒤 다시 만든다.
    값     src/index.css
    설명   scripts/design-doc-content.mjs
    생성   npm run doc:design
-->
<style>
  :root {
${d.tokenCss}
    --font: -apple-system, 'Apple SD Gothic Neo', system-ui, 'Segoe UI', sans-serif;
    --mono: ui-monospace, Menlo, monospace;
  }
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

  section { margin-bottom: 48px }
  h2 { font-size: 18px; display: flex; align-items: baseline; gap: 8px }
  h2 .cnt { font-size: 14px; font-weight: 400; color: var(--color-fg-subtle) }
  .cap { font-size: 12px; color: var(--color-fg-subtle); margin-top: 4px }
  .grp { margin-bottom: 32px }
  h3 { font-size: 14px; margin-bottom: 2px }

  /* 사용법 */
  .rules { border: 1px solid var(--color-border); background: var(--color-surface); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 40px }
  .rules h2 { font-size: 14px }
  .cols { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; margin-top: 12px }
  @media (max-width: 640px) { .cols { grid-template-columns: 1fr } }
  .cols .ok { font-size: 12px; font-weight: 600; color: var(--color-success) }
  .cols .no { font-size: 12px; font-weight: 600; color: var(--color-danger) }
  pre { margin-top: 4px; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border); background: var(--color-canvas); font-family: var(--mono); font-size: 12px; overflow-x: auto }
  .rules p { color: var(--color-fg-muted); margin-top: 12px }

  /* 색 카드 — 2층은 호버·포커스로 연다 */
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; margin: 12px 0 }
  .sw { position: relative; outline: none }
  .swbox { display: flex; align-items: center; gap: 12px; padding: 8px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface) }
  .sw:hover .swbox { border-color: var(--color-border-strong) }
  .sw:focus .swbox { border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary-soft) }
  .swbox i { width: 40px; height: 40px; flex: 0 0 40px; border-radius: 6px; border: 1px solid var(--color-border); display: block }
  .swtxt { min-width: 0 }
  .swtxt .n { display: block; font-size: 12px; font-weight: 600 }
  .swtxt .v { display: block; font-size: 12px; color: var(--color-fg-subtle) }
  .mark { color: var(--color-warning); margin-left: 4px }

  .pop {
    position: absolute; top: 100%; left: 0; z-index: 10; width: 280px; margin-top: 4px;
    padding: 12px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
    background: var(--color-surface); box-shadow: var(--shadow-card);
    visibility: hidden; opacity: 0;
  }
  .sw:hover .pop, .sw:focus .pop, .sw:focus-within .pop { visibility: visible; opacity: 1 }
  .pop .ex { font-size: 12px; color: var(--color-fg-subtle); margin-top: 8px }
  .pop .ex span { color: var(--color-fg-muted) }
  .pop .note { font-size: 12px; color: var(--color-fg-muted); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--color-border) }

  /* 3층 — 클릭해서 연다. 접혀 있어도 내용은 문서에 있어 검색·인쇄된다 */
  details { border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface-2); margin-top: 8px }
  summary { cursor: pointer; padding: 8px 12px; font-size: 12px; font-weight: 600; color: var(--color-fg-muted) }
  summary .cnt { font-weight: 400; color: var(--color-fg-subtle) }
  .qa { padding: 12px; border-top: 1px solid var(--color-border); display: grid; gap: 12px }
  .qa .q { font-size: 14px; font-weight: 600 }
  .qa .a { font-size: 14px; color: var(--color-fg-muted); margin-top: 4px; line-height: 1.65 }

  /* 타이포 */
  .rows { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); overflow: hidden }
  .row { display: flex; align-items: baseline; gap: 16px; padding: 12px 16px; border-bottom: 1px solid var(--color-border) }
  .row:last-child { border-bottom: 0 }
  .row code { font-size: 12px; color: var(--color-fg-subtle) }
  .row .k { width: 120px; flex: 0 0 120px }
  .row .val { width: 48px; flex: 0 0 48px }
  .fonts { display: flex; flex-wrap: wrap; gap: 24px; margin-top: 16px }

  /* 모서리·그림자 */
  .boxes { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end }
  .boxes > div { text-align: center }
  .boxes b { display: block; width: 64px; height: 64px; border: 1px solid var(--color-border-strong); background: var(--color-surface) }
  .boxes code { display: block; margin-top: 4px; font-size: 12px; color: var(--color-fg-subtle) }

  /* 셸 */
  .cards { display: grid; gap: 12px; grid-template-columns: 1fr 1fr }
  @media (max-width: 640px) { .cards { grid-template-columns: 1fr } }
  .card { display: block; padding: 16px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); text-decoration: none; color: inherit }
  .card:hover { border-color: var(--color-border-strong) }
  .card .top { display: flex; align-items: baseline; justify-content: space-between }
  .card .nm { font-family: var(--mono); font-size: 14px; font-weight: 600 }
  .card .uses { font-size: 12px; color: var(--color-fg-subtle) }
  .card .desc { font-size: 14px; color: var(--color-fg-muted); margin-top: 8px }
  .card .go { display: inline-block; margin-top: 12px; font-size: 14px; color: var(--color-primary) }

  .empty { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); padding: 24px }
  .empty p + p { color: var(--color-fg-muted); margin-top: 8px }
  footer { border-top: 1px solid var(--color-border); padding-top: 16px; font-size: 12px; color: var(--color-fg-subtle) }
  :focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <p class="kicker">생성된 문서 · 직접 고치지 않는다</p>
    <h1>디자인 시스템</h1>
    <p>화면을 만들기 전에 여기서 쓸 토큰을 고른다. 값은 <code>src/index.css</code>에서 읽어 만든다.</p>
    <div class="howto">
      <b>카드에 커서를 올리면</b> 언제 쓰는 색인지 나온다. <b>「왜 이렇게 정했나」를 누르면</b> 설계 근거가 열린다.
      키보드로는 Tab으로 카드에 이동하면 같은 내용이 보인다.
    </div>
  </header>

  <div class="rules">
    <h2>쓰는 법</h2>
    <div class="cols">
      <div>
        <p class="ok">이렇게</p>
        <pre>&lt;div className="bg-surface text-fg-muted
     border-border rounded-lg"&gt;</pre>
      </div>
      <div>
        <p class="no">이렇게 말고</p>
        <pre>&lt;div className="bg-[#fff] text-[#5a616b]"
     style={{ color: '#5a616b' }}&gt;</pre>
      </div>
    </div>
    <p>하드코딩한 색은 <code>npm run check:design</code>이 막는다. 크기·간격에 임의값(<code>h-[46px]</code>)을 쓰는 것은 막지 않지만, <b>같은 값이 세 번 반복되면 토큰으로 올린다.</b></p>
    <p>쓸 토큰이 없으면 임의 색을 만들지 말고 먼저 묻는다 — 대개 이미 있는 의미에 이름을 잘못 찾고 있는 경우다.</p>
  </div>

  ${section('색', d.colorCount, `값이 조정된 토큰 ${d.adjusted}개는 카드에 ✎ 표시가 있다`, d.colorSections)}

  ${section(
    '글자 크기',
    d.texts.length,
    '데이터 밀도가 높은 운영 도구라 기준이 14px다(웹 기본 16px 아님)',
    `<div class="rows">
      ${d.texts
        .map(
          (t) =>
            `<div class="row"><code class="k">text-${esc(t.short)}</code><code class="val">${esc(t.value)}</code><span style="font-size:${esc(t.value)}">다람쥐 헌 쳇바퀴에 타고파</span></div>`,
        )
        .join('')}
    </div>
    ${rationale([
      {
        q: '왜 기본이 16px이 아닌가',
        a: '한 화면에 표·지표·목록이 함께 놓이는 운영 도구다. 16px 기준으로 잡으면 표가 한 화면에 안 들어와 스크롤이 늘고, 그러면 비교가 어려워진다. 대신 대비를 AA로 유지해 작아도 읽히게 했다.',
      },
      {
        q: '3xl은 어디 쓰나',
        a: '인증 화면의 마케팅 헤드라인 전용이다. 앱 내부 화면에는 그만한 글자가 없다.',
      },
    ])}
    <div class="fonts">
      ${d.fonts
        .map(
          (f) =>
            `<div><code class="v">font-${esc(f.short)}</code><p style="font-family:${esc(f.value)};font-size:16px">다람쥐 Sphinx 0123</p></div>`,
        )
        .join('')}
    </div>
    ${rationale([
      {
        q: '왜 웹폰트를 안 쓰나',
        a: '한글 웹폰트는 용량이 크고, 라틴 전용 폰트를 넣어봐야 한글은 결국 시스템 폰트로 폴백된다. 얻는 것보다 첫 화면이 느려지는 비용이 크다고 봤다.',
      },
    ])}`,
  )}

  ${section(
    '모서리 · 그림자',
    d.radii.length + (d.hasShadow ? 1 : 0),
    null,
    `<div class="boxes">
      ${d.radii.map((r) => `<div><b style="border-radius:${esc(r.value)}"></b><code>rounded-${esc(r.short)} · ${esc(r.value)}</code></div>`).join('')}
      ${d.hasShadow ? `<div><b style="border-radius:var(--radius-lg);border-color:transparent;box-shadow:var(--shadow-card)"></b><code>shadow-card</code></div>` : ''}
    </div>
    ${rationale([
      {
        q: '그림자가 왜 하나뿐인가',
        a: '이 제품에서 떠 있어야 하는 것은 카드뿐이다. 모달은 배경을 덮어 구분되고, 나머지는 테두리로 나뉜다. 그림자 단계를 여럿 두면 "얼마나 떠 있나"를 매번 고민하게 된다.',
      },
    ])}`,
  )}

  ${section(
    '셸',
    2,
    '아래는 설계 원본인 와이어프레임으로 연결된다',
    `<div class="cards">
      <a class="card" href="../plan/screen/wireframe/shared/login.html">
        <div class="top"><span class="nm">AuthShell</span><span class="uses">4~7 / 17 화면</span></div>
        <p class="desc">좌 브랜드 패널 + 우 폼. 구조는 고정이고 헤드라인·설명·각주만 받는다.</p>
        <span class="go">와이어프레임 열기 →</span>
      </a>
      <a class="card" href="../plan/screen/wireframe/manager/dashboard.html">
        <div class="top"><span class="nm">ManagerShell</span><span class="uses">7~9 / 17 화면</span></div>
        <p class="desc">상단바(브랜드·기수 선택기·사용자) + 좌측 네비 184px + 콘텐츠. 총괄 전용 항목을 가린다.</p>
        <span class="go">와이어프레임 열기 →</span>
      </a>
    </div>
    ${rationale([
      {
        q: '왜 셸을 먼저 만들었나',
        a: '확정 화면 17개에서 무엇이 가장 많이 반복되는지 세어봤더니 개별 컴포넌트가 아니라 셸이었다(레이아웃 골격 9회, 네비·콘텐츠 9회, 상단바 8회). 둘이 나눠 개발하면 각자 셸을 만들게 되고, 그러면 가장 크고 가장 많이 쓰이는 것을 두 벌 갖게 된다.',
      },
      {
        q: '페이지 제목·주액션은 왜 셸이 안 받나',
        a: '화면마다 탭이 끼거나 제목 옆에 총개수가 붙는 등 조합이 달라서, 셸이 다 받으면 props가 계속 늘어난다. 별도 컴포넌트로 둔다.',
      },
    ])}`,
  )}

  ${section(
    '컴포넌트',
    0,
    null,
    `<div class="empty">
      <p><b>아직 없다.</b></p>
      <p>Button · Badge · Card · 표 배치 · PageHeader가 다음 순서다. 만들어지는 대로 여기에 쌓인다.</p>
    </div>
    ${rationale([
      {
        q: '왜 미리 다 만들어두지 않나',
        a: '화면 하나만 보고 뽑은 컴포넌트는 두 번째 화면에서 대개 틀린다. 같은 조각이 세 번 반복되는 것을 확인한 뒤에 뽑는다. 지금 만드는 것들은 확정 화면 17개에서 5회 이상 반복되는 것만 고른 것이다.',
      },
      {
        q: '필요한 컴포넌트가 없으면',
        a: '내 도메인 폴더 안에 만든다(features/{도메인}/components). 다른 도메인에서도 같은 것이 필요해지면 그때 공용으로 올린다. 처음부터 공용으로 만들면 한 곳의 사정에 맞춘 것이 공용이 된다.',
      },
    ])}`,
  )}

  <footer>
    생성 명령 <code>npm run doc:design</code> · 값 <code>src/index.css</code> · 설명 <code>scripts/design-doc-content.mjs</code>
  </footer>
</div>
</body>
</html>
`
}

/* ── 실행 ────────────────────────────────────────────── */

const html = build()

if (process.argv.includes('--check')) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''
  if (current !== html) {
    console.error('\n✗ 디자인 시스템 문서가 토큰과 어긋난다.')
    console.error('    npm run doc:design 을 실행하고 결과를 커밋할 것.\n')
    process.exit(1)
  }
  console.log('✓ 디자인 시스템 문서가 최신이다')
} else {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, html)
  console.log(`✓ ${OUT.slice(ROOT.length)} 생성됨`)
}
