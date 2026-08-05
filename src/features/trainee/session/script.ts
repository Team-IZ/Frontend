import type { ProblemScript } from './types'

/*
  ⚠️ Mock 전용 시나리오 — 백엔드(AI 채점) 연동 시 이 파일을 통째로 삭제하세요.

  질문 다음에 일어나는 일은 실제로는 AI가 답을 보고 판단한다. 지금은 그 판단을
  흉내낼 수 없어서 **턴 인덱스로 완전히 확정**해 둔다 — 힌트를 다 쓰고 제출하면
  `hintExhaustedOutcome`(정의서 §6 "미달이면 거기서 끝난다"), 아니면 `outcome`으로 간다.
  이 조건 분기 자체는 사용자 행동(힌트를 썼는지)에 반응하는 것이라 인터랙티브하다 —
  거짓으로 "다 맞았다"고 하는 게 아니라 사용자가 실제로 고를 수 있는 두 갈래다.

  문제 순서·문항 텍스트는 목업(trainee/session.html)에서 그대로 가져왔다. 목업이
  구체적으로 보여주지 않은 자리(Problem 1 "Graph 구성"의 턴·State 관리의 힌트 문구)만
  같은 도메인(AI_LLMOps 미프)에 맞춰 새로 썼다 — 임계값이 아니라 UI 문구라 "지어낸 값"
  규칙(mock-first §2-4)에 걸리지 않는다.

  Problem 1·2가 각각 힌트 소진 시 STOP으로 가게 해 둔 것은 TR-01 mockDb.ts의
  `retryConcepts: ['HITL Trigger 조건', 'Graph 구성']`와 짝을 맞춘 것이다 — 다시 보기가
  겨냥하는 두 개념이 실제로 이 세션에서 막혔어야 이야기가 맞는다.
*/

