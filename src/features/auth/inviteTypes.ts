// ─────────────────────────────────────────────────────────────
// 초대 가입·활성화 API 계약
// 출처: 배포 스펙 `POST /api/v0/auth/{invitations/resolve,manager-signup,trainee-activation}`
// (api/openapi.json) — **여기가 단일 원천**. 이전 판은 목업 케이스 표
// (signup-activation.html#cases)를 옮긴 것이었다. 실서버 연동하며 실제 스펙
// (`src/api/auth/authTypes.ts`)에 맞춰 정리했다 — passwordResetTypes.ts·authTypes.ts(로그인)와
// 같은 근거·구조.
// ─────────────────────────────────────────────────────────────
import type { Role } from './authTypes'

/** 화면이 쓰는 폼 변형 — 서버 `role`에서 파생한다(사용자가 고르지 않음, AU-02 §2) */
export type InviteType = 'MANAGER' | 'TRAINEE'

/**
 * `role → 화면 변형` 매핑.
 * - `TRAINEE` → 변형 B(활성화, `activateTrainee`)
 * - `MANAGER`·`OPERATOR` → 변형 A(가입). `signupManager` 하나를 공유한다 — 스펙 설명이
 *   그대로 "OPERATOR 또는 MANAGER 계정 활성화"다.
 * - `SUPER_ADMIN` → 이 화면 대상이 아니다(v1 결정 로그 D12: 슈퍼어드민은 시드·내부 초대
 *   전용, 공개 가입 화면 미포함). 가입시킬 API 자체가 없으므로 `null` — 호출부가
 *   `INVITATION_INVALID`와 같은 무효 카드로 처리한다.
 */
export function inviteTypeForRole(role: Role): InviteType | null {
  if (role === 'TRAINEE') return 'TRAINEE'
  if (role === 'MANAGER' || role === 'OPERATOR') return 'MANAGER'
  return null
}

/** `POST /auth/invitations/resolve` 응답에서 화면이 쓰는 값만 추린 것 */
export interface InviteInfo {
  inviteType: InviteType
  /** 초대 원장에서 확인한 읽기전용 이메일 — 화면에서 그대로 보여준다(D13) */
  email: string
  /** 후속 가입·활성화 요청에 그대로 실어 보내야 하는 대상 사용자 ID */
  userId: string
}

/** `POST /auth/manager-signup` (변형 A · 오퍼레이터·매니저) */
export interface SignupRequest {
  token: string
  userId: string
  name: string
  password: string
  passwordConfirm: string
  /** 동의한 항목 코드 목록 — `consents.ts`의 `ConsentItem.code` */
  consents: string[]
}

/** `POST /auth/trainee-activation` (변형 B · 교육생) */
export interface ActivateRequest {
  token: string
  userId: string
  password: string
  passwordConfirm: string
  consents: string[]
}

/**
 * 케이스 계약 · AU-02 (구현 근거)
 * v1 목 코드(`INVITE_EXPIRED` 등)를 버리고 실제 스펙 코드로 통일했다 — 백엔드가
 * 2026-08-11 4종으로 분리 확답한 것(만료/이미가입/명단외/무효).
 *
 * ⚠️ 여기 없는 코드(`PASSWORD_CONFIRMATION_MISMATCH`·`REQUIRED_CONSENT_MISSING`·
 * `WEAK_PASSWORD`·`ACTIVATION_STATE_CHANGED`·네트워크·미지의 값)는 `resolveInviteState`가
 * 폴백으로 처리한다 — 앞의 셋은 클라이언트가 이미 검사해서 거의 안 오고(비밀번호
 * 재설정과 같은 근거), `ACTIVATION_STATE_CHANGED`(동시 요청으로 상태가 먼저 바뀜)는
 * AU-02·목업 어디에도 전용 카드가 없어 시스템 메시지로 둔다 — 화면이 생기면 그때 추가한다.
 */
export type InviteErrorCode =
  | 'INVITATION_EXPIRED' // 410 — 만료 또는 재발송으로 교체됨
  | 'INVITATION_ALREADY_ACCEPTED' // 409 — 이미 수락·활성화됨 (재수강생 재활성화 포함)
  | 'INVITATION_NOT_IN_ROSTER' // 403 — 명단에 살아 있는 자리 없음 (교육생 전용, signupManager엔 없음)
  | 'INVITATION_INVALID' // 400 — 위변조·목적 불일치·대상 역할 불가(SUPER_ADMIN 포함)

/*
  ⚠️ 없어진 것 — 상태 카드의 `email` 자동 표시(만료·이미가입).
  실제 `ErrorResponse`엔 email 필드가 없다 — 토큰 검증(resolve) 실패 시점엔 서버가
  이메일을 안 준다. 그래서:
  - "이미 가입됨" 카드는 이메일 문구를 뺐다.
  - "만료" 카드(검증 단계, `InviteScreen.tsx`의 `renderVerifyStatusCard`)는 사용자가
    이메일을 직접 입력해야 재발송이 된다 — `resendAccountInvitation`이 토큰이 아니라
    email을 받기 때문(스펙: `InvitationResendRequest.email`).
  - 단, **제출 단계**(폼을 이미 연 뒤 만료된 경우)는 `resolve`가 먼저 성공해서
    `invite.email`을 이미 알고 있으므로 기존처럼 자동 재발송한다 — 이 차이는
    `InviteScreen.tsx` 주석 참고.
*/
