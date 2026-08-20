#!/usr/bin/env node
/*
  기관이 준 **계정 목록 마크다운**을 로그인 화면이 읽는 JSON으로 바꾼다.

    node scripts/dev-team-accounts.mjs <마크다운경로> [--out dev-team-accounts.json]

  ## 왜 또 스크립트인가 — `dev-accounts.mjs`와 무엇이 다른가

  | | 무엇을 받나 | 무엇이 들어 있나 |
  |---|---|---|
  | `dev-accounts.mjs` | 백엔드가 준 **엑셀** | 교육생 **상태별**(미응시·응시중·창 닫힘…) |
  | 이 스크립트 | 기관이 준 **마크다운** | 한 기수 **전원**(오퍼레이터·매니저·교육생) |

  앞은 *"이 상태를 보고 싶다"* 로 고르는 목록이고, 이쪽은 상태가 아예 없다. **역할별
  전원 명부**라 고르는 축이 다르다(아래 「무엇으로 묶나」).

  ## 입력 형식

  `## <역할>` 밑에 `| # | 이름 | 이메일 | 비밀번호 |` 표가 오면 된다. 역할 이름은
  `오퍼레이터` · `매니저` · `교육생` 셋을 찾는다.

  ## 무엇으로 묶나 — 상태가 없으면 「소모」가 축이다

  상태가 없으니 `미응시`처럼 화면이 갈리는 축으로는 못 나눈다. 그런데 교육생 계정은
  **소모된다** — 세션을 시작하면 그 계정은 시작 전으로 안 돌아간다. 그래서 남는
  질문은 하나다: *"어디까지 썼나."* 이메일의 t번호를 50개 단위로 끊어 **앞에서부터
  차례로** 쓰게 한다. 이름 가나다순으로 묶으면 이 질문에 답할 수 없다.

  오퍼레이터·매니저는 일곱뿐이라 묶을 것이 없다. 대신 `슬롯 N`을 붙인다.

  ## 담당자 이름을 넣지 않는다

  예전 판은 계정마다 `owner`에 **팀원 이름**을 적어 두고 화면이 그것으로 걸렀다.
  이 저장소는 **외부에 공개**되고 이 값은 **번들에 그대로 들어가므로**, 팀원 이름을
  넣으면 실명이 배포본에 실려 나간다. 그래서 `owner`를 전부 비우고 자리 번호만 남긴다 —
  누가 몇 번인지는 저장소 밖에서 정한다.

  `owner`가 비면 화면의 담당자 줄은 스스로 사라진다(`CaseAccountPicker`). 화면 코드를
  고칠 필요가 없다.

  ⚠️ **출력에는 비밀번호가 들어간다.** 출력 파일과 함께 만드는 `.env` 한 줄 모두
  gitignore 대상이다. 배포 번들에 실린다는 사실은 그대로이므로 운영 환경에는 넣지 않는다.
*/
import { readFileSync, writeFileSync } from 'node:fs'

/** 교육생을 끊는 단위. 소모된 자리를 앞에서부터 지워 나가는 크기다 */
const BLOCK = 50

/**
 * 기수 명부 **밖**의 슈퍼 어드민 — `.env.local`의 기존 `VITE_DEV_ACCOUNTS`에서 가져온다.
 *
 * 기관 명부에는 슈퍼 어드민이 없다(기관 소속이 아니라 서비스 운영자다). 그런데 이 역할의
 * 화면도 테스트해야 하므로 예전부터 쓰던 계정을 그대로 이어 받는다.
 *
 * 🔴 **여기에 값을 적어 두지 않는다.** 이 파일은 저장소에 들어가고 저장소는 외부에
 * 공개된다 — 상수로 박으면 자격 증명이 그대로 공개된다. 자격 증명은 gitignore 대상인
 * `.env.local`에만 산다.
 *
 * 못 찾으면 그 그룹만 빼고 나머지는 그대로 만든다. **하나뿐이라 슬롯을 붙이지 않는다** —
 * 나눌 것이 없는데 번호를 주면 나눠 쓸 수 있다는 뜻이 된다.
 */
function readSuperAdmin() {
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
    const hit = list.find((a) => a.label?.includes('슈퍼') || a.label?.includes('어드민'))
    return hit ? { name: hit.label, email: hit.email, password: hit.password } : null
  } catch {
    return null
  }
}

const SUPER_ADMIN = readSuperAdmin()

const argv = process.argv.slice(2)
const src = argv.find((a) => !a.startsWith('--'))
const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'dev-team-accounts.json'

if (!src) {
  console.error('사용: node scripts/dev-team-accounts.mjs <마크다운경로> [--out 파일]')
  process.exit(1)
}