export const SESSION_SCRIPT: ProblemScript[] = [
  {
    title: 'Graph 구성',
    file: 'graph.py',
    code: [
      { line: 5, text: 'workflow = StateGraph(AgentState)' },
      { line: 6, text: 'workflow.add_node("agent", call_model)' },
      { line: 7, text: 'workflow.add_node("human", human_review)' },
      { line: 8, text: '' },
      { line: 39, text: 'workflow.add_conditional_edges(' },
      { line: 40, text: '    "agent", should_trigger_hitl,' },
      { line: 41, text: '    {True: "human", False: "end"})' },
    ],
    callers: { label: '이 그래프를 쓰는 곳', snippet: 'main.py:8\napp = workflow.compile()' },
    turns: [
      {
        question: '이 그래프는 노드를 어떤 순서로 연결하나요? 전체 흐름을 설명해 주세요.',
        ref: 'graph.py:5–8',
        level: 1,
        hintTexts: [
          'agent 노드와 human 노드가 각각 무엇을 하는지부터 짚어 보세요.',
          '이 그래프에 들어온 입력이 끝(end)에 닿기까지 지나가는 노드를 순서대로 말해 보세요.',
        ],
        outcome: 'NEXT_TURN',
      },
      {
        question: 'conditional_edges에서 분기 조건은 무엇을 기준으로 정해지나요?',
        ref: 'graph.py:39–41',
        level: 2,
        hintTexts: [
          'should_trigger_hitl이 True를 돌려주는 경우와 False를 돌려주는 경우, 각각 어디로 가나요?',
          '이 분기가 없다면 agent 노드 다음엔 무슨 일이 일어날까요?',
        ],
        outcome: 'COMPLETE_PROBLEM',
        hintExhaustedOutcome: 'STOP_PROBLEM',
      },
    ],
  },
  {
    title: 'HITL Trigger 조건',
    file: 'nodes.py',
    code: [
      { line: 8, text: '# 재시도 상한 — 넘으면 사람이 확인한다', gap: true },
      { line: 9, text: 'MAX_ITERATIONS = 3', gap: true },
      { line: 10, text: '', gap: true },
      { line: 11, text: '', gap: true },
      { line: 12, text: 'def should_trigger_hitl(state: AgentState) -> bool:' },
      { line: 13, text: '    """사람 확인이 필요한지 판단한다."""' },
      { line: 14, text: '    if state["retry"] > MAX_ITERATIONS:' },
      { line: 15, text: '        return True' },
      { line: 16, text: '' },
      { line: 17, text: '    if state["decision"] == "REJECTED":' },
      { line: 18, text: '        return True' },
      { line: 19, text: '' },
      { line: 20, text: '    return False' },
    ],
    callers: {
      label: '이 함수를 쓰는 곳',
      snippet:
        'graph.py:41\nworkflow.add_conditional_edges(\n  "agent", should_trigger_hitl,\n  {True: "human", False: "end"})',
    },
    turns: [
      {
        question:
          '이 함수는 무슨 일을 하나요? 어떤 값이 들어오고, 어디에서 쓰이는지도 같이 이야기해 주세요.',
        ref: 'nodes.py:12–20',
        level: 1,
        hintTexts: [
          '이 함수가 True를 돌려주면 그래프는 어디로 가나요? False면요?',
          'state 안의 어떤 값들을 보고 판단하는 함수인가요?',
        ],
        outcome: 'NEXT_TURN',
      },
      {
        question:
          '교안에서는 사람이 확인해야 하는 조건을 세 가지로 봤는데, 여기서는 두 가지만 보고 있어요. 왜 그렇게 하셨나요?',
        ref: 'nodes.py:14, 17',
        level: 2,
        hintTexts: [
          '이 함수가 True를 돌려주는 경우를 먼저 짚어 보고, 교안에 있던 나머지 한 가지를 여기서는 왜 넣지 않았는지 이야기해 주세요.',
          '조건이 두 개일 때와 세 개일 때, 사람이 확인하게 되는 상황이 어떻게 달라질까요?',
        ],
        outcome: 'NEXT_TURN',
        hintExhaustedOutcome: 'STOP_PROBLEM',
      },
      {
        question:
          '이 조건들을 쓰지 않고 다르게 만들 수도 있었을까요? 다른 방법이 있다면 무엇이 달라지는지 이야기해 주세요.',
        ref: 'nodes.py:20',
        level: 3,
        hintTexts: [
          '조건을 함수 밖으로 빼서 설정값으로 두면 무엇이 달라질까요?',
          '지금 방식의 장점과 단점을 하나씩 들어 보세요.',
        ],
        outcome: 'COMPLETE_PROBLEM',
      },
    ],
  },
  {
    title: 'State 관리',
    file: 'state.py',
    code: [
      { line: 1, text: 'from typing import Annotated, TypedDict', gap: true },
      { line: 2, text: '', gap: true },
      { line: 6, text: 'class AgentState(TypedDict):' },
      { line: 7, text: '    messages: Annotated[list, add_messages]' },
      { line: 8, text: '    retry: int' },
      { line: 9, text: '    decision: str' },
      { line: 10, text: '    human_decision: str | None' },
    ],
    callers: { label: '이 타입을 쓰는 곳', snippet: 'graph.py:12 · nodes.py:12' },
    turns: [
      {
        question: 'messages에 add_messages를 붙인 이유가 뭔가요?',
        ref: 'state.py:7',
        level: 1,
        hintTexts: [
          'add_messages 없이 그냥 리스트로 두면 노드를 지날 때마다 무슨 일이 일어날까요?',
          '이 값이 여러 노드를 오가며 계속 쌓여야 하는 이유가 있나요?',
        ],
        outcome: 'NEXT_TURN',
      },
      {
        question: '이걸 쓰지 않았다면 어디에서 문제가 생겼을까요?',
        ref: 'state.py:7',
        level: 2,
        hintTexts: [
          'HITL 노드에서 사람 답을 받아 agent로 돌아가는 상황을 떠올려 보세요.',
          '앞서 나눈 대화가 사라지면 다음 질문에 어떤 영향이 있을까요?',
        ],
        outcome: 'COMPLETE_PROBLEM',
      },
    ],
  },
]

/** 다시 보기 — 1차에서 막힌 두 개념만, 힌트 없이, 통과하면 더 깊이 가지 않는다 */
export const RETRY_SCRIPT: ProblemScript[] = [
  {
    ...SESSION_SCRIPT[1], // HITL Trigger 조건
    turns: [
      {
        ...SESSION_SCRIPT[1].turns[1],
        outcome: 'COMPLETE_PROBLEM',
        hintExhaustedOutcome: 'COMPLETE_PROBLEM',
      },
    ],
  },
  {
    ...SESSION_SCRIPT[0], // Graph 구성
    turns: [
      {
        ...SESSION_SCRIPT[0].turns[1],
        outcome: 'COMPLETE_PROBLEM',
        hintExhaustedOutcome: 'COMPLETE_PROBLEM',
      },
    ],
  },
]
