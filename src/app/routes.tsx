import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import type { RouteObject } from 'react-router'
import UiPreviewScreen from '@/app/UiPreviewScreen'
import TraineeCaseIndex from '@/app/TraineeCaseIndex'
import RouteNotFound from '@/app/RouteNotFound'
import AppCrashed from '@/app/AppCrashed'

/*
  각 화면이 자기 라우트를 옆 파일(`{X}Screen.route.tsx`)에 `route` export로
  갖는다 — 도메인 단위 `routes.tsx`도, 화면 파일 안에 같이 두는 것도 아니다.

  - 도메인 단위였을 때: 폴더 하나에 화면이 2개면(면담 목록+브리프 등) 그 파일을
    나눠 가져야 했다 — 원래 화면마다 파일을 쪼갠 이유(작업 겹침 방지)가 깨졌다.
  - 화면 파일 안에 같이 뒀을 때: 컴포넌트 export와 route export가 한 파일에
    있으면 React Fast Refresh가 상태 보존 핫리로드를 못 한다
    (`react/only-export-components`) — 화면이 폼·타이머 같은 상태를 갖기
    시작하면 저장할 때마다 그 상태가 날아간다.

  옆 파일로 쪼개면 둘 다 안 생긴다 — 화면 하나당 파일이 여전히 독립적이고,
  `{X}Screen.tsx`는 컴포넌트만 export한다.

  `import.meta.glob`으로 `*.route.tsx`를 훑어 `route`만 모은다 — Vite 빌드타임에
  정적으로 분석되는 네이티브 기능이라 런타임 매직이 아니다. 새 화면을 추가해도
  이 파일은 한 글자도 안 바뀐다.
*/
const routeModules = import.meta.glob<{ route: RouteObject }>('/src/features/**/*.route.tsx', {
  eager: true,
})
const featureRoutes = Object.values(routeModules).map((m) => m.route)

/*
  **경로 없는 부모 하나로 전부를 감싼다.** 자식 어디서 렌더가 터져도 예외가 여기까지
  올라와 `AppCrashed`가 받는다 — 없으면 화면이 아니라 **앱이 사라진다**(흰 화면,
  async-states §3-6). 라우트마다 `errorElement`를 달지 않아도 되는 이유다.

  `element: <Outlet />`은 아무것도 안 그리고 자식만 통과시킨다 — 이 부모는 레이아웃이
  아니라 **그물**이라 화면에 아무 영향이 없어야 한다.
*/
export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <AppCrashed />,
    children: [
      ...featureRoutes,

      // 진입점. 로그인 후 역할별 초기 화면은 서버가 판정하므로(명세 AUTH-03),
      // 클라이언트는 역할→화면 매핑을 갖지 않는다.
      { path: '/', element: <Navigate to="/shared/login" replace /> },
      { path: '/ui-preview', element: <UiPreviewScreen /> },
      { path: '/trainee/__cases', element: <TraineeCaseIndex /> },

      // 없는 경로를 조용히 로그인으로 보내지 않는다. 그러면 "라우트를 등록 안 한 것"과
      // "코드가 틀린 것"을 구분할 수 없어 개발 중에 시간을 잃는다.
      { path: '*', element: <RouteNotFound /> },
    ],
  },
])
