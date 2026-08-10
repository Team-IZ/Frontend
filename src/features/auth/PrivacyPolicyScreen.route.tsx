import type { RouteObject } from 'react-router'
import PrivacyPolicyScreen from './PrivacyPolicyScreen'

/*
  화면 파일(.tsx)과 라우트 파일을 나누는 관례는 LoginScreen.route.tsx와 동일 —
  이 파일 참고.
*/
export const route: RouteObject = {
  path: '/shared/privacy-policy',
  element: <PrivacyPolicyScreen />,
}
