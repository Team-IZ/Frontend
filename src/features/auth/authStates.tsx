import type { ReactNode } from 'react'
import type { AuthErrorCode, AlertVariant } from './authTypes'

/**
 * shared/login.html#cases (mockup c6911c0) · 상태별 UI (AUTH-03 예외 9 case 전량 1:1)
 * 문구는 계약값 그대로 — 임의 변경 금지(계정 열거 방지 등 보안 규칙 포함).
 */
export interface AuthState {
  variant: AlertVariant
  message: ReactNode
  /** 제출 버튼 비활성 (case2·3 지연 창) */
  blockSubmit?: boolean
  /** 초대 메일 재발송 링크 노출 (case4 미활성) */
  showResend?: boolean
}

/** case 6·7·8은 사용자에겐 동일 문구(내부 처리만 다름) */
const SYSTEM_MESSAGE = '일시적 오류입니다. 잠시 후 다시 시도하세요.'

export function resolveAuthState(code: AuthErrorCode, retryAfter?: number): AuthState {
  switch (code) {
    // 1 인증 실패 — 계정 존재 여부를 노출하지 않는 단일 문구
    case 'AUTH_INVALID':
      return { variant: 'danger', message: '이메일 또는 비밀번호가 올바르지 않습니다.' }

    // 2·3 연속 실패 지연 (잠금 아님) — 대기 창 동안 제출 비활성, 남은 시도 횟수는 노출하지 않는다
    case 'AUTH_THROTTLED':
      return {
        variant: 'warning',
        message: (
          <>
            시도가 너무 잦습니다.
            <br />
            {retryAfter ?? 30}초 후 다시 시도해 주세요.
          </>
        ),
        blockSubmit: true,
      }

    // 4 미활성 계정 — 초대 링크로 활성화 전, 재발송 가능
    case 'AUTH_UNVERIFIED':
      return {
        variant: 'info',
        message: '초대 링크로 먼저 계정을 활성화해 주세요',
        showResend: true,
      }

    // 5 정지된 계정 — 재발송 불가, 문의만(문구에 포함)
    case 'AUTH_INACTIVE':
      return {
        variant: 'danger',
        message: (
          <>
            사용이 중지된 계정입니다.
            <br />
            담당자에게 문의해 주세요.
          </>
        ),
      }

    // 6·7·8 시스템 오류 (동일 문구)
    case 'AUTH_TOKEN_ISSUE':
    case 'AUTH_ROLLBACK':
    case 'AUTH_COOKIE':
      return { variant: 'danger', message: SYSTEM_MESSAGE }

    // 9 권한 컨텍스트 결여
    case 'AUTH_NO_CONTEXT':
      return {
        variant: 'danger',
        message: (
          <>
            계정 권한 설정에 문제가 있습니다.
            <br />
            담당자에게 문의해 주세요.
          </>
        ),
      }
  }
}
