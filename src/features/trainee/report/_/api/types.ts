import type { findMyReports_Response } from '@/api/reporting/reportingTypes'

/*
  TR-04 계약 — **서버 모양을 화면 어휘로 옮긴 것**(api-boundary §1-③).
  확정 모델은 `docs/dev/screens/tr-04-report.md`.

  16차에 요청한 봉투(`rounds` + `reportsById`)가 그대로 왔다. 상태는 글자까지 같아서
  화면 분기가 산다(2026-08-20 기준 7종 — `IN_PROGRESS` 추가). 그래서 여기서 새로
  짓는 것은 **목이 지어냈던 두 군데뿐**이다.
*/

type Server = findMyReports_Response
type ServerReport = Server['reportsById'][string]
export type ServerConcept = NonNullable<ServerReport['concepts']>[number]

/** 도달 단계 0~4. **`0` = 1단조차 통과 못함** — 서버가 `minimum 0 · maximum 4`로 못박았다(23차 R2) */
export type ReachedLevel = 0 | 1 | 2 | 3 | 4

export type CurriculumRef = { chapter: string; pages: string; title: string }
export type QaEntry = { questionLabel: string; question: string; answer: string }

/**
 * 재시험 전후 도달 단계.
 *
 * **`before`가 정본이다** — 재시험 결과는 기록에만 남고 원점수를 바꾸지 않는다.
 * 그래서 카드의 배지는 `reachedLevel`(= 원점수)을 유지하고 이 값은 곁들여 보여준다.
 */
export type ComparedReach = { before: number; after: number }

/*
  ⚠️ **`asked: false`(문항 없음)와 `reachedLevel: 0`은 다르다.**

  0단은 *물었는데 못한 것*이고, 문항 없음은 *확정된 개념이 그 학생 코드에 없어 문항이
  아예 안 만들어진 것*이다. **생성 실패는 이 배열에 아예 안 들어온다**(23차 Q1) —
  그건 `missingConceptCount`로 센다.

  서버는 `asked: boolean` + 옵셔널 필드로 주는데 **여기서 union으로 가른다.** 문항 없음
  카드가 도달 단계·서술을 그릴 수 없다는 것을 컴파일러가 막는다 — 옵셔널로 두면
  `level ?? 0`처럼 조용히 0단으로 뭉개는 코드가 언젠가 들어온다.
*/
export type ConceptReport =
  | { asked: false; name: string }
  | {
      asked: true
      name: string
      /** 마지막으로 통과한 단계. 재시험을 봤어도 **첫 응시 값**이다 */
      reachedLevel: ReachedLevel
      said: string
      /** 도달 2단 미만이라 다시 볼 대상이다 — 서버가 `level < 2`로 판정한다(23차 R2) */
      isRetryTarget: boolean
      /** 어디를 보고 오라는 안내 — 다시 보기의 전제다 */
      curriculumRef: CurriculumRef | null
      /** 막힌 이유 상세. 도달 2단 미만인데 다시 보기를 아직 안 마쳤으면 서버가 가린다 */
      explanation: string[] | null
      /** 문답 원문. 질문과 힌트가 한 벌로 섞여 온다 — 위와 같은 조건으로 가려진다 */
      qa: QaEntry[] | null
      /** 재시험을 본 개념에만 붙는다 */
      comparedReach: ComparedReach | null
    }

export type RoundListItem = {
  id: string
  label: string
  /** 아직 안 한 다시 보기가 있다 — 레일에 점으로 표시 */
  hasPendingRetry: boolean
}

type RoundBase = { id: string; label: string }

export type PublishedReport = RoundBase & {
  status: 'PUBLISHED'
  /**
   * 다시 보기 개설(`POST /assessment-sessions/reviews`)에 넘기는 값.
   *
   * ⚠️ `id`(회차)와 **다른 값이다.** 회차 id를 넘기면 서버가 못 찾는다.
   */
  reportId: string
  publishedAt: string
  curriculum: string
  concepts: ConceptReport[]
  /** `DONE`이면 재시험을 이미 썼다 — **기회는 1회뿐**이라 버튼이 사라진다 */
  retryState: 'NONE' | 'PENDING' | 'DONE'
  /**
   * 다시 보기 마감 — **서버가 `발행일 + 3일`을 계산해 응답에만 담는다**(DB에 없다).
   * 창이 지나면 `retryState`가 `NONE`으로 떨어지므로 이 값도 함께 사라진다.
   *
   * ⚠️ 학생이 버튼을 누르는 순간 **실제 마감은 다시 잡힌다**(`누른 시각 + 3일`,
   * 세션의 `reviewDueAt`). 발행 이틀 뒤에 누르면 실제로는 발행+5일이 마감이다.
   * 여기 값은 **아직 안 누른 학생에게 보여줄 예상치**이고, 시작한 뒤로는 세션 쪽을 본다.
   *
   * 표시에만 쓴다 — 버튼을 그릴지는 `retryState`가 이미 창까지 보고 판정한다.
   */
  retryDueAt: string | null
  retryCompletedAt: string | null
  /**
   * **AI 생성이 실패해 빠진 개념 수**(시스템 장애). `0`이면 빠진 것이 없다.
   * 문항 없음(`asked: false`)과 다르다 — 그건 정상이고 이건 학생 잘못이 아닌 손해다.
   */
  missingConceptCount: number
}

