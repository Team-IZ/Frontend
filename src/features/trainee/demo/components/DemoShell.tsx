import type { ReactNode } from 'react'
import { FileTextIcon, HomeIcon } from 'lucide-react'
import Header from '@/shells/Header'
import Sidebar from '@/shells/Sidebar'
import type { SidebarGroup } from '@/shells/sidebarConfig'

/*
  데모용 셸 — `Header`·`Sidebar`는 실제 것을 그대로 쓰고 **링크만 데모 주소로 바꾼다.**

  `ConsoleShell`을 못 쓰는 이유는 하나다. 그것은 `SIDEBAR_BY_ROLE[role]`을 읽어
  `/trainee/home`·`/trainee/report`를 그린다 — 시연 중에 사이드바를 한 번 잘못
  누르면 로그인 화면으로 튀고, 서버가 죽어 있으면 거기서 돌아올 길이 없다.

  이름은 자리값이다. 실제 `ConsoleShell`은 `GET /members/me`로 채우는데 이 화면은
  네트워크를 쓰지 않는다.
*/
const DEMO_SIDEBAR: SidebarGroup[] = [
  [
    { icon: HomeIcon, label: '홈', to: '/demo' },
    { icon: FileTextIcon, label: '내 리포트', to: '/demo/report' },
  ],
]

const DEMO_USER = { name: '김교육', role: '교육생' }

export default function DemoShell({ children }: { children: ReactNode }) {
  return (
    // 높이·여백·본문 상한은 ConsoleShell과 같은 값이다(h-svh · p-8 · max-w-7xl)
    <div className="flex h-svh flex-col overflow-hidden">
      <Header user={DEMO_USER} />
      <div className="flex min-h-0 min-w-0 flex-1">
        <Sidebar sidebar={DEMO_SIDEBAR} />
        <main className="bg-canvas min-w-0 flex-1 overflow-auto p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
