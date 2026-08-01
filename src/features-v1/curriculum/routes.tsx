import type { RouteObject } from 'react-router'
import CurriculumListScreen from './CurriculumListScreen'
import CurriculumUploadScreen from './CurriculumUploadScreen'
import CurriculumDetailScreen from './CurriculumDetailScreen'

/*
  경로 규약은 `/{역할}/{화면}` — dashboard와 동일. managerNav.ts의 '교안' 항목과
  경로가 일치해야 좌측 네비에서 열린다.

  `:id` 상세는 `/new`보다 뒤에 둔다 — react-router는 정적 세그먼트를 동적보다 먼저
  맞추지만, 순서로도 의도를 드러낸다(등록 폼이 교안 하나로 오인되지 않게).
*/
export const curriculumRoutes: RouteObject[] = [
  { path: '/manager/curriculum', element: <CurriculumListScreen /> }, // SC-M12
  { path: '/manager/curriculum/new', element: <CurriculumUploadScreen /> }, // SC-M12 · CUR-03 등록
  { path: '/manager/curriculum/:id', element: <CurriculumDetailScreen /> }, // SC-M12 · CUR-01+02 상세
]