export type RoundReport =
  | PublishedReport
  /**
   * **이해도 확인까지 실제로 마쳤고** 리포트만 아직 없다(2026-08-20 정정 — 기산점이
   * 좁혀졌다). `IN_PROGRESS`와 갈라야 한다: 이쪽은 응시가 끝났고, 그쪽은 아직 끝나지
   * 않았다.
   */
  | (RoundBase & { status: 'PENDING_PUBLISH'; publishAfter: string | null })
  /**
   * 응시 기록은 있지만 **아직 COMPLETED에 이르지 못했다**(2026-08-20 추가) — 코드
   * 제출 전이거나, 제출은 했는데 분석 중이거나, 분석은 끝났는데 이해도 확인 세션을
   * 아직 시작 안 했거나, 세션이 진행 중인 경우를 전부 묶는다.
   *
   * 🔴 **`PENDING_PUBLISH`로 잘못 뜨던 버그를 고친 값이다.** 백엔드가 응시
   * 미완료(코드 분석 중 등)를 `PENDING_PUBLISH`("응시 완료")로 잘못 내려보내던 것을
   * 이 값으로 분리했다 — 실사용 재현: 코드 분석이 진행 중인 회차가 "응시 완료"로
   * 표시됨. 세부 단계(제출 전/분석 중/세션 준비/세션 진행 중)는 이 화면 계약에
   * 없다 — 필요하면 TR-01 홈의 스테퍼가 더 자세히 보여준다.
   */
  | (RoundBase & { status: 'IN_PROGRESS' })
  /**
   * 제출 마감 **전**이고 아직 응시하지 않았다 — 정상이고 아직 시간이 있다.
   * `NOT_ATTEMPTED`(마감이 지나도록 안 함)와 갈라야 한다(26차 A1) — 한 문구로 묶으면
   * 정말 놓친 학생에게서 경고가 사라진다.
   */
  | (RoundBase & { status: 'NOT_STARTED' })
  | (RoundBase & { status: 'NOT_ATTEMPTED' })
  | (RoundBase & { status: 'VOID_ATTEMPT' })
  | (RoundBase & { status: 'STOPPED' })
  /**
   * **코드 분석이 실패해 리포트를 만들 근거가 없다**(2026-08-21 신설).
   *
   * `IN_PROGRESS`와 갈라야 한다 — 그쪽은 기다리면 되고 이쪽은 **기다려도 안 나온다.**
   * 학생이 할 일은 재제출이므로 그 자리를 알려 준다.
   */
  | (RoundBase & { status: 'ANALYSIS_FAILED' })

export type ReportsData = {
  rounds: RoundListItem[]
  reportsById: Record<string, RoundReport>
}

/*
  서버가 `minimum 0 · maximum 4`를 스펙에 못박았지만(23차 R2) **타입은 그냥 정수**다.
  범위를 벗어난 값이 오면 화면의 문구 표가 뚫린다(`REACH_LABEL[7]`은 undefined) —
  경계로 접어 그 사고를 여기서 끝낸다. `comparedReach.after`도 같은 정수라 같이 쓴다.
*/
export function clampLevel(level: number | null | undefined): ReachedLevel {
  if (typeof level !== 'number' || !Number.isFinite(level)) return 0
  return Math.min(4, Math.max(0, Math.round(level))) as ReachedLevel
}

/** 물어본 개념만 — 문항 없음은 도달 단계도 재시험도 없어서 대부분의 계산에서 빠진다 */
export const askedConcepts = (concepts: ConceptReport[]) =>
  concepts.filter((c): c is Extract<ConceptReport, { asked: true }> => c.asked)
