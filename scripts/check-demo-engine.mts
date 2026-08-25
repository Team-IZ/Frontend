/*
  시연용 진행 엔진이 실제 규칙대로 갈리는지 확인한다.

      node --experimental-strip-types --test scripts/check-demo-engine.mts

  **이 검사가 지키는 것은 하나다** — 시연 도중 화면이 엉뚱한 데로 가지 않는 것.
  종료 경로가 셋(통과·힌트 소진·시간 초과)이고 그 셋이 각각 다른 화면을 띄우므로,
  하나라도 어긋나면 설명하던 사람이 말을 잃는다.

  녹화 데이터의 세 문제가 실제로 어떻게 끝났는지는
  `~/Downloads/demo-verification-session/README.md` 의 「진행 결과」 표에 있다.
*/
import assert from 'node:assert'
import { test } from 'node:test'
import {
  currentAxis,
  currentProblem,
  initialState,
  PROBLEM_TOTAL,
  reachedLevel,
  reduce,
  type DemoAction,
  type DemoState,
} from '../src/features/trainee/demo/engine.ts'
import type { Score } from '../src/features/trainee/demo/data/rubric.ts'

const run = (actions: DemoAction[], from: DemoState = initialState()) =>
  actions.reduce(reduce, from)

const answers = (...scores: Score[]): DemoAction[] =>
  scores.map((score) => ({ type: 'ANSWER', score }))
const started = () => run([{ type: 'START' }])

test('시작 전에는 안내 화면이고, 점수를 눌러도 아무 일이 없다', () => {
  const s = initialState()
  assert.equal(s.phase, 'INTRO')
  assert.deepEqual(run(answers(5)), s)
})

test('3점 이상이면 다음 축으로 간다 — 힌트가 열리지 않는다', () => {
  const s = run(answers(3), started())
  assert.equal(s.phase, 'IN_PROBLEM')
  assert.equal(currentAxis(s), 'L2')
  assert.equal(s.hintsUsed, 0)
  assert.equal(currentProblem(s).current?.shownHints.length, 0)
})

test('3점 미만이면 같은 축에 머물고 힌트가 하나 열린다', () => {
  const s = run(answers(2), started())
  assert.equal(currentAxis(s), 'L1')
  assert.equal(s.hintsUsed, 1)
  assert.equal(currentProblem(s).current?.shownHints.length, 1)
  assert.equal(currentProblem(s).current?.hintsLeft, 1)
})

test('힌트 둘을 다 쓰고도 미달이면 그 축이 확정 미달이고 문제가 닫힌다', () => {
  const s = run(answers(2, 2, 2), started())
  assert.equal(s.phase, 'TRANSITION')
  assert.equal(s.transitionReason, 'STOP')
  assert.equal(s.closeReasons[0], 'HINTS_EXHAUSTED')
  assert.equal(s.results[0].status, 'NOT_PASSED')
  // 묻지도 못한 축은 「못한 것」이 아니다
  assert.equal(s.results[1].status, 'NOT_REACHED')
  assert.equal(reachedLevel(s.results, 1), 0)
})

test('힌트 뒤에 통과하면 그 축은 통과다 — 힌트를 썼다고 깎지 않는다', () => {
  const s = run(answers(2, 2, 3), started())
  assert.equal(currentAxis(s), 'L2')
  assert.equal(s.results[0].status, 'PASSED')
  assert.deepEqual(s.results[0].scores, [2, 2, 3])
})

test('L4까지 통과하면 다 물어본 것이라 「다음으로」 전환이다', () => {
  const s = run(answers(5, 5, 5, 5), started())
  assert.equal(s.phase, 'TRANSITION')
  assert.equal(s.transitionReason, 'NEXT')
  assert.equal(s.closeReasons[0], 'ALL_AXES')
  assert.equal(reachedLevel(s.results, 1), 4)
})

test('시연자의 「시간 초과」는 그 문제만 닫고 남은 축을 미도달로 남긴다', () => {
  const s = run([...answers(5, 5), { type: 'TIME_OUT' }], started())
  assert.equal(s.closeReasons[0], 'PROBLEM_TIME_LIMIT')
  assert.equal(s.results[0].status, 'PASSED') // L1
  assert.equal(s.results[1].status, 'PASSED') // L2
  assert.equal(s.results[2].status, 'NOT_REACHED') // L3 — 답하던 중이었다
  assert.equal(reachedLevel(s.results, 1), 2)
})

