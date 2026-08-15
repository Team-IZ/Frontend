import type { findMyReports_Response } from '@/api/reporting/reportingTypes'

/*
  TR-04 계약 — **서버 모양을 화면 어휘로 옮긴 것**(api-boundary §1-③).
  확정 모델은 `docs/dev/screens/tr-04-report.md`.

  16차에 요청한 봉투(`rounds` + `reportsById`)가 그대로 왔다. 상태 6종도 글자까지 같아서
  화면 분기가 산다. 그래서 여기서 새로 짓는 것은 **목이 지어냈던 두 군데뿐**이다.
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
      /** 막힌 이유 상세. 공개 범위가 `FULL`일 때만 서버가 보낸다 */
      explanation: string[] | null
      /** 문답 원문. `FULL`일 때만 — 질문과 힌트가 한 벌로 섞여 온다 */
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
  publishedAt: string
  curriculum: string
  concepts: ConceptReport[]
  /**
   * 공개 범위 — **리포트 단위다.**
   *
   * 목은 개념마다 따로 뒀는데 서버에는 그런 축이 없다. `SUMMARY`면 그 리포트의
   * **모든** 개념에서 문답·해설이 통째로 빠진다(실응답으로 확인).
   */
  scope: 'FULL' | 'SUMMARY'
  /** `DONE`이면 재시험을 이미 썼다 — **기회는 1회뿐**이라 버튼이 사라진다 */
  retryState: 'NONE' | 'PENDING' | 'DONE'
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
  | (RoundBase & { status: 'PENDING_PUBLISH'; publishAfter: string | null })
  | (RoundBase & { status: 'PENDING_VISIBILITY' })
  /**
   * 제출 마감 **전**이고 아직 응시하지 않았다 — 정상이고 아직 시간이 있다.
   * `NOT_ATTEMPTED`(마감이 지나도록 안 함)와 갈라야 한다(26차 A1) — 한 문구로 묶으면
   * 정말 놓친 학생에게서 경고가 사라진다.
   */
  | (RoundBase & { status: 'NOT_STARTED' })
  | (RoundBase & { status: 'NOT_ATTEMPTED' })
  | (RoundBase & { status: 'VOID_ATTEMPT' })
  | (RoundBase & { status: 'STOPPED' })

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
