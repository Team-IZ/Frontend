// ─────────────────────────────────────────────────────────────
// 비밀번호 재설정 API 격리 모듈 (password-reset.html#cases · mockup c6911c0)
// 백엔드 준비 시 각 함수의 Mock 블록만 지우고 아래 fetch를 켜면 됩니다.
// ─────────────────────────────────────────────────────────────
import type {
  ConfirmResetRequest,
  ConfirmResetResponse,
  PasswordResetApiError,
  ResetTokenInfo,
} from './passwordResetTypes'
import { accounts, resetAccountPassword } from './mockDb'

// ───────── Mock 재설정 토큰 (백엔드 연동 시 이 블록 전체 삭제) ─────────
/** 정상 토큰 — 어느 계정의 비밀번호를 바꿀지 결정 */
const MOCK_RESET_TOKENS: Record<string, string> = {
  'reset-valid': 'manager@org.com',
  'reset-revokefail': 'manager@org.com', // 성공하지만 세션 폐기가 실패하는 case8 시연용
  'reset-failing': 'manager@org.com', // 제출 단계에서 항상 실패하는 case7 시연용
}

/** 토큰 검증 단계에서 바로 실패하는 시연용 토큰 */
const MOCK_RESET_TOKEN_ERRORS: Record<string, PasswordResetApiError> = {
  'reset-expired': { code: 'RESET_TOKEN_EXPIRED' },
  'reset-used': { code: 'RESET_TOKEN_USED' },
  'reset-tampered': { code: 'RESET_TOKEN_INVALID' },
}

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}
// ──────────────────────────────────────────────────────────────

/** POST /auth/password-reset/request — 항상 202. 정상·없는 이메일·미활성 계정 셋 다 같은 응답(계정 열거 방지) */
export function requestPasswordReset(_email: string): Promise<void> {
  // ===== Mock 버전 =====
  return delay(undefined)

  // ===== 실제 백엔드 버전 =====
  // await fetch('/auth/password-reset/request', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email }),
  // })
}

/** GET /auth/password-reset/{token} — 토큰 검증(만료·사용됨·위변조만 판정, 계정 활성 상태는 보지 않는다) */
export function verifyResetToken(token: string): Promise<ResetTokenInfo> {
  // ===== Mock 버전 =====
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const failure = MOCK_RESET_TOKEN_ERRORS[token]
      if (failure) {
        reject(failure)
        return
      }
      const email = MOCK_RESET_TOKENS[token]
      if (!email) {
        reject({ code: 'RESET_TOKEN_INVALID' } satisfies PasswordResetApiError)
        return
      }
      resolve({ email })
    }, 400)
  })

  // ===== 실제 백엔드 버전 =====
  // const res = await fetch(`/auth/password-reset/${token}`)
  // if (!res.ok) return Promise.reject(await res.json())
  // return res.json() // { email }
}

/** POST /auth/password-reset/confirm — 새 비밀번호 저장, 성공 시 서버가 기존 세션 전부 폐기 시도 */
export function confirmPasswordReset(req: ConfirmResetRequest): Promise<ConfirmResetResponse> {
  // ===== Mock 버전 =====
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // case7 시연용 — 항상 저장 실패(롤백, 비밀번호 아직 안 바뀜)
      if (req.token === 'reset-failing') {
        reject({ code: 'RESET_FAILED' } satisfies PasswordResetApiError)
        return
      }
      const email = MOCK_RESET_TOKENS[req.token]
      if (!email) {
        reject({ code: 'RESET_TOKEN_INVALID' } satisfies PasswordResetApiError)
        return
      }
      const account = accounts[email]
      // case6 — 지금 쓰는 비밀번호와 같음(클라이언트는 현재 비밀번호를 모르므로 서버가 판정)
      if (account?.password === req.password) {
        reject({ code: 'SAME_AS_CURRENT' } satisfies PasswordResetApiError)
        return
      }
      resetAccountPassword(email, req.password)
      resolve({ revokeFailed: req.token === 'reset-revokefail' })
    }, 600)
  })

  // ===== 실제 백엔드 버전 =====
  // const res = await fetch('/auth/password-reset/confirm', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(req), // { token, password }
  // })
  // if (!res.ok) return Promise.reject(await res.json())
  // return res.json() // { revokeFailed }
}
