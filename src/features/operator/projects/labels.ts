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
 * 미리 고를 수도 없다. 한글 음절은 유니코드에서 **초성×21×28 + 중성×28 + 종성**으로
 * 배열돼 있어, `(코드 - 0xAC00) % 28`이 0이면 받침이 없다.
 *
 * 숫자·영문으로 끝나면 받침을 알 수 없으므로 **받침 없음으로 둔다**(`v2를`).
 */
export function withParticle(name: string, withBatchim: string, without: string): string {
  const last = name.trim().at(-1) ?? ''
  const code = last.charCodeAt(0)
  const isHangul = code >= 0xac00 && code <= 0xd7a3
  const hasBatchim = isHangul && (code - 0xac00) % 28 !== 0
  return `${name}${hasBatchim ? withBatchim : without}`
}
