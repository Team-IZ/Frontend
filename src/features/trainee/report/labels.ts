import { formatDate } from '@/lib/format'
import { askedConcepts, type ReachedLevel, type RoundReport } from './_/api/types'

/*
  표시 라벨 — **화면 것**(api-boundary §1-⑤). 숫자 계단을 학생 언어로 바꾸는 것도
  전부 여기다 — 서버는 level: 1~4만 준다.

  색은 여기서 만들지 않는다 — 레벨 배지·레일 핀 둘 다 컴포넌트가 --color-reach-1~4를
  직접 쓴다(ConceptCard.tsx 머리 주석. 5단 그라디언트를 그대로 쓰기로 결정 — 문서
  초안의 3색 폭보다 이쪽이 낫다는 판단, 실사용 피드백으로 확정).
*/

/*
  배지는 **어디까지 올라갔나**를 말한다. 1~4단은 "…까지"로 도달한 칸을 가리킨다.

  ⚠ **0단 문구는 기획에 없다 — 프론트가 정한 값이다**(2026-08-12 사용자 확정).

  0단은 1단(무엇을 하는지) 질문을 **세 번 다 못 넘긴 것**인데, 그 원인이 하나가 아니다:
  본인이 안 쓴 팀 코드가 걸렸거나 · 알지만 말로 못 풀었거나 · 문제당 20분이 끝나
  끊겼거나 · 성의 없이 답했거나. **배지 하나가 이걸 전부 덮어야 한다.**

  그래서 **학생을 주어로 세우지 않는다.** "설명하지 못했어요"는 능력 문제로만 읽히는데
  위 네 경우 중 하나일 뿐이다. 시스템을 주어로 두면("듣지 못했다") 시간초과·팀 코드
  경우에도 사실이면서 아무도 탓하지 않는다.

  버린 후보와 이유:
    "설명이 닿지 않았어요"   — *무엇에* 닿지 않았는지가 없어 뜻이 안 통했다(실사용 피드백)
    "무엇을 하는지부터"      — 1단("무엇을 하는지까지")과 조사 한 글자 차이라 배지에서 구분 불가
    "코드 설명이 남았어요"   — 뜻은 통하나 학생이 안 한 일로 읽힌다

  "실패"·"0점" 같은 말은 쓰지 않는다(A5 — 점수는 비노출).
  기획에서 값이 나오면 여기만 바꾼다.
*/
export const REACH_LABEL: Record<ReachedLevel, string> = {
  0: '설명을 듣지 못했어요',
  1: '무엇을 하는지까지',
  2: '왜 그렇게 했는지까지',
  3: '가능한 다른 방법까지',
  4: '언제 깨지는지까지',
}

/**
 * 문항 없음 — **못한 것이 아니라 안 물어본 것**이다.
 *
 * 매니저·오퍼레이터 화면이 이미 같은 뜻으로 쓰는 문구를 학생 어투로 옮겼다
 * (`PersonResultPanel`: "코드에 이 개념이 없어 묻지 못했습니다 — 못한 것이 아닙니다").
 * 이 자리를 안 보여주면 학생은 개념 3개 중 2개만 뜨는 이유를 알 수 없다.
 */
export const UNASKED_TITLE = '이 개념은 묻지 않았어요'
export const UNASKED_BODY =
  '제출한 코드에 이 개념이 없어서 질문이 만들어지지 않았어요. 못한 것이 아니에요.'

/** 레일의 회차 한 줄 보조문구 — report의 실제 상태에서 계산한다(문장을 서버에서 받지 않는다, A7) */
export function buildRailNote(report: RoundReport | undefined): string | undefined {
  if (!report) return undefined
  switch (report.status) {
    case 'PUBLISHED': {
      if (report.retryState === 'PENDING') {
        const count = askedConcepts(report.concepts).filter((c) => c.isRetryTarget).length
        // 0개면 안내가 아니라 소음이다 — 서버에 `PENDING`인데 대상이 없는 회차가 있다(24차 문의).
        // 본문 배너도 같은 조건으로 접히므로 레일도 같이 접어야 둘이 어긋나지 않는다.
        if (count > 0) return `다시 볼 문제 ${count}개`
        return '응시 완료'
      }
      if (report.retryState === 'DONE') return '다시 보기 1개 완료'
      return undefined
    }
    // 마감 전(아직 할 수 있다)과 마감 후(기회가 지났다)를 레일에서도 가른다 — 본문과
    // 다른 말을 하면 목록을 훑을 때와 열었을 때 인상이 달라진다
    case 'NOT_STARTED':
      return '시작 전'
    case 'NOT_ATTEMPTED':
      return '미응시'
    case 'STOPPED':
      return '중단'
    case 'VOID_ATTEMPT':
      return '확인 필요'
    case 'PENDING_PUBLISH':
      return '응시 완료'
  }
}

/** "3개월 전" — 아카이브(오래된 회차)에서만 붙인다 */
export function formatRelativeMonths(publishedAtIso: string, now: number): string | null {
  const months = Math.floor((now - new Date(publishedAtIso).getTime()) / (30 * 86_400_000))
  return months >= 1 ? `${months}개월 전` : null
}

export { formatDate }
