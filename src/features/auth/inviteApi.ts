// ─────────────────────────────────────────────────────────────
// 초대 가입·활성화 API 격리 모듈 (SC-A02 §5)
// 백엔드 준비 시 각 함수의 Mock 블록만 지우고 아래 fetch를 켜면 됩니다.
// ─────────────────────────────────────────────────────────────
import type { ActivateRequest, InviteApiError, InviteInfo, SignupRequest } from './inviteTypes'
import { accounts, createManagerAccount, activateTraineeAccount } from './mockDb'

// ───────── Mock 초대 토큰 (백엔드 연동 시 이 블록 전체 삭제) ─────────
/** 정상 토큰 — 유형과 초대 이메일을 결정 */
const MOCK_INVITES: Record<string, InviteInfo> = {
  'mgr-8f3a': { inviteType: 'MANAGER', email: 'newmanager@org.com' },
  'stu-4c19': { inviteType: 'TRAINEE', email: 'newtrainee@org.com' },
  // 제출 단계 오류 시연용 (폼은 정상 렌더 → 제출 시 실패)
  'mgr-rollback': { inviteType: 'MANAGER', email: 'rollback@org.com' },
  'stu-consent': { inviteType: 'TRAINEE', email: 'newtrainee@org.com' },
}

/** 토큰 검증 단계에서 바로 실패하는 시연용 토큰 */
const MOCK_INVITE_ERRORS: Record<string, InviteApiError> = {
  'mgr-expired': { code: 'A1_TOKEN_EXPIRED' },
  'mgr-used': { code: 'A2_TOKEN_USED' },
  'mgr-invalid': { code: 'A3_TOKEN_INVALID' },
  'stu-expired': { code: 'B2_TOKEN_EXPIRED' },
  'stu-noroster': { code: 'B1_NOT_IN_ROSTER' },
  'stu-dup': { code: 'B5_EMAIL_DUPLICATE' },
  'stu-badorg': { code: 'B8_INVALID_ORG_TOKEN' },
}

/** 제출 단계에서 강제로 실패시킬 토큰 */
const MOCK_SUBMIT_ERRORS: Record<string, InviteApiError> = {
  'mgr-rollback': { code: 'A7_SIGNUP_ROLLBACK' },
  'stu-consent': { code: 'CS3_CONSENT_SAVE_FAILED' },
}

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}
// ──────────────────────────────────────────────────────────────

/** GET /auth/invite/{token} — 토큰 검증 후 폼 변형 결정 */
export function getInvite(token: string): Promise<InviteInfo> {
  // ===== Mock 버전 =====
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const failure = MOCK_INVITE_ERRORS[token]
      if (failure) {
        reject(failure)
        return
      }
      const invite = MOCK_INVITES[token]
      if (!invite) {
        reject({ code: 'A3_TOKEN_INVALID' } satisfies InviteApiError)
        return
      }
      resolve(invite)
    }, 400)
  })

  // ===== 실제 백엔드 버전 =====
  // const res = await fetch(`/auth/invite/${token}`)
  // if (!res.ok) return Promise.reject(await res.json())
  // return res.json() // { inviteType, email }
}

/** POST /auth/signup — 매니저 회원가입 (변형 A) */
export function signup(req: SignupRequest): Promise<void> {
  // ===== Mock 버전 =====
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const forced = MOCK_SUBMIT_ERRORS[req.token]
      if (forced) {
        reject(forced)
        return
      }
      const invite = MOCK_INVITES[req.token]
      if (!invite) {
        reject({ code: 'A3_TOKEN_INVALID' } satisfies InviteApiError)
        return
      }
      // A5 · 이미 가입된 이메일 (같은 토큰으로 두 번 가입 시 재현됨)
      if (accounts[invite.email]) {
        reject({ code: 'A5_EMAIL_DUPLICATE' } satisfies InviteApiError)
        return
      }
      createManagerAccount(invite.email, req.name, req.password)
      resolve()
    }, 600)
  })

  // ===== 실제 백엔드 버전 =====
  // const res = await fetch('/auth/signup', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(req), // { token, name, password, consents }
  // })
  // if (!res.ok) return Promise.reject(await res.json())
}

/** POST /auth/activate — 교육생 계정 활성화 (변형 B) */
export function activate(req: ActivateRequest): Promise<void> {
  // ===== Mock 버전 =====
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const forced = MOCK_SUBMIT_ERRORS[req.token]
      if (forced) {
        reject(forced)
        return
      }
      const invite = MOCK_INVITES[req.token]
      if (!invite) {
        reject({ code: 'B8_INVALID_ORG_TOKEN' } satisfies InviteApiError)
        return
      }
      const account = accounts[invite.email]
      // B1 · 명단에 없는 계정
      if (!account) {
        reject({ code: 'B1_NOT_IN_ROSTER' } satisfies InviteApiError)
        return
      }
      // B4 · 이미 활성화된 계정 (두 번째 활성화 시 재현됨)
      if (account.active) {
        reject({ code: 'B4_ALREADY_ACTIVE' } satisfies InviteApiError)
        return
      }
      activateTraineeAccount(invite.email, req.password)
      resolve()
    }, 600)
  })

  // ===== 실제 백엔드 버전 =====
  // const res = await fetch('/auth/activate', { ... })
  // if (!res.ok) return Promise.reject(await res.json())
}

/** POST /auth/resend-invite — 계정 유무 무관 동일 응답 */
export function resendInvite(_token: string): Promise<void> {
  return delay(undefined, 400)
}
