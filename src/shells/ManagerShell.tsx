import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { MANAGER_NAV } from './managerNav'

/*
  매니저 계열 공용 셸 — 대시보드 · 운영 관리 · 교안 · 프로젝트 · 교육생 리스트·상세.
  상단바(브랜드 + 기수 선택기 + 사용자) + 좌측 네비 184px + 콘텐츠.

  확정 화면 17개 중 7~9개가 이 골격을 공유한다. 가장 많이 반복되는 것이 개별
  컴포넌트가 아니라 이 셸이라, 둘이 나눠 개발하기 전에 하나로 확정한다.

  페이지 제목·breadcrumb·주액션은 셸이 받지 않는다. 화면마다 탭이 끼거나 제목 옆
  총개수가 붙는 등 조합이 달라서, 셸이 다 받으면 API가 비대해진다. 별도 컴포넌트로 둔다.
*/
type Props = {
  /** 로그인한 사용자 — 인증이 붙기 전까지는 화면에서 넘긴다 */
  user: { name: string; role: string }
  /** 현재 선택된 기수. 전역 스코프라 나중에 스토어로 옮긴다 */
  cohort: string
  /** 총괄 매니저 여부. 총괄 전용 항목의 노출을 가른다 */
  isLead?: boolean
  children: ReactNode
}

export default function ManagerShell({ user, cohort, isLead = false, children }: Props) {
  const items = MANAGER_NAV.filter((item) => !item.leadOnly || isLead)

  return (
    <div className="flex min-h-svh flex-col">
      {/*
        키보드로 쓰는 사람은 화면을 열 때마다 네비 8항목을 지나야 본문에 닿는다.
        평소엔 화면 밖에 있다가 Tab을 처음 누르면 나타난다 — 마우스 사용자에게는
        보이지 않고 키보드 사용자에게만 보인다.
      */}
      <a
        href="#main"
        className="bg-primary sr-only rounded-md px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        본문으로 건너뛰기
      </a>

      <header className="bg-surface border-border flex h-[54px] items-center justify-between border-b px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-bold">
            <span
              aria-hidden="true"
              className="bg-primary inline-flex size-[26px] items-center justify-center rounded-[7px] text-[13px] text-white"
            >
              ◆
            </span>
            IZ-Get
          </div>

          {/* 기수 선택기 — 전역 스코프. 바꾸면 하위 조회가 전부 다시 돈다 */}
          <button
            type="button"
            className="border-border-strong bg-surface-2 flex items-center gap-2 rounded-full border px-3 py-[5px] text-sm"
          >
            <span className="text-fg-subtle text-xs">기수</span>
            {cohort}
            <span aria-hidden="true" className="text-fg-subtle">
              ▾
            </span>
          </button>
        </div>

        <div className="text-fg-muted flex items-center gap-2 text-sm">
          {user.name} · {user.role}
          <span
            aria-hidden="true"
            className="bg-primary-soft text-primary inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold"
          >
            {user.name.slice(0, 1)}
          </span>
        </div>
      </header>

      <div className="flex flex-1">
        <nav aria-label="주요 메뉴" className="bg-nav w-[184px] shrink-0 px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'mb-0.5 flex items-center gap-2 rounded-md px-3 py-[9px] text-sm',
                  isActive ? 'bg-nav-active font-semibold text-white' : 'text-nav-fg',
                ].join(' ')
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
              {item.leadOnly && <span className="text-nav-accent ml-auto text-[10px]">총괄</span>}
            </NavLink>
          ))}
        </nav>

        {/* tabIndex={-1} — 건너뛰기 링크로 이동했을 때 여기에 실제로 포커스가 놓이게 한다 */}
        <main id="main" tabIndex={-1} className="bg-canvas min-w-0 flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
