import type { RouteObject } from 'react-router'
import InterviewBriefScreen from './InterviewBriefScreen'

/*
  화면 파일(.tsx)과 라우트 파일을 나눈다 — 한 파일이 컴포넌트와
  route를 같이 export하면 React Fast Refresh가 그 파일에 상태 보존
  핫리로드를 못 해준다(react/only-export-components). 화면이 폼·타이머처럼
  실제 상태를 갖기 시작하면 이 비용이 개발 경험에 반복적으로 걸린다.

  라우트 파일은 화면마다 하나씩이다 — 도메인 폴더 하나에 화면이 여럿이어도
  (면담 목록+브리프 등) 공유하는 파일이 없다. app/routes.tsx가
  `*.route.tsx`를 훑어 route만 모은다(import.meta.glob) — 새 화면을
  추가해도 그 파일은 안 바뀐다.
*/
export const route: RouteObject = {
  path: '/manager/interviews/:id/brief',
  element: <InterviewBriefScreen />,
}
