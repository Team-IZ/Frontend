/*
  verify:ci의 스텝 실행기 — 판정이 틀리면 재현기 전체가 거짓말을 하므로 따로 떼어 테스트한다
  (scripts/verify-ci.test.mjs).

  ## 판정 규칙
  ① **셸은 CI와 같은 POSIX sh.** ci.yml의 스텝은 ubuntu의 셸 스크립트다(`':(exclude)…'` 같은
     따옴표, 여러 줄 블록). cmd.exe로 돌리면 다르게 해석된다. Windows는 git 훅을 돌리는
     Git for Windows의 sh를 쓴다 — 훅이 돈다면 이 sh는 이미 있다.
  ② **성공은 종료 코드로만 판정한다.** 출력이 비었다는 것은 성공의 증거가 아니다.
  ③ **여러 줄은 첫 실패에서 멈춘다.** GitHub Actions의 기본 셸이 `bash -e`다.
*/
import { execFileSync, execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export function posixShell({
  platform = process.platform,
  gitExecPath = platform === 'win32'
    ? execFileSync('git', ['--exec-path'], { encoding: 'utf8' }).trim()
    : '',
  exists = existsSync,
} = {}) {
  if (platform !== 'win32') return '/bin/sh'
  // git --exec-path = <Git>/mingw64/libexec/git-core → 세 단계 위가 설치 루트
  const root = join(gitExecPath, '..', '..', '..')
  return [join(root, 'bin', 'sh.exe'), join(root, 'usr', 'bin', 'sh.exe')].find(exists) ?? null
}

/** 성공이면 null, 실패면 사유(비어 있지 않은 문자열). */
export function run(script, cwd, shell = posixShell()) {
  try {
    execSync(`set -e\n${script}`, { cwd, stdio: 'pipe', encoding: 'utf8', shell })
    return null
  } catch (e) {
    const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim().split('\n').slice(-12).join('\n')
    return out || `(출력 없음 · ${e.code ?? `exit ${e.status}`})`
  }
}
