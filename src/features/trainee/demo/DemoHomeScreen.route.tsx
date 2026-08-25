import type { RouteObject } from 'react-router'
import DemoHomeScreen from './DemoHomeScreen'

/** 시연 진입점. `RequireRole`을 두르지 않는다 — 서버가 죽어도 열려야 한다 */
export const route: RouteObject = {
  path: '/demo',
  element: <DemoHomeScreen />,
}
