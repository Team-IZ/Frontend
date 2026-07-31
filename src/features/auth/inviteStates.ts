import type { InviteErrorCode } from './inviteTypes'
import type { AlertVariant } from './authTypes'

/**
 * signup-activation.html#cases (mockup c6911c0) · 상태별 UI
 * 문구는 계약값 그대로.
 */
export interface InviteState {
  variant: AlertVariant
  message: string
  /** 알림 안에 노출할 후속 행동 */
  action?: 'RESEND' | 'LOGIN' | 'CONTACT'
}

const SYSTEM_MESSAGE =
  '잠시 문제가 있었어요. 다시 시도해 주세요. 계정은 아직 만들어지지 않았고 입력한 내용은 그대로 있습니다.'

export function resolveInviteState(code: InviteErrorCode): InviteState {
  switch (code) {
    // A1·B2 — 초대 토큰 만료 (같은 주소로만 재발송)
    case 'INVITE_EXPIRED':
      return { variant: 'danger', message: '초대 링크가 만료되었습니다', action: 'RESEND' }

    // A2·B4 — 이미 가입·활성화됨 · B5(신규) 재수강생 — 화면은 이 상태와 동일(백엔드만 다름)
    case 'INVITE_USED':
    case 'ACCOUNT_EXISTS':
      return { variant: 'warning', message: '이미 활성화된 계정입니다', action: 'LOGIN' }

    // A3·B8 — 위변조·다른 기수 토큰 (보안 로그)
    case 'INVITE_INVALID':
      return { variant: 'danger', message: '유효하지 않은 링크입니다', action: 'CONTACT' }

    // B1 — 명단 외 이메일 (변형 B만)
    case 'NOT_IN_ROSTER':
      return { variant: 'danger', message: '명단에 등록되지 않은 계정입니다', action: 'CONTACT' }

    // A7·B7·CS3 — 저장 실패·롤백. 계정 생성 전 차단, 폼은 유지(재시도)
    case 'SIGNUP_FAILED':
      return { variant: 'danger', message: SYSTEM_MESSAGE }
  }
}

/** 비밀번호 정책 (AUTH-01·06 case A6·B6) — 미충족 기준 목록을 돌려줌 */
export function checkPasswordPolicy(password: string): string[] {
  const unmet: string[] = []
  if (password.length < 8) unmet.push('8자 이상')
  if (!/[A-Za-z]/.test(password)) unmet.push('영문 포함')
  if (!/[0-9]/.test(password)) unmet.push('숫자 포함')
  if (!/[^A-Za-z0-9]/.test(password)) unmet.push('특수문자 포함')
  return unmet
}
