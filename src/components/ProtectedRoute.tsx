import { Navigate } from 'react-router'
import type { ReactNode } from 'react'
import { useAuth } from '@/auth/AuthContext'
import type { Role } from '@/types/auth'

/**
 * 화면 진입 문지기 (AUTH-09 · RBAC / SYS-02 격리)
 * 1) 로그인 안 했으면 → 로그인 화면으로
 * 2) 로그인했지만 권한이 없는 화면이면 → 자기 초기 화면으로
 */
export default function ProtectedRoute({
  allow,
  children,
}: {
  allow: Role[]
  children: ReactNode
}) {
  const { session } = useAuth()

  if (!session) {
    return <Navigate to="/shared/login" replace />
  }

  if (!allow.includes(session.role)) {
    return <Navigate to={session.initialScreen} replace />
  }

  return <>{children}</>
}
