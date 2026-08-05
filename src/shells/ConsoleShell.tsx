import type { ReactNode } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import { SIDEBAR_BY_ROLE, type Role } from './sidebarConfig'

/*
  4역할 공용 셸 — 유일한 셸 컴포넌트다. Header + Sidebar + 콘텐츠를 조립하고,
  역할별로 달라지는 것(사이드바 항목·스코프 유무)은 `role` 하나로 여기서 갈라
  낸다. 예전엔 SuperAdminShell·OperatorShell·ManagerShell·TraineeShell 4개
  파일이 있었는데, 넷 다 "어떤 SIDEBAR_BY_ROLE을 넣을까"만 다른 얇은 래퍼라
  scope 하나 고치려 해도 파일 4개를 돌아다녀야 했다 — 그게 문제였다.
  역할이 늘어도 이 파일과 sidebarConfig.ts만 고치면 된다.

  cohort — 오퍼레이터·매니저만 기수 스코프를 쓴다(17번 2절). 슈퍼어드민·교육생은
  값을 넘겨도 무시한다 — role이 스코프 유무를 결정하지, prop이 있고 없고로
  화면마다 다르게 조립하지 않는다.

  user·cohort 기본값 — 인증이 없는 지금은 화면 25개 전부 같은 자리값을 쓴다.
  기본값이 없으면 화면 파일마다 똑같은 자리값을 반복해서 넘겨야 하고,
  인증이 붙을 때 25곳을 고쳐야 한다. 여기 한 곳만 실제 세션으로 바꾸면 된다.

  높이 — 목업은 `.app{height:var(--screen-h)}` + `.content{overflow:hidden}`이다.
  헤더·사이드바가 뷰포트 밖으로 스크롤되지 않고, 내용이 길면 콘텐츠 영역
  **안에서만** 스크롤된다. `min-h-svh`(최소 높이)를 쓰면 내용이 길어질 때 문서
  전체가 늘어나 헤더·사이드바까지 같이 밀려 올라간다 — `h-svh` + `overflow-hidden`
  으로 막는다.

  본문 여백·상한 — 목업 `.content{padding:var(--sp-6)}`가 **32px**이고(`p-8`),
  콘텐츠는 1280px에서 멈추고 가운데 정렬된다(01-design-checklist H8).
  1512(맥북 14)에서 본문 가용폭이 `1512 − 184(나브) − 64(좌우 32씩) = 1264px`라 팀이
  실제로 쓰는 화면에서는 이 상한에 닿지 않고 1920 이상에서만 걸린다 — 임의의 숫자가
  아니라 그 경계값이다. 상한을 여기서 한 번 걸어 두면 화면 25개가 각자 다시 걸 필요가 없다.

  `p-6`(24px)을 쓰면 가용폭이 1280이 되어 **1512에서 상한에 정확히 닿는다** — 여백이
  좁아지는 것뿐 아니라 문서가 근거로 든 경계값 자체가 무너진다.

  상한을 `<main>` 자신이 아니라 안쪽 div에 거는 이유 — `<main>`이 배경(`bg-canvas`)을
  칠하므로 그것을 좁히면 캔버스가 같이 좁아져 좌우에 이음선이 생긴다. 그리고 `<main>`은
  블록으로 둔다: flex로 바꾸면 안쪽 `mx-auto`가 진짜 중앙 정렬로 동작해 본문이 통째로
  가운데로 밀린다(02-layout-system 2절에서 실제로 겪은 것).

  너비 — 헤더·사이드바 둘 다 `w-full`/`flex-1` 계열이라 뷰포트 폭을 그대로
  따라간다(고정 리터럴은 사이드바의 184px 하나뿐이고, 그 값 자체가 v2 레이아웃
  문서 §1의 상수다). `md:` 미만에서 사이드바를 접는 것은 기존 관례(AuthForm·
  BrandPanel의 `md:` 분기)를 그대로 따른 것이고, 다시 여는 버튼(햄버거)은 없다
  — 실제 모바일 IA를 정하는 별도 설계가 필요하다.
*/
const COHORT_SCOPED_ROLES: Role[] = ['operator', 'manager']
const PLACEHOLDER_USER = { name: '김도현', role: '역할' }
const PLACEHOLDER_COHORT = '7기'

type Props = {
  role: Role
  user?: { name: string; role: string }
  cohort?: string
  children: ReactNode
}

export default function ConsoleShell({
  role,
  user = PLACEHOLDER_USER,
  cohort = PLACEHOLDER_COHORT,
  children,
}: Props) {
  const sidebar = SIDEBAR_BY_ROLE[role]
  const scope =
    COHORT_SCOPED_ROLES.includes(role) && cohort ? { label: '기수', value: cohort } : undefined

  return (
    // print:h-auto print:overflow-visible — 화면에서는 뷰포트 안에 가두지만
    // (위 주석) 인쇄에서 같은 높이 상한을 쓰면 한 페이지 분량만 찍히고 나머지가
    // 잘린다. index.css가 Header·Sidebar를 지우는 것과 짝을 이루는 규칙이다.
    <div className="flex h-svh flex-col overflow-hidden print:h-auto print:overflow-visible">
      <a
        href="#main"
        className="bg-primary sr-only rounded-md px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        본문으로 건너뛰기
      </a>

      <Header user={user} scope={scope} role={role} />

      <div className="flex min-h-0 min-w-0 flex-1 print:block">
        <Sidebar sidebar={sidebar} />

        <main
          id="main"
          tabIndex={-1}
          className="bg-canvas min-w-0 flex-1 overflow-auto p-8 print:overflow-visible print:p-0"
        >
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
