import { createBrowserRouter, Navigate, Link, useLocation } from 'react-router'
import type { RouteObject } from 'react-router'
import UiPreviewScreen from '@/app/UiPreviewScreen'
import PlaceholderScreen from '@/app/PlaceholderScreen'
import ConsoleShell from '@/shells/ConsoleShell'
import type { Role } from '@/shells/sidebarConfig'

/*
  v2 뼈대 — 25화면 전부 자리표시(PlaceholderScreen)로 등록한다. 화면 이식은
  화면별 후속 이슈에서 한다(#50 "하지 않는 것"). 지금 이 파일이 답하는 것은
  "URL·셸·사이드바가 서로 맞는가" 하나다.

  경로 규약은 `/{역할}/{화면}` — docs/plan/v2/wireframe 폴더 구조와 같다
  (docs/plan/v2/definition/00-index.md 화면 25개 표).

  로그인 세션이 없으므로 user·cohort는 전부 자리값이다 — 인증이 붙으면
  AuthContext에서 읽는다(features-v1/auth/AuthContext를 당분간 그대로 쓴다).

  역할별 래퍼(SuperAdminShell 등)를 두지 않는다 — ConsoleShell이 `role` 하나로
  사이드바·스코프를 결정하므로, 여기서는 role만 골라 주면 된다.
*/
const user = { name: '김도현', role: '역할' }
const cohort = '7기'

function screen(role: Role, code: string, title: string) {
  return (
    <ConsoleShell role={role} user={user} cohort={cohort}>
      <PlaceholderScreen code={code} title={title} />
    </ConsoleShell>
  )
}
const sa = (code: string, title: string) => screen('superadmin', code, title)
const op = (code: string, title: string) => screen('operator', code, title)
const mg = (code: string, title: string) => screen('manager', code, title)
const tr = (code: string, title: string) => screen('trainee', code, title)

const authRoutes: RouteObject[] = [
  { path: '/shared/login', element: <PlaceholderScreen code="AU-01" title="로그인" /> }, // AU-01
  {
    path: '/invite/:token', // AU-02 — 토큰이 변형(가입/활성화)을 결정한다
    element: <PlaceholderScreen code="AU-02" title="회원가입 · 계정 활성화" />,
  },
  {
    path: '/shared/password-reset',
    element: <PlaceholderScreen code="AU-03" title="비밀번호 재설정" />,
  },
]

const superadminRoutes: RouteObject[] = [
  { path: '/superadmin/orgs', element: sa('SA-01', '기관 목록') },
  { path: '/superadmin/orgs/:id', element: sa('SA-02', '기관 상세') },
  { path: '/superadmin/settings', element: sa('SA-03', '플랫폼 설정') },
]

const operatorRoutes: RouteObject[] = [
  { path: '/operator/dashboard', element: op('OP-01', '대시보드') },
  { path: '/operator/analysis', element: op('OP-02', '분석') },
  { path: '/operator/projects', element: op('OP-03', '프로젝트 목록') },
  { path: '/operator/projects/:id', element: op('OP-04', '프로젝트 상세') },
  { path: '/operator/report', element: op('OP-05', '리포트') },
  { path: '/operator/admin', element: op('OP-06', '운영 관리') },
]

const managerRoutes: RouteObject[] = [
  { path: '/manager/dashboard', element: mg('MG-01', '대시보드') },
  { path: '/manager/heatmap', element: mg('MG-02', '히트맵') },
  { path: '/manager/interviews', element: mg('MG-03', '면담 목록') },
  { path: '/manager/interviews/:id/brief', element: mg('MG-04', '면담 브리프') }, // 모드 — nav 없음
  { path: '/manager/trainees', element: mg('MG-05', '교육생 명부') },
  { path: '/manager/trainees/:id', element: mg('MG-06', '교육생 상세') }, // 명부에서만 진입
  { path: '/manager/projects', element: mg('MG-07', '프로젝트 목록') },
  { path: '/manager/projects/:id', element: mg('MG-08', '프로젝트 상세') },
  { path: '/manager/curriculum', element: mg('MG-09', '교안') },
]

const traineeRoutes: RouteObject[] = [
  { path: '/trainee/home', element: tr('TR-01', '홈') },
  { path: '/trainee/submission', element: tr('TR-02', '코드 제출') }, // 홈에서만 진입, nav 없음
  // TR-03 검증 세션 — 전체화면 모드라 셸 밖이다(17번 4절 "세션은 전체화면이라 애초에 나브가 없다")
  { path: '/trainee/session', element: <PlaceholderScreen code="TR-03" title="검증 세션" /> },
  { path: '/trainee/report', element: tr('TR-04', '내 리포트') },
]

export const router = createBrowserRouter([
  ...authRoutes,
  ...superadminRoutes,
  ...operatorRoutes,
  ...managerRoutes,
  ...traineeRoutes,

  // 진입점. 로그인 후 역할별 초기 화면은 서버가 판정하므로(명세 AUTH-03),
  // 클라이언트는 역할→화면 매핑을 갖지 않는다.
  { path: '/', element: <Navigate to="/shared/login" replace /> },
  { path: '/ui-preview', element: <UiPreviewScreen /> },

  // 없는 경로를 조용히 로그인으로 보내지 않는다. 그러면 "라우트를 등록 안 한 것"과
  // "코드가 틀린 것"을 구분할 수 없어 개발 중에 시간을 잃는다.
  { path: '*', element: <RouteNotFound /> },
])

function RouteNotFound() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-lg font-semibold">이 경로에 등록된 화면이 없습니다</p>
      <p className="text-fg-muted text-sm">
        <code className="font-mono">{pathname}</code>
      </p>
      <p className="text-fg-subtle text-sm">
        <code className="font-mono">src/app/routes.tsx</code>에 라우트를 추가했는지 확인하세요.
      </p>
      <Link to="/shared/login" className="text-primary mt-2 text-sm">
        로그인으로
      </Link>
    </div>
  )
}
