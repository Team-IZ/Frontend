import type { RouteObject } from 'react-router'
import DemoSessionScreen from './DemoSessionScreen'

/*
  **`RequireRole`을 두르지 않는다.** 이 화면이 존재하는 이유가 "서버가 죽었을 때"라서,
  로그인 API에 기대면 대역이 되지 않는다. 네트워크 요청을 한 번도 하지 않는다.
*/
export const route: RouteObject = {
  path: '/demo/session',
  element: <DemoSessionScreen />,
}
