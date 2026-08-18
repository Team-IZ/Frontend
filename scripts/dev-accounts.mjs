#!/usr/bin/env node
/*
  백엔드가 준 상태별 테스트 계정 엑셀을 **로그인 화면이 읽는 JSON**으로 바꾼다.

    node scripts/dev-accounts.mjs <엑셀경로> [--out dev-accounts.json] [--per 10]

  ## 왜 스크립트인가

  계정이 194개다. 지금까지 쓰던 `.env.local`의 한 줄 JSON으로는 담을 수 없고(1만 자가
  넘는 한 줄이 된다) 엑셀이 갱신될 때마다 손으로 옮길 수도 없다.

  ## 무엇을 고르나 — 케이스별 최대 N개, 최대한 다르게

  같은 케이스 계정이 여러 개 필요한 이유는 **소모되기 때문**이다(세션을 시작하면 그
  계정은 다시 시작 전으로 안 돌아간다). 그런데 열 명을 아무렇게나 고르면 열 명이 다
  똑같다 — 그러면 하나를 본 것과 다르지 않다.

  **무엇이 다르면 다른 테스트인가**를 두 겹으로 본다.

  ```
  ① 상태     홈 CTA · 세션상태 · 문제 수 · 도달단계 …  ← 화면이 갈리는 축
  ② 반·팀    같은 팀은 제출물·팀명이 전부 같다        ← 데이터가 갈리는 축
  ```

  ①이 먼저다. 화면을 테스트하는데 `RESUME_ASSESSMENT`인 사람과 `WAIT_FOR_REPORT`인
  사람은 완전히 다른 화면이고, 같은 상태에서 반만 다른 것은 거의 같은 화면이다.
  그래서 상태 조합으로 먼저 돌리고 그 안에서 반·팀으로 다시 돌린다.

  ## 시트가 곧 테스트 케이스다

  35차 요청서에 케이스 목록을 적어 보냈더니 백엔드가 **그 목록대로 시트를 갈라 주었다.**
  `문제 20분 초과`처럼 정상 흐름으로 도달할 수 없는 자리는 SQL로 세워 둔 계정이다.
  요약 시트의 `테스트로 볼 것`도 함께 읽어 화면에 그대로 보여준다 — 계정만 있고 무엇을
  볼지 모르면 고를 수가 없다.

  ## 비밀번호는 엑셀에 없다

  `.env.local`의 기존 계정에서 공용 비밀번호를 읽어 쓴다 — 그 기관 계정 대부분이 같은
  해시를 쓴다(백엔드 회신). 자격 증명은 이 스크립트 출력에도, 저장소에도 안 남는다:
  출력 파일은 gitignore 대상이다.
*/
import { readFileSync, writeFileSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'

const PER_STATE = 10

// ── 엑셀(xlsx) 최소 파서 ─────────────────────────────────────────────────────
/*
  의존성을 새로 넣지 않는다. xlsx는 zip 안의 XML이고 우리가 읽을 것은 시트의 셀 문자열
  뿐이라, 필요한 만큼만 직접 푼다.

  ⚠️ 이 파일은 **인라인 문자열**(`<is><t>`)로 저장돼 있어 `sharedStrings.xml`이 없다.
  두 형식을 다 받는다 — 엑셀을 만든 도구가 바뀌면 다른 쪽으로 온다.
*/
function readXlsx(path) {
  const buf = readFileSync(path)
  const files = readZip(buf)
  const wb = files.get('xl/workbook.xml')?.toString('utf8') ?? ''
  const names = [...wb.matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1])

  const shared = []
  const ss = files.get('xl/sharedStrings.xml')?.toString('utf8')
  if (ss) for (const m of ss.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) shared.push(decode(m[1]))

  const sheets = new Map()
  names.forEach((name, i) => {
    const xml = files.get(`xl/worksheets/sheet${i + 1}.xml`)?.toString('utf8')
    if (xml) sheets.set(name, parseSheet(xml, shared))
  })
  return sheets
}

