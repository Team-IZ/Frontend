// ─────────────────────────────────────────────────────────────
// 인증 API 격리 모듈
// 백엔드 준비 시 각 함수의 Mock 블록만 삭제하고 아래 주석의 fetch를 켜면 됩니다.
// (화면·컴포넌트 코드는 수정 불필요)
// ─────────────────────────────────────────────────────────────
import type { ApiError, LoginRequest, LoginResponse, Role } from './authTypes'
import { accounts } from './mockDb'

/** 서버가 내려주는 역할별 초기 화면 (initialScreen) */
const INITIAL_SCREEN: Record<Role, string> = {
  SUPERADMIN: '/superadmin/orgs', // SA-01
  OPERATOR: '/operator/dashboard', // OP-01
  MANAGER: '/manager/dashboard', // MG-01
  TRAINEE: '/trainee/home', // TR-01
}

// ───────── Mock 전용 (백엔드 연동 시 이 블록 삭제) ─────────
/** 상태 시연용 계정 — 9 case를 화면에서 직접 확인할 수 있게 함 */
const MOCK_ERROR_ACCOUNTS: Record<string, ApiError> = {
  'suspended@org.com': { code: 'AUTH_INACTIVE' },
  'error@org.com': { code: 'AUTH_TOKEN_ISSUE' },
  'rollback@org.com': { code: 'AUTH_ROLLBACK' },
  'cookie@org.com': { code: 'AUTH_COOKIE' },
  'noctx@org.com': { code: 'AUTH_NO_CONTEXT' },
}

const THROTTLE_THRESHOLD = 3
/** 데모라 30초. 실제 서버는 정책값을 씁니다. */
const THROTTLE_DURATION_MS = 30_000

interface FailState {
  count: number
  throttledUntil?: number // timestamp
}
const failState: Record<string, FailState> = {}

function stateOf(email: string): FailState {
  if (!failState[email]) failState[email] = { count: 0 }
  return failState[email]
}

function retryAfterSeconds(until: number): number {
  return Math.max(1, Math.ceil((until - Date.now()) / 1000))
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

      // 지연이 끝났으면 카운터 초기화
      if (state.throttledUntil && now >= state.throttledUntil) {
        state.count = 0
        state.throttledUntil = undefined
      }

      // case2·3 · 지연 창 안에서 재시도 (제출 버튼 비활성. 계정을 잠그지 않는다)
      if (state.throttledUntil) {
        reject({
          code: 'AUTH_THROTTLED',
          retryAfter: retryAfterSeconds(state.throttledUntil),
        } satisfies ApiError)
        return
      }

      const account = accounts[req.email]

      // case4 · 미활성 계정 (명단 등록만 되고 아직 초대 활성화 안 함)
      if (account && !account.active) {
        reject({ code: 'AUTH_UNVERIFIED' } satisfies ApiError)
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

      // 실패 누적 → 임계 도달 시 지연 시작 (case2·3, 잠금 아님)
      state.count += 1
      if (state.count >= THROTTLE_THRESHOLD) {
        state.throttledUntil = now + THROTTLE_DURATION_MS
        reject({
          code: 'AUTH_THROTTLED',
          retryAfter: retryAfterSeconds(state.throttledUntil),
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
  // if (!res.ok) return Promise.reject(await res.json()) // { code, retryAfter? }
  // return res.json() // { accessToken, role, initialScreen }
}

/** POST /auth/resend-invite — 초대 메일 재발송(email 기준). 계정 존재 여부 비노출(항상 동일 응답) */
export function resendInviteMail(_email: string): Promise<void> {
  // ===== Mock 버전 =====
  return new Promise((resolve) => setTimeout(() => resolve(), 500))

  // ===== 실제 백엔드 버전 =====
  // await fetch('/auth/resend-invite', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email }),
  // })
}
