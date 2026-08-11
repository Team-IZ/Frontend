// ─────────────────────────────────────────────────────────────
// 비밀번호 재설정 API 격리 모듈 — 실서버 연동 완료(이슈 178)
// 화면 어휘(password/passwordConfirm)를 서버 어휘(newPassword/newPasswordConfirmation)로
// 여기서만 바꾼다 — report 도메인(`operator/report/_/api/api.ts`)과 같은 경계 원칙.
// ─────────────────────────────────────────────────────────────
import type { ConfirmResetRequest, ResetTokenInfo } from './passwordResetTypes'
import {
  requestPasswordReset as requestPasswordResetApi,
  validatePasswordResetToken,
  confirmPasswordReset as confirmPasswordResetApi,
} from '@/api/auth/authApi'

/** `POST /auth/password-reset/requests` — 항상 202. 정상·없는 이메일·미활성 계정 셋 다 같은 응답(계정 열거 방지) */
export async function requestPasswordReset(email: string): Promise<void> {
  await requestPasswordResetApi({ body: { email } })
}

/** `POST /auth/password-reset/validations` — 토큰 검증(만료·사용됨·위변조만 판정, 계정 활성 상태는 보지 않는다) */
export async function verifyResetToken(token: string): Promise<ResetTokenInfo> {
  const res = await validatePasswordResetToken({ body: { token } })
  return { email: res.email }
}

/** `POST /auth/password-reset/confirmations` — 새 비밀번호 저장, 성공 시 서버가 기존 세션 전부 폐기 시도 */
export async function confirmPasswordReset(req: ConfirmResetRequest): Promise<void> {
  await confirmPasswordResetApi({
    body: {
      token: req.token,
      newPassword: req.password,
      newPasswordConfirmation: req.passwordConfirm,
    },
  })
}