/** `## 역할` 밑의 표를 역할별로 모은다 — 열 순서는 `# · 이름 · 이메일 · 비밀번호` */
function readSections(text) {
  const sections = new Map()
  for (const chunk of text.split(/^## /m).slice(1)) {
    const lines = chunk.split('\n')
    const title = lines[0].split('(')[0].trim()
    const rows = []
    for (const line of lines.slice(1)) {
      if (!line.startsWith('|')) continue
      const cells = line.replace(/^\||\|$/g, '').split('|')
      const [no, name, email, password] = cells.map((c) => c.trim())
      // 헤더(`| # | 이름 |`)와 구분선(`|---|`)을 같은 자리에서 걸러낸다
      if (cells.length < 4 || no === '#' || /^-+$/.test(no)) continue
      rows.push({ name, email, password })
    }
    if (rows.length) sections.set(title, rows)
  }
  return sections
}

const sections = readSections(readFileSync(src, 'utf8'))

const missing = ['오퍼레이터', '매니저', '교육생'].filter((r) => !sections.has(r))
if (missing.length) {
  // 조용히 빈 그룹을 내면 "왜 목록이 없지"로 시간을 쓴다
  console.error(`마크다운에서 찾지 못한 역할: ${missing.join(' · ')}`)
  console.error('`## 오퍼레이터` 같은 제목 밑에 표가 있어야 합니다.')
  process.exit(1)
}

const operators = sections.get('오퍼레이터')
const managers = sections.get('매니저')
const trainees = sections.get('교육생')

/** 이름이 비어 있는 행이 실제로 온다 — 빈 칸으로 두면 어느 계정인지 못 읽는다 */
const account = (row, note = null) => ({
  email: row.email,
  password: row.password,
  name: row.name.replace('(이름 미기재)', '이름 없음') || '이름 없음',
  /*
    전원이 같은 기관이라 비운다. 266줄에 같은 기관명을 반복하면 이름·이메일이 들어갈
    자리만 먹는다 — 모두 같은 값은 아무것도 구분해 주지 않는다.
  */
  className: '',
  teamName: '',
  note,
  owner: null,
})

const group = (label, hint, accounts) => ({ label, hint, total: accounts.length, accounts })

const SHARED_HINT = '7개뿐이라 겹치기 쉬워요 — 슬롯 번호를 나눠 쓰세요'
const slots = (rows) => rows.map((r, i) => account(r, `슬롯 ${i + 1}`))

const groups = [
  group('오퍼레이터', SHARED_HINT, slots(operators)),
  group('매니저', SHARED_HINT, slots(managers)),
]

if (SUPER_ADMIN) {
  groups.push(
    group('슈퍼 어드민', '기수 명부 밖 · 하나뿐이라 여럿이 동시에 쓰면 겹쳐요', [
      account(SUPER_ADMIN),
    ]),
  )
} else {
  // 조용히 빠지면 "왜 슈퍼 어드민이 없지"로 시간을 쓴다
  console.warn('  ⚠️ .env.local의 VITE_DEV_ACCOUNTS에서 슈퍼 어드민을 못 찾아 그룹을 뺐습니다')
}

// t번호가 있는 것과 없는 것을 가른다 — 번호가 없으면 「어디까지 썼나」에 못 넣는다
const numbered = []
const rest = []
for (const row of trainees) {
  const m = /^t(\d+)@/.exec(row.email)
  if (m) numbered.push({ no: Number(m[1]), row })
  else rest.push(row)
}
numbered.sort((a, b) => a.no - b.no)

const TRAINEE_HINT = '쓴 계정은 되돌아오지 않아요 — 앞에서부터 차례로 쓰세요'
const last = numbered.at(-1)?.no ?? 0
for (let start = 1; start <= last; start += BLOCK) {
  const end = start + BLOCK - 1
  const rows = numbered.filter((n) => n.no >= start && n.no <= end)
  if (!rows.length) continue
  const pad = String(last).length
  const label = `교육생 t${String(start).padStart(pad, '0')}–t${String(end).padStart(pad, '0')}`
  groups.push(
    group(
      label,
      TRAINEE_HINT,
      rows.map(({ row }) => account(row)),
    ),
  )
}
if (rest.length) {
  groups.push(
    group(
      '교육생 그 외',
      't번호가 아닌 계정',
      rest.map((r) => account(r)),
    ),
  )
}

const data = { groups }
writeFileSync(out, JSON.stringify(data, null, 2) + '\n')

/*
  배포용 한 줄도 같이 낸다. 파일만 내면 배포 화면에서 목록이 영영 안 나온다 —
  gitignore 대상이라 저장소에 없고, 저장소에 없으면 번들에도 없기 때문이다.
*/
const envOut = out.replace(/\.json$/, '') + '.env'
writeFileSync(
  envOut,
  `VITE_TEAM_ACCOUNTS='${JSON.stringify(data)}'\n\n` +
    `VITE_DEV_ACCOUNTS='${JSON.stringify(
      [
        SUPER_ADMIN && { label: '슈퍼 어드민', ...pick(SUPER_ADMIN) },
        { label: '오퍼레이터', ...pick(operators[0]) },
        { label: '매니저', ...pick(managers[0]) },
        { label: '교육생', ...pick(numbered[0]?.row ?? trainees[0]) },
      ].filter(Boolean),
    )}'\n`,
)

function pick({ email, password }) {
  return { email, password }
}

const total = groups.reduce((n, g) => n + g.total, 0)
console.log(`${src} → ${out} · ${envOut}`)
console.log(`  계정 ${total}개 · 그룹 ${groups.length}종`)
for (const g of groups) console.log(`    ${g.label.padEnd(20)} ${String(g.total).padStart(3)}`)

// 같은 계정이 두 줄에 있으면 하나는 이미 남이 쓴 것이다 — 조용히 넘기면 안 된다
const emails = groups.flatMap((g) => g.accounts.map((a) => a.email))
const dupes = emails.filter((e, i) => emails.indexOf(e) !== i)
if (dupes.length)
  console.warn(`  ⚠️ 이메일 중복 ${dupes.length}건: ${[...new Set(dupes)].join(' ')}`)
