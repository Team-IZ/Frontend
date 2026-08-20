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

  ## 입력 형식 — 열 자리는 **헤더에서 찾는다**

  `## <역할>` 밑에 표가 오면 된다. 역할 이름은 `오퍼레이터` · `매니저` · `교육생`
  셋을 찾는다. 열 수는 역할마다 다르다:

    오퍼레이터  | # | 이름 | 이메일 | 상태 | 비밀번호 |
    매니저      | # | 이름 | 이메일 | 상태 | 담당 반 | 비밀번호 |
    교육생      | # | 이름 | 이메일 | 상태 | 반 | 팀(4차) | 비밀번호 |

  🔴 처음엔 넷으로 고정해 읽었는데 `상태`·`반`·`팀`이 끼어들며 어긋났다. 네 번째 칸을
  비밀번호로 읽어 **전 계정의 비밀번호가 `ACTIVE`가 됐다**(실측). 표는 266줄을 멀쩡히
  뱉고 로그인만 전부 실패하므로 눈으로는 안 잡힌다.

  ## 무엇으로 묶나 — **반**이다

  예전 명부에는 반이 없어 이메일의 t번호를 50개씩 끊었다("어디까지 썼나"). 이제 명부가
  반·팀을 주므로 반으로 묶는다 — 화면을 볼 때 묻는 것이 "t120번 썼나"가 아니라
  *"이 반 매니저로 이 반 학생을 보고 싶다"* 이기 때문이다.

  **매니저가 자기 반 맨 앞에 선다.** 두 화면을 같은 반으로 짝지어 보게 되는데, 역할별로
  목록이 갈려 있으면 두 그룹을 오가며 이름을 맞춰야 한다. 한 사람이 두 반을 맡으면
  (`담당 반: E반, G반`) 양쪽에 다 넣는다.

  소모 순서는 **팀 번호**가 대신한다 — 반 안에서 1팀부터 차례로 쓰면 된다.

  오퍼레이터·슈퍼 어드민은 반이 없고 수가 적어 겹치기 쉽다. `슬롯 N`을 붙여 맨 앞에 둔다.

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

const cellsOf = (line) =>
  line
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())

/**
 * `## 역할` 밑의 표를 역할별로 모은다 — **열 자리는 헤더에서 찾는다.**
 *
 * 🔴 자리를 박아 두면 안 된다. 역할마다 열이 다르고(오퍼레이터 5 · 매니저 6 · 교육생 7),
 * 다음 명부에서 또 바뀐다. 박아 두었을 때 네 번째 칸(`상태`)을 비밀번호로 읽어 전
 * 계정이 `ACTIVE`가 됐는데, **표는 266줄을 멀쩡히 뱉어서** 로그인해 보기 전까지
 * 몰랐다. 이름으로 찾으면 열이 늘어도 그대로 맞고, 없으면 아래에서 멈춘다.
 */
