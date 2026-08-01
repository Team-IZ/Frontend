import { NavLink } from 'react-router'
import type { SidebarGroup } from './sidebarConfig'

/*
  좌측 사이드바 — 184px 고정폭. ConsoleShell에서 분리한 이유는 Header와 같다 —
  프레임(스크롤·높이)과 이 안의 항목 렌더링은 바뀌는 이유가 다르다.

  색은 `--sidebar-*` 시맨틱 토큰을 쓴다(index.css `@theme inline` — shadcn 표준
  이름으로 이미 배선돼 있다: sidebar/sidebar-foreground/sidebar-accent/
  sidebar-border). 원시 팔레트(`--color-nav*`)를 직접 잡지 않는다 — 컴포넌트는
  시맨틱 토큰을 쓰고, 팔레트 값은 그 토큰 하나가 대표하게 둔다.

  선택 항목 글자만 예외로 `text-white`를 그대로 쓴다 — `--sidebar-accent-foreground`
  가 `--color-nav-fg`(흐린 회색)로 매핑돼 있어서, 목업 `.nav .item.on{color:#fff}`
  와 안 맞는다(대비도 떨어진다). 토큰이 이 상태엔 틀린 값이라 확인하고 뺐다.
*/
type Props = {
  sidebar: SidebarGroup[]
}

export default function Sidebar({ sidebar }: Props) {
  return (
    <nav
      aria-label="주요 메뉴"
      className="bg-sidebar hidden w-[184px] shrink-0 overflow-y-auto px-3 py-4 md:block"
    >
      {sidebar.map((group, i) => (
        <div key={i} className={i > 0 ? 'border-sidebar-border mt-3 border-t pt-3' : undefined}>
          {group.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'mb-0.5 flex items-center gap-2 rounded-md px-3 py-[9px] text-sm',
                  isActive
                    ? 'bg-sidebar-accent font-semibold text-white'
                    : 'text-sidebar-foreground',
                ].join(' ')
              }
            >
              <item.icon aria-hidden="true" className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}
