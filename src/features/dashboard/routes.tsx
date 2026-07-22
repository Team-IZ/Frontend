import type { RouteObject } from 'react-router'
import DashboardScreen from './DashboardScreen'

/*
  경로 규약은 `/{역할}/{화면}` 이다 — 와이어프레임 폴더(manager · trainee ·
  superadmin · shared)와 로그인이 내려주는 initialScreen이 같은 형태를 쓴다.
  SC-M01이 이 화면이다.

  처음엔 `/dashboard`로 만들었는데, 로그인이 `/manager/dashboard`로 보내면서
  등록되지 않은 경로가 됐다. 역할 접두사가 있어야 교육생·슈퍼어드민 화면이
  들어올 때 이름이 겹치지 않는다.
*/
export const dashboardRoutes: RouteObject[] = [
  { path: '/manager/dashboard', element: <DashboardScreen /> }, // SC-M01
]
