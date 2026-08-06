#!/usr/bin/env node
/**
 * 디자인 토큰 문서 생성 — `npm run doc:design`
 *
 * src/index.css의 @theme을 읽어 docs/dev/design-system.html을 만든다.
 * 값을 HTML에 손으로 적으면 토큰이 바뀔 때 문서가 조용히 거짓말을 한다.
 * 설명은 design-doc-content.mjs에서만 온다 — 값과 설명 모두 출처가 하나다.
 *
 * 이 문서는 **토큰(값)만** 다룬다. 셸·컴포넌트는 component-doc.mjs가 만드는
 * docs/dev/components.html로 분리했다 — 읽는 목적이 다르다. 값을 고르러 오는
 * 것과 구현을 참고하러 오는 것은 같은 문서에 있을 필요가 없다.
 *
 * `--check`를 주면 생성 결과가 커밋된 파일과 다를 때 실패한다(CI용).
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import {
  ROOT,
  readTokens,
  byPrefix,
  tokenCssBlock,
  esc,
  rationale,
  section,
  pageShell,
} from './doc-shared.mjs'
import { TOKEN_DOCS, OTHER_DOCS, GROUP_RATIONALE } from './design-doc-content.mjs'

const OUT = join(ROOT, 'docs/dev/design-system.html')

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
    title: '개념 도달 단계 (0~4)',
    note: '0→4로 이어지는 정도. 의미 색과는 축이 다르다',
    re: /^reach/,
  },
  {
    title: '어두운 면 (좌측 네비)',
    note: '밝은 배경용 색은 어두운 면에서 통하지 않는다',
    re: /^nav/,
  },
  {
    title: '코드 패널',
    note: '코드 텍스트 블록만 어둡다 — 감싼 패널은 흰 면이다',
    re: /^code/,
  },
]

/* 위 섹션들이 각각 가져가는 접두사. 여기 안 걸리는 토큰은 마지막 섹션에 모인다 */
const TYPED = /^(color|radius|text|font|shadow)-/

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

const PAGE_CSS = `
  .rules { border: 1px solid var(--color-border); background: var(--color-surface); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 40px }
  .rules h2 { font-size: 14px }
  .cols { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; margin-top: 12px }
  @media (max-width: 640px) { .cols { grid-template-columns: 1fr } }
  .cols .ok { font-size: 12px; font-weight: 600; color: var(--color-success) }
  .cols .no { font-size: 12px; font-weight: 600; color: var(--color-danger) }
  pre { margin-top: 4px; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border); background: var(--color-canvas); font-family: var(--mono); font-size: 12px; overflow-x: auto }
  .rules p { color: var(--color-fg-muted); margin-top: 12px }

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

  .rows { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); overflow: hidden }
  .row { display: flex; align-items: baseline; gap: 16px; padding: 12px 16px; border-bottom: 1px solid var(--color-border) }
  .row:last-child { border-bottom: 0 }
  .row code { font-size: 12px; color: var(--color-fg-subtle) }
  .row .k { width: 120px; flex: 0 0 120px }
  .row .val { width: 48px; flex: 0 0 48px }
  .fonts { display: flex; flex-wrap: wrap; gap: 24px; margin-top: 16px }

  .boxes { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end }
  .boxes > div { text-align: center }
  .boxes b { display: block; width: 64px; height: 64px; border: 1px solid var(--color-border-strong); background: var(--color-surface) }
  .boxes code { display: block; margin-top: 4px; font-size: 12px; color: var(--color-fg-subtle) }
`

