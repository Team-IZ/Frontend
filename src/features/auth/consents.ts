import type { InviteType } from './inviteTypes'

/**
 * 개인정보 동의 항목 (D14 · 개인정보보호법 §15·17·22·26)
 * 대상 차등: 매니저 2개(전부 필수) / 교육생 5개(필수 4 + 선택 1)
 * 문구는 와이어프레임(shared/signup-activation.html) 기준.
 */
export interface ConsentItem {
  code: string
  title: string
  required: boolean
  /** 거부 시 불이익 — AI 분석 항목에만 노출 */
  note?: string
  /** 위탁 고지 (§26) */
  subNote?: string
}

const TERMS: ConsentItem = { code: 'TERMS', title: '서비스 이용약관', required: true }
const PRIVACY: ConsentItem = {
  code: 'PRIVACY',
  title: '개인정보 수집·이용 (이름·이메일·소속)',
  required: true,
}

export const MANAGER_CONSENTS: ConsentItem[] = [TERMS, PRIVACY]

export const TRAINEE_CONSENTS: ConsentItem[] = [
  TERMS,
  PRIVACY,
  {
    code: 'AI_ANALYSIS',
    title: '코드·세션 답변의 AI 분석',
    required: true,
    note: '미동의 시 평가 불가',
    subNote: '분석은 외부 LLM 제공사에 위탁하여 처리됩니다.',
  },
  { code: 'ORG_SHARE', title: '평가 결과의 소속 기관 공유', required: true },
  { code: 'ANON_IMPROVE', title: '익명 데이터의 서비스 개선 활용', required: false },
]

export function consentsFor(inviteType: InviteType): ConsentItem[] {
  return inviteType === 'MANAGER' ? MANAGER_CONSENTS : TRAINEE_CONSENTS
}
