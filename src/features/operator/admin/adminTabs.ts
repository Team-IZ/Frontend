import type { ComponentType } from 'react'
import type { AdminCounts } from './_/api/types'
import CohortsTab from './cohorts/CohortsTab'
import ClassesTab from './classes/ClassesTab'
import RosterTab from './roster/RosterTab'
import ManagersTab from './managers/ManagersTab'
import CurriculaTab from './curricula/CurriculaTab'
import CostTab from './cost/CostTab'

/*
  탭 다섯의 **단일 정의.** 값(경로 조각)·라벨·개수 표기·컴포넌트가 한 줄에 모인다.

  **셋으로 흩어져 있었다** — `labels.ts`에 값·라벨, `AdminScreen`에 배지 계산과 렌더 분기.
  탭을 하나 더할 때 세 곳을 고쳐야 했고, 그중 하나만 빠뜨리면 **타입 검사가 못 잡는다**
  (배지 맵은 `Record<AdminTab, …>`이라 잡히지만, 렌더 분기를 빠뜨리면 빈 패널이 뜬다).

  `labels.ts`에 합치지 않은 이유 — 거기에 컴포넌트를 넣으면 **표시 라벨 파일이 화면을
  알게 된다.** 라벨은 배지·필터 드롭다운도 읽는 값이라 화면과 무관해야 한다.
  그래서 라벨 파일이 아니라 **도메인 루트의 레지스트리**로 둔다.

  **`.ts`다(`.tsx` 아니다).** 컴포넌트를 참조만 하고 JSX를 쓰지 않는다 — `.tsx`로 두면
  린터가 `react/only-export-components`로 잡는다(컴포넌트 아닌 값을 export하는 파일은
  Fast Refresh가 상태 보존을 못 한다. 라우트 파일을 옆으로 가른 것과 같은 이유다).

  **`_/`가 아니라 루트에 있다** — 탭 값이 곧 URL 세그먼트(`/operator/admin/classes`)라
  주소를 아는 파일이고, 화면 폴더 다섯을 전부 import하므로 `_/`(주소를 모르는 것들)와
  성격이 다르다.
*/

/** 탭이 알아야 하는 것 — 개수는 이 화면이 한 번에 받아 나눠 준다 */
type TabProps = {
  /** 목록이 바뀌어 탭 개수를 다시 받아야 한다. 개수를 안 쓰는 탭은 무시한다 */
  onCountsChange: () => void
}

type AdminTabDef = {
  value: string
  label: string
  Panel: ComponentType<TabProps>
  /**
   * 탭 이름 옆 개수. **아직 안 왔으면 `null`** — `0`으로 쓰면 없는 사실을 주장한다.
   * 비용 탭처럼 셀 것이 없으면 아예 `null`을 돌려준다.
   */
  badge: (counts: AdminCounts | undefined) => string | null
}

export const ADMIN_TABS = [
  {
    value: 'cohorts',
    label: '기수',
    Panel: CohortsTab,
    badge: (n) => (n ? `${n.cohorts}` : null),
  },
  {
    value: 'classes',
    label: '반',
    Panel: ClassesTab,
    badge: (n) => (n ? `${n.classes}` : null),
  },
  {
    /*
      **명단을 반에서 갈랐다**(op-06-admin.md OP06-1). 정의서 OP-06 §3은 한 탭이었지만 두 표가
      한 뷰포트에 안 들어갔다 — 반 표를 잘라 넣으면 *"같이 보인다"* 는 합친 이유가 사라진다.
    */
    value: 'roster',
    label: '명단',
    Panel: RosterTab,
    badge: (n) => (n ? `${n.trainees}` : null),
  },
  {
    value: 'managers',
    label: '매니저',
    Panel: ManagersTab,
    badge: (n) => (n ? `${n.managers}` : null),
  },
  {
    value: 'curricula',
    label: '교안',
    Panel: CurriculaTab,
    badge: (n) => (n ? `${n.curricula}` : null),
  },
  {
    // 비용은 목록이 아니라 금액이라 셀 것이 없다
    value: 'cost',
    label: '비용',
    Panel: CostTab,
    badge: () => null,
  },
] as const satisfies readonly AdminTabDef[]

export type AdminTab = (typeof ADMIN_TABS)[number]['value']

/** 탭 없이 들어왔거나 모르는 값이면 여기로 — 기수가 조직 세팅의 시작점이다 */
export const DEFAULT_ADMIN_TAB: AdminTab = 'cohorts'

export function isAdminTab(value: string | undefined): value is AdminTab {
  return ADMIN_TABS.some((t) => t.value === value)
}
