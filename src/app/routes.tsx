import { createBrowserRouter, Navigate, Link, useLocation } from 'react-router'
import { authRoutes } from '@/features/auth/routes'
import { dashboardRoutes } from '@/features/dashboard/routes'
import { curriculumRoutes } from '@/features/curriculum/routes'
import UiPreviewScreen from '@/app/UiPreviewScreen'

/*
  각 도메인이 자기 라우트를 내보내고, 여기서는 합치기만 한다.
  도메인이 추가되면 이 파일에서 바뀌는 것은 import 한 줄과 배열 한 줄이라
  두 사람이 동시에 고쳐도 대개 자동 병합된다.

  경로 규약은 `/{역할}/{화면}` — 와이어프레임 폴더 구조와 같다.
  공개 화면만 `/shared/*`를 쓴다.
*/
export const router = createBrowserRouter([
  ...authRoutes,
  ...dashboardRoutes,
  ...curriculumRoutes,

  // 진입점. 로그인 후 역할별 초기 화면은 서버가 판정하므로(명세 AUTH-03),
  // 클라이언트는 역할→화면 매핑을 갖지 않는다.
  { path: '/', element: <Navigate to="/shared/login" replace /> },
  { path: '/ui-preview', element: <UiPreviewScreen /> },

  // 없는 경로를 조용히 로그인으로 보내지 않는다. 그러면 "라우트를 등록 안 한 것"과
  // "코드가 틀린 것"을 구분할 수 없어 개발 중에 시간을 잃는다.
  // 인증이 붙으면 미로그인 사용자용 리다이렉트로 바뀐다.
  { path: '*', element: <RouteNotFound /> },
])

function RouteNotFound() {
  // 전역 location이 아니라 라우터의 값을 쓴다. 전역을 쓰면 화면 안에서 다른 경로로
  // 이동했을 때 주소만 바뀌고 화면은 이전 경로를 계속 보여준다(실제로 그랬다).
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-lg font-semibold">이 경로에 등록된 화면이 없습니다</p>
      <p className="text-fg-muted text-sm">
        <code className="font-mono">{pathname}</code>
      </p>
      <p className="text-fg-subtle text-sm">
        해당 도메인의 <code className="font-mono">routes.tsx</code>에 라우트를 추가했는지
        확인하세요.
      </p>
      <Link to="/shared/login" className="text-primary mt-2 text-sm">
        로그인으로
      </Link>
    </div>
  )
}
