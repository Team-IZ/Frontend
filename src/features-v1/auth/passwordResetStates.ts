import type { PasswordResetErrorCode } from './passwordResetTypes'

/** password-reset.html#cases (mockup c6911c0) · 토큰 검증 단계 상태별 UI */
export interface PasswordResetState {
  message: string
  /** 알림 안에 노출할 후속 행동 */
  action?: 'REQUEST_AGAIN' | 'CONTACT'
}

export function resolvePasswordResetState(code: PasswordResetErrorCode): PasswordResetState {
  switch (code) {
    // 2·3 — 만료·이미 사용됨 (할 일이 재요청으로 같아 한 화면)
    case 'RESET_TOKEN_EXPIRED':
    case 'RESET_TOKEN_USED':
      return { message: '링크가 만료되었습니다', action: 'REQUEST_AGAIN' }

    // 4 — 위변조·목적 불일치. 재요청해도 같은 일이 반복되므로 문의로 보낸다(보안 로그)
    case 'RESET_TOKEN_INVALID':
      return { message: '유효하지 않은 링크입니다', action: 'CONTACT' }

    // 6 — 지금 쓰는 비밀번호와 같음. 필드 하단에 붙이므로 여기서는 도달하지 않지만
    // confirmPasswordReset 실패 분기가 이 타입을 공유한다
    case 'SAME_AS_CURRENT':
      return { message: '지금 쓰는 비밀번호와 달라야 합니다' }

    // 7 — 저장 실패·롤백. 비밀번호는 아직 안 바뀜
    case 'RESET_FAILED':
      return {
        message: '잠시 문제가 있었어요. 다시 시도해 주세요. 비밀번호는 아직 바뀌지 않았습니다.',
      }
  }
}
