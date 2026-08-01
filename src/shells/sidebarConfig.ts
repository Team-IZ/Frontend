import {
  Building2Icon,
  LayoutDashboardIcon,
  ChartLineIcon,
  FileTextIcon,
  FolderKanbanIcon,
  SettingsIcon,
  Grid3x3Icon,
  MessageSquareIcon,
  UsersIcon,
  BookOpenIcon,
  HomeIcon,
  type LucideIcon,
} from 'lucide-react'

/*
  역할별 사이드바 항목 — v2 메뉴 트리(docs/plan/v2/17-ia-menu-tree.md §3) 기준.

  "역할마다 하는 일이 다르면 메뉴도 다르다"(17번 1절 원칙 1) — 그래서 배열 4벌을
  따로 둔다. 상위 역할이 하위의 superset가 아니다(오퍼레이터엔 면담·교육생이 없다).

  그룹(빈 줄로 나뉜 배열의 배열)은 구분선이다 — "보다 / 하다 / 찾다"처럼 성격이
  갈리는 지점에 넣는다. 라벨을 넣지 않는다 — 순서가 이미 말하고 있다(17번 3-1).

  아이콘은 lucide-react다 — 손글씨 유니코드 글리프(▦▨✎ 등)는 폰트마다 다르게
  그려지고 접근성 트리에도 의미 없는 문자로 잡힌다. shadcn 프리미티브들이 이미
  전부 lucide를 쓰고 있어(Dialog·Checkbox 등) 새 의존성도 아니다.
*/
export type Role = 'superadmin' | 'operator' | 'manager' | 'trainee'

export type SidebarItem = {
  icon: LucideIcon
  label: string
  to: string
}

export type SidebarGroup = SidebarItem[]

/** 슈퍼어드민 — 1. 실질 화면이 기관 하나뿐이다(플랫폼 설정은 우상단 ⚙, 자리 없음) */
export const SUPERADMIN_SIDEBAR: SidebarGroup[] = [
  [{ icon: Building2Icon, label: '기관', to: '/superadmin/orgs' }],
]

/** 오퍼레이터 — 5. 면담·교육생 없음(담당 반이 없다, 17번 3-2) */
export const OPERATOR_SIDEBAR: SidebarGroup[] = [
  [
    { icon: LayoutDashboardIcon, label: '대시보드', to: '/operator/dashboard' },
    { icon: ChartLineIcon, label: '분석', to: '/operator/analysis' },
  ],
  [
    { icon: FolderKanbanIcon, label: '프로젝트', to: '/operator/projects' },
    { icon: FileTextIcon, label: '리포트', to: '/operator/report' },
  ],
  [{ icon: SettingsIcon, label: '운영 관리', to: '/operator/admin' }],
]

/**
 * 매니저 — 6. 00-index.md 기준 5→6(교안 추가) — MG-09 §3 참고.
 * 위험·우수 테이블, 리포트는 메뉴에 없다(면담·프로젝트 결과 안에 이미 있다).
 */
export const MANAGER_SIDEBAR: SidebarGroup[] = [
  [
    { icon: LayoutDashboardIcon, label: '대시보드', to: '/manager/dashboard' },
    { icon: Grid3x3Icon, label: '히트맵', to: '/manager/heatmap' },
  ],
  [{ icon: MessageSquareIcon, label: '면담', to: '/manager/interviews' }],
  [
    { icon: UsersIcon, label: '교육생', to: '/manager/trainees' },
    { icon: FolderKanbanIcon, label: '프로젝트', to: '/manager/projects' },
    { icon: BookOpenIcon, label: '교안', to: '/manager/curriculum' },
  ],
]

/** 교육생 — 2. 제출·세션은 메뉴가 아니다(홈에서 진입, 세션은 전체화면) */
export const TRAINEE_SIDEBAR: SidebarGroup[] = [
  [
    { icon: HomeIcon, label: '홈', to: '/trainee/home' },
    { icon: FileTextIcon, label: '내 리포트', to: '/trainee/report' },
  ],
]

export const SIDEBAR_BY_ROLE: Record<Role, SidebarGroup[]> = {
  superadmin: SUPERADMIN_SIDEBAR,
  operator: OPERATOR_SIDEBAR,
  manager: MANAGER_SIDEBAR,
  trainee: TRAINEE_SIDEBAR,
}
