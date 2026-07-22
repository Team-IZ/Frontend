import type { RouteObject } from 'react-router'
import LoginScreen from './LoginScreen'
import PasswordResetScreen from './PasswordResetScreen'
import InviteSignupScreen from './InviteSignupScreen'

/*
  이 도메인의 라우트는 이 파일이 소유한다.
  화면을 추가할 때 app/routes.tsx가 아니라 여기를 고친다 — 그래야 두 사람이
  같은 파일을 건드리지 않는다. 근거: docs/dev/frontend-architecture.md §4

  경로는 App.tsx에 있던 것을 그대로 옮겼다(SC-A01·A02·A03).
*/
export const authRoutes: RouteObject[] = [
  // 공개 화면 — 로그인 없이 접근 가능
  { path: '/shared/login', element: <LoginScreen /> }, // SC-A01
  { path: '/shared/password-reset', element: <PasswordResetScreen /> }, // SC-A03

  // 초대 링크 진입 — 토큰이 변형(매니저 가입 / 교육생 활성화)을 결정한다
  { path: '/invite/:token', element: <InviteSignupScreen /> }, // SC-A02
]