function readSections(text) {
  const sections = new Map()
  for (const chunk of text.split(/^## /m).slice(1)) {
    const all = chunk.split('\n')
    const title = all[0].split('(')[0].trim()
    const table = all.filter((l) => l.startsWith('|'))
    if (!table.length) continue

    const head = cellsOf(table[0])
    // `팀(4차)`처럼 괄호로 단서를 달아 오므로 앞부분만 맞으면 같은 열로 본다
    const at = (name) => head.findIndex((h) => h.split('(')[0].trim() === name)
    const col = { name: at('이름'), email: at('이메일'), password: at('비밀번호') }

    const rows = table
      .slice(1)
      .map(cellsOf)
      // 구분선(`|---|`)은 헤더 바로 밑에 온다
      .filter((cells) => !/^-+$/.test(cells[0]))
      .map((cells) => ({
        name: cells[col.name],
        email: cells[col.email],
        password: cells[col.password],
        /** 역할마다 다른 열(`반`·`팀`·`담당 반`)은 호출부가 이름으로 꺼낸다 */
        get: (colName) => cells[at(colName)],
      }))

    if (rows.length) sections.set(title, { col, rows })
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

/*
  🔴 **필요한 열이 없으면 여기서 멈춘다.** 없는 열은 `-1`이 되어 `cells[-1]`,
  즉 `undefined`를 조용히 낸다 — 비밀번호가 통째로 빈 목록이 나오고 그것을 로그인
  화면에서야 알게 된다. 이름·이메일·비밀번호 셋은 없으면 계정 구실을 못한다.
*/
for (const [role, { col }] of sections) {
  const gone = Object.entries(col)
    .filter(([, i]) => i < 0)
    .map(([k]) => ({ name: '이름', email: '이메일', password: '비밀번호' })[k])
  if (gone.length) {
    console.error(`「${role}」 표에서 못 찾은 열: ${gone.join(' · ')}`)
    console.error('헤더 이름이 바뀌었는지 확인하세요.')
    process.exit(1)
  }
}

const operators = sections.get('오퍼레이터').rows
const managers = sections.get('매니저').rows
const trainees = sections.get('교육생').rows

/**
 * 이름이 비어 있는 행이 실제로 온다 — 빈 칸으로 두면 어느 계정인지 못 읽는다.
 *
 * `className`·`teamName`은 목록에서 이름 앞에 붙는다(`A반 1팀 문재윤`). 기관명은
 * 전원이 같아 안 넣는다 — 266줄에 같은 값을 반복하면 이름·이메일 자리만 먹고 아무것도
 * 구분해 주지 않는다. 반·팀은 다르다: **그것으로 그룹을 나누고 순서를 정한다.**
 */
const account = (row, { className = '', teamName = '', note = null } = {}) => ({
  email: row.email,
  password: row.password,
  name: row.name.replace('(이름 미기재)', '이름 없음') || '이름 없음',
  className,
  teamName,
  note,
  owner: null,
})

const group = (label, hint, accounts) => ({ label, hint, total: accounts.length, accounts })

const SHARED_HINT = '수가 적어 겹치기 쉬워요 — 슬롯 번호를 나눠 쓰세요'
const slots = (rows) => rows.map((r, i) => account(r, { note: `슬롯 ${i + 1}` }))

/*
  **반이 없는 역할이 맨 앞이다.** 오퍼레이터·슈퍼 어드민은 기수 전체를 보는 자리라
  어느 반에도 안 붙는다. 뒤에 두면 반 열 개를 지나야 나오는데, 화면 전체를 훑는 일은
  반을 고르는 일보다 자주 온다.
*/
const groups = [group('오퍼레이터', SHARED_HINT, slots(operators))]

if (SUPER_ADMIN) {
  groups.unshift(
    group('슈퍼 어드민', '기수 명부 밖 · 하나뿐이라 여럿이 동시에 쓰면 겹쳐요', [
      account(SUPER_ADMIN),
    ]),
  )
} else {
  // 조용히 빠지면 "왜 슈퍼 어드민이 없지"로 시간을 쓴다
  console.warn('  ⚠️ .env.local의 VITE_DEV_ACCOUNTS에서 슈퍼 어드민을 못 찾아 그룹을 뺐습니다')
}

/*
  ## 반으로 묶는다 — 매니저가 자기 반 맨 앞에 선다

  매니저 화면과 교육생 화면은 **같은 반을 놓고 짝으로** 본다. 역할별로 목록이 갈려
  있으면 A반을 열려고 두 그룹을 오가며 이름을 맞춰야 한다.

  한 사람이 두 반을 맡는다(`담당 반: E반, G반`). 그때는 **양쪽에 다 넣는다** — 그 반을
  여는 데 필요한 계정이라 한쪽에만 두면 나머지 반에서 찾을 수 없다.

  **설명(`hint`)은 안 붙인다.** 목록이 이미 그 말을 하고 있다 — 맨 윗줄이 `매니저 ·
  담당 A반`이고 그 아래로 `A반 1팀`부터 번호가 올라간다. 같은 말을 문장으로 한 번 더
  쓰면 스물여섯 줄을 밀어내고 첫 화면에서 계정이 그만큼 덜 보인다.
*/
const byClass = new Map()
const noClass = []

/** `A반` · `E반, G반` 모두 받는다 — 빈 칸(`-`)이면 배정이 없다는 뜻이다 */
const classesOf = (raw) =>
  (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== '-')

const into = (className) => {
  if (!byClass.has(className)) byClass.set(className, { managers: [], students: [] })
  return byClass.get(className)
}

for (const row of managers) {
  const owns = classesOf(row.get('담당 반'))
  if (!owns.length) noClass.push(account(row, { note: '매니저 · 담당 반 없음' }))
  for (const c of owns) {
    into(c).managers.push(account(row, { className: c, note: `매니저 · 담당 ${owns.join(' ')}` }))
  }
}

for (const row of trainees) {
  const [className] = classesOf(row.get('반'))
  const teamName = classesOf(row.get('팀'))[0] ?? ''
  if (!className) {
    noClass.push(account(row, { note: '교육생 · 반 배정 없음' }))
    continue
  }
  into(className).students.push(account(row, { className, teamName }))
}

/** `1팀` → 1. 반 안에서는 팀 번호가 「어디까지 썼나」를 대신한다 */
const teamNo = (a) => Number(/\d+/.exec(a.teamName)?.[0] ?? Number.MAX_SAFE_INTEGER)

for (const className of [...byClass.keys()].sort()) {
  const { managers: mgr, students } = byClass.get(className)
  students.sort((a, b) => teamNo(a) - teamNo(b) || a.name.localeCompare(b.name, 'ko'))
  groups.push(group(className, null, [...mgr, ...students]))
}

if (noClass.length) {
  groups.push(group('반 없음', '명부에 반이 안 적혀 있다 — 반으로 갈리는 화면은 못 본다', noClass))
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
        { label: '교육생', ...pick(trainees[0]) },
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

/*
  같은 계정이 **한 그룹 안에** 두 번 있으면 명부가 겹쳐 적힌 것이다 — 조용히 넘기면
  안 된다. 그룹을 가로질러 겹치는 것은 정상이다: 두 반을 맡은 매니저는 양쪽에 일부러
  넣는다(위 「반으로 묶는다」). 그래서 검사도 그룹 안에서만 한다.
*/
for (const g of groups) {
  const seen = g.accounts.map((a) => a.email)
  const dupes = [...new Set(seen.filter((e, i) => seen.indexOf(e) !== i))]
  if (dupes.length)
    console.warn(`  ⚠️ ${g.label} 이메일 중복 ${dupes.length}건: ${dupes.join(' ')}`)
}
