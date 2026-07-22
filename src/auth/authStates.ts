import type { AuthErrorCode } from '@/types/auth'
import type { AlertVariant } from '@/components/InlineAlert'

/**
 * SC-A01 §6 · 상태별 UI (AUTH-03 예외 9 case 전량 1:1)
 * 문구는 명세 계약값 그대로 — 임의 변경 금지(계정 열거 방지 등 보안 규칙 포함).
 */
export interface AuthState {
  variant: AlertVariant
  message: string
  /** 제출 버튼 비활성 (case3 잠금 상태 진입) */
  blockSubmit?: boolean
  /** 인증 메일 재발송 링크 노출 (case4 미인증) */
  showResend?: boolean
}

/** case 6·7·8은 사용자에겐 동일 문구(내부 처리만 다름) */
const SYSTEM_MESSAGE = '일시적 오류입니다. 잠시 후 다시 시도하세요.'

export function resolveAuthState(code: AuthErrorCode, lockedUntil?: string): AuthState {
  switch (code) {
    // 1 인증 실패 — 계정 존재 여부를 노출하지 않는 단일 문구
    case 'AUTH_INVALID':
      return { variant: 'danger', message: '이메일 또는 비밀번호를 확인해주세요.' }

    // 2 잠금 발생
    case 'AUTH_LOCKED_NEW':
      return {
        variant: 'warning',
        message: `여러 번 실패하여 계정이 잠겼습니다. ${lockedUntil ?? '잠시 후'} 이후 다시 시도하세요.`,
      }

    // 3 잠금 상태 진입 — 제출 버튼 비활성
    case 'AUTH_LOCKED':
      return {
        variant: 'warning',
        message: `여러 번 실패하여 계정이 잠겼습니다. ${lockedUntil ?? '잠시 후'} 이후 다시 시도하세요.`,
        blockSubmit: true,
      }

    // 4 미인증 계정 — 재발송 링크
    case 'AUTH_UNVERIFIED':
      return { variant: 'info', message: '이메일 인증이 필요합니다.', showResend: true }

    // 5 비활성 계정
    case 'AUTH_INACTIVE':
      return { variant: 'danger', message: '이용할 수 없는 계정입니다. 관리자에게 문의하세요.' }

    // 6·7·8 시스템 오류 (동일 문구)
    case 'AUTH_TOKEN_ISSUE':
    case 'AUTH_ROLLBACK':
    case 'AUTH_COOKIE':
      return { variant: 'danger', message: SYSTEM_MESSAGE }

    // 9 권한 컨텍스트 결여
    case 'AUTH_NO_CONTEXT':
      return {
        variant: 'danger',
        message: '계정 권한 설정에 문제가 있습니다. 관리자에게 문의하세요.',
      }
  }
}
