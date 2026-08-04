/**
 * 한글 입력이 깨지지 않는가 — `npm run check:korean`
 *
 * **Enter로 값을 확정하는 입력은 조합 중 키를 무시해야 한다.**
 * 한글은 `ㅂㅂㅂ`를 치는 동안 IME 조합이 안 끝난 상태인데, 그때 Enter를 누르면
 * 브라우저가 keydown을 **두 번** 보낸다 — 조합을 확정하는 것 하나, 확정된 뒤 하나.
 * 막지 않으면 `ㅂㅂㅂㅇㅇㅇ`와 잔여 조각 `ㅇ`이 **각각 저장된다.**
 *
 *     if (e.nativeEvent.isComposing) return
 *
 * **왜 스크립트인가** — 이 버그는 `typecheck`·`lint`·`build`를 전부 통과한다. 타입도
 * 문법도 맞고, 영어로 테스트하면 재현되지 않는다. 실제로 사용자가 칩 두 개가 생기는 것을
 * 보고 알려줘서 발견했다. **한국어 서비스에서 사람이 눈으로 잡아야 하는 버그를 남겨두지
 * 않는다.**
 *
 * 실제로 두 곳에 있었고 그중 하나가 `InputCompositionsPreview.tsx`(**참조 구현**)라,
 * 베껴 쓰는 화면마다 같이 퍼지는 구조였다.
 *
 * 검사는 파일 단위로 거칠게 한다 — `'Enter'`를 다루는 파일에 `isComposing`이 있나.
 * 정밀하지 않지만 **빠뜨리는 쪽이 아니라 과하게 잡는 쪽**으로 틀리므로 안전하다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/*
  `features-v1`은 검사하지 않는다 — 라우팅되지 않는 이식 대기 보관고이고(decision-log D16)
  `.route.tsx`가 하나도 없어 화면으로 뜨지 않는다. 죽은 코드를 고치게 하면 가드가
  "통과시키려고 고치는 일"을 만든다.
*/
const ROOTS = ['src/app', 'src/components', 'src/features', 'src/shells']

/** Enter를 **확정 키로** 쓰는가. 파일 열기·버튼 대용(`Enter || ' '`)은 텍스트 입력이 아니다 */
const COMMITS_ON_ENTER = /key === 'Enter'(?!\s*\|\|\s*e\.key === ' ')/

function walk(dir: string): string[] {
  let out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out = out.concat(walk(path))
    else if (/\.tsx?$/.test(path)) out.push(path)
  }
  return out
}

const offenders = ROOTS.flatMap(walk).filter((path) => {
  const src = readFileSync(path, 'utf8')
  return COMMITS_ON_ENTER.test(src) && !src.includes('isComposing')
})

if (offenders.length) {
  console.error(`✗ Enter로 확정하는데 IME 조합을 막지 않는 파일 ${offenders.length}개\n`)
  for (const f of offenders) console.error(`  ${f}`)
  console.error(`
  한글은 조합 중 Enter에서 keydown이 두 번 옵니다 — 값이 두 번 저장됩니다.
  keydown 핸들러 맨 앞에 넣으세요:

    if (e.nativeEvent.isComposing) return

  Enter가 확정이 아니라 버튼 대용이면(파일 선택 등) 이 가드는 필요 없습니다.`)
  process.exit(1)
}

console.log(`✓ 한글 IME 가드 통과 (Enter 확정 입력 전수 검사)`)