test('전환에서 계속하면 다음 문제의 코드·질문으로 갈아탄다', () => {
  const inProblem1 = started()
  const closed = run(answers(2, 2, 2), inProblem1)
  /*
    문제를 닫는 순간 커서는 이미 다음 문제를 가리킨다 — 전환 화면이 **다음 문제의
    이름·파일**을 말해야 하기 때문이다(실제 화면도 `setProblemNo(nextProblemNo)` 를
    먼저 하고 전환으로 간다). 그래서 여기서 비교 대상은 닫기 전 상태다.
  */
  const s = run([{ type: 'CONTINUE' }], closed)
  assert.equal(s.phase, 'IN_PROBLEM')
  assert.equal(s.turns.length, 0)
  assert.equal(currentAxis(s), 'L1')
  assert.equal(currentProblem(s).problemNo, 2)
  assert.notEqual(currentProblem(s).code.path, currentProblem(inProblem1).code.path)
})

test('마지막 문제가 닫히면 전환이 아니라 종료다', () => {
  let s = started()
  for (let i = 0; i < PROBLEM_TOTAL; i += 1) {
    s = run(answers(2, 2, 2), s)
    if (i < PROBLEM_TOTAL - 1) s = run([{ type: 'CONTINUE' }], s)
  }
  assert.equal(s.phase, 'ENDED')
  assert.equal(s.endReason, 'COMPLETED')
})

test('도달 단계는 L1부터 연속으로만 센다 — 앞에서 끊기면 뒤는 안 세어진다', () => {
  // L1 미달로 문제가 닫히므로 L2 이후는 물어보지도 못한다
  const s = run(answers(0, 0, 0), started())
  assert.equal(reachedLevel(s.results, 1), 0)
})

test('녹화 시나리오대로 누르면 그 자리의 진짜 답변이 나온다', () => {
  // 문제1 L1은 무힌트 5점이 녹화돼 있다(README 「진행 결과」)
  const s = run(answers(5), started())
  assert.match(s.turns[0].answerText, /@BeforeEach/)
  // 녹화에 없는 점수는 대역 문장으로 접는다 — 5점 답변을 3점이라고 우기지 않는다
  const other = run(answers(3), started())
  assert.doesNotMatch(other.turns[0].answerText, /@BeforeEach/)
})

test('질문·힌트는 12축 전부 채워져 있다 — 도달 못 한 축의 것까지', () => {
  let s = started()
  for (let p = 0; p < PROBLEM_TOTAL; p += 1) {
    for (let axis = 0; axis < 4; axis += 1) {
      const q = currentProblem(s).current
      assert.ok(q && q.questionText.length > 0, `문제${p + 1} 축${axis + 1} 질문 없음`)
      // 힌트 둘을 실제로 열어 본다
      const one = run(answers(0), s)
      assert.equal(one.turns.at(-1)?.hintText, null)
      const two = run(answers(0), one)
      assert.ok((two.turns.at(-1)?.hintText ?? '').length > 0, '힌트1 없음')
      s = run(answers(5), s)
    }
    if (p < PROBLEM_TOTAL - 1) s = run([{ type: 'CONTINUE' }], s)
  }
})

/* ── 리포트 조립 ─────────────────────────────────────────────────────
   세션에서 누른 점수가 리포트까지 이어지는지. 여기가 끊기면 시연의 마지막
   화면이 "아까 누른 건 뭐였죠"가 된다.
*/
const { buildConcepts } = await import('../src/features/trainee/demo/buildReport.ts')

/** 세 문제를 각각 주어진 점수열로 통과시키고 끝까지 몬다 */
const playAll = (...perProblem: Score[][]) => {
  let s = started()
  perProblem.forEach((scores, i) => {
    s = run(answers(...scores), s)
    if (i < perProblem.length - 1 && s.phase === 'TRANSITION') s = run([{ type: 'CONTINUE' }], s)
  })
  return s
}

