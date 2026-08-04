import type { TodoKind } from './api/types'

/*
  표시 라벨 — **화면 것이다.** 연동해도 남는다(api-boundary §1-⑤).

  **문장을 서버에서 받지 않는 이유가 여기 있다**(체크리스트 A7). 판정을 문장으로 내려받으면
  규칙이 바뀔 때마다 문구·테스트가 따라오고, 데이터가 다르면 그 문장이 거짓말을 한다.
  서버는 사실만 주고 문구는 이 파일과 각 블록이 만든다.
*/

/** 조치 한 줄의 종류 라벨. 왼쪽 고정 열(92px)에 들어간다 */
export const TODO_KIND_LABEL: Record<TodoKind, string> = {
  UNASSIGNED: '미배정',
  CONCEPT_GAP: '개념 공백',
  GROUP_MISS: '집단 미달',
  INTERVIEW_BACKLOG: '면담 적체',
}

/*
  나가는 곳. **여기서 처리하지 않는다 — 요약과 링크만이다**(OP-01 §5).

  `집단 미달`은 정의서 §5가 *"OP-04 구성"* 이라 적었는데 목업은 `분석에서 보기 ↗`다.
  **어긋나면 목업이 이긴다**(00-index — 케이스·문구 한정). 그리고 목업 쪽이 9-6과도 맞는다:
  집단 미달은 반 값 비교라 그 자리는 분석이다.
*/
/*
  **탭으로 딥링크한다.** 미배정·면담 적체는 둘 다 매니저 배정을 고쳐야 하는 일이라
  `managers` 탭으로 간다.

  OP-06이 이 링크를 근거로 라우트를 `:tab?`으로 잡았다(`AdminScreen.route.tsx` —
  *"useState 탭이면 그 링크를 만들 수 없다"*). 한동안 그 라우트가 없어 빈 화면으로
  가던 것을 `/operator/admin`으로 막아 뒀는데, 머지됐으므로 되돌린다.
*/
export const ADMIN_MANAGERS = '/operator/admin/managers'
export const ANALYSIS = '/operator/analysis'
export const projectPath = (id: string) => `/operator/projects/${id}`

/** 링크 문구. 목업이 `↗`로 "이 화면을 떠난다"를 표시한다 */
export const GO_ADMIN = '운영 관리'
export const GO_ANALYSIS = '분석에서 보기'
export const GO_PROJECT = '프로젝트'
export const GO_STATUS = '현황'
