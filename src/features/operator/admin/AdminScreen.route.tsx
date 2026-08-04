import type { RouteObject } from 'react-router'
import AdminScreen from './AdminScreen'

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
/*
  탭이 경로에 있다 — OP-01 `조치 필요`가 **탭으로 딥링크**한다(미배정·면담 적체 →
  `/operator/admin/managers`, 비용 → `/operator/admin/cost`). useState 탭이면 그 링크를
  만들 수 없다. 탭 없이 들어오면 화면이 첫 탭으로 보낸다.

  같은 폴더의 다른 라우트 둘(`/assign` 모드 · 교안 상세)은 **정적 구간이 더 길거나
  세그먼트가 더 많아** React Router 랭킹에서 `:tab?`보다 먼저 잡힌다 — 순서를 손으로
  맞출 필요가 없다(app/routes.tsx가 glob으로 모으므로 순서를 정할 수도 없다).
*/
export const route: RouteObject = { path: '/operator/admin/:tab?', element: <AdminScreen /> }
