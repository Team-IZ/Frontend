import type { RouteObject } from 'react-router'
import RequireRole from '@/shells/RequireRole'
import CurriculumDetailScreen from './CurriculumDetailScreen'

/*
  교안 상세. 주소는 목업 그대로다(`/admin/curricula/ai-llmops`).

  **탭을 경로에 넣지 않았다.** 프로젝트 상세(OP-04)는 OP-01이 탭별로 딥링크하지만
  여기로 딥링크하는 화면이 없다 — 들어오는 길은 목록 행 하나뿐이고, 그때는 항상 `섹션`
  부터 본다. 링크가 생기면 그때 `:tab?`을 더한다(아무도 안 쓰는 파라미터를 미리 두지
  않는다).

  `/operator/admin/:tab?`보다 **세그먼트가 하나 더 길어** React Router 랭킹에서 먼저 잡힌다.
*/
export const route: RouteObject = {
  path: '/operator/admin/curricula/:id',
  element: (
    <RequireRole allow={['OPERATOR']}>
      <CurriculumDetailScreen />
    </RequireRole>
  ),
}
