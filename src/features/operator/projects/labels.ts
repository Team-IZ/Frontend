/*
  화면 표시용 한글 라벨.

  **계약(projectTypes)과 갈라 둔 이유** — enum 값은 서버와 맞추는 것이고 라벨은 화면
  것이다. 한 파일에 두면 "서버가 한글을 내려주나?"가 헷갈리고, 문구를 고칠 때마다
  계약 파일이 바뀐다.

  **한 곳에 모은 이유** — 상태 라벨을 배지(ProjectStatusBadge)와 필터 드롭다운
  (ProjectListScreen)이 같이 쓴다. 각자 갖게 두면 `준비 중`을 고칠 때 한 곳만 바뀌고
  같은 상태가 화면 안에서 두 이름으로 보인다.
*/
import type { ProjectKind, ProjectStatus } from './types'

/** 미프 = 미니프로젝트 · 빅프 = 빅프로젝트. 화면에는 줄임말로 쓴다 */
export const KIND_LABEL: Record<ProjectKind, string> = { MINI: '미프', BIG: '빅프' }

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  PREP: '준비 중',
  READY: '준비됨',
  RUNNING: '진행 중',
  DONE: '종료',
}