test('리포트는 누른 점수로 만들어진다 — 도달 단계가 문제마다 다르게 나온다', () => {
  const s = playAll(
    [5, 5, 5, 5], // 문제1 전부 통과 → 4단
    [5, 2, 2, 2], // 문제2 L1만 통과, L2에서 힌트 소진 → 1단
    [0, 0, 0], //    문제3 L1부터 막힘 → 0단
  )
  assert.equal(s.phase, 'ENDED')

  const concepts = buildConcepts(s)
  assert.equal(concepts.length, 3)
  assert.deepEqual(
    concepts.map((c) => (c.asked ? c.reachedLevel : null)),
    [4, 1, 0],
  )
  // L1·L2가 필수 구간이라 2단 미만만 다시 보기 대상이다
  assert.deepEqual(
    concepts.map((c) => (c.asked ? c.isRetryTarget : null)),
    [false, true, true],
  )
})

test('리포트의 문답이 세션에서 보여준 답변과 같다', () => {
  const s = playAll([5, 5, 5, 5], [5, 2, 2, 2], [0, 0, 0])
  const first = buildConcepts(s)[0]
  assert.ok(first.asked)
  // 문제1 L1 5점은 녹화된 자리다 — 리포트에도 그 진짜 답변이 있어야 한다
  assert.match(first.qa?.[0].answer ?? '', /@BeforeEach/)
  assert.equal(first.qa?.length, 4) // 네 축을 한 번씩
})

test('막힌 축만 설명에 적는다 — 통과한 축은 안 적는다', () => {
  const s = playAll([5, 5, 5, 5], [5, 2, 2, 2], [0, 0, 0])
  const [all, stuck] = buildConcepts(s)
  assert.ok(all.asked && stuck.asked)
  assert.equal(all.explanation, null) // 전부 통과 → 적을 것이 없다
  assert.equal(stuck.explanation?.length, 1) // L2 하나만
  assert.match(stuck.explanation?.[0] ?? '', /설계논리/)
})

test('시간 초과로 닫힌 개념은 「못한 것」이 아니라고 말한다', () => {
  let s = run(answers(5, 5), started())
  s = run([{ type: 'TIME_OUT' }], s)
  s = run([{ type: 'CONTINUE' }], s)
  s = run(answers(0, 0, 0), s)
  s = run([{ type: 'CONTINUE' }], s)
  s = run(answers(0, 0, 0), s)

  const first = buildConcepts(s)[0]
  assert.ok(first.asked)
  assert.equal(first.reachedLevel, 2)
  assert.match(first.said, /시간이 다 됐어요/)
  assert.equal(first.explanation, null) // 도달 못 한 축을 미달로 적지 않는다
})

test('교안 근거가 개념마다 붙는다 — 「어디를 보라」가 비면 리포트가 반쪽이다', () => {
  const s = playAll([5, 5, 5, 5], [5, 5, 5, 5], [5, 5, 5, 5])
  for (const c of buildConcepts(s)) {
    assert.ok(c.asked && c.curriculumRef)
    assert.match(c.curriculumRef.pages, /spring_backend_v1\.pdf/)
  }
})

/* ── 답변 은행 ───────────────────────────────────────────────────────
   시연에 실제 개발자가 온다. 답변이 겹치거나 그 축의 질문과 상관없는 말이면
   그 자리에서 들통난다. 여기서 기계로 막는다.
*/
const { answerFor } = await import('../src/features/trainee/demo/data/answers.ts')
const { PROBLEMS } = await import('../src/features/trainee/demo/data/fixture.ts')

const ALL_AXES = ['L1', 'L2', 'L3', 'L4'] as const
const ALL_SCORES: Score[] = [0, 1, 2, 3, 4, 5]

/** 실제로 도달 가능한 (문제·축·점수·시도) 자리 전부 */
const everySlot = () => {
  const slots: {
    problemNo: number
    axis: (typeof ALL_AXES)[number]
    score: Score
    attempt: number
  }[] = []
  for (const p of PROBLEMS) {
    for (const axis of ALL_AXES) {
      for (const score of ALL_SCORES) {
        // 3점 이상은 즉시 다음 축이라 힌트를 쓴 뒤에는 나오지 않는 조합이 아니다 —
        // 힌트 후에도 통과할 수 있으므로 시도 3개 모두 유효하다.
        for (let attempt = 0; attempt < 3; attempt += 1) {
          slots.push({ problemNo: p.problemNo, axis, score, attempt })
        }
      }
    }
  }
  return slots
}