function build() {
  const tokens = readTokens()
  const colors = byPrefix(tokens, 'color-')
  const radii = byPrefix(tokens, 'radius-')
  const texts = byPrefix(tokens, 'text-')
  const fonts = byPrefix(tokens, 'font-')
  const adjusted = colors.filter((c) => TOKEN_DOCS[c.short]?.adjusted).length
  const hasShadow = tokens.some((t) => t.name.startsWith('shadow-'))
  const others = tokens.filter((t) => !TYPED.test(t.name))

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

  const bodyHtml = `
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

  ${section('색', colors.length, `값이 조정된 토큰 ${adjusted}개는 카드에 ✎ 표시가 있다`, colorSections + restSection)}

  ${section(
    '글자 크기',
    texts.length,
    '데이터 밀도가 높은 운영 도구라 기준이 14px다(웹 기본 16px 아님)',
    `<div class="rows">
      ${texts
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
        q: '2xs·3xl은 어디 쓰나',
        a: '2xs(11px)는 확정 화면 실측에서 가장 많이 쓰인 크기(148회)라 뒤늦게 승격했다 — 배지·메타·표의 보조 정보. 3xl은 인증 화면의 마케팅 헤드라인 전용이다.',
      },
    ])}
    <div class="fonts">
      ${fonts
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
    radii.length + (hasShadow ? 1 : 0),
    null,
    `<div class="boxes">
      ${radii.map((r) => `<div><b style="border-radius:${esc(r.value)}"></b><code>rounded-${esc(r.short)} · ${esc(r.value)}</code></div>`).join('')}
      ${hasShadow ? `<div><b style="border-radius:var(--radius-lg);border-color:transparent;box-shadow:var(--shadow-card)"></b><code>shadow-card</code></div>` : ''}
    </div>
    ${rationale([
      {
        q: '그림자가 왜 하나뿐인가',
        a: '이 제품에서 떠 있어야 하는 것은 카드뿐이다. 모달은 배경을 덮어 구분되고, 나머지는 테두리로 나뉜다. 그림자 단계를 여럿 두면 "얼마나 떠 있나"를 매번 고민하게 된다.',
      },
    ])}`,
  )}

  ${section(
    '그 외',
    others.length,
    '색·글자·모서리 어디에도 속하지 않는 값. 설명이 비어 있으면 OTHER_DOCS에 추가한다',
    `<div class="rows">
      ${others
        .map(
          (t) =>
            `<div class="row"><code class="k">${esc(t.name)}</code><code class="val">${esc(t.value)}</code><span>${esc(OTHER_DOCS[t.name]?.use ?? '설명 없음 — scripts/design-doc-content.mjs의 OTHER_DOCS에 추가할 것')}</span></div>`,
        )
        .join('')}
    </div>
    ${rationale(
      others
        .filter((t) => OTHER_DOCS[t.name]?.note)
        .map((t) => ({ q: `${t.name}은 왜 토큰인가`, a: OTHER_DOCS[t.name].note })),
    )}`,
  )}`

  return pageShell({
    title: 'IZ-Get · 디자인 시스템',
    kicker: '생성된 문서 · 직접 고치지 않는다',
    lede: `값은 <code>src/index.css</code>에서 읽어 만든다. 셸·컴포넌트는 <a href="./components.html">구현 문서</a>에 있다.`,
    howto: `<b>카드에 커서를 올리면</b> 언제 쓰는 색인지 나온다. <b>「왜 이렇게 정했나」를 누르면</b> 설계 근거가 열린다.
      키보드로는 Tab으로 카드에 이동하면 같은 내용이 보인다.`,
    nav: `<a class="on" href="./design-system.html">토큰</a><a href="./components.html">셸 · 컴포넌트</a>`,
    tokenCss: tokenCssBlock(tokens),
    pageCss: PAGE_CSS,
    bodyHtml,
    footerNote: `생성 명령 <code>npm run doc:design</code> · 값 <code>src/index.css</code> · 설명 <code>scripts/design-doc-content.mjs</code>`,
  })
}

/* ── 실행 ────────────────────────────────────────────── */

const html = build()

if (process.argv.includes('--check')) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''
  if (current !== html) {
    console.error('\n✗ 디자인 토큰 문서가 토큰과 어긋난다.')
    console.error('    npm run doc:design 을 실행하고 결과를 커밋할 것.\n')
    process.exit(1)
  }
  console.log('✓ 디자인 토큰 문서가 최신이다')
} else {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, html)
  console.log(`✓ ${OUT.slice(ROOT.length)} 생성됨`)
}
