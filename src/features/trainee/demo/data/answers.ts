import { bankAnswer } from './answerBank.ts'
import { RECORDED } from './fixture.ts'
import type { AxisCode, Score } from './rubric.ts'

/*
  답변 말풍선에 무엇을 띄우나.

  ```
  ① 녹화된 20턴 중 (문제·축·힌트횟수)가 맞고 점수까지 같으면 → 그 진짜 답변
  ② 아니면                                                  → answerBank.ts의 그 자리 답변
  ```

  ①이 먼저인 이유는 실제 채점기가 매긴 답변이고 근거문(`evidence`)까지 함께 있어서다.
  ②가 나머지 124칸을 채운다 — 자리마다·점수마다·시도마다 다른 답변이라 같은 문장이
  두 번 나오지 않는다.

  ⚠️ **어느 점수가 「정답」이라고 표시하지 않는다.** 데모 세션은 시연자가 만드는 것이고,
  녹화 시나리오는 그중 한 경로일 뿐이다. 특정 점수에 「실제」 같은 표를 달면 그 점수가
  맞는 답인 것처럼 읽히는데, 이 제품에는 맞는 점수라는 것이 없다.
*/

type Recorded = (typeof RECORDED)[number]

const findRecorded = (
  problemNo: number,
  axisCode: AxisCode,
  hintsUsed: number,
): Recorded | undefined =>
  RECORDED.find(
    (r) => r.problemNo === problemNo && r.axisCode === axisCode && r.hintsUsed === hintsUsed,
  )

/*
  은행에도 녹화본에도 없는 자리는 없어야 한다 — 12축 × 6점수 × 3시도가 전부 채워져 있다.
  그래도 빈손으로 돌려보내지는 않는다: 데이터가 어긋나 화면이 빈 말풍선을 그리면 시연
  도중에 그것부터 설명해야 한다.
*/
const MISSING = '(이 자리의 답변이 준비되지 않았습니다)'

export function answerFor(
  problemNo: number,
  axisCode: AxisCode,
  hintsUsed: number,
  score: Score,
): string {
  const r = findRecorded(problemNo, axisCode, hintsUsed)
  if (r && r.score === score) return r.answerText
  return bankAnswer(problemNo, axisCode, hintsUsed, score) ?? MISSING
}

/**
 * 채점 근거 한 줄 — 리포트에서 「어디서 막혔나」로 쓴다.
 *
 * 녹화된 자리에서 점수까지 맞을 때만 진짜 근거가 있다. 벗어나면 `null`이고, 그때는
 * 리포트가 루브릭 문장으로 대신한다 — **없는 근거를 지어내지 않는다.**
 */
export function evidenceFor(
  problemNo: number,
  axisCode: AxisCode,
  hintsUsed: number,
  score: Score,
): string | null {
  const r = findRecorded(problemNo, axisCode, hintsUsed)
  return r && r.score === score ? r.evidence : null
}
