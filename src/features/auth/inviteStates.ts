import type { InviteErrorCode } from './inviteTypes'
import type { AlertVariant } from './authTypes'

/**
 * SC-A02 §6 · 상태별 UI (AUTH-01 6 활성 + AUTH-06 8 + 동의 3)
 * 문구는 명세 계약값 그대로.
 */
export interface InviteState {
  variant: AlertVariant
  message: string
  /** 알림 안에 노출할 후속 행동 */
  action?: 'RESEND' | 'LOGIN'
  /** 토큰 자체가 무효 → 폼을 렌더하지 않음 */
  blocksForm?: boolean
}

const SYSTEM_MESSAGE = '일시적 오류입니다. 다시 시도하세요.'

export function resolveInviteState(code: InviteErrorCode): InviteState {
  switch (code) {
    // ── 변형 A · 매니저 회원가입 ──
    case 'A1_TOKEN_EXPIRED':
      return {
        variant: 'danger',
        message: '초대 링크가 만료되었습니다.',
        action: 'RESEND',
        blocksForm: true,
      }
    case 'A2_TOKEN_USED':
      return { variant: 'danger', message: '이미 사용된 초대 링크입니다.', blocksForm: true }
    case 'A3_TOKEN_INVALID':
      return { variant: 'danger', message: '유효하지 않은 링크입니다.', blocksForm: true }
    case 'A5_EMAIL_DUPLICATE':
      return { variant: 'warning', message: '이미 가입된 이메일입니다.', action: 'LOGIN' }
    case 'A7_SIGNUP_ROLLBACK':
      return { variant: 'danger', message: SYSTEM_MESSAGE }

    // ── 변형 B · 교육생 계정 활성화 ──
    case 'B1_NOT_IN_ROSTER':
      return { variant: 'danger', message: '명단에 등록되지 않은 계정입니다.', blocksForm: true }
    case 'B2_TOKEN_EXPIRED':
      return {
        variant: 'warning',
        message: '링크가 만료되었습니다.',
        action: 'RESEND',
        blocksForm: true,
      }
    case 'B3_MAIL_NOT_RECEIVED':
      return { variant: 'info', message: '메일을 받지 못하셨나요?', action: 'RESEND' }
    case 'B4_ALREADY_ACTIVE':
      return { variant: 'warning', message: '이미 활성화된 계정입니다.', action: 'LOGIN' }
    case 'B5_EMAIL_DUPLICATE':
      return {
        variant: 'danger',
        message: '이미 등록된 이메일입니다. 기존 계정과 기수 소속을 관리자에게 확인해주세요.',
        blocksForm: true,
      }
    case 'B7_ACTIVATE_ROLLBACK':
      return { variant: 'danger', message: SYSTEM_MESSAGE }
    case 'B8_INVALID_ORG_TOKEN':
      return { variant: 'danger', message: '유효하지 않은 링크입니다.', blocksForm: true }

    // ── 동의 (D14) ──
    case 'CS3_CONSENT_SAVE_FAILED':
      return { variant: 'danger', message: '잠시 후 다시 시도하세요.' }
  }
}

/** 비밀번호 정책 (AUTH-01·06 case6) — 미충족 기준 목록을 돌려줌 */
export function checkPasswordPolicy(password: string): string[] {
  const unmet: string[] = []
  if (password.length < 8) unmet.push('8자 이상')
  if (!/[A-Za-z]/.test(password)) unmet.push('영문 포함')
  if (!/[0-9]/.test(password)) unmet.push('숫자 포함')
  if (!/[^A-Za-z0-9]/.test(password)) unmet.push('특수문자 포함')
  return unmet
}
