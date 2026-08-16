import type { RouteObject } from 'react-router'
import RequireRole from '@/shells/RequireRole'
import CurriculaScreen from './CurriculaScreen'

/*
  교안 목록 — 사이드바 최상위. **`/operator/admin/` 아래가 아니다**(CurriculaScreen 주석).

  주소에 `?cohort=`를 안 싣는다 — 이 화면은 기수를 안 본다. 운영 관리 탭들이 그 쿼리를
  들고 다니는 것과 다른 점이다.

  상세(`/operator/curricula/:id`)가 세그먼트 하나 더 길어 React Router 랭킹에서 먼저
  잡힌다 — 순서를 손으로 맞출 필요가 없다.
*/
export const route: RouteObject = {
  path: '/operator/curricula',
  element: (
    <RequireRole allow={['OPERATOR']}>
      <CurriculaScreen />
    </RequireRole>
  ),
}
