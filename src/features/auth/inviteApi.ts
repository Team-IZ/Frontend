// ─────────────────────────────────────────────────────────────
// 초대 가입·활성화 API 격리 모듈 — 실서버 연동 완료
// 화면 어휘(동의 코드 배열 등)를 서버 어휘(개별 동의 불리언)로 여기서만 바꾼다 —
// passwordResetApi.ts·report 도메인(`operator/report/_/api/api.ts`)과 같은 경계 원칙.
// ─────────────────────────────────────────────────────────────
import { ApiError } from '@/api/_contract'
import {
  resolveInvitation,
  signupManager,
  activateTrainee,
  resendAccountInvitation,
} from '@/api/auth/authApi'
import { inviteTypeForRole } from './inviteTypes'
import type { ActivateRequest, InviteInfo, SignupRequest } from './inviteTypes'

/**
 * 메일 링크의 토큰엔 역할 접두사가 붙어 온다(백엔드 확인, 2026-08-11):
 *   `sa-<token>`(슈퍼어드민) · `op-<token>`(오퍼레이터·매니저 공용) · `stu-<token>`(교육생)
 * 첫 `-` 앞부분은 라우팅용 힌트일 뿐 실제 일회성 토큰이 아니다 — 서버엔 그 뒤만 보낸다.
 * (역할 자체는 이 접두사가 아니라 `resolveInvitation` 응답의 `role`로 판정한다 — inviteTypes.ts.)
 */
function stripRolePrefix(rawToken: string): string {
  const i = rawToken.indexOf('-')
  return i === -1 ? rawToken : rawToken.slice(i + 1)
}

/** 동의 코드 배열 → 서버가 원하는 개별 불리언. 화면에 없는 코드는 자연히 false(=미동의) */
function consentBooleans(codes: string[]) {
  const has = (code: string) => codes.includes(code)
  return {
    serviceTermsAgreed: has('TERMS'),
    privacyCollectionAgreed: has('PRIVACY'),
    aiAnalysisAgreed: has('AI_ANALYSIS'),
    organizationSharingAgreed: has('ORG_SHARE'),
    anonymousImprovementAgreed: has('ANON_IMPROVE'),
  }
}

/** `POST /auth/invitations/resolve` — 토큰 검증 후 폼 변형 결정 */
export async function getInvite(token: string): Promise<InviteInfo> {
  const res = await resolveInvitation({ body: { invitationToken: stripRolePrefix(token) } })
  const inviteType = inviteTypeForRole(res.role)

  // 슈퍼어드민(가입 API 없음) · user_id 없는 응답(스펙상 optional) — 둘 다 이 화면이
  // 진행할 수 없다는 점에서 사용자에게는 동일하다. INVITATION_INVALID와 같은 카드로 처리.
  if (!inviteType || !res.user_id) {
    throw new ApiError({
      status: 400,
      code: 'INVITATION_INVALID',
      message: '이 초대는 이 화면에서 처리할 수 없습니다.',
    })
  }

  return { inviteType, email: res.email, userId: res.user_id }
}

/** `POST /auth/manager-signup` — 오퍼레이터·매니저 가입 (변형 A) */
export async function signup(req: SignupRequest): Promise<void> {
  const c = consentBooleans(req.consents)
  await signupManager({
    body: {
      user_id: req.userId,
      invitationToken: stripRolePrefix(req.token),
      name: req.name,
      password: req.password,
      passwordConfirmation: req.passwordConfirm,
      serviceTermsAgreed: c.serviceTermsAgreed,
      privacyCollectionAgreed: c.privacyCollectionAgreed,
    },
  })
}

/** `POST /auth/trainee-activation` — 교육생 활성화 (변형 B) */
export async function activate(req: ActivateRequest): Promise<void> {
  const c = consentBooleans(req.consents)
  await activateTrainee({
    body: {
      user_id: req.userId,
      invitationToken: stripRolePrefix(req.token),
      password: req.password,
      passwordConfirmation: req.passwordConfirm,
      serviceTermsAgreed: c.serviceTermsAgreed,
      privacyCollectionAgreed: c.privacyCollectionAgreed,
      aiAnalysisAgreed: c.aiAnalysisAgreed,
      organizationSharingAgreed: c.organizationSharingAgreed,
      anonymousImprovementAgreed: c.anonymousImprovementAgreed,
    },
  })
}

/**
 * `POST /auth/invitations/resend` — **토큰이 아니라 이메일**로 재발송한다(계정 유무·
 * 초대 존재 여부와 무관하게 항상 같은 응답 — 계정 열거 방지). 호출부(`InviteScreen.tsx`)가
 * 검증 단계 실패면 사용자가 입력한 이메일을, 제출 단계 실패면 이미 아는 `invite.email`을 넘긴다.
 */
export async function resendInvite(email: string): Promise<void> {
  await resendAccountInvitation({ body: { email } })
}
