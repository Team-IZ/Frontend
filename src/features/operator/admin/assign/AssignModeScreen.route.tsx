import type { RouteObject } from 'react-router'
import AssignModeScreen from './AssignModeScreen'

/*
  반 배정은 **모드**다 — 사이드바를 가리므로 `ConsoleShell` 안이 아니라 자기 라우트를
  갖는다(H4 · 17번 4절 「메뉴가 아닌 화면」).

  주소는 목업 그대로다(`/admin/cohorts/7/assign`의 우리 버전). 기수는 아직 상단 스위처가
  하나뿐이라 경로에 넣지 않았다 — 스위처가 실제로 생기면 `cohortScope.ts`와 함께
  `/operator/admin/:cohortId/assign`으로 옮긴다.

  정적 구간(`assign`)이라 `/operator/admin/:tab?`의 동적 구간보다 React Router 랭킹에서
  먼저 잡힌다 — glob으로 모으므로 순서를 손으로 정할 수 없고, 정할 필요도 없다.
*/
export const route: RouteObject = {
  path: '/operator/admin/assign',
  element: <AssignModeScreen />,
}
