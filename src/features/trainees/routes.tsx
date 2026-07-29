import type { RouteObject } from 'react-router'
import TraineeListScreen from './TraineeListScreen'
import TraineeDetailScreen from './TraineeDetailScreen'

/*
  경로 규약은 `/{역할}/{화면}` — managerNav.ts의 '교육생' 항목과 경로가 일치해야
  좌측 네비에서 열린다.
*/
export const traineeRoutes: RouteObject[] = [
  { path: '/manager/trainees', element: <TraineeListScreen /> }, // SC-M11
  { path: '/manager/trainees/:id', element: <TraineeDetailScreen /> }, // SC-M06
]