function parseSheet(xml, shared) {
  const rows = []
  for (const rm of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = []
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1] ?? ''
      const inner = cm[2] ?? ''
      const inline = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inner)
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner)
      const isShared = /t="s"/.test(attrs)
      cells.push(
        inline ? decode(inline[1]) : isShared && v ? (shared[+v[1]] ?? '') : decode(v?.[1] ?? ''),
      )
    }
    rows.push(cells)
  }
  return rows
}

const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')

/**
 * zip 중앙 디렉터리를 훑어 `이름 → 내용`으로. deflate와 무압축만 다룬다.
 *
 * ⚠️ zip의 deflate는 **raw**다(zlib 헤더가 없다). `unzipSync`는 헤더를 기대해서
 * `incorrect header check`로 실패한다 — `inflateRawSync`를 써야 한다.
 */
function readZip(buf) {
  const out = new Map()
  // End of central directory: 시그니처를 뒤에서 찾는다
  let eocd = buf.length - 22
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  if (eocd < 0) throw new Error('zip 구조를 읽지 못했습니다 — xlsx가 맞습니까?')
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break
    const method = buf.readUInt16LE(p + 10)
    const compSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const offset = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)

    // 로컬 헤더는 길이가 가변이라 그 자리에서 다시 읽는다
    const lNameLen = buf.readUInt16LE(offset + 26)
    const lExtraLen = buf.readUInt16LE(offset + 28)
    const start = offset + 30 + lNameLen + lExtraLen
    const raw = buf.subarray(start, start + compSize)
    out.set(name, method === 0 ? raw : inflateRawSync(raw))

    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}

// ── 고르기 ───────────────────────────────────────────────────────────────────

/** 큐들을 번갈아 하나씩 — 앞쪽 큐만 소진되는 것을 막는다 */
function roundRobin(queues, per) {
  const picked = []
  let round = 0
  while (picked.length < per) {
    const before = picked.length
    for (const q of queues) {
      if (picked.length >= per) break
      if (q.length > round) picked.push(q[round])
    }
    if (picked.length === before) break // 더 뽑을 것이 없다
    round++
  }
  return picked
}

const bucket = (rows, keyOf) => {
  const m = new Map()
  for (const r of rows) {
    const k = keyOf(r)
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(r)
  }
  return [...m.values()]
}

/**
 * 최대 `per`개를 **상태가 겹치지 않는 순서로** 고른다.
 *
 * ## 왜 두 겹인가
 *
 * 한 시트 안에서도 계정이 다 같지 않다 — `그 외` 시트에는 홈 CTA가 다섯 종류
 * 들어 있고 `분석 완료`에는 문제 2개짜리와 3개짜리가 섞여 있다. **테스트에서
 * 중요한 다양성은 반·팀이 아니라 이 상태 축이다.**
 *
 * 그래서 바깥은 **상태 조합**으로 돌리고, 그 안에서 다시 **반·팀**으로 돌린다.
 * 축이 하나도 안 갈리는 시트(전원 같은 상태)는 자연히 예전과 같은 반·팀 분배가 된다.
 */
function pickDiverse(rows, per, axes) {
  const byState = bucket(rows, (r) => axes.map((a) => r.raw[a] ?? '').join('|'))
  const queues = byState.map((list) =>
    roundRobin(
      bucket(list, (r) => `${r.className}/${r.teamName}`),
      list.length,
    ),
  )
  return roundRobin(queues, per)
}

// ── 실행 ─────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const src = argv.find((a) => !a.startsWith('--'))
const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'dev-accounts.json'
const per = argv.includes('--per') ? Number(argv[argv.indexOf('--per') + 1]) : PER_STATE

if (!src) {
  console.error('사용: node scripts/dev-accounts.mjs <엑셀경로> [--out 파일] [--per 10]')
  process.exit(1)
}

