import type { RouteObject } from 'react-router'
import RequireRole from '@/shells/RequireRole'
import CurriculumDetailScreen from './CurriculumDetailScreen'

/*
  교안 상세. 주소는 목업 그대로다(`/admin/curricula/ai-llmops`).

  **탭을 경로에 넣지 않았다.** 프로젝트 상세(OP-04)는 OP-01이 탭별로 딥링크하지만
  여기로 딥링크하는 화면이 없다 — 들어오는 길은 목록 행 하나뿐이고, 그때는 항상 `섹션`
  부터 본다. 링크가 생기면 그때 `:tab?`을 더한다(아무도 안 쓰는 파라미터를 미리 두지
  않는다).

  목록과 같이 `/operator/admin/` 밖으로 나왔다 — 교안은 기수 자산이 아니라 기관 자산이다
  (CurriculaScreen 주석). 옛 주소로 오는 링크는 없다: 들어오는 길이 목록 행과
  프로젝트 설정 탭 둘뿐이고 둘 다 같이 고쳤다.
*/
export const route: RouteObject = {
  path: '/operator/curricula/:id',
  element: (
    <RequireRole allow={['OPERATOR']}>
      <CurriculumDetailScreen />
    </RequireRole>
  ),
}
