import type { RouteObject } from 'react-router'
import CurriculumListScreen from './CurriculumListScreen'
import CurriculumUploadScreen from './CurriculumUploadScreen'

/*
  경로 규약은 `/{역할}/{화면}` — dashboard와 동일. managerNav.ts의 '교안' 항목과
  경로가 일치해야 좌측 네비에서 열린다.
*/
export const curriculumRoutes: RouteObject[] = [
  { path: '/manager/curriculum', element: <CurriculumListScreen /> }, // SC-M12
  { path: '/manager/curriculum/new', element: <CurriculumUploadScreen /> }, // SC-M12 · CUR-03 등록
]
