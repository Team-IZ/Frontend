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

  ## 4단 — `깨지는지`에서 `문제가 되는지`로

  **문서가 먼저 옮겨갔고 화면이 따라간 것이다.** v2 루브릭(`docs/plan/v2/14-verification-design.md`
  L4 3점)이 *"언제 **문제가 되는지** 조건을 특정"* 으로 쓴다. `깨지는지`는 v1
  (`12-scoring-rules.md`) 어휘였다.

  바꾼 이유는 둘이다. ① `깨지다`는 개발자 말이고 이 화면의 독자는 학생이다 — 매니저
  화면도 마찬가지라(비전공자가 실사용자, 11번 문서) 같은 말로 함께 옮겼다. ② 주어가
  없어 **무엇이** 깨지는지가 안 잡힌다(코드인지 시험인지 서비스인지). 나머지 1~3단은
  전부 자기 코드 얘기인데 4단만 고장 얘기로 튀어 사다리가 끊겨 보였다.

  ⚠️ **같은 말을 쓰는 곳이 넷이다.** 여기를 고치면 나머지 셋도 같이 간다 —
  `manager/heatmap/components/HeatmapLegend.tsx` · `operator/analysis/_/labels.ts` ·
  `operator/report/_/labels.ts`. 오퍼레이터 쪽 주석이 *"같은 말이 두 화면에서 같아야
  한다"* 고 못박아 두었다.

  ## 0단 — 시스템 주어를 버렸다

  ⚠ **0단 문구는 기획에 없다 — 프론트가 정한 값이다**(2026-08-12 사용자 확정).

  0단은 1단(무엇을 하는지) 질문을 **세 번 다 못 넘긴 것**인데, 그 원인이 하나가 아니다:
  본인이 안 쓴 팀 코드가 걸렸거나 · 알지만 말로 못 풀었거나 · 문제당 20분이 끝나
  끊겼거나 · 성의 없이 답했거나. **배지 하나가 이걸 전부 덮어야 한다.**

  종전 `설명을 듣지 못했어요`는 그래서 나온 값이다 — 학생을 주어로 세우지 않으려고
  시스템을 주어로 뒀다(*"시스템이 학생 설명을 못 들었다"*). 뜻은 맞았는데 **처음 읽는
  사람에게는 정반대로 읽혔다** — `학생이 설명을 못 들었다`로. 주어가 생략되는 한국어에서
  시스템 주어는 서 있질 못한다.

  `코드 설명까지 가지 못했어요`는 주어를 아예 세우지 않는다. 진행이 거기까지 못 갔다는
  사실만 말하므로 위 네 경우 어디에도 어긋나지 않고, 누구도 탓하지 않는다.

  버린 후보와 이유:
    "설명이 닿지 않았어요"   — *무엇에* 닿지 않았는지가 없어 뜻이 안 통했다(실사용 피드백)
    "무엇을 하는지부터"      — 1단("무엇을 하는지까지")과 조사 한 글자 차이라 배지에서 구분 불가
    "코드 설명이 남았어요"   — 뜻은 통하나 학생이 안 한 일로 읽힌다
    "설명을 듣지 못했어요"   — 시스템 주어가 학생 주어로 오독됐다(위)

  "실패"·"0점" 같은 말은 쓰지 않는다(A5 — 점수는 비노출).
  기획에서 값이 나오면 여기만 바꾼다.
*/
export const REACH_LABEL: Record<ReachedLevel, string> = {
  0: '코드 설명까지 가지 못했어요',
  1: '무엇을 하는지까지',
  2: '왜 그렇게 했는지까지',
  3: '가능한 다른 방법까지',
  4: '언제 문제가 되는지까지',
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
    /*
      2026-08-20 추가 — 백엔드가 응시 미완료(코드 제출 전·분석 중·이해도 확인 세션
      준비/진행 중)를 `PENDING_PUBLISH`("응시 완료")로 잘못 내려보내던 버그를 고치며
      새로 생긴 값이다. `PENDING_PUBLISH`와 다른 말이어야 한다 — 그건 "다 봤고
      리포트만 기다리는 중"이고 이건 "아직 안 끝남"이다.
    */
    case 'IN_PROGRESS':
      return '진행 중'
    /*
      2026-08-21 추가 — 분석 실패로 끝났고 리포트가 아예 없는 회차. `PENDING_PUBLISH`의
      "응시 완료"를 그대로 쓰면 안 된다 — 리포트가 곧 나온다는 뜻인데 이쪽은 영영 안
      나온다는 뜻이다.
    */
    case 'ANALYSIS_FAILED':
      return '분석 실패'
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
