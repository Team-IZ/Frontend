import type { ReactNode } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import { SIDEBAR_BY_ROLE, type Role } from './sidebarConfig'
import { useSession } from '@/features/auth/useSession'

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

  user — **인증이 붙어 여기 한 곳을 실제 세션으로 바꿨다**(예고해 둔 그 자리다).
  종전에는 화면 25개가 전부 `김도현 · 역할`이라는 자리값을 그렸고, 실제로 로그인한
  사람이 `이담`이어도 헤더는 남의 이름을 말했다. `useSession()`은 `GET /members/me`를
  react-query로 읽으므로 화면마다 요청이 늘지 않는다(같은 키를 공유한다).

  화면이 `user`를 넘기면 그것이 이긴다 — 지금 그런 화면은 없고, 앞으로도 「다른 사람으로
  보기」 같은 것이 생길 때만 쓴다.

  cohort — **자리값을 두지 않는다.** 예전에는 `'7기'`가 기본이라 아직 연동 안 된 화면이
  9기 계정에서도 `7기`를 그렸고, 연동된 화면과 오가면 기수가 바뀐 것처럼 보였다.
  값이 없으면 스코프 칩을 아예 안 그린다 — 없는 것이 틀린 것보다 낫다. 각 화면은
  연동될 때 자기 스코프 훅(`stores/cohortScope`)에서 받아 넘긴다.

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

/** 서버 역할 코드 → 헤더에 그릴 말 */
const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: '슈퍼 어드민',
  OPERATOR: '오퍼레이터',
  MANAGER: '매니저',
  TRAINEE: '교육생',
}

type Props = {
  role: Role
  /** 넘기면 세션보다 우선한다 — 지금 그런 화면은 없다 */
  user?: { name: string; role: string; email?: string }
  /** 헤더 스코프에 보일 지금 기수 이름. 빈 문자열이면 스코프 자리를 그리지 않는다 */
  cohort?: string
  /** 고를 수 있는 기수 전부. 주면 헤더 스위처가 **실제로 동작한다** */
  cohorts?: readonly { value: string; label: string }[]
  onCohortChange?: (cohortId: string) => void
  children: ReactNode
}

export default function ConsoleShell({
  role,
  user,
  cohort,
  cohorts,
  onCohortChange,
  children,
}: Props) {
  /*
    **로그인한 사람은 서버가 안다.** 아직 안 왔으면 이름 자리를 비워 둔다 — 남의 이름을
    잠깐 보여줬다 바꾸는 것보다 낫다(async-states §1-3, 자리는 그대로 두고 값만 채운다).
  */
  const { user: me } = useSession()
  const shown = user ?? {
    name: me?.name ?? '',
    role: me ? (ROLE_LABEL[me.role] ?? me.role) : '',
    email: me?.email,
  }

  const sidebar = SIDEBAR_BY_ROLE[role]
  const scope =
    COHORT_SCOPED_ROLES.includes(role) && cohort
      ? { label: '기수', value: cohort, options: cohorts, onChange: onCohortChange }
      : undefined

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

      <Header user={shown} scope={scope} />

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
