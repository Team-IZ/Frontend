import type { ConceptReport, QaEntry } from '../report/_/api/types'
import { answerFor } from './data/answers.ts'
import { PROBLEMS, TEACHES } from './data/fixture.ts'
import { AXIS_NAME, RUBRIC, type AxisCode, type Score } from './data/rubric.ts'
import { axisResults, reachedLevel, type AxisResult, type DemoState } from './engine.ts'

/*
  시연자가 누른 점수 → 리포트.

  **고정된 리포트를 보여주지 않는 이유.** 세션에서 마음대로 눌러 놓고 리포트가 항상
  같으면, 보는 사람이 가장 먼저 "그럼 아까 누른 건 뭐였죠"를 묻는다.

  ## 실제 응답을 보고 맞췄다

  처음엔 짐작으로 만들었다가 실제 교육생 계정(`GET /reports`)을 받아 대조하니 셋이
  달랐다. 지금은 실측 모양을 따른다.

  | | 처음 만든 것 | 실제 |
  |---|---|---|
  | `said` | `네 질문을 모두 통과했어요` 한 줄 | **88~360자 진단문** |
  | 해설 필드 | `explanation` | **`explain`** — 막힌 지점 + 학생 이해 재구성 2요소 |
  | `qa` | 전 축의 문답 | **막힌 축 하나만** (`L3 질문`·`L3 힌트 1`·`L3 힌트 2`) |

  실측 예(노유진 · 미프 4차):

  > 학생은 JPA 엔티티에서 nullable 컬럼이 (…) L1, 그리고 (…) L2에 대해서는 힌트 없이
  > 정확히 설명했다. 그러나 L3 단계에서 (…) 힌트 2개를 받은 뒤에도 답을 하지 못했다.
  > 결과적으로 (…) 기본 개념은 이해하지만, (…) 응용 능력은 부족한 상태다.

  세 부분이다 — **어디까지 했나 · 어디서 막혔나 · 그래서 무슨 상태인가.** 아래
  `saidOf`가 그 세 문장을 진행 결과로 조립한다.
*/

/** 도달 2단 미만이면 다시 볼 대상이다 — L1·L2가 필수 구간이라 그렇다 */
const RETRY_BELOW = 2

const AXES: readonly AxisCode[] = ['L1', 'L2', 'L3', 'L4']

/** 그 축이 무엇을 묻는지 — 진단문이 "무엇을" 설명했는지 말하려면 필요하다 */
const AXIS_ASK: Record<AxisCode, string> = {
  L1: '코드가 무엇을 하고 어떻게 이어지는지',
  L2: '왜 그렇게 했는지',
  L3: '다른 방법과 무엇이 다른지',
  L4: '언제 문제가 되는지',
}

/** 그 축을 못 넘겼을 때 무엇이 부족한 것인가 — 진단의 마지막 문장에 쓴다 */
const AXIS_GAP: Record<AxisCode, string> = {
  L1: '코드를 읽고 흐름을 설명하는 능력',
  L2: '선택의 이유를 제약과 연결해 설명하는 능력',
  L3: '대안을 떠올려 지금 방식과 비교하는 응용 능력',
  L4: '한계 조건을 특정해 방어하는 능력',
}

