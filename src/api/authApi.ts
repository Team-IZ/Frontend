// ─────────────────────────────────────────────────────────────
// 인증 API 격리 모듈
// 백엔드 준비 시 각 함수의 Mock 블록만 삭제하고 아래 주석의 fetch를 켜면 됩니다.
// (화면·컴포넌트 코드는 수정 불필요)
// ─────────────────────────────────────────────────────────────
import type { ApiError, LoginRequest, LoginResponse, Role } from '@/types/auth'
import { accounts } from '@/api/mockDb'

/** 서버가 내려주는 역할별 초기 화면 (SC-A01 §5 · initialScreen) */
const INITIAL_SCREEN: Record<Role, string> = {
  MANAGER: '/manager/dashboard', // SC-M01
  TRAINEE: '/trainee/home', // SC-T01
  SUPERADMIN: '/superadmin/console', // SC-S01
}

// ───────── Mock 전용 (백엔드 연동 시 이 블록 삭제) ─────────
/** 상태 시연용 계정 — 9 case를 화면에서 직접 확인할 수 있게 함 */
const MOCK_ERROR_ACCOUNTS: Record<string, ApiError> = {
  'locked@org.com': { code: 'AUTH_LOCKED', lockedUntil: '오후 3:20' },
  'unverified@org.com': { code: 'AUTH_UNVERIFIED' },
  'error@org.com': { code: 'AUTH_TOKEN_ISSUE' },
  'rollback@org.com': { code: 'AUTH_ROLLBACK' },
  'cookie@org.com': { code: 'AUTH_COOKIE' },
  'noctx@org.com': { code: 'AUTH_NO_CONTEXT' },
}

const LOCK_THRESHOLD = 3
/** 데모라 30초. 실제 서버는 10분 등 정책값을 씁니다. */
const LOCK_DURATION_MS = 30_000

interface FailState {
  count: number
  lockedUntil?: number // timestamp
}
const failState: Record<string, FailState> = {}

function stateOf(email: string): FailState {
  if (!failState[email]) failState[email] = { count: 0 }
  return failState[email]
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}
// ──────────────────────────────────────────────────────────

/** POST /auth/login */
export function login(req: LoginRequest): Promise<LoginResponse> {
  // ===== Mock 버전 (현재 활성) =====
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const forced = MOCK_ERROR_ACCOUNTS[req.email]
      if (forced) {
        reject(forced)
        return
      }

      const state = stateOf(req.email)
      const now = Date.now()

      // 잠금이 만료됐으면 카운터 초기화
      if (state.lockedUntil && now >= state.lockedUntil) {
        state.count = 0
        state.lockedUntil = undefined
      }

      // case3 · 잠금 상태에서 로그인 시도 (제출 버튼 비활성)
      if (state.lockedUntil) {
        reject({
          code: 'AUTH_LOCKED',
          lockedUntil: formatTime(state.lockedUntil),
        } satisfies ApiError)
        return
      }

      const account = accounts[req.email]

      // case5 · 비활성 계정 (명단 등록만 되고 아직 활성화 안 함)
      if (account && !account.active) {
        reject({ code: 'AUTH_INACTIVE' } satisfies ApiError)
        return
      }

      if (account && account.password === req.password) {
        state.count = 0
        resolve({
          accessToken: 'mock-access-token',
          role: account.role,
          initialScreen: INITIAL_SCREEN[account.role],
        })
        return
      }

      // 실패 누적 → 임계 도달 시 잠금 발생 (case2)
      state.count += 1
      if (state.count >= LOCK_THRESHOLD) {
        state.lockedUntil = now + LOCK_DURATION_MS
        reject({
          code: 'AUTH_LOCKED_NEW',
          lockedUntil: formatTime(state.lockedUntil),
        } satisfies ApiError)
        return
      }
      reject({ code: 'AUTH_INVALID' } satisfies ApiError)
    }, 500)
  })

  // ===== 실제 백엔드 버전 (연동 시 위를 지우고 주석 해제 · 함수에 async 추가) =====
  // const res = await fetch('/auth/login', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   credentials: 'include', // refreshToken(HttpOnly Cookie) 수신
  //   body: JSON.stringify(req),
  // })
  // if (!res.ok) return Promise.reject(await res.json()) // { code, lockedUntil? }
  // return res.json() // { accessToken, role, initialScreen }
}

/** POST /auth/resend-verification — 계정 존재 여부 비노출(항상 동일 응답) */
export function resendVerification(_email: string): Promise<void> {
  // ===== Mock 버전 =====
  return new Promise((resolve) => setTimeout(() => resolve(), 500))

  // ===== 실제 백엔드 버전 =====
  // await fetch('/auth/resend-verification', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email }),
  // })
}
