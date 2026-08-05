import { formatDate } from '@/lib/format'
import type { LadderLevel, RoundReport } from './types'

/*
  표시 라벨 — **화면 것**(api-boundary §1-⑤). 숫자 계단을 학생 언어로 바꾸는 것도
  전부 여기다 — 서버는 level: 1~4만 준다.

  색은 여기서 만들지 않는다 — 레벨 배지·레일 핀 둘 다 컴포넌트가 --color-reach-1~4를
  직접 쓴다(ConceptCard.tsx 머리 주석. 5단 그라디언트를 그대로 쓰기로 결정 — 문서
  초안의 3색 폭보다 이쪽이 낫다는 판단, 실사용 피드백으로 확정).
*/

export const REACH_LABEL: Record<LadderLevel, string> = {
  1: '무엇을 하는지까지',
  2: '왜 그렇게 했는지까지',
  3: '다른 방법까지',
  4: '언제 깨지는지까지',
}

/** 레일의 회차 한 줄 보조문구 — report의 실제 상태에서 계산한다(문장을 서버에서 받지 않는다, A7) */
export function buildRailNote(report: RoundReport | undefined): string | undefined {
  if (!report) return undefined
  switch (report.status) {
    case 'PUBLISHED': {
      if (report.retryState === 'PENDING') {
        const count = report.concepts.filter((c) => c.isRetryTarget).length
        return `다시 볼 문제 ${count}개`
      }
      if (report.retryState === 'DONE') return '다시 보기 1개 완료'
      return undefined
    }
    case 'NOT_ATTEMPTED':
      return '미응시'
    case 'STOPPED':
      return '중단'
    case 'VOID_ATTEMPT':
      return '확인 필요'
    case 'PENDING_PUBLISH':
    case 'PENDING_VISIBILITY':
      return '응시 완료'
  }
}

/** "3개월 전" — 아카이브(오래된 회차)에서만 붙인다 */
export function formatRelativeMonths(publishedAtIso: string, now: number): string | null {
  const months = Math.floor((now - new Date(publishedAtIso).getTime()) / (30 * 86_400_000))
  return months >= 1 ? `${months}개월 전` : null
}

export { formatDate }
