import { Link, useLocation } from 'react-router'

/*
  없는 경로를 조용히 로그인으로 보내지 않는다. 그러면 "라우트를 등록 안 한 것"과
  "코드가 틀린 것"을 구분할 수 없어 개발 중에 시간을 잃는다.
*/
export default function RouteNotFound() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-lg font-semibold">이 경로에 등록된 화면이 없습니다</p>
      <p className="text-fg-muted text-sm">
        <code className="font-mono">{pathname}</code>
      </p>
      <p className="text-fg-subtle text-sm">
        해당 화면의 <code className="font-mono">{'{X}Screen.tsx'}</code>에{' '}
        <code className="font-mono">route</code>를 export했는지 확인하세요.
      </p>
      <Link to="/shared/login" className="text-primary mt-2 text-sm">
        로그인으로
      </Link>
    </div>
  )
}