export function buildConcepts(state: DemoState): ConceptReport[] {
  /*
    다시 보기를 실제로 **답한** 개념만 추린다. 버튼만 누르고 한 문제도 안 답했으면
    비교할 것이 없다 — `0단 → 0단`을 그리면 다시 본 것처럼 보인다.
  */
  const reviewed = new Set(
    state.reviewResults.filter((r) => r.scores.length > 0).map((r) => r.problemNo),
  )

  return PROBLEMS.map((p, i) => {
    const results = axisResults(state.results, p.problemNo)
    const level = reachedLevel(state.results, p.problemNo)
    const teach = TEACHES[i]
    const isRetryTarget = level < RETRY_BELOW
    const timedOut = state.closeReasons[i] === 'PROBLEM_TIME_LIMIT'

    /*
      🔴 **잠금은 다시 보기를 마치면 풀린다.**

      도달 2단 미만이면 서버가 `explain`·`qa`를 가려서 보낸다(`ConceptCard`가 그때
      자물쇠 안내를 그린다). 다시 보기를 마친 개념은 열린다 — 실측으로 확인했다
      (미프 1차 `retryState: DONE`의 재시험 대상 개념에 `explain`이 들어 있었다).
    */
    const didReview = reviewed.has(p.problemNo)

    /*
      🔴 **다시 보기는 개념마다 한 번씩이다.** 대상이 셋이면 셋 다 다시 볼 수 있고,
      각 개념은 한 번 보면 그 개념의 기회가 끝난다.

      잠금도 개념별이다 — 다시 본 개념만 해설·문답이 열리고, 아직 안 본 개념은 잠긴
      채로 남아 그 자리에 버튼이 계속 있다.
    */
    const locked = isRetryTarget && !didReview

    return {
      asked: true,
      name: p.title,
      /*
        **판정은 언제나 1차다.** 배지도 진단문도 해설도 1차 응시를 말한다 — 다시 본
        결과는 성적에 반영되지 않기 때문이다(실제 규칙). 다시 보기가 바꾸는 것은
        **잠금이 풀린다**는 것 하나뿐이고, 그 사실은 카드 배지 옆 표시로 말한다.
      */
      reachedLevel: level,
      said: saidOf(p.problemNo, p.title, results, timedOut),
      isRetryTarget,
      curriculumRef: { chapter: teach.unitId, pages: teach.source, title: teach.label },
      explanation: locked ? null : explainOf(results, timedOut),
      qa: locked
        ? null
        : qaOf(i, results, didReview ? axisResults(state.reviewResults, p.problemNo) : null),
      /*
        다시 봤다는 **사실만** 남긴다. 올라간 단계를 문장으로 쓰지 않는다 — 판정이
        안 바뀌는데 `다시 봤을 때 …까지`라고 적으면 그게 새 성적처럼 읽힌다
        (실사용 피드백). 카드는 이 값이 있으면 「다시 봄」 표시만 그린다.
      */
      comparedReach: didReview
        ? { before: level, after: reachedLevel(state.reviewResults, p.problemNo) }
        : null,
    }
  })
}

/**
 * 카드 본문 한 줄 — **요약이지 해설이 아니다.**
 *
 * 🔴 실측에서 `said`는 **한 문장 정형문**이었다.
 *
 * ```
 * 문제 1 [Supervisor 패턴의 HITL 실행 흐름] — 코드 이해와 설계 논리(L1~L2)는
 * 통과했지만, 같은 요구사항을 구현할 다른 방법과 장단점 비교(L3)가 부족했습니다.
 * ```
 *
 * 한때 여기에 세 문장짜리 진단을 넣었다가 *"이 멘트 자체가 해설 아니냐"* 는 지적을
 * 받았다 — 맞다. 어디까지 했고 왜 그랬는지를 풀어 쓰는 것은 아래 `explainOf`의
 * 몫이고, 이 자리는 **한눈에 보는 한 줄**이다. 카드가 접혀 있어도 이 줄만 읽으면
 * 무슨 일이 있었는지 알아야 한다.
 */
