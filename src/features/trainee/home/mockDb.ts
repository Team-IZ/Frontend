import type { CurrentRound, HomeView, PastRound, RoundStatus, UpcomingRound } from './types'

/*
  ⚠️ Mock 전용 데이터 — 백엔드 연동 시 이 파일을 통째로 삭제하세요.

  마감·발행일을 고정 날짜 문자열로 박지 않고 **호출 시점(now) + 오프셋**으로 만든다.
  목업 스크린샷의 "1일 4시간 남음" 같은 숫자를 그대로 옮기는 게 아니라 — 살아있는
  카운트다운 자체가 기능이라, 고정 날짜를 쓰면 오늘이 지날 때마다 전부 "이미 지남"이
  된다(mock-first-screens.md §2-4는 값을 지어내지 말라고 하는데, 그 값이 절대 날짜인
  게 오히려 화면을 죽인다 — 상대 오프셋이 "지어내지 않은 값"이다).
*/

const HOUR = 3_600_000
const DAY = 86_400_000

const ROUND_META = { roundLabel: '미프 3차', classTeam: 'A반 3팀', curriculum: 'AI_LLMOps' }

const UPCOMING: UpcomingRound = {
  roundLabel: '미프 4차',
  scheduleLabel: '제출 07-21 · 이해도 확인 07-22~23',
}

const PAST_ROUNDS: PastRound[] = [
  { id: 'mif-2', roundLabel: '미프 2차', summary: '완료 · 다시 보기 1건 완료' },
  { id: 'mif-1', roundLabel: '미프 1차', summary: '완료' },
]

function currentRoundFor(status: RoundStatus, now: number): CurrentRound {
  switch (status) {
    case 'NOT_SUBMITTED':
      return {
        ...ROUND_META,
        status,
        submissionDueAt: new Date(now + DAY + 4 * HOUR).toISOString(),
      }
    case 'ANALYZING':
      return { ...ROUND_META, status }
    case 'ANALYSIS_FAILED':
      return {
        ...ROUND_META,
        status,
        submissionDueAt: new Date(now + 4 * HOUR).toISOString(),
        failureReason:
          '저장소가 비어 있거나 접근할 수 없었어요. 주소를 확인하고 다시 제출해 주세요.',
      }
    case 'READY_TO_VERIFY':
      return {
        ...ROUND_META,
        status,
        verifyClosesAt: new Date(now + 19 * HOUR + 12 * 60_000).toISOString(),
      }
    case 'VERIFY_DONE':
      return {
        ...ROUND_META,
        status,
        verifiedAt: new Date(now - 3 * HOUR).toISOString(),
        reportAfter: new Date(now + DAY).toISOString(),
      }
    case 'RETRY_AVAILABLE':
      return {
        ...ROUND_META,
        status,
        retryDueAt: new Date(now + 6 * DAY).toISOString(),
        retryConcepts: ['HITL Trigger 조건', 'Graph 구성'],
        reportRoundId: 'mif-3',
      }
    case 'SUBMISSION_CLOSED':
      return { ...ROUND_META, status, submissionDueAt: new Date(now - 2 * HOUR).toISOString() }
    case 'VERIFICATION_CLOSED':
      return { ...ROUND_META, status, verifyClosedAt: new Date(now - HOUR).toISOString() }
  }
}

export function buildHomeFixture(status: RoundStatus | 'NONE', now: number): HomeView {
  if (status === 'NONE') {
    return {
      currentRound: null,
      scope: { cohort: '7기', classTeam: 'A반 3팀' },
      upcomingRound: null,
      pastRounds: [{ id: 'mif-3', roundLabel: '미프 3차', summary: '완료' }, ...PAST_ROUNDS],
    }
  }
  return {
    currentRound: currentRoundFor(status, now),
    scope: { cohort: '7기', classTeam: 'A반 3팀' },
    upcomingRound: UPCOMING,
    pastRounds: PAST_ROUNDS,
  }
}
