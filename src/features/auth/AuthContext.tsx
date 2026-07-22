import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { Role } from './authTypes'

/**
 * 로그인 세션을 앱 전체가 공유하는 곳 (AUTH-09 · 인증 컨텍스트)
 *
 * ⚠️ 실서비스 주의:
 * 지금은 데모라 sessionStorage에 보관해 새로고침을 견디게 했습니다.
 * 실제로는 accessToken을 메모리에만 두고, 새로고침 시
 * refreshToken(HttpOnly 쿠키)으로 재발급받아 세션을 복원하는 것이 안전합니다.
 */
export interface Session {
  accessToken: string
  role: Role
  initialScreen: string
}

interface AuthValue {
  session: Session | null
  signIn: (session: Session) => void
  signOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)
const STORAGE_KEY = 'iz-get.session'

function readStoredSession(): Session | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession)

  function signIn(next: Session) {
    setSession(next)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function signOut() {
    setSession(null)
    sessionStorage.removeItem(STORAGE_KEY)
    // 실서비스에서는 여기서 POST /auth/logout 호출로 서버 토큰도 폐기 (AUTH-04)
  }

  return (
    <AuthContext.Provider value={{ session, signIn, signOut }}>{children}</AuthContext.Provider>
  )
}

/** 어느 컴포넌트에서든 로그인 정보를 꺼내 쓰는 훅 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.')
  return ctx
}