function saidOf(
  problemNo: number,
  title: string,
  results: AxisResult[],
  timedOut: boolean,
): string {
  const passed = results.filter((r) => r.status === 'PASSED')
  const stuck = results.find((r) => r.status === 'NOT_PASSED')
  const head = `문제 ${problemNo} [${title}] — `

  const range = (list: AxisResult[]) =>
    list.length === 1
      ? `${AXIS_NAME[list[0].axisCode]}(${list[0].axisCode})`
      : `${AXIS_NAME[list[0].axisCode]}과 ${AXIS_NAME[list[list.length - 1].axisCode]}(${list[0].axisCode}~${list[list.length - 1].axisCode})`

  if (stuck) {
    return passed.length > 0
      ? `${head}${range(passed)}는 통과했지만, ${AXIS_ASK[stuck.axisCode]}에 해당하는 ${AXIS_NAME[stuck.axisCode]}(${stuck.axisCode})를 통과하지 못했습니다.`
      : `${head}${AXIS_ASK[stuck.axisCode]}에 해당하는 ${AXIS_NAME[stuck.axisCode]}(${stuck.axisCode})부터 통과하지 못했습니다.`
  }
  if (timedOut) {
    return passed.length > 0
      ? `${head}${range(passed)}는 통과했지만, 남은 단계는 문제 시간이 다 되어 묻지 못했습니다.`
      : `${head}답하기 전에 문제 시간이 다 되어 묻지 못했습니다.`
  }
  if (passed.length === AXES.length) {
    return `${head}네 단계를 모두 통과했습니다.`
  }
  return `${head}${range(passed)}까지 통과했습니다.`
}

/*
  「어디서 막혔나」 — **여기가 해설이다.**

  실측 구조는 두 요소다.

  ```
  ["문제 1 [Service와 셀렉터] — 코드가 무엇을 하는지(L1)는 설명했지만, 왜 이 구조를
    선택했는지에 해당하는 설계 논리(L2)를 통과하지 못했습니다.",
   "제가 이해한 흐름은, (…) 다만 이 구조를 선택한 이유와 책임 경계까지는 설명하기
    어렵습니다."]
  ```

  ① **판정** — `said`와 같은 문장이다(실측에서 실제로 같았다). 카드를 접었다 펴도
  기준이 흔들리지 않게 같은 말로 시작한다. ② **학생이 이해한 것을 학생 말로 재구성** —
  자기가 한 말을 되돌려 받아야 무엇이 빠졌는지 스스로 보인다.

  여기에 **어디까지 했고 왜 거기서 막혔는지**를 풀어 쓴다 — 한 줄 요약(`said`)이 못
  담는 것이 그것이고, 잠금이 풀렸을 때 학생이 실제로 얻는 것도 이 설명이다.

  ⚠️ 도달 2단 미만이면 서버가 가리고, 다시 보기를 마치면 열린다(`buildConcepts`의 `locked`).
*/
function explainOf(results: AxisResult[], timedOut: boolean): string[] | null {
  const stuck = results.find((r) => r.status === 'NOT_PASSED')
  const passed = results.filter((r) => r.status === 'PASSED')
  if (!stuck && !timedOut) return null

  /*
    🔴 **`said`를 다시 적지 않는다.**

    실측 응답은 `explain[0]`이 `said`와 같은 문장이었는데, 화면에서는 그 두 줄이 위아래로
    붙어 **같은 말이 두 번** 나온다(실사용 피드백). 실제로도 그렇게 보이는 것이 맞다고
    할 수는 없으니 여기서는 겹치는 첫 줄을 빼고 **풀어 쓰는 부분부터** 시작한다.
  */
  const lines: string[] = []

  // ② 어디까지 했나 — 힌트를 안 쓰고 넘긴 축과 쓰고 넘긴 축을 갈라 말한다
  if (passed.length > 0) {
    const solo = passed.filter((r) => r.scores.length === 1)
    const helped = passed.filter((r) => r.scores.length > 1)
    const label = (list: AxisResult[]) =>
      list.map((r) => `${AXIS_ASK[r.axisCode]}(${r.axisCode})`).join(', ')
    const done =
      solo.length > 0 && helped.length > 0
        ? `${label(solo)}는 힌트 없이 설명했고, ${label(helped)}는 다시 설명을 듣고 답했습니다.`
        : helped.length > 0
          ? `${label(helped)}를 다시 설명을 듣고 답했습니다.`
          : `${label(solo)}를 힌트 없이 설명했습니다.`
    lines.push(done)
  }

  // ③ 왜 거기서 막혔나 — 채점 근거가 있으면 그것이 제일 정확하다
  if (stuck) {
    const tries = stuck.scores.length
    const how = tries > 1 ? `다시 설명을 ${tries - 1}번 듣고도` : '한 번의 시도에서'
    lines.push(
      stuck.evidence
        ? `${AXIS_NAME[stuck.axisCode]}에서는 ${how} 막혔습니다 — ${stuck.evidence}`
        : `${AXIS_NAME[stuck.axisCode]}에서는 ${how} 「${RUBRIC[stuck.axisCode][(stuck.finalScore ?? 0) as Score]}」 수준에 머물렀습니다.`,
    )
    lines.push(`${AXIS_GAP[stuck.axisCode]}부터 다시 보면 좋겠습니다.`)
  }

  // ④ 학생이 이해한 것을 학생 말로 되돌려 준다 — **없으면 지어내지 않는다**
  const evidence = passed.find((r) => r.evidence)?.evidence
  if (evidence) lines.push(`제가 이해한 흐름은, ${evidence}`)

  /*
    시간 초과처럼 **풀어 쓸 것이 없는 경우**가 있다 — 답을 아예 못 한 문제가 그렇다.
    그때는 요약(`said`)이 이미 사실을 말했으므로 빈 박스를 그리지 않는다.
  */
  if (lines.length === 0) {
    return timedOut
      ? [
          `답을 시작하기 전에 시간이 다 됐습니다. 못한 것이 아니라 도달하지 못한 것이라, 이 개념은 다시 볼 대상이 됩니다.`,
        ]
      : null
  }

  return lines
}