test('빈 답변이 하나도 없다', () => {
  for (const s of everySlot()) {
    const a = answerFor(s.problemNo, s.axis, s.attempt, s.score)
    // 0점 답변("왜 그렇게 했는지는 모르겠습니다")이 짧은 것은 루브릭상 맞다 —
    // 여기서 잡으려는 것은 빈 문자열과 자리 표시자다
    assert.ok(
      a.length > 10,
      `문제${s.problemNo} ${s.axis} ${s.score}점 시도${s.attempt}: 너무 짧음 — ${a}`,
    )
    assert.doesNotMatch(
      a,
      /준비되지 않았습니다/,
      `문제${s.problemNo} ${s.axis} ${s.score}점 시도${s.attempt}: 은행에 없음`,
    )
  }
})

test('같은 축 안에서 답변이 겹치지 않는다 — 미달 3번이 세 번 다 달라야 한다', () => {
  for (const p of PROBLEMS) {
    for (const axis of ALL_AXES) {
      const seen = new Map<string, string>()
      for (const score of ALL_SCORES) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          // 통과 점수는 한 축에서 한 번뿐이라 시도별로 같아도 된다
          if (score >= 3 && attempt > 0) continue
          const a = answerFor(p.problemNo, axis, attempt, score)
          const where = `${score}점 시도${attempt}`
          const dup = seen.get(a)
          assert.ok(!dup, `문제${p.problemNo} ${axis}: ${where}가 ${dup}과 같은 문장`)
          seen.set(a, where)
        }
      }
    }
  }
})

test('축이 다르면 답변도 다르다 — L2 답이 L4 자리에 나오면 안 된다', () => {
  const seen = new Map<string, string>()
  for (const s of everySlot()) {
    if (s.score >= 3 && s.attempt > 0) continue
    const a = answerFor(s.problemNo, s.axis, s.attempt, s.score)
    const where = `문제${s.problemNo}/${s.axis}/${s.score}점/시도${s.attempt}`
    const dup = seen.get(a)
    assert.ok(!dup, `${where} 가 ${dup} 과 같은 문장`)
    seen.set(a, where)
  }
})

/*
  통과 답변(3점 이상)은 **그 축의 코드를 실제로 짚어야** 한다. 개발자가 보는 자리라
  "잘 이어집니다" 같은 말만 있으면 바로 티가 난다. 축마다 그 파일에서 반드시 나와야
  하는 식별자를 골라 둔다.
*/
const MUST_MENTION: Record<string, RegExp> = {
  '1-L1': /setUp|aiClient|grader/,
  '1-L2': /AiClient|mock|AnswerSubmit/,
  '1-L3': /페이크|WireMock|ArgumentCaptor|when/,
  '1-L4': /stages|스키마|when/,
  '2-L1': /guard|repository|GradingInput/,
  '2-L2': /트랜잭션|커넥션/,
  '2-L3': /트랜잭션|큐|202/,
  '2-L4': /rowVersion|row_version|isAnswered|loadForGrading/,
  '3-L1': /turnStore|grader|GradingInput/,
  '3-L2': /turnStore|grader|Transactional|트랜잭션/,
  '3-L3': /Repository|인터페이스/,
  '3-L4': /AnswerSubmitResponse|NextQuestion|presentation/,
}

test('통과 답변은 그 축의 코드를 실제로 짚는다', () => {
  for (const p of PROBLEMS) {
    for (const axis of ALL_AXES) {
      const re = MUST_MENTION[`${p.problemNo}-${axis}`]
      for (const score of [3, 4, 5] as Score[]) {
        const a = answerFor(p.problemNo, axis, 0, score)
        assert.match(a, re, `문제${p.problemNo} ${axis} ${score}점이 그 축의 코드를 안 짚음`)
      }
    }
  }
})

test('미달 답변은 통과 답변보다 짧다 — 못 하는 학생이 더 길게 말하지 않는다', () => {
  for (const p of PROBLEMS) {
    for (const axis of ALL_AXES) {
      const zero = answerFor(p.problemNo, axis, 0, 0).length
      const four = answerFor(p.problemNo, axis, 0, 4).length
      assert.ok(
        zero < four,
        `문제${p.problemNo} ${axis}: 0점(${zero}자)이 4점(${four}자)보다 짧지 않음`,
      )
    }
  }
})