/** `.env.local`의 기존 계정에서 공용 비밀번호를 가져온다 */
function passwordFromEnv() {
  let raw
  try {
    raw = readFileSync('.env.local', 'utf8')
  } catch {
    return null
  }
  const line = raw.split('\n').find((l) => l.startsWith('VITE_DEV_ACCOUNTS='))
  if (!line) return null
  try {
    const list = JSON.parse(line.slice('VITE_DEV_ACCOUNTS='.length).replace(/^'|'$/g, ''))
    return list.find((a) => a.email?.includes('trainee'))?.password ?? list[0]?.password ?? null
  } catch {
    return null
  }
}

const password = passwordFromEnv()
if (!password) {
  console.error('.env.local의 VITE_DEV_ACCOUNTS에서 비밀번호를 찾지 못했습니다.')
  process.exit(1)
}

const sheets = readXlsx(src)

/*
  ## 시트가 곧 테스트 케이스다

  35차 요청서에 케이스 목록을 적어 보냈더니 **백엔드가 그 목록대로 시트를 갈라
  주었다** — `문제 20분 초과`·`세션 60분 초과`·`응시 창 도중에 닫힘`처럼 정상 흐름으로는
  도달할 수 없는 자리는 SQL로 상태를 세워 둔 것이다.

  그래서 묶음의 단위를 **세션 상황**에서 **시트**로 바꿨다. 예전 파일은 시트가 추출
  단위일 뿐이라 안에서 상황별로 다시 갈라야 했는데, 지금은 시트 자체가 *"무엇을
  테스트하는 계정인가"* 다.
*/
const SUMMARY = '요약'

/** 요약 시트의 `테스트로 볼 것` 열 — 시트마다 무엇을 확인하는지 백엔드가 적어 두었다 */
function readHints(rows) {
  const hints = new Map()
  const head = rows.findIndex((r) => r[0] === '시트')
  if (head < 0) return hints
  const [si, wi] = [0, rows[head].indexOf('테스트로 볼 것')]
  if (wi < 0) return hints
  for (const r of rows.slice(head + 1)) {
    if (!r[si] || r[si] === '합계') continue
    if (r[wi]) hints.set(r[si], r[wi])
  }
  return hints
}

/*
  계정마다 붙일 한 줄 — **같은 시트 안에서 이 계정이 남과 어떻게 다른가.**
  시트 안에서 값이 실제로 갈리는 축만 쓴다. 전원 같은 값이면 적어 봐야 소음이다.
*/
const NOTE_AXES = ['홈 CTA', '세션상태', '준비문제수', '도달단계', '응시상태', '무효검토']
const NOTE_FORMAT = {
  준비문제수: (v) => `문제 ${v}개`,
  도달단계: (v) => `도달 ${v}단`,
  // 기본값은 적어 봐야 소음이다 — 검토 중인 것만 말한다
  무효검토: (v) => (v === 'PENDING' ? '무효 검토중' : ''),
}

/**
 * 화면에 보일 한 줄. **고를 때 쓰는 축(`axes`)과 보여줄 축은 다르다** —
 * 다양성은 갈리는 축 전부로 계산하되, 목록에 다섯 개를 늘어놓으면 읽히지 않는다.
 */
const NOTE_SHOWN = 3
const noteOf = (raw, axes) =>
  axes
    .map((ax) => (NOTE_FORMAT[ax] ?? ((v) => v))(raw[ax] ?? ''))
    .filter(Boolean)
    .slice(0, NOTE_SHOWN)
    .join(' · ') || null

const hints = readHints(sheets.get(SUMMARY) ?? [])
const groups = []
/*
  계정이 **하나도 없는 케이스**를 조용히 버리지 않는다. 백엔드가 시트에 이유를 적어 두는데
  (`해당하는 계정이 없다. …`) 그냥 사라지면 화면에서 그 케이스를 못 본다는 사실 자체를
  모르게 된다 — 「목록에 없네」와 「그 상태인 사람이 없네」는 다르다.
*/
const empty = []
let scanned = 0

