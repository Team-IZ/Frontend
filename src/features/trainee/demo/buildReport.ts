import type { ConceptReport, QaEntry } from '../report/_/api/types'
import { answerFor } from './data/answers.ts'
import { PROBLEMS, TEACHES } from './data/fixture.ts'
import { AXIS_NAME, RUBRIC, type AxisCode, type Score } from './data/rubric.ts'
import {
  axisResults,
  reachedLevel,
  type AxisResult,
  type CloseReason,
  type DemoState,
} from './engine.ts'

/*
  시연자가 누른 점수 → 리포트.

  **고정된 리포트를 보여주지 않는 이유.** 세션에서 마음대로 눌러 놓고 리포트가 항상
  같으면, 보는 사람이 가장 먼저 "그럼 아까 누른 건 뭐였죠"를 묻는다. 누른 것이 결과로
  이어져야 이 제품이 무엇을 하는지가 한 흐름으로 보인다.

  실제 서버가 만드는 모양(`ConceptReport`)을 그대로 만든다 — 그래야 `ConceptCard`를
  한 줄도 안 고치고 쓴다.
*/

/** 도달 2단 미만이면 다시 볼 대상이다 — L1·L2가 필수 구간이라 그렇다 */
const RETRY_BELOW = 2

const AXES: readonly AxisCode[] = ['L1', 'L2', 'L3', 'L4']

export function buildConcepts(state: DemoState): ConceptReport[] {
  return PROBLEMS.map((p, i) => {
    const results = axisResults(state.results, p.problemNo)
    const level = reachedLevel(state.results, p.problemNo)
    const teach = TEACHES[i]

    /*
      **한 번도 답하지 못한 개념도 `asked: true`다.** 「문항 없음」은 그 학생 코드에
      근거가 없어 문제가 **아예 안 만들어진** 것이고, 여기는 만들어졌는데 도달을 못 한
      것이다 — 0단으로 남겨야 그 둘이 갈린다.
    */
    return {
      asked: true,
      name: p.title,
      reachedLevel: level,
      said: saidOf(level, results, state.closeReasons[i]),
      isRetryTarget: level < RETRY_BELOW,
      curriculumRef: { chapter: teach.unitId, pages: teach.source, title: teach.label },
      explanation: explanationOf(results),
      qa: qaOf(i, results),
      comparedReach: null,
    }
  })
}

/** 카드 본문 한 문단 — 어디까지 갔고 왜 멈췄나 */
function saidOf(level: number, results: AxisResult[], closeReason: CloseReason): string {
  const passed = results.filter((r) => r.status === 'PASSED').length
  const stuck = results.find((r) => r.status === 'NOT_PASSED')

  if (closeReason === 'PROBLEM_TIME_LIMIT') {
    return `질문 ${passed}개까지 답하고 시간이 다 됐어요. 남은 질문은 묻지 못했으니 못한 것으로 기록하지 않아요.`
  }
  if (stuck) {
    const rubric = RUBRIC[stuck.axisCode][(stuck.finalScore ?? 0) as Score]
    return `${AXIS_NAME[stuck.axisCode]}에서 멈췄어요. 다시 설명을 두 번 드렸는데도 「${rubric}」 수준에 머물렀어요.`
  }
  if (level === AXES.length) {
    return '네 질문을 모두 통과했어요. 코드가 무엇을 하는지부터 언제 문제가 되는지까지 설명했어요.'
  }
  return '답한 만큼 기록했어요.'
}

/*
  「무엇이 부족했나」 — **막힌 축만** 적는다.

  통과한 축까지 줄줄이 쓰면 정작 봐야 할 한 줄이 묻힌다(정의서 §9 "피드백은 막힌
  만큼 두꺼워진다"). 채점 근거는 녹화된 자리에서 점수까지 맞을 때만 진짜가 있고,
  없으면 루브릭 문장으로 대신한다 — **지어내지 않는다.**
*/
function explanationOf(results: AxisResult[]): string[] | null {
  const lines = results
    .filter((r) => r.status === 'NOT_PASSED')
    .map(
      (r) =>
        `${AXIS_NAME[r.axisCode]} — ${r.evidence ?? RUBRIC[r.axisCode][(r.finalScore ?? 0) as Score]}`,
    )
  return lines.length > 0 ? lines : null
}

/*
  문답 원문 — 질문·힌트·답변을 오간 순서대로.

  ⚠️ **`state.turns`를 쓰지 않는다.** 그 배열은 문제가 닫힐 때 비워진다(다음 문제의
  대화창이라 그래야 한다). 대신 남아 있는 점수 이력(`scores`)으로 세션이 썼던 것과
  **같은 규칙**(`answerFor`)을 다시 돌린다 — 그래서 리포트의 답변이 세션에서 본
  문장과 어긋나지 않는다.
*/
function qaOf(problemIdx: number, results: AxisResult[]): QaEntry[] | null {
  const stages = PROBLEMS[problemIdx].stages
  const problemNo = PROBLEMS[problemIdx].problemNo
  const entries: QaEntry[] = []

  results.forEach((r, axisIdx) => {
    r.scores.forEach((score, attempt) => {
      entries.push({
        // 힌트 뒤의 답변은 **다른 질문이 아니다** — 같은 질문을 다시 설명한 것이다
        questionLabel:
          attempt === 0 ? `질문 ${axisIdx + 1}` : `질문 ${axisIdx + 1} · 다시 설명 ${attempt}`,
        question: attempt === 0 ? stages[axisIdx].questionText : stages[axisIdx].hints[attempt - 1],
        answer: answerFor(problemNo, AXES[axisIdx], attempt, score),
      })
    })
  })

  return entries.length > 0 ? entries : null
}
