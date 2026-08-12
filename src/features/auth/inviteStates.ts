import { ApiError } from '@/api/_contract'
import type { InviteErrorCode } from './inviteTypes'
import type { AlertVariant } from './authTypes'

/**
 * AU-02 · 제출 단계(폼은 유지, 인라인 알림) 상태별 UI. 검증 단계(토큰 자체가 안 산다 —
 * 폼 대신 화면 전체를 대체하는 상태 카드)는 `InviteScreen.tsx`의 `renderVerifyStatusCard`가
 * 따로 갖는다 — 카드가 필요로 하는 아이콘·부가문구·버튼 구성이 이 인라인 알림보다 풍부해서다.
 */
export interface InviteState {
  variant: AlertVariant
  message: string
  /** 알림 안에 노출할 후속 행동 */
  action?: 'RESEND' | 'LOGIN' | 'CONTACT'
}

const SYSTEM_MESSAGE =
  '잠시 문제가 있었어요. 다시 시도해 주세요. 계정은 아직 만들어지지 않았고 입력한 내용은 그대로 있습니다.'

/**
 * **분기는 2단이다** — `code`로 먼저, 모르는 코드면 폴백으로. `resolveAuthState`(로그인)·
 * `resolvePasswordResetState`와 같은 구조 — authStates.tsx 참고.
 */
export function resolveInviteState(error: unknown): InviteState {
  const e = error instanceof ApiError ? error : null

  switch (e?.code as InviteErrorCode | undefined) {
    // 만료 — 이 시점엔 폼을 이미 열어 본 상태라 invite.email을 안다. 호출부가 그 값으로
    // 자동 재발송한다(검증 단계와 달리 이메일을 다시 물을 필요 없음)
    case 'INVITATION_EXPIRED':
      return { variant: 'danger', message: '초대 링크가 만료되었습니다', action: 'RESEND' }

    // 이미 가입·활성화됨(재수강생 재활성화 포함) — 백엔드만 다르고 화면은 같다(AU-02 §"재수강생")
    case 'INVITATION_ALREADY_ACCEPTED':
      return { variant: 'warning', message: '이미 활성화된 계정입니다', action: 'LOGIN' }

    // 위변조·목적 불일치 등 (보안 로그)
    case 'INVITATION_INVALID':
      return { variant: 'danger', message: '유효하지 않은 링크입니다', action: 'CONTACT' }

    // 명단 외 이메일 — 교육생(activateTrainee)에서만 온다
    case 'INVITATION_NOT_IN_ROSTER':
      return { variant: 'danger', message: '명단에 등록되지 않은 계정입니다', action: 'CONTACT' }

    /*
      모르는 코드 — 여기가 폴백이다. `PASSWORD_CONFIRMATION_MISMATCH`·`REQUIRED_CONSENT_MISSING`·
      `WEAK_PASSWORD`는 클라이언트가 이미 검사해서 거의 안 오고, `ACTIVATION_STATE_CHANGED`
      (동시 요청으로 상태가 먼저 바뀜)는 전용 카드가 아직 없어 시스템 메시지로 둔다.
      계정 생성 전에 막혔으므로 폼은 그대로 유지된다(AU-02 §"저장 실패는 계정 생성 전에 막는다").
    */
    default:
      if (e?.isNetwork)
        return { variant: 'danger', message: '서버에 연결하지 못했습니다. 연결을 확인해 주세요.' }
      return { variant: 'danger', message: SYSTEM_MESSAGE }
  }
}
