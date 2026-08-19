import type { QueryClient } from '@tanstack/react-query'
import { assessmentKeys } from './assessment/assessmentKeys'
import { reportingKeys } from './reporting/reportingKeys'
import { submissionKeys } from './submission/submissionKeys'

/*
  교육생 화면 조회는 **캐시하지 않는다.**

  ## 왜 이 화면들만 예외인가

  전역 기본은 `staleTime: 30초`다(main.tsx). 대부분의 화면에서는 30초 묵힌 값이 맞다 —
  명단·커리큘럼처럼 사람이 고쳐야 바뀌는 것들이다.

  **교육생 화면은 시간에 쫓긴다.** 응시 창·문제 상한(20분)·세션 상한(60분)이 전부 시계로
  움직이고, 그 값이 서버에서 저절로 바뀐다. 30초만 낡아도 화면이 학생에게 거짓말을 한다.

  | 조회 | 낡으면 |
  |---|---|
  | 회차(홈) | 끝난 응시에 `시작하기`가 남아, 눌렀다가 세션이 없다는 화면으로 떨어진다 |
  | 세션 | 끝난 세션을 진행 중으로 그리고, 답을 쓰다 `409`를 받는다 |
  | 제출 현황 | 화면이 *"켜 두지 않아도 됩니다"* 라고 해 놓고, 돌아오면 아직 `분석 중`이다 |
  | 내 리포트 | 홈은 `리포트가 나왔어요`인데 리포트 화면은 `아직 발행 전`이다 |

  ## 왜 훅마다 옵션을 주지 않고 여기서 거나

  조회가 넷이고 화면이 넷이라 손으로 달면 **언젠가 하나가 빠진다.** 그리고 그 하나가
  빠졌다는 사실은 화면을 오래 열어 둬야만 드러난다 — 가장 늦게 발견되는 종류다.

  쿼리 키 접두어로 한 번에 건다. 새 조회가 늘어도 같은 도메인이면 자동으로 적용된다.

  ⚠️ `submission`·`reporting`은 **매니저·오퍼레이터도 쓴다.** 그쪽까지 끄면 목록 화면이
  이동할 때마다 다시 읽는다 — 그래서 도메인 전체가 아니라 **교육생 것만** 겨눈다.
*/
const NO_CACHE = {
  staleTime: 0,
  // 캐시된 값이 있어도 화면에 들어오면 다시 읽는다 — 「방금 본 것」이 아니라 「지금」이어야 한다
  refetchOnMount: 'always',
} as const

export function applyTraineeFreshness(queryClient: QueryClient) {
  // 응시 도메인은 통째로 교육생 것이다(회차·세션·문제)
  queryClient.setQueryDefaults(assessmentKeys.all, NO_CACHE)
  // 이 둘은 도메인을 공유하므로 교육생 조회만 집는다
  queryClient.setQueryDefaults([...submissionKeys.all, 'findMySubmission'], NO_CACHE)
  queryClient.setQueryDefaults(reportingKeys.findMyReports(), NO_CACHE)
}
