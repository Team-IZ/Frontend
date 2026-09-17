/*
  verify:ci가 「실패를 통과로 보고하는」 경로를 고정한다 — `node --test scripts/verify-ci.test.mjs`

  왜 필요한가: 재현기가 틀리면 아무도 모른다. 통과(✅)만 찍히기 때문이다.
  실제로 두 가지가 그랬다.
  ① Windows에는 `/bin/sh`가 없다. 셸 경로를 고정했더니 실행 자체가 안 됐는데 출력이 비어
     있어서 `if (err)`가 거짓 → ✅. 팀원 PR의 CI 실패 6건이 전부 훅이 있는 브랜치에서 났다.
  ② 여러 줄 스텝은 마지막 줄의 종료 코드만 남았다. CI(`bash -e`)는 첫 실패에서 멈추는데
     재현기는 `api:test`가 실패해도 `api:check`가 통과하면 ✅였다.
*/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { posixShell, run } from './verify-ci-run.mjs'

const cwd = tmpdir()

test('성공은 null', () => {
  assert.equal(run('true', cwd), null)
})

test('출력 없이 실패해도 실패다', () => {
  const r = run('exit 3', cwd)
  assert.ok(r, '빈 문자열이면 호출부 if (err)가 통과로 읽는다')
  assert.match(r, /exit 3/)
})

test('셸을 못 찾으면 실패다 — Windows의 /bin/sh 고정이 이 경로였다', () => {
  const r = run('true', cwd, '/no/such/sh')
  assert.ok(r)
  assert.match(r, /ENOENT/)
})

test('여러 줄 스텝은 중간 실패에서 멈춘다 — CI의 bash -e와 같게', () => {
  assert.ok(run('false\ntrue', cwd), '마지막 줄이 성공해도 앞줄 실패는 실패')
  assert.ok(run('true\nfalse', cwd))
  assert.equal(run('true\ntrue', cwd), null)
})

test('posixShell — macOS·Linux는 /bin/sh', () => {
  assert.equal(posixShell({ platform: 'darwin' }), '/bin/sh')
  assert.equal(posixShell({ platform: 'linux' }), '/bin/sh')
})

test('posixShell — Windows는 훅을 돌리는 Git for Windows의 sh', () => {
  const root = join('C:', 'Program Files', 'Git')
  const execPath = join(root, 'mingw64', 'libexec', 'git-core')
  const has = (want) => (p) => p === want

  assert.equal(
    posixShell({
      platform: 'win32',
      gitExecPath: execPath,
      exists: has(join(root, 'bin', 'sh.exe')),
    }),
    join(root, 'bin', 'sh.exe'),
  )
  assert.equal(
    posixShell({
      platform: 'win32',
      gitExecPath: execPath,
      exists: has(join(root, 'usr', 'bin', 'sh.exe')),
    }),
    join(root, 'usr', 'bin', 'sh.exe'),
  )
  assert.equal(
    posixShell({ platform: 'win32', gitExecPath: execPath, exists: () => false }),
    null,
    '못 찾으면 null — 호출부가 조용히 넘어가지 않고 멈춘다',
  )
})
