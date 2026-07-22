/*
  매니저 셸의 좌측 네비게이션 항목.

  셸이 항목을 하드코딩하지 않고 이 배열을 렌더한다. 여덟 중 셋(분석·진단 / 개입 /
  리포트)은 **임시 화면**이라 나중에 전면 재작성되는데, 하드코딩되어 있으면 그때
  셸까지 건드려야 한다. 여기만 고치면 되도록 분리했다.

  아이콘은 와이어의 글리프를 그대로 쓴다. 아이콘 라이브러리(lucide)로 바꾸는 것은
  어느 아이콘을 쓸지 정하는 별도 결정이라 지금 임의로 고르지 않는다 —
  바꿀 때는 이 배열의 `icon`만 교체하면 된다.

  라벨은 `운영 관리`가 맞다. 와이어 일부에 남아 있는 `기수 구성`은 옛 라벨이고,
  나중에 다시 쓰인 파일(운영 관리·프로젝트·반 배정)이 모두 새 라벨을 쓴다.
*/
export type NavItem = {
  icon: string
  label: string
  to: string
  /** 총괄 매니저에게만 보이는 항목 */
  leadOnly?: boolean
  /** 임시 화면 — 나중에 전면 재작성된다 */
  temporary?: boolean
}

export const MANAGER_NAV: NavItem[] = [
  { icon: '▦', label: '대시보드', to: '/dashboard' },
  { icon: '⚙', label: '운영 관리', to: '/admin/cohorts', leadOnly: true },
  { icon: '▧', label: '교안', to: '/curriculum' },
  { icon: '▤', label: '프로젝트', to: '/projects' },
  { icon: '◎', label: '교육생', to: '/trainees' },
  { icon: '△', label: '분석 · 진단', to: '/analysis', temporary: true },
  { icon: '✎', label: '개입', to: '/interventions', temporary: true },
  { icon: '▥', label: '리포트', to: '/reports', temporary: true },
]
