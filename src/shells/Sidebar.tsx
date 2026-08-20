import { NavLink, useSearchParams } from 'react-router'
import type { SidebarGroup } from './sidebarConfig'

/*
  좌측 사이드바 — 184px 고정폭. ConsoleShell에서 분리한 이유는 Header와 같다 —
  프레임(스크롤·높이)과 이 안의 항목 렌더링은 바뀌는 이유가 다르다.

  색은 `--sidebar-*` 시맨틱 토큰을 쓴다(index.css `@theme inline` — shadcn 표준
  이름으로 이미 배선돼 있다: sidebar/sidebar-foreground/sidebar-accent/
  sidebar-border). 원시 팔레트(`--color-nav*`)를 직접 잡지 않는다 — 컴포넌트는
  시맨틱 토큰을 쓰고, 팔레트 값은 그 토큰 하나가 대표하게 둔다.

  선택 항목 글자만 예외로 `text-white`를 그대로 쓴다 — `--sidebar-accent-foreground`
  가 `--color-nav-fg`(흐린 회색)로 매핑돼 있어서, 목업의 흰 글자 값과 안 맞는다
  (대비도 떨어진다). 토큰이 이 상태엔 틀린 값이라 확인하고 뺐다.
*/
type Props = {
  sidebar: SidebarGroup[]
}

export default function Sidebar({ sidebar }: Props) {
  /*
    **고른 기수는 주소가 갖는다**(`stores/cohortScope.ts`) — 사이드바 이동도 예외가
    아니다. `item.to`는 순수 경로 문자열이라 그대로 쓰면 `?cohort=`가 떨어져 나가고,
    다음 화면은 주소에 기수가 없다고 보고 기본값(진행 중 기수)으로 되돌아간다 —
    탭을 오갈 때마다 기수가 튀던 버그가 이래서 났다. 슈퍼어드민·교육생처럼 기수가
    없는 역할은 애초에 주소에 `cohort`가 안 실리니 그대로 통과한다(역할별 분기를
    여기 새로 두지 않는다).
  */
  const [params] = useSearchParams()
  const cohort = params.get('cohort')
  const cohortSuffix = cohort ? `?${new URLSearchParams({ cohort }).toString()}` : ''

  return (
    <nav
      aria-label="주요 메뉴"
      className="bg-sidebar hidden w-[184px] shrink-0 overflow-y-auto px-3 py-4 md:block"
    >
      {/* 그룹 구분선 간격은 목업 `.nav .grp{padding-top:--sp-2;margin-top:--sp-2}` = 8px */}
      {sidebar.map((group, i) => (
        <div key={i} className={i > 0 ? 'border-sidebar-border mt-2 border-t pt-2' : undefined}>
          {group.map((item) => (
            <NavLink
              key={item.to}
              to={`${item.to}${cohortSuffix}`}
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
