import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useSession } from '@/features/auth/useSession'
import { initialScreenFor } from '@/features/auth/authStore'
import type { Role } from '@/features/auth/authTypes'

/*
  라우트 단위 역할 가드.

  데이터 접근은 서버가 401/403으로 막지만(진짜 보안 경계), 그것만으로는
  role이 다른 사람이 URL을 직접 쳐 들어왔을 때 화면 셸·레이아웃까지
  그대로 렌더되는 걸 막지 못한다 — 이 컴포넌트는 그 방어선을 프론트에
  하나 더 둔다(시큐어코딩 가이드 ⑤ 관리자 권한 접속,
  docs/dev/pipa-secure-coding-audit.md 시큐어5).

  세션 확인 중엔 아무것도 그리지 않는다. LoginScreen과 같은 이유 —
  먼저 그리면(로그인 화면이든 대상 화면이든) 잠깐 보였다가 사라져
  화면이 깜빡인다.

  - 비로그인 → 로그인 화면
  - 로그인은 했지만 role 불일치 → 자기 초기 화면(initialScreenFor)
    로그인 화면으로 보내지 않는다 — 이미 로그인한 사람에게 "로그인하세요"는
    거짓 안내다.
*/
type Props = {
  /** 이 라우트 진입을 허용하는 role 목록 */
  allow: Role[]
  children: ReactNode
}

export default function RequireRole({ allow, children }: Props) {
  const { user, isLoading } = useSession()

  if (isLoading) return null
  if (!user) return <Navigate to="/shared/login" replace />
  if (!allow.includes(user.role)) {
    return <Navigate to={initialScreenFor(user.role)} replace />
  }

  return <>{children}</>
}
