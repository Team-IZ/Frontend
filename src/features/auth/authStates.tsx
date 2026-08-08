import type { ReactNode } from 'react'
import { ApiError } from '@/api/_contract'
import type { AlertVariant, LoginErrorCode } from './authTypes'

/**
 * 로그인 실패를 화면 상태로 옮긴다.
 *
 * **문구는 프론트가 정한다.** 서버 `message`를 그대로 띄우지 않는다 — 백엔드도 스펙에
 * *"message는 사람이 읽는 기본 문구라 바뀔 수 있다"* 고 못박아 뒀다. 문구를 그대로 쓰면
 * 백엔드가 다듬는 순간 우리 계정 열거 방지 규칙이 조용히 깨진다.
 *
 * **분기는 2단이다** — `code`로 먼저, 모르는 코드면 `status`로. 스펙에 없는 코드가 올 수
 * 있고(스펙이 늘 최신은 아니다) 서버에 닿지 못하는 경우도 있다.
 */
export interface AuthState {
  variant: AlertVariant
  message: ReactNode
  /** 제출 버튼 비활성 — 일시 차단 창 동안 */
  blockSubmit?: boolean
  /** 초대 메일 재발송 링크 노출 */
  showResend?: boolean
}

const SYSTEM_MESSAGE = '일시적 오류입니다. 잠시 후 다시 시도하세요.'

const CONTACT_MANAGER = (lead: string): ReactNode => (
  <>
    {lead}
    <br />
    담당자에게 문의해 주세요.
  </>
)

export function resolveAuthState(error: unknown): AuthState {
  const e = error instanceof ApiError ? error : null

  switch (e?.code as LoginErrorCode | undefined) {
    /*
      자격 불일치. 계정 존재 여부를 노출하지 않는 단일 문구를 쓴다.

      **활성화 전 계정도 여기로 온다**(authTypes 주석). 그래서 재발송 링크를 여기에 붙인다 —
      "당신 계정이 미활성이다"라고 말하지 않으면서, 실제로 초대 메일을 못 받은 사람이
      스스로 길을 찾을 수 있다. 링크가 뜬다는 사실 자체는 아무 정보도 흘리지 않는다
      (틀린 비밀번호를 넣은 사람에게도 똑같이 뜬다).
    */
    case 'LOGIN_INVALID':
      return {
        variant: 'danger',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        showResend: true,
      }

    case 'VALIDATION_FAILED':
      return { variant: 'danger', message: '이메일과 비밀번호를 확인해 주세요.' }

    // 일시 차단 — 남은 시도 횟수는 노출하지 않는다(그 자체가 공격자에게 주는 정보)
    case 'LOGIN_TEMPORARILY_BLOCKED':
      return {
        variant: 'warning',
        message: (
          <>
            시도가 너무 잦습니다.
            <br />
            {e?.retryAfter ?? 60}초 후 다시 시도해 주세요.
          </>
        ),
        blockSubmit: true,
      }

    case 'LOGIN_ACCOUNT_INACTIVE':
      return { variant: 'danger', message: CONTACT_MANAGER('사용이 중지된 계정입니다.') }

    // 계정 문제가 아니라는 것이 이 문구의 요점 — 본인이 할 수 있는 일이 없다
    case 'LOGIN_ORG_SUSPENDED':
      return { variant: 'danger', message: CONTACT_MANAGER('기관 이용이 중지된 상태입니다.') }

    case 'LOGIN_ORIGIN_NOT_ALLOWED':
      return { variant: 'danger', message: CONTACT_MANAGER('허용되지 않은 접속 경로입니다.') }

    case 'LOGIN_NO_ORG_CONTEXT':
      return { variant: 'danger', message: CONTACT_MANAGER('계정 권한 설정에 문제가 있습니다.') }

    /*
      모르는 코드 — 여기가 폴백이다. 화면이 흰 채로 남는 것이 가장 나쁘므로
      "무엇을 해야 하는가"만 남기고 원인은 감춘다.
    */
    default:
      if (e?.isNetwork)
        return { variant: 'danger', message: '서버에 연결하지 못했습니다. 연결을 확인해 주세요.' }
      return { variant: 'danger', message: SYSTEM_MESSAGE }
  }
}
