import { ApiError } from '@/api/_contract'
import type { PasswordResetErrorCode } from './passwordResetTypes'

/** password-reset.html#cases · 토큰 검증·확정 단계 상태별 UI */
export interface PasswordResetState {
  message: string
  /** 알림 안에 노출할 후속 행동 */
  action?: 'REQUEST_AGAIN' | 'CONTACT'
}

const SYSTEM_MESSAGE =
  '잠시 문제가 있었어요. 다시 시도해 주세요. 비밀번호는 아직 바뀌지 않았습니다.'

/**
 * **분기는 2단이다** — `code`로 먼저, 모르는 코드(네트워크·5xx·스펙에 없는 값)면 폴백으로.
 * `resolveAuthState`(로그인)와 같은 구조 — authStates.tsx 참고.
 */
export function resolvePasswordResetState(error: unknown): PasswordResetState {
  const e = error instanceof ApiError ? error : null

  switch (e?.code as PasswordResetErrorCode | undefined) {
    // 2·3 — 만료·이미 사용됨 (할 일이 재요청으로 같아 한 화면)
    case 'RESET_TOKEN_EXPIRED':
    case 'RESET_TOKEN_USED':
      return { message: '링크가 만료되었습니다', action: 'REQUEST_AGAIN' }

    // 4 — 위변조·목적 불일치. 재요청해도 같은 일이 반복되므로 문의로 보낸다(보안 로그)
    case 'RESET_TOKEN_INVALID':
      return { message: '유효하지 않은 링크입니다', action: 'CONTACT' }

    // 6 — 지금 쓰는 비밀번호와 같음. 화면이 필드 하단에 직접 붙이므로 보통 여기까지 안 오지만
    // (PasswordResetScreen.tsx가 먼저 가로챈다), 폴백 경로로 들어오면 같은 문구를 쓴다
    case 'SAME_AS_CURRENT':
      return { message: '지금 쓰는 비밀번호와 달라야 합니다' }

    // 7 — 저장 실패·롤백. 비밀번호는 아직 안 바뀜
    case 'RESET_FAILED':
      return { message: SYSTEM_MESSAGE }

    // 클라이언트가 이미 정책·일치 여부를 검사해서 거의 안 오지만, 경쟁 상태 대비 폴백
    case 'WEAK_PASSWORD':
      return { message: '비밀번호 정책을 다시 확인해 주세요.' }
    case 'VALIDATION_FAILED':
      return { message: '입력값을 다시 확인해 주세요.' }

    // 모르는 코드·네트워크 — 화면이 흰 채로 남는 것이 가장 나쁘므로 원인은 감추고 행동만 남긴다
    default:
      if (e?.isNetwork) return { message: '서버에 연결하지 못했습니다. 연결을 확인해 주세요.' }
      return { message: SYSTEM_MESSAGE }
  }
}