for (const [sheet, rows] of sheets) {
  if (sheet === SUMMARY || sheet === 'Query' || rows.length < 2) continue
  const head = rows[0]
  const col = (name) => head.indexOf(name)
  const [ci, ai, cls, team, nm] = [col('계정'), col('계정상태'), col('반'), col('팀'), col('이름')]
  if (ci < 0) continue

  const list = []
  for (const r of rows.slice(1)) {
    if (!r[ci]) continue
    if (ai >= 0 && r[ai] !== 'ACTIVE') continue // 비활성 계정은 로그인이 안 된다
    scanned++
    list.push({
      email: r[ci],
      name: r[nm] ?? '',
      className: r[cls] ?? '',
      teamName: r[team] ?? '',
      // 축을 이름으로 읽으려면 헤더가 필요하다 — 뽑을 때만 쓰고 출력에는 안 넣는다
      raw: Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])),
    })
  }
  if (list.length === 0) {
    // 시트 본문에 이유가 한 줄로 적혀 있다 — 열이 아니라 통째로 병합된 칸이다
    const why = rows
      .slice(1)
      .flat()
      .find((c) => c && c.length > 10)
    empty.push({ label: sheet, why: why ?? '계정이 없습니다' })
    continue
  }

  // 이 시트 안에서 **실제로 갈리는** 축만 남긴다
  const axes = NOTE_AXES.filter(
    (ax) => head.includes(ax) && new Set(list.map((r) => r.raw[ax])).size > 1,
  )

  groups.push({
    label: sheet,
    hint: hints.get(sheet) ?? null,
    total: list.length,
    axes,
    accounts: pickDiverse(list, per, axes).map(({ raw, ...a }) => ({
      ...a,
      password,
      note: noteOf(raw, axes),
    })),
  })
}

/*
  순서는 **가나다가 아니라 시트 순서**다. 백엔드가 응시 흐름 순으로 놓아 주었고
  (미응시 → 분석 → 응시 → 종료 → 리포트), 그 순서가 테스트하는 순서와 같다.
  이름순으로 다시 정렬하면 그 뜻이 사라진다.
*/
/*
  **언제 잰 값인지 남긴다.** 상태에는 유효기간이 있다 — 개인 응시 창은 분석 완료 뒤
  24시간이라 `응시 가능` 계정은 하루가 지나면 전부 `창 닫힘`이 된다(실측). 화면이
  라벨만 보여주고 날짜를 숨기면 눌러 보고 나서야 알게 된다.
*/
writeFileSync(out, JSON.stringify({ measuredAt: new Date().toISOString(), groups }, null, 2) + '\n')

const taken = groups.reduce((n, g) => n + g.accounts.length, 0)
console.log(`✓ ${out}`)
console.log(
  `  훑은 계정 ${scanned}개 → 고른 ${taken}개 (케이스 ${groups.length}종 · 케이스별 ≤${per})`,
)
for (const g of groups) {
  const teams = new Set(g.accounts.map((a) => `${a.className}/${a.teamName}`)).size
  const states = new Set(g.accounts.map((a) => a.note ?? '')).size
  const variety = g.axes.length ? `상태 ${states}종 · 반·팀 ${teams}조합` : `반·팀 ${teams}조합`
  console.log(
    `    ${String(g.accounts.length).padStart(2)}/${String(g.total).padEnd(3)} ${g.label.padEnd(14)} (${variety})`,
  )
}
for (const e of empty) console.log(`     0      ${e.label.padEnd(14)} ⚠️  ${e.why}`)

console.log('\n⚠️  이 파일은 자격 증명을 담습니다 — gitignore 대상인지 확인하세요.')