/** 다시 본 문답은 라벨에 접두어가 붙는다 — `QaList`가 그것으로 묶음을 가른다 */
const REVIEW_PREFIX = '다시 보기 · '

function qaOf(
  problemIdx: number,
  results: AxisResult[],
  /** 다시 본 결과. 있으면 1차 문답 **아래에 이어 붙인다** — 갈아치우지 않는다 */
  reviewResults: AxisResult[] | null,
): QaEntry[] | null {
  const first = turnsOf(problemIdx, results, '')
  if (!reviewResults) return first
  const again = turnsOf(problemIdx, reviewResults, REVIEW_PREFIX)
  const all = [...(first ?? []), ...(again ?? [])]
  return all.length > 0 ? all : null
}

/**
 * 한 벌의 결과에서 **답한 것 전부**를 문답으로 편다.
 *
 * 🔴 한때 막힌 축 하나만 뽑았다 — 실제 API가 그렇게 주기 때문이다(실측: `level 2`인
 * 개념의 `qa`가 전부 L3의 것이었다). 그런데 **시연에서는 학생이 무엇을 답했는지가
 * 전부 남아야 한다**(사용자 지시) — 통과한 축의 답변도 그 학생이 실제로 쓴 것이고,
 * 그것까지 봐야 "어디까지는 했다"가 눈으로 확인된다.
 *
 * 축 순서대로, 축 안에서는 시도 순서대로 편다. 힌트를 받고 다시 답한 것은 `L3 힌트 1`
 * 처럼 그 사실이 라벨에 남는다.
 */
function turnsOf(problemIdx: number, results: AxisResult[], labelPrefix: string): QaEntry[] | null {
  const stages = PROBLEMS[problemIdx].stages
  const problemNo = PROBLEMS[problemIdx].problemNo

  const entries = results.flatMap((r) => {
    const axisIdx = AXES.indexOf(r.axisCode)
    return r.scores.map((score, attempt) => ({
      questionLabel:
        labelPrefix + (attempt === 0 ? `${r.axisCode} 질문` : `${r.axisCode} 힌트 ${attempt}`),
      question: attempt === 0 ? stages[axisIdx].questionText : stages[axisIdx].hints[attempt - 1],
      answer: answerFor(problemNo, r.axisCode, attempt, score),
    }))
  })

  return entries.length > 0 ? entries : null
}
