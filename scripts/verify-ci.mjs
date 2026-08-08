#!/usr/bin/env node
/*
  CI를 로컬에서 그대로 재현한다 — `npm run verify:ci`

  ## 왜 필요한가 — 로컬 검사는 CI와 다른 것을 본다
  ① **커밋 안 된 파일까지 검사한다.** 내 폴더에서 `npm run lint`를 돌리면 PR에 안 들어간
     파일도 같이 본다. CI는 커밋된 것만 본다.
  ② **`node_modules`가 이미 있다.** CI는 매번 `npm ci`로 새로 설치한다.

  ②가 실제로 우리를 물었다(#132). `package.json`에 의존성을 선언하고 `package-lock.json`을
  다른 커밋으로 보냈더니 CI가 `npm ci`에서 죽었는데, 로컬은 이미 설치돼 있어 전부 통과했다.
  **설치 단계를 안 거치니 알아챌 방법이 없었다.**

  ## 훅이 아니라 명령인 이유
  `npm ci` + 빌드가 1분 가까이 걸린다. 매 커밋에 붙이면 `--no-verify`로 우회하게 되고,
  그러면 훅 전체가 무력해진다. 훅은 **비용이 0에 가까운 것만** 맡는다(pre-commit의 lock 검사).

  ## 언제 돌리나
  - **PR을 쪼갤 때** — 파일이 브랜치마다 갈리면 각 커밋이 혼자 성립하는지 알 수 없다
  - **빌드 설정을 건드릴 때** — package.json · tsconfig · ci.yml · 번들러 설정
  - **커밋 안 된 파일이 많이 쌓였을 때** — 로컬 검사가 다른 것을 보고 있다

  ## 어떻게 하나
  임시 워크트리(`git worktree`)에 **커밋된 상태만** 꺼내 `npm ci`부터 돌린다.
  작업 폴더는 건드리지 않는다 — 진행 중인 변경이 그대로 남는다.
*/
import { execFileSync, execSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CI = '.github/workflows/ci.yml'

/*
  ci.yml에서 스텝을 그대로 읽는다 — 목록을 손으로 베끼면 CI와 갈린다.

  **여러 줄 `run: |` 블록을 통째로 실행한다.** 첫 줄만 뽑으면 드리프트 검사처럼
  `명령 → git add → git diff` 세 줄이 한 판정인 스텝이 반쪽만 돈다.
*/
function stepsFromWorkflow() {
  const yml = execSync(`git show HEAD:${CI}`, { encoding: 'utf8' })
  const lines = yml.split('\n')
  const steps = []
  let name = null

  for (let i = 0; i < lines.length; i++) {
    const n = lines[i].match(/^\s*-\s*name:\s*(.+?)\s*$/)
    if (n) {
      name = n[1]
      continue
    }

    const one = lines[i].match(/^(\s*)-?\s*run:\s*(\S.*?)\s*$/)
    if (one && one[2] !== '|') {
      if (one[2] !== 'npm ci') steps.push({ name: name ?? one[2], script: one[2] })
      name = null
      continue
    }

    const block = lines[i].match(/^(\s*)run:\s*\|\s*$/)
    if (block) {
      const body = []
      const indent = block[1].length
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === '') {
          body.push('')
          continue
        }
        if (lines[j].search(/\S/) <= indent) break
        body.push(lines[j].trim())
        i = j
      }
      steps.push({ name: name ?? body[0], script: body.filter(Boolean).join('\n') })
      name = null
    }
  }
  return steps
}

function run(script, cwd) {
  try {
    execSync(script, { cwd, stdio: 'pipe', encoding: 'utf8', shell: '/bin/sh' })
    return null
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`.trim().split('\n').slice(-12).join('\n')
  }
}

const dirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim()
const head = execSync('git log --oneline -1', { encoding: 'utf8' }).trim()

console.log(`\nCI 재현 — 커밋된 상태만 본다`)
console.log(`  ${head}`)
if (dirty) {
  const n = dirty.split('\n').length
  console.log(`  ⚠️ 커밋되지 않은 변경 ${n}건은 검사 대상이 아니다 (CI도 안 본다)`)
}

const dir = mkdtempSync(join(tmpdir(), 'verify-ci-'))
let failed = 0
try {
  execFileSync('git', ['worktree', 'add', '--detach', dir, 'HEAD'], { stdio: 'pipe' })

  process.stdout.write(`\n  ${'npm ci'.padEnd(38)} `)
  const install = run('npm ci', dir)
  if (install) {
    console.log('❌')
    console.log(install.replace(/^/gm, '      '))
    console.log('\n✗ 설치가 실패하면 나머지는 볼 필요가 없다.')
    console.log('  package.json과 package-lock.json이 어긋났을 가능성이 높다.\n')
    process.exit(1)
  }
  console.log('✅')

  for (const step of stepsFromWorkflow()) {
    process.stdout.write(`  ${step.name.padEnd(38)} `)
    const err = run(step.script, dir)
    if (err) {
      failed++
      console.log('❌')
      console.log(err.replace(/^/gm, '      '))
    } else {
      console.log('✅')
    }
  }
} finally {
  // node_modules까지 지우므로 --force가 필요하다. 실패해도 임시 폴더는 남기지 않는다
  try {
    execFileSync('git', ['worktree', 'remove', dir, '--force'], { stdio: 'pipe' })
  } catch {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
    execFileSync('git', ['worktree', 'prune'], { stdio: 'pipe' })
  }
}

console.log(
  failed
    ? `\n✗ ${failed}건 실패 — 이대로 push하면 CI가 같은 곳에서 막힌다.\n`
    : '\n✓ CI가 돌리는 것을 전부 통과했다.\n',
)
process.exit(failed ? 1 : 0)
