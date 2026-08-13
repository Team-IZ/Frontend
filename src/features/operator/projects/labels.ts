/*
  화면 표시용 한글 라벨.

  **계약(projectTypes)과 갈라 둔 이유** — enum 값은 서버와 맞추는 것이고 라벨은 화면
  것이다. 한 파일에 두면 "서버가 한글을 내려주나?"가 헷갈리고, 문구를 고칠 때마다
  계약 파일이 바뀐다.

  **한 곳에 모은 이유** — 상태 라벨을 배지(ProjectStatusBadge)와 필터 드롭다운
  (ProjectListScreen)이 같이 쓴다. 각자 갖게 두면 `준비 중`을 고칠 때 한 곳만 바뀌고
  같은 상태가 화면 안에서 두 이름으로 보인다.
*/
import type { ProjectStatus } from './types'

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  PREP: '준비 중',
  READY: '준비됨',
  RUNNING: '진행 중',
  DONE: '종료',
}

/**
 * 이름 뒤에 붙는 조사 — **받침으로 갈린다.** `미프 4차를` / `1반을`.
 *
 * `을(를)` 표기는 읽는 사람이 괄호를 건너뛰며 읽어야 하고, 회차 이름이 데이터라
 * 미리 고를 수도 없다.
 *
 * **구현은 `lib/format`으로 올라갔다** — 실패 문구(`lib/errorCopy`)가 세 번째로 같은 것을
 * 필요로 했다(D14). 여기서 다시 내보내는 이유는 호출부·검증 스크립트가 이 경로를 쓰고
 * 있어서다. 새로 쓰는 곳은 `@/lib/format`에서 직접 가져간다.
 *
 * ⚠ 상대 경로 + 확장자인 이유는 `npm run check:project`가 이 파일을 node로 직접 읽어서다
 * (별칭을 모른다). `lib/errorCopy.ts` 맨 위 주석과 같은 사정이다.
 */
export { withParticle } from '../../../lib/format.ts'
