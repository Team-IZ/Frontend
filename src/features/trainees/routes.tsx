import type { RouteObject } from 'react-router'
import TraineeListScreen from './TraineeListScreen'

/*
  경로 규약은 `/{역할}/{화면}` — managerNav.ts의 '교육생' 항목과 경로가 일치해야
  좌측 네비에서 열린다. 상세(SC-M06)는 아직 없다 — 행 클릭은 `/manager/trainees/:id`로
  가지만 라우트가 등록되기 전까지는 RouteNotFound가 뜬다(app/routes.tsx 참고).
*/
export const traineeRoutes: RouteObject[] = [
  { path: '/manager/trainees', element: <TraineeListScreen /> }, // SC-M11
]
