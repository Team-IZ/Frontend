/*
  시연용 고정 데이터 — **손으로 고치지 않는다.**

  출처: `~/Downloads/demo-verification-session/` 의 01_analysis_result.json ·
  02_session_turns.json 에서 필요한 것만 뽑았다. 그 폴더가 정본이고 여기는 사본이다.

  JSON을 그대로 두지 않은 이유 하나 — tsconfig.app.json에 `resolveJsonModule`이 없어
  `import x from './a.json'` 이 `tsc -b` 에서 터진다. tsconfig는 기존 파일이라 안 고친다.

  `problems` — 문제 3 × (코드 전문 + 축 4 × (질문 1 + 힌트 2)). 질문·힌트는 세션 중에
  만들어지는 것이 아니라 분석 배치 산출이라, 도달하지 못한 축의 것까지 전부 들어 있다.

  `recorded` — 실제로 오간 20턴. 시연자가 누른 점수가 그 자리의 녹화 점수와 같을 때만
  이 답변이 쓰인다(answers.ts).
*/

export const PROBLEMS = [
  {
    problemId: 'f5c7d9eb-3a4f-4123-87a8-cd3e4f506172',
    problemNo: 1,
    title: '테스트 경계와 대역 설계',
    path: 'src/test/java/com/bigproject/backend/domain/assessment/application/SessionAnswerGraderTest.java',
    language: 'java',
    snippet:
      'package com.bigproject.backend.domain.assessment.application;\n\nimport com.bigproject.backend.domain.assessment.application.AnswerGradingContract.AnswerResult;\nimport com.bigproject.backend.domain.assessment.application.AnswerGradingContract.AnswerSubmit;\nimport com.bigproject.backend.domain.assessment.domain.AnswerSlot;\nimport com.bigproject.backend.domain.assessment.domain.SessionErrorCode;\nimport com.bigproject.backend.domain.assessment.domain.SessionException;\nimport com.bigproject.backend.domain.assessment.domain.SessionModels.SessionHead;\nimport com.bigproject.backend.domain.assessment.domain.SessionModels.SessionProblem;\nimport com.bigproject.backend.domain.assessment.domain.SessionModels.SessionStage;\nimport com.bigproject.backend.domain.assessment.domain.SessionModels.SlotState;\nimport com.bigproject.backend.global.ai.AiCallException;\nimport com.bigproject.backend.global.ai.AiClient;\nimport com.bigproject.backend.global.ai.AsyncAiProxyWarmUp;\nimport org.junit.jupiter.api.BeforeEach;\nimport org.junit.jupiter.api.Test;\nimport org.mockito.ArgumentCaptor;\nimport org.springframework.beans.factory.annotation.Value;\nimport org.springframework.boot.env.YamlPropertySourceLoader;\nimport org.springframework.core.env.MutablePropertySources;\nimport org.springframework.core.env.PropertySourcesPropertyResolver;\nimport org.springframework.core.io.ClassPathResource;\nimport org.springframework.http.HttpStatus;\nimport org.springframework.test.util.ReflectionTestUtils;\n\nimport java.time.Instant;\nimport java.util.List;\nimport java.util.UUID;\n\nimport static org.assertj.core.api.Assertions.assertThat;\nimport static org.assertj.core.api.Assertions.assertThatThrownBy;\nimport static org.mockito.ArgumentMatchers.any;\nimport static org.mockito.ArgumentMatchers.anyString;\nimport static org.mockito.ArgumentMatchers.eq;\nimport static org.mockito.Mockito.mock;\nimport static org.mockito.Mockito.times;\nimport static org.mockito.Mockito.verify;\nimport static org.mockito.Mockito.verifyNoInteractions;\nimport static org.mockito.Mockito.when;\n\n/**\n * AI 요청 조립을 고정한다.\n *\n * <p><b>AI는 세션 상태를 들고 있지 않다.</b> 그래서 여기서 빠뜨린 것은 전부 채점 품질의 저하로 조용히\n * 나타난다 — 계약 위반이 아니라 "학생이 앞에서 뭐라고 답했는지 모르는 채점"이 된다. 단위 시험으로\n * 잡지 않으면 드러나지 않는 종류의 결함이라 요청 본문을 직접 들여다본다.\n */\nclass SessionAnswerGraderTest {\n\n\tprivate static final UUID SESSION_ID = UUID.randomUUID();\n\tprivate static final UUID PROBLEM_ID = UUID.randomUUID();\n\tprivate static final UUID STAGE_L1 = UUID.randomUUID();\n\tprivate static final UUID STAGE_L2 = UUID.randomUUID();\n\n\tprivate AiClient aiClient;\n\tprivate AsyncAiProxyWarmUp asyncWarmUp;\n\tprivate SessionAnswerGrader grader;\n\n\t@BeforeEach\n\tvoid setUp() {\n\t\taiClient = mock(AiClient.class);\n\t\tasyncWarmUp = mock(AsyncAiProxyWarmUp.class);\n\t\tgrader = new SessionAnswerGrader(aiClient, asyncWarmUp);\n\t\twhen(aiClient.post(anyString(), any(), eq(AnswerResult.class), anyString(), any()))\n\t\t\t\t.thenReturn(new AnswerResult(SESSION_ID, "IN_PROGRESS", null, null, null, null, null, null,\n\t\t\t\t\t\tList.of()));\n\t}\n\n\t@Test\n\tvoid 문제마다_네_단계와_힌트_두_개를_모두_싣는다() {\n\t\tgrader.grade(head(), List.of(problem()), stageL2(), AnswerSlot.QUESTION, "답변", "trace");\n\n\t\tAnswerSubmit body = capture();\n\t\tassertThat(body.problems()).hasSize(1);\n\t\t// AI 스키마가 stages를 4개 고정(minItems=maxItems=4)으로 요구한다.\n\t\tassertThat(body.problems().get(0).stages()).hasSize(4);\n\t\tassertThat(body.problems().get(0).stages())\n\t\t\t\t.allSatisfy(stage -> assertThat(stage.hints()).hasSize(2));\n\t}\n\n\t/**\n\t * 확정된 답변만 transcript에 들어간다. 힌트를 열어 두기만 하고 답하지 않은 슬롯은 답이 없으므로\n\t * 나오면 안 된다 — {@code answerText}가 필수 필드라 빈 턴을 보내면 계약 위반이다.\n\t *\n\t * <p>한 축에서 턴이 둘 나오는 것은 미달 후 힌트를 보고 <b>같은 질문에 다시 답했기</b> 때문이고,\n\t * {@code hintsUsed}가 몇 번째 시도인지를 말한다.\n\t */\n\t@Test\n\tvoid 확정된_답변만_transcript에_넣는다() {\n\t\tgrader.grade(head(), List.of(problem()), stageL2(), AnswerSlot.QUESTION, "답변", "trace");\n\n\t\tAnswerSubmit body = capture();\n\t\tassertThat(body.transcript()).hasSize(2);\n\t\tassertThat(body.transcript()).extracting(AnswerGradingContract.TranscriptTurn::hintsUsed)\n\t\t\t\t.containsExactly(0, 1);\n\t\tassertThat(body.transcript()).extracting(AnswerGradingContract.TranscriptTurn::answerText)\n\t\t\t\t.containsExactly("L1 답", "L1 힌트 뒤 답");\n\t}\n\n\t/** 커서는 지금 답하는 자리를 가리킨다. 이게 어긋나면 AI가 다른 축의 기준으로 채점한다. */\n\t@Test\n\tvoid 커서는_지금_답하는_자리를_가리킨다() {\n\t\tgrader.grade(head(), List.of(problem()), stageL2(), AnswerSlot.QUESTION, "답변", "trace");\n\n\t\tAnswerSubmit body = capture();\n\t\tassertThat(body.cursor().problemId()).isEqualTo(PROBLEM_ID);\n\t\tassertThat(body.cursor().axisCode()).isEqualTo("L2");\n\t\tassertThat(body.cursor().hintsUsed()).isZero();\n\t}\n\n\t/**\n\t * 커서의 {@code hintsUsed}는 <b>답변 슬롯이 아니라 재진술 횟수</b>다. 슬롯에서 뽑으면 답변이\n\t * 언제나 질문 슬롯인 지금 모델에서 항상 0이 나가고, 재진술을 본 사실이 AI에 전달되지 않는다.\n\t */\n\t@Test\n\tvoid 커서의_힌트_수는_연_재진술_횟수다() {\n\t\tgrader.grade(head(), List.of(problem()), stageL2AfterOneHint(), AnswerSlot.QUESTION, "답변", "trace");\n\n\t\tassertThat(capture().cursor().hintsUsed()).isEqualTo(1);\n\t}\n\n\t/**\n\t * 같은 자리에 대한 재전송은 같은 멱등키여야 한다. 다르면 AI가 새 요청으로 보고 LLM 비용을 다시 쓴다 —\n\t * 네트워크 타임아웃 후 재시도가 정확히 이 경우다.\n\t *\n\t * <p>재진술을 몇 번 열었는지는 키에 넣지 않는다. 넣으면 재전송 사이에 학생이 `다시 설명해 주세요`를\n\t * 한 번 더 누른 것만으로 키가 바뀌어 같은 답이 두 번 과금된다.\n\t */\n\t@Test\n\tvoid 같은_자리_재전송은_같은_멱등키를_쓴다() {\n\t\tString first = SessionAnswerGrader.idempotencyKey(SESSION_ID, stageL2(), AnswerSlot.QUESTION).toString();\n\t\tString again = SessionAnswerGrader.idempotencyKey(SESSION_ID, stageL2AfterOneHint(), AnswerSlot.QUESTION)\n\t\t\t\t.toString();\n\t\tString otherAxis = SessionAnswerGrader.idempotencyKey(SESSION_ID, stageL1(), AnswerSlot.QUESTION)\n\t\t\t\t.toString();\n\n\t\tassertThat(first).isEqualTo(again);\n\t\tassertThat(first).isNotEqualTo(otherAxis);\n\t}\n\n\t/** AI 실패는 학생 화면에서 할 수 있는 일이 "다시 제출"뿐이라 코드 하나로 접는다. */\n\t@Test\n\tvoid AI_실패는_GRADING_FAILED로_접는다() {\n\t\twhen(aiClient.post(anyString(), any(), eq(AnswerResult.class), anyString(), any()))\n\t\t\t\t.thenThrow(new AiCallException(HttpStatus.SERVICE_UNAVAILABLE, "PROVIDER_ERROR", true, "실패"));\n\n\t\tassertThatThrownBy(() -> grader.grade(head(), List.of(problem()), stageL2(), AnswerSlot.QUESTION,\n\t\t\t\t"답변", "trace"))\n\t\t\t\t.isInstanceOf(SessionException.class)\n\t\t\t\t.extracting(exception -> ((SessionException) exception).getErrorCode())\n\t\t\t\t.isEqualTo(SessionErrorCode.GRADING_FAILED);\n\t}\n\n\t/**\n\t * 설정한 모델이 실제로 요청에 실리는지. 비어 있으면 필드가 통째로 빠져 AI가 자기 기본 모델로\n\t * 채점하고, 어떤 모델이 학생을 평가했는지가 우리 설정 어디에도 남지 않는다.\n\t */\n\t@Test\n\tvoid 설정한_채점_모델을_요청에_싣는다() {\n\t\tReflectionTestUtils.setField(grader, "providerModelCode", "minimaxai/minimax-m3");\n\n\t\tgrader.grade(head(), List.of(problem()), stageL2(), AnswerSlot.QUESTION, "답변", "trace");\n\n\t\tassertThat(capture().providerModelCode()).isEqualTo("minimaxai/minimax-m3");\n\t}\n\n\t/**\n\t * 설정 키를 <b>애너테이션에서 직접 읽어</b> application.yaml에 대고 푼다. 양쪽 이름을 따로 적으면\n\t * 이 시험이 지키는 것이 없다 — 실제로 이 필드는 yaml에 대응하는 키가 아예 없어 오랫동안 빈 값이었고,\n\t * 요청 본문에서 필드가 조용히 빠지는 것 말고는 아무 증상이 없었다. 목 기반 시험이 잡지 못하는\n\t * 종류라 여기서 고정한다.\n\t *\n\t * <p>환경변수는 일부러 보지 않는다({@code AI_SESSION_MODEL_CODE}가 실행 환경에 있으면 결과가\n\t * 사람마다 달라진다). yaml 하나만 실어 기본값이 무엇인지를 본다.\n\t */\n\t@Test\n\tvoid application_yaml이_채점_모델_키를_채운다() throws Exception {\n\t\tString expression = SessionAnswerGrader.class.getDeclaredField("providerModelCode")\n\t\t\t\t.getAnnotation(Value.class).value();\n\n\t\tMutablePropertySources sources = new MutablePropertySources();\n\t\tnew YamlPropertySourceLoader().load("application", new ClassPathResource("application.yaml"))\n\t\t\t\t.forEach(sources::addLast);\n\n\t\tassertThat(new PropertySourcesPropertyResolver(sources).resolvePlaceholders(expression))\n\t\t\t\t.isEqualTo("minimaxai/minimax-m3");\n\t}\n\n\t/**\n\t * 게이트웨이 실패에 <b>요청 안에서 재시도하지 않는다.</b>\n\t *\n\t * <p>종전에는 여기서 프록시를 깨우고(최대 150초) 한 번 더 보냈다(다시 150초). 읽기 타임아웃도\n\t * {@code status}가 비어 같은 분기를 타므로 제출 하나가 최악 450초까지 늘어났는데, 그 전에 학생\n\t * 연결이 끊겨 되살린 응답이 닿을 곳이 없었다(37차 R1 — 90초에 끊겼다).\n\t *\n\t * <p>그래서 곧바로 실패시키고 깨우기만 뒤로 넘긴다. 학생은 같은 답을 다시 내면 되고, 멱등키가\n\t * 자리마다 고정이라 재전송이 LLM 비용을 늘리지 않는다.\n\t */\n\t@Test\n\tvoid 게이트웨이_실패는_기다리지_않고_실패시키되_뒤에서_깨운다() {\n\t\twhen(aiClient.post(anyString(), any(), eq(AnswerResult.class), anyString(), any()))\n\t\t\t\t.thenThrow(new AiCallException(HttpStatus.BAD_GATEWAY, null, true, "게이트웨이 실패"));\n\n\t\tassertThatThrownBy(() -> grader.grade(head(), List.of(problem()), stageL2(), AnswerSlot.SECOND_HINT,\n\t\t\t\t"답변", "trace"))\n\t\t\t\t.isInstanceOf(SessionException.class)\n\t\t\t\t.hasFieldOrPropertyWithValue("errorCode", SessionErrorCode.GRADING_FAILED);\n\n\t\tverify(aiClient, times(1)).post(anyString(), any(), eq(AnswerResult.class), anyString(), any());\n\t\tverify(asyncWarmUp).wakeInBackground(anyString());\n\t}\n\n\t/** 4xx는 깨워도 달라지지 않는다. 헛되이 깨우면 잠든 서버를 요청마다 흔든다. */\n\t@Test\n\tvoid 요청_오류는_뒤에서도_깨우지_않는다() {\n\t\twhen(aiClient.post(anyString(), any(), eq(AnswerResult.class), anyString(), any()))\n\t\t\t\t.thenThrow(new AiCallException(HttpStatus.UNPROCESSABLE_ENTITY, null, false, "본문 오류"));\n\n\t\tassertThatThrownBy(() -> grader.grade(head(), List.of(problem()), stageL2(), AnswerSlot.SECOND_HINT,\n\t\t\t\t"답변", "trace"))\n\t\t\t\t.isInstanceOf(SessionException.class);\n\n\t\tverifyNoInteractions(asyncWarmUp);\n\t}\n\n\tprivate AnswerSubmit capture() {\n\t\tArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);\n\t\tverify(aiClient).post(anyString(), captor.capture(), eq(AnswerResult.class), anyString(), any());\n\t\treturn (AnswerSubmit) captor.getValue();\n\t}\n\n\t// ── 픽스처: L1은 힌트 하나 쓰고 통과, L2는 아직 답 전 ──\n\n\tprivate static SessionHead head() {\n\t\treturn new SessionHead(SESSION_ID, UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),\n\t\t\t\tUUID.randomUUID(), "INITIAL", "IN_PROGRESS", PROBLEM_ID, STAGE_L2, Instant.now(), null, null,\n\t\t\t\tUUID.randomUUID());\n\t}\n\n\tprivate static SessionProblem problem() {\n\t\treturn new SessionProblem(PROBLEM_ID, 1, "제목", "DESIGN_CHOICE", null, null, null, "key", "PYTHON",\n\t\t\t\t"nodes.py", 12, 20, "evidenceHash", 1, "code", "contentHash", List.of(),\n\t\t\t\tList.of(stageL1(), stageL2(), stage("L3", 3), stage("L4", 4)));\n\t}\n\n\t/** 첫 답이 미달이라 힌트가 열렸고, 힌트를 보고 쓴 두 번째 답으로 통과한 축. 턴이 둘 나온다. */\n\tprivate static SessionStage stageL1() {\n\t\tSlotState empty = new SlotState(null, null, null, null);\n\t\treturn new SessionStage(STAGE_L1, PROBLEM_ID, 1, "L1", 1, "L1 질문", "L1 힌트1", "L1 힌트2", "PASSED",\n\t\t\t\tnew SlotState("L1 답", (short) 2, false, Instant.now()),\n\t\t\t\tnew SlotState("L1 힌트 뒤 답", (short) 4, true, Instant.now()),\n\t\t\t\tempty, Instant.now(), null, 2L);\n\t}\n\n\t/** 재진술을 한 번 연 채 아직 답하지 않은 L2. 커서의 {@code hintsUsed}가 1이어야 한다. */\n\tprivate static SessionStage stageL2AfterOneHint() {\n\t\tSlotState empty = new SlotState(null, null, null, null);\n\t\treturn new SessionStage(STAGE_L2, PROBLEM_ID, 1, "L2", 2, "L2 질문", "L2 힌트1", "L2 힌트2",\n\t\t\t\t"IN_PROGRESS", empty, empty, empty, Instant.now(), null, 0L);\n\t}\n\n\tprivate static SessionStage stageL2() {\n\t\treturn stage("L2", 2);\n\t}\n\n\tprivate static SessionStage stage(String axisCode, int sequenceNo) {\n\t\tSlotState empty = new SlotState(null, null, null, null);\n\t\treturn new SessionStage(axisCode.equals("L2") ? STAGE_L2 : UUID.randomUUID(), PROBLEM_ID, 1, axisCode,\n\t\t\t\tsequenceNo, axisCode + " 질문", axisCode + " 힌트1", axisCode + " 힌트2", "PREPARED",\n\t\t\t\tempty, empty, empty, null, null, 0L);\n\t}\n}\n',
    lineStart: 55,
    lineEnd: 79,
    references: [
      {
        type: 'PRIMARY_BLOCK',
        path: 'src/test/java/com/bigproject/backend/domain/assessment/application/SessionAnswerGraderTest.java',
        lineStart: 55,
        lineEnd: 79,
        axisCode: '',
      },
      {
        type: 'QUESTION_HIGHLIGHT',
        path: 'src/test/java/com/bigproject/backend/domain/assessment/application/SessionAnswerGraderTest.java',
        lineStart: 55,
        lineEnd: 79,
        axisCode: 'L1',
      },
      {
        type: 'QUESTION_HIGHLIGHT',
        path: 'src/test/java/com/bigproject/backend/domain/assessment/application/SessionAnswerGraderTest.java',
        lineStart: 55,
        lineEnd: 79,
        axisCode: 'L2',
      },
      {
        type: 'QUESTION_HIGHLIGHT',
        path: 'src/test/java/com/bigproject/backend/domain/assessment/application/SessionAnswerGraderTest.java',
        lineStart: 55,
        lineEnd: 79,
        axisCode: 'L3',
      },
      {
        type: 'QUESTION_HIGHLIGHT',
        path: 'src/test/java/com/bigproject/backend/domain/assessment/application/SessionAnswerGraderTest.java',
        lineStart: 55,
        lineEnd: 79,
        axisCode: 'L4',
      },
    ],
    stages: [
      {
        axisCode: 'L1',
        questionText:
          '`setUp`이 만드는 `aiClient`·`asyncWarmUp`·`grader` 세 객체가 각각 무엇이고, 바로 아래 `문제마다_네_단계와_힌트_두_개를_모두_싣는다`가 실행될 때 이 셋이 어떤 순서로 관여하는지 코드에 적힌 대로 설명해 주세요.',
        hints: [
          '짧게 나눠서 다시 묻겠습니다. `setUp`이 끝난 시점에 준비되어 있는 것은 무엇인가요. 그다음 시험 메서드가 실행될 때 무엇이 먼저 불리나요.',
          '한 번에 다 말하지 않아도 됩니다. 먼저 `aiClient`가 무엇인지만 말해 주세요. 그다음 `grader`가 그것을 어떻게 넘겨받는지, 마지막으로 시험 메서드가 `grader`에게 무엇을 시키는지 순서대로 이어 주세요.',
        ],
      },
      {
        axisCode: 'L2',
        questionText:
          '`setUp`에서 `AiClient`를 실제 구현 대신 `mock`으로 세우고 `when(...).thenReturn(...)`으로 응답까지 미리 정해 두었습니다. 이 시험에서 경계를 그 자리에 그은 판단의 근거를 말해 주세요.',
        hints: [
          '같은 질문을 다른 말로 물어보겠습니다. 이 시험이 확인하려는 것은 무엇인가요. 그것을 확인하는 데 `AiClient`의 실제 동작이 필요했나요.',
          '나눠서 답해 주세요. 먼저 `mock`으로 세우지 않았다면 이 시험을 돌릴 때 무엇이 더 필요했을지 말해 주세요. 그다음 그것이 이 시험에 어떤 부담이 되는지, 마지막으로 그래서 경계를 여기 두기로 했는지를 이어 주세요.',
        ],
      },
      {
        axisCode: 'L3',
        questionText:
          '`AiClient`를 `mock`으로 두지 않고 다른 방식으로 대신 세울 수도 있었습니다. 그 방식과 지금 방식이 이 시험에서 각각 무엇을 얻고 무엇을 잃는지 비교해 주세요.',
        hints: [
          '다시 묻겠습니다. `AiClient` 자리에 놓을 수 있는 다른 것이 있을까요. 그렇게 했다면 이 시험이 어떻게 달라졌을까요.',
          '순서대로 답해 주세요. 먼저 다른 방식 하나를 구체적으로 말해 주세요. 그다음 그 방식이 지금보다 나은 점을 말해 주세요. 마지막으로 그 방식이 지금보다 못한 점을 말해 주세요.',
        ],
      },
      {
        axisCode: 'L4',
        questionText:
          '지금처럼 `AiClient`를 `mock`으로 세운 이 시험이 초록불인데도 실제 채점이 잘못 나가는 상황을 하나 들고, 그 상황에서 `setUp`의 어느 대목이 먼저 소용없어지는지 말해 주세요.',
        hints: [
          '같은 질문을 다르게 물어보겠습니다. 이 시험이 통과하는데도 안심할 수 없는 때가 있을까요. 어떤 때가 그런가요.',
          '나눠서 답해 봅시다. 먼저 그런 상황을 하나만 구체적으로 말해 주세요. 그다음 그때 이 시험이 왜 그것을 못 잡는지 말해 주세요. 마지막으로 그 이유가 `setUp`의 무엇에서 오는지 이어 주세요.',
        ],
      },
    ],
  },
  {
    problemId: '06d8eafc-4b50-4234-98b9-de4f50617283',
    problemNo: 2,
    title: '트랜잭션 경계 설정',
    path: 'src/main/java/com/bigproject/backend/domain/assessment/application/SessionTurnStore.java',
    language: 'java',
    snippet:
      'package com.bigproject.backend.domain.assessment.application;\n\nimport com.bigproject.backend.domain.assessment.application.AnswerGradingContract.AnswerResult;\nimport com.bigproject.backend.domain.assessment.domain.AnswerGrade;\nimport com.bigproject.backend.domain.assessment.domain.AnswerSlot;\nimport com.bigproject.backend.domain.assessment.domain.SessionErrorCode;\nimport com.bigproject.backend.domain.assessment.domain.SessionException;\nimport com.bigproject.backend.domain.assessment.domain.SessionModels.SessionHead;\nimport com.bigproject.backend.domain.assessment.domain.SessionModels.SessionProblem;\nimport com.bigproject.backend.domain.assessment.domain.SessionModels.SessionStage;\nimport com.bigproject.backend.domain.assessment.infrastructure.JdbcSessionRepository;\nimport com.bigproject.backend.domain.assessment.presentation.dto.AnswerSubmitResponse;\nimport lombok.RequiredArgsConstructor;\nimport lombok.extern.slf4j.Slf4j;\nimport org.springframework.stereotype.Service;\nimport org.springframework.transaction.annotation.Transactional;\n\nimport java.util.List;\nimport java.util.UUID;\n\n/**\n * 답변 한 턴의 <b>읽기 전 · 쓰기 후</b> 트랜잭션. 채점(AI 호출)은 이 둘 사이에 트랜잭션 없이 일어난다.\n *\n * <p><b>{@link AssessmentSessionService}와 클래스를 나눈 이유는 트랜잭션이다.</b> 같은 클래스 안에서\n * 자기 메서드를 부르면 Spring AOP가 프록시를 거치지 않아 {@code @Transactional}이 조용히 무시된다\n * ({@code ReportRunFinalizer}가 같은 이유로 나뉘어 있다). 별도 빈이면 프록시를 탄다.\n *\n * <p>왜 굳이 나누느냐 — 채점이 4.5~7.7초다. 한 트랜잭션으로 묶으면 그동안 DB 커넥션이 잠겨\n * 동시 응시 인원만큼 풀이 마른다.\n */\n@Slf4j\n@Service\n@RequiredArgsConstructor\npublic class SessionTurnStore {\n\n\tprivate final JdbcSessionRepository repository;\n\tprivate final SessionGuard guard;\n\n\t/**\n\t * 채점에 필요한 것을 한 번에 읽는다. 이 트랜잭션이 끝난 뒤 AI를 부른다.\n\t *\n\t * <p><b>{@code readOnly}가 아니다.</b> 하는 일은 읽기뿐이지만 {@link SessionGuard#running}이\n\t * 시간 상한을 넘긴 세션을 <b>그 자리에서 닫는다</b>(세션 상한이면 {@code end}, 문제 상한이면\n\t * {@code expireCurrentProblem}). {@code readOnly=true}면 Hibernate가 커넥션에\n\t * {@code setReadOnly(true)}를 걸고 PostgreSQL이 그 UPDATE를 {@code 25006}으로 거절하므로,\n\t * 상한을 넘긴 제출이 {@code SESSION_TIMEOUT}(409) 대신 500이 되고 세션은 열린 채 남는다 —\n\t * 다음 제출도 같은 500을 받는다. 힌트 열기·활동 기록이 같은 이유로 쓰기 트랜잭션이다.\n\t */\n\t@Transactional\n\tpublic GradingInput loadForGrading(UUID userId, UUID sessionId, String answerText) {\n\t\tif (answerText == null || answerText.isBlank()) {\n\t\t\tthrow new SessionException(SessionErrorCode.ANSWER_TEXT_REQUIRED);\n\t\t}\n\t\tSessionHead head = guard.running(userId, sessionId);\n\t\tSessionStage stage = guard.currentStage(head);\n\n\t\tAnswerSlot slot = stage.nextSlot();\n\t\tif (stage.slot(slot).isAnswered()) {\n\t\t\tthrow new SessionException(SessionErrorCode.ANSWER_ALREADY_SUBMITTED);\n\t\t}\n\t\tList<SessionProblem> problems = repository.findProblems(sessionId, head.sourceSubmissionId());\n\t\treturn new GradingInput(head, problems, stage, slot);\n\t}\n\n\t/**\n\t * 채점 결과를 확정하고 커서를 옮긴다.\n\t *\n\t * <p>{@code row_version}이 어긋나면 읽은 뒤 누군가 같은 자리에 답한 것이다. 덮어쓰지 않고 거절한다 —\n\t * 되돌릴 수 없는 제출이라 마지막 쓰기가 이기게 두면 학생이 쓴 답이 조용히 사라진다.\n\t */\n\t@Transactional\n\tpublic AnswerSubmitResponse applyGrading(GradingInput input, AnswerResult result, String answerText) {\n\t\tSessionStage stage = input.stage();\n\t\tAnswerGrade grade = gradeOf(result);\n\n\t\t// 방금 채점을 요청할 때 쓴 멱등키를 다시 만든다. 키가 결정론적이라(세션·단계·축·힌트사용수)\n\t\t// 같은 값이 나오는 것이 보장되고, 생성 규칙이 한 곳에만 있게 된다 — 값을 들고 다니면\n\t\t// 규칙이 둘로 갈릴 자리가 생긴다.\n\t\tUUID gradingRequestId = SessionAnswerGrader.idempotencyKey(\n\t\t\t\tinput.head().sessionId(), stage, input.slot());\n\n\t\tif (repository.applyAnswer(stage.problemStageId(), input.slot(), answerText, grade.score(),\n\t\t\t\tgrade.passed(), stageStatus(input.slot(), grade.passed()), gradingRequestId,\n\t\t\t\tstage.rowVersion()) == 0) {\n\t\t\tthrow new SessionException(SessionErrorCode.ANSWER_ALREADY_SUBMITTED);\n\t\t}\n\n\t\tUUID sessionId = input.head().sessionId();\n\t\tif (input.slot() == AnswerSlot.SECOND_HINT && !grade.passed()) {\n\t\t\treturn closeProblem(input, result);\n\t\t}\n\n\t\tif (result.cursor() != null && result.cursor().problemId() != null) {\n\t\t\t// 커서가 다른 문제로 넘어갔다면 방금까지 풀던 문제가 끝난 것이다. 그 자리에서 닫아\n\t\t\t// 종료 표식을 찍는다 — 이 경로를 빠뜨리면 남은 축이 열린 채로 남아 그 문제의 리포트가\n\t\t\t// 영영 만들어지지 않는다. 같은 문제의 다른 축으로 옮기는 것은 종료가 아니다.\n\t\t\tif (!input.stage().problemId().equals(result.cursor().problemId())) {\n\t\t\t\trepository.closeProblem(sessionId, input.stage().problemId(),\n\t\t\t\t\t\tJdbcSessionRepository.CLOSE_CURSOR_MOVED);\n\t\t\t}\n\t\t\trepository.moveCursor(sessionId, result.cursor().problemId(),\n\t\t\t\t\tresolveStageId(sessionId, result.cursor().problemId(), result.cursor().axisCode()));\n\t\t} else {\n\t\t\t// 커서가 null이면 AI가 "더 물을 것이 없다"고 판정한 것이다. 종료 판정은 AI가 소유하므로\n\t\t\t// 백엔드가 커서 변화로 역추론하지 않는다(AI 계약 주석).\n\t\t\trepository.end(sessionId,\n\t\t\t\t\tinput.head().isReview() ? "ALL_REVIEW_TARGETS_TERMINAL" : "ALL_PROBLEMS_TERMINAL",\n\t\t\t\t\tresult.endedLevel());\n\t\t}\n\t\treturn AnswerSubmitResponse.of(result, input.problems(), autoHint(input, result, grade));\n\t}\n\n\t/**\n\t * 힌트를 둘 다 쓰고도 미달이면 <b>그 문제를 접고 다음 문제로 넘어간다.</b> 축이 L1이든 L4든 같다 —\n\t * 두 번 설명하고도 닿지 않았다면 같은 코드에 대해 더 물어도 얻을 것이 없다.\n\t *\n\t * <p><b>AI 커서를 덮어쓴다.</b> 종료 판정은 원래 AI가 소유하고 백엔드는 커서를 따르기만 했다\n\t * ({@link #applyGrading}의 다른 분기). 여기만 예외인 이유는 이 규칙이 <b>학습 정책</b>이라\n\t * 모델 응답에 따라 흔들리면 안 되기 때문이다 — 같은 상황에서 어떤 학생은 다음 질문을 받고 어떤\n\t * 학생은 다음 문제로 가면, 리포트의 "도달 축"이 사람마다 다른 뜻이 된다.\n\t *\n\t * <p>남은 축은 {@code NOT_REACHED}·{@code NOT_PASSED}로 닫고 종료 표식을 찍는다\n\t * ({@link JdbcSessionRepository#closeProblem}). 그러지 않으면 {@code PREPARED}로 남아 리포트가\n\t * "여기까지 오지도 못했다"를 표현할 수 없고, 표식이 없으면 리포트 자체가 만들어지지 않는다.\n\t */\n\tprivate AnswerSubmitResponse closeProblem(GradingInput input, AnswerResult result) {\n\t\tUUID sessionId = input.head().sessionId();\n\t\tUUID closedProblemId = input.stage().problemId();\n\t\trepository.closeProblem(sessionId, closedProblemId, JdbcSessionRepository.CLOSE_HINTS_EXHAUSTED);\n\n\t\tSessionStage nextStage = repository.findStages(sessionId).stream()\n\t\t\t\t.filter(stage -> !stage.problemId().equals(closedProblemId))\n\t\t\t\t.filter(stage -> stage.problemNo() > input.stage().problemNo())\n\t\t\t\t.findFirst()\n\t\t\t\t.orElse(null);\n\n\t\tif (nextStage == null) {\n\t\t\t// 마지막 문제였다. 세션을 닫는다 — 이때는 AI의 endedLevel을 그대로 쓴다(도달 축 판정은\n\t\t\t// 여전히 AI 것이고, 우리가 덮어쓴 것은 "다음에 무엇을 물을까"뿐이다).\n\t\t\trepository.end(sessionId,\n\t\t\t\t\tinput.head().isReview() ? "ALL_REVIEW_TARGETS_TERMINAL" : "ALL_PROBLEMS_TERMINAL",\n\t\t\t\t\tresult.endedLevel());\n\t\t\treturn AnswerSubmitResponse.sessionEnded();\n\t\t}\n\n\t\trepository.moveCursor(sessionId, nextStage.problemId(), nextStage.problemStageId());\n\t\treturn AnswerSubmitResponse.problemClosed(nextStage, input.problems());\n\t}\n\n\t/**\n\t * 3점 미만이면 <b>다음 힌트를 자동으로 연다.</b> 학생이 `다시 설명해 주세요`를 누르기를 기다리지\n\t * 않는다 — 정의서 §6의 "미달이면 그때 힌트를 보여준다"가 이 경로다.\n\t *\n\t * <p>여는 방식은 {@code POST /hints}와 <b>같은 UPDATE</b>여야 한다. 표시 시각을 남기지 않고\n\t * 문구만 응답에 실으면, 새로고침 복귀 때 {@code hintsUsed}가 0으로 되돌아가 학생이 힌트를\n\t * 세 번, 네 번 쓴다.\n\t *\n\t * <p>열지 않는 경우 셋 — 통과했다(더 설명할 것이 없다), 힌트를 다 썼다, 커서가 다른 자리로\n\t * 옮겨 갔다. 마지막은 AI가 "이 질문은 여기까지"라고 판정한 것이므로 닫힌 질문에 힌트를 붙이지\n\t * 않는다.\n\t *\n\t * <p><b>다시 보기도 연다(37차 R2).</b> 종전에는 {@code isReview}면 건너뛰었는데, 그러면 힌트 표시\n\t * 시각이 안 남아 {@link SessionStage#nextSlot()}이 영원히 {@code QUESTION}이 되고 미달한 축에서\n\t * 세션이 갇혔다. 1차와 같은 경로를 그대로 쓰면 미달 → 힌트 → 재답변 → (2회 소진 시) 문제 종료가\n\t * 다시 보기에서도 그대로 돈다.\n\t */\n\tprivate AnswerSubmitResponse.AutoHint autoHint(GradingInput input, AnswerResult result, AnswerGrade grade) {\n\t\tSessionStage stage = input.stage();\n\t\tint hintsUsed = stage.hintsUsed();\n\t\tif (grade.passed() || hintsUsed >= 2 || !staysOnSameStage(input, result)) {\n\t\t\treturn null;\n\t\t}\n\n\t\tAnswerSlot opening = AnswerSlot.ofHintsUsed(hintsUsed + 1);\n\t\t// row_version은 방금의 applyAnswer가 1 올렸다. 읽어 둔 값 그대로 쓰면 어긋난다.\n\t\tif (repository.openHint(stage.problemStageId(), opening, stage.rowVersion() + 1) == 0) {\n\t\t\t// 같은 자리에 다른 요청이 끼어들었다. 답변 저장은 이미 끝났으므로 실패시키지 않고\n\t\t\t// 힌트만 비운다 — 화면은 `다시 설명해 주세요`로 직접 열 수 있다.\n\t\t\tlog.warn("자동 힌트 열기가 낙관적 잠금에 걸렸다. 답변은 저장됐다: stageId={}, slot={}",\n\t\t\t\t\tstage.problemStageId(), opening);\n\t\t\treturn null;\n\t\t}\n\t\tString hintText = opening == AnswerSlot.FIRST_HINT ? stage.firstHintText() : stage.secondHintText();\n\t\treturn new AnswerSubmitResponse.AutoHint(hintText, hintsUsed + 1, 2 - (hintsUsed + 1));\n\t}\n\n\t/** AI 커서가 방금 답한 그 질문에 그대로 서 있는가. 옮겨 갔으면 이 질문은 닫힌 것이다. */\n\tprivate static boolean staysOnSameStage(GradingInput input, AnswerResult result) {\n\t\treturn result.cursor() != null\n\t\t\t\t&& input.stage().problemId().equals(result.cursor().problemId())\n\t\t\t\t&& input.stage().axisCode().equals(result.cursor().axisCode());\n\t}\n\n\n\t/**\n\t * 채점 결과를 판정으로 바꾼다. <b>통과 여부는 점수에서 도출한다</b>({@link AnswerGrade}) —\n\t * 3점 미만이면 실패다.\n\t *\n\t * <p>{@code turn}이 없으면 채점이 되지 않은 것이다. 예전에는 이때 0점·실패로 적었는데, 그러면\n\t * <b>AI가 답을 읽지도 못한 답변이 "0점 실패"로 기록되고</b> 학생은 힌트를 하나 잃는다. 저장하지 않고\n\t * 재제출을 요구하는 편이 맞다 — 멱등키가 자리마다 고정이라 같은 답을 다시 보내도 비용이 늘지 않는다.\n\t */\n\tprivate AnswerGrade gradeOf(AnswerResult result) {\n\t\tif (result.turn() == null) {\n\t\t\tthrow new SessionException(SessionErrorCode.GRADING_FAILED);\n\t\t}\n\t\tAnswerGrade grade = AnswerGrade.of(result.turn().score());\n\t\tif (grade.passed() != result.turn().passed()) {\n\t\t\t// 저장은 점수 기준으로 한다. 어긋난다는 것은 AI의 임계값이 우리와 다르다는 뜻이라 계약 문제다.\n\t\t\tlog.warn("AI 통과 판정이 점수와 어긋난다. 점수 기준으로 저장한다: score={}, aiPassed={}, 임계값={}",\n\t\t\t\t\tresult.turn().score(), result.turn().passed(), AnswerGrade.PASS_SCORE);\n\t\t}\n\t\treturn grade;\n\t}\n\n\t/**\n\t * 단계 상태. 통과면 {@code PASSED}, 마지막 슬롯까지 쓰고도 미달이면 {@code NOT_PASSED},\n\t * 그 사이는 {@code IN_PROGRESS}다 — 힌트가 남아 있으면 같은 질문에 다시 답할 수 있다.\n\t *\n\t * <p>{@code NOT_PASSED}를 마지막 슬롯에서만 쓰는 것은 취향이 아니라 제약이다 —\n\t * {@code ck_problem_stage_status_2}가 답한 슬롯 중 통과한 것이 없을 것을 요구한다.\n\t */\n\tprivate static String stageStatus(AnswerSlot slot, boolean passed) {\n\t\tif (passed) {\n\t\t\treturn "PASSED";\n\t\t}\n\t\treturn slot == AnswerSlot.SECOND_HINT ? "NOT_PASSED" : "IN_PROGRESS";\n\t}\n\n\t/** AI가 준 커서(문제 + 축)를 우리 단계 ID로 되돌린다. */\n\tprivate UUID resolveStageId(UUID sessionId, UUID problemId, String axisCode) {\n\t\treturn repository.findStages(sessionId).stream()\n\t\t\t\t.filter(stage -> stage.problemId().equals(problemId) && stage.axisCode().equals(axisCode))\n\t\t\t\t.map(SessionStage::problemStageId)\n\t\t\t\t.findFirst()\n\t\t\t\t.orElseThrow(() -> new SessionException(SessionErrorCode.STAGE_NOT_FOUND));\n\t}\n\n\t/** 채점 전에 읽어 둔 것들. AI 호출 동안 트랜잭션을 붙들지 않기 위한 운반 상자다. */\n\tpublic record GradingInput(SessionHead head, List<SessionProblem> problems, SessionStage stage,\n\t\t\tAnswerSlot slot) {\n\t}\n}\n',
    lineStart: 49,
    lineEnd: 63,
    references: [
      {
        type: 'PRIMARY_BLOCK',
        path: 'src/main/java/com/bigproject/backend/domain/assessment/application/SessionTurnStore.java',
        lineStart: 49,
        lineEnd: 63,
        axisCode: '',
      },
      {
        type: 'QUESTION_HIGHLIGHT',
        path: 'src/main/java/com/bigproject/backend/domain/assessment/application/SessionTurnStore.java',
        lineStart: 49,
        lineEnd: 63,
        axisCode: 'L1',
      },
      {
        type: 'QUESTION_HIGHLIGHT',
        path: 'src/main/java/com/bigproject/backend/domain/assessment/application/SessionTurnStore.java',
        lineStart: 49,
        lineEnd: 63,
        axisCode: 'L2',
      },
      {
        type: 'QUESTION_HIGHLIGHT',
        path: 'src/main/java/com/bigproject/backend/domain/assessment/application/SessionTurnStore.java',
        lineStart: 49,
        lineEnd: 63,
        axisCode: 'L3',
      },
      {
        type: 'QUESTION_HIGHLIGHT',
        path: 'src/main/java/com/bigproject/backend/domain/assessment/application/SessionTurnStore.java',
        lineStart: 49,
        lineEnd: 63,
        axisCode: 'L4',
      },
      {
        type: 'CALLER',
        path: 'src/main/java/com/bigproject/backend/domain/assessment/application/AssessmentSessionService.java',
        lineStart: 266,
        lineEnd: 266,
        axisCode: '',
      },
    ],
    stages: [
      {
        axisCode: 'L1',
        questionText:
          '`loadForGrading`이 호출된 뒤 반환될 때까지 `guard`와 `repository`가 각각 무엇을 하고, 그 결과가 `GradingInput`에 어떻게 담기는지 코드에 적힌 대로 설명해 주세요.',
        hints: [
          '짧게 나눠 묻겠습니다. `loadForGrading`이 값을 읽어 오는 곳은 몇 군데인가요. 각각 무엇을 돌려주나요.',
          '순서대로 답해 주세요. 먼저 `guard`가 무엇을 확인하는지 말해 주세요. 그다음 `stage`에서 무엇을 꺼내는지, 마지막으로 `repository`가 무엇을 돌려주고 그것이 어디에 담기는지 이어 주세요.',
        ],
      },
      {
        axisCode: 'L2',
        questionText:
          '`loadForGrading`과 `applyGrading`에는 각각 `@Transactional`이 붙어 있는데 그 사이에 일어나는 채점 호출은 어느 트랜잭션에도 들어 있지 않습니다. 경계를 이렇게 끊어 둔 판단의 근거를 말해 주세요.',
        hints: [
          '같은 질문을 다르게 물어보겠습니다. 채점을 트랜잭션 안에 두면 무엇이 곤란해지나요. 그 곤란함 때문에 무엇을 바꾼 건가요.',
          '나눠서 답해 봅시다. 먼저 트랜잭션이 열려 있는 동안 무엇이 붙잡혀 있는지 말해 주세요. 그다음 채점이 그 시간에 어떤 영향을 주는지, 마지막으로 그래서 경계를 어디에 두기로 했는지 이어 주세요.',
        ],
      },
      {
        axisCode: 'L3',
        questionText:
          '`loadForGrading`부터 `applyGrading`까지를 지금처럼 두 트랜잭션으로 끊지 않고 다르게 묶을 수도 있었습니다. 그 방식과 지금 방식이 이 서비스에서 각각 무엇을 얻고 무엇을 잃는지 비교해 주세요.',
        hints: [
          '다시 묻겠습니다. 이 두 구간을 다르게 묶는 방법이 있을까요. 그렇게 했다면 무엇이 달라졌을까요.',
          '순서대로 답해 주세요. 먼저 다른 묶는 방식 하나를 구체적으로 말해 주세요. 그다음 그 방식이 지금보다 나은 점을 말해 주세요. 마지막으로 그 방식이 지금보다 못한 점을 말해 주세요.',
        ],
      },
      {
        axisCode: 'L4',
        questionText:
          '`loadForGrading`이 읽은 값과 `applyGrading`이 쓰는 시점 사이에 다른 요청이 끼어드는 상황을 하나 들고, 그때 무엇이 먼저 어긋나는지 말해 주세요.',
        hints: [
          '같은 질문을 다르게 물어보겠습니다. 두 트랜잭션 사이가 비어 있는 동안 다른 요청이 들어올 수 있나요. 그러면 무슨 일이 생기나요.',
          '나눠서 답해 봅시다. 먼저 그런 상황을 하나만 구체적으로 말해 주세요. 그다음 그때 두 요청이 각각 무엇을 들고 있는지 말해 주세요. 마지막으로 어느 값이 먼저 맞지 않게 되는지 이어 주세요.',
        ],
      },
    ],
  },
  {
    problemId: '17e9fb0d-5c61-4345-89ca-ef5061728394',
    problemNo: 3,
    title: '계층 분리와 의존성 방향',
    path: 'src/main/java/com/bigproject/backend/domain/assessment/application/AssessmentSessionService.java',
    language: 'java',
    snippet:
      'package com.bigproject.backend.domain.assessment.application;\n\nimport com.bigproject.backend.domain.assessment.application.AnswerGradingContract.AnswerResult;\nimport com.bigproject.backend.domain.assessment.application.SessionTurnStore.GradingInput;\nimport com.bigproject.backend.domain.assessment.domain.AnswerSlot;\nimport com.bigproject.backend.domain.assessment.domain.SessionErrorCode;\nimport com.bigproject.backend.domain.assessment.domain.SessionException;\nimport com.bigproject.backend.domain.assessment.domain.SessionModels.SessionHead;\nimport com.bigproject.backend.domain.assessment.domain.SessionModels.SessionProblem;\nimport com.bigproject.backend.domain.assessment.domain.SessionModels.SessionStage;\nimport com.bigproject.backend.domain.assessment.domain.SessionModels.SlotState;\nimport com.bigproject.backend.domain.assessment.infrastructure.JdbcSessionRepository;\nimport com.bigproject.backend.domain.assessment.presentation.dto.AnswerSubmitRequest;\nimport com.bigproject.backend.domain.assessment.presentation.dto.AnswerSubmitResponse;\nimport com.bigproject.backend.domain.assessment.presentation.dto.HintResponse;\nimport com.bigproject.backend.domain.assessment.presentation.dto.ProblemActivityResponse;\nimport com.bigproject.backend.domain.assessment.presentation.dto.SessionActivityEventRequest;\nimport com.bigproject.backend.domain.assessment.presentation.dto.SessionActivityRequest;\nimport com.bigproject.backend.domain.assessment.presentation.dto.SessionResponse;\nimport com.bigproject.backend.global.ai.AsyncAiProxyWarmUp;\nimport lombok.RequiredArgsConstructor;\nimport org.springframework.beans.factory.annotation.Value;\nimport org.springframework.stereotype.Service;\nimport org.springframework.transaction.annotation.Transactional;\n\nimport java.time.Duration;\nimport java.time.Instant;\nimport java.util.List;\nimport java.util.Optional;\nimport java.util.UUID;\n\n/**\n * 검증 세션(TR-03) 다섯 경로의 업무 규칙.\n *\n * <h2>왜 답변 제출에 세션 ID만 받는가</h2>\n *\n * <p>질문·문제·커서를 클라이언트가 실어 보내게 하면 <b>학생이 어느 질문에 답하는지를 학생이 정하게\n * 된다.</b> 계단을 건너뛰거나 이미 닫힌 문제에 답을 붙이는 요청이 만들어지고, 서버는 그것이 진짜\n * 화면 상태인지 알 방법이 없다. 진행 위치는 {@code assessment_session}의 커서가 정본이고 요청은\n * 답변 원문만 싣는다.\n *\n * <h2>힌트가 별도 경로인 이유</h2>\n *\n * <p>한 경로가 "AI를 타는 채점"과 "DB만 읽는 힌트 열기"를 겸하면 응답 형태·지연·실패 모드가 요청 본문에\n * 따라 갈린다. 채점은 몇 초가 걸리고 실패하면 재전송을 요구하지만, 힌트는 즉답이고 몇 번을 눌러도 같다.\n */\n@Service\n@RequiredArgsConstructor\npublic class AssessmentSessionService {\n\n\t/**\n\t * 인트로 고지 버전. 문구를 바꾸면 올린다 — 무효 응시 검토에서 "그때 무엇을 고지받았나"를\n\t * 이 번호로 되짚는다.\n\t */\n\tprivate static final int INTRO_NOTICE_VERSION = 1;\n\n\t/**\n\t * {@link #findCurrent}가 상한 정리를 반복하는 최대 횟수. 살아 있는 세션은 1차·재시험·다시 보기\n\t * 셋을 넘지 않으므로 넉넉하다. 상한이 아니라 <b>루프를 끊는 안전장치</b>다.\n\t */\n\tprivate static final int MAX_EXPIRY_SWEEPS = 3;\n\n\tprivate final JdbcSessionRepository repository;\n\tprivate final SessionGuard guard;\n\tprivate final SessionTurnStore turnStore;\n\tprivate final SessionAnswerGrader grader;\n\tprivate final AsyncAiProxyWarmUp asyncWarmUp;\n\n\t/** 정책 시간 상한(분). 정의서 §2의 하드 상한 60분이 기본값이다. */\n\t@Value("${session.time-limit-minutes:60}")\n\tprivate int timeLimitMinutes;\n\n\t/** 문제별 상한(분). {@link ProblemActivityResponse}의 카운트다운 기산에 쓴다. */\n\t@Value("${session.problem-time-limit-minutes:20}")\n\tprivate int problemTimeLimitMinutes;\n\n\t/**\n\t * 지금 이어서 할 세션. 없으면 비어 있다 — 화면은 "진행 중인 회차 없음"으로 그린다.\n\t *\n\t * <p>새로고침·재접속 복귀가 이 하나로 해결된다. 진행 중인 세션을 먼저 고르므로 학생이 다시 들어오면\n\t * 커서가 서 있던 자리가 그대로 나온다.\n\t *\n\t * <h2>상한을 넘긴 세션을 여기서도 정리한다</h2>\n\t *\n\t * <p>종전에는 쓰기 요청({@code POST /answers}·{@code /hints}·{@code /activity})만 상한을 봤다.\n\t * 그래서 학생이 아무것도 제출하지 않고 새로고침만 하면 <b>이미 끝났어야 할 세션이 계속 진행 중으로\n\t * 내려갔다</b> — 남은 시간이 음수인 화면이 그려지고, 첫 제출에서야 409로 끊겼다.\n\t *\n\t * <p>정리 대상이 둘이라 반복한다. 세션 상한이면 그 세션이 닫히고, 문제 상한이면 다음 문제로 커서가\n\t * 옮겨진다(마지막 문제였으면 세션이 닫힌다). 닫힌 뒤에는 <b>다른 살아 있는 세션</b>이 뽑힐 수 있어\n\t * 다시 고른다 — 1차와 다시 보기를 함께 들고 있는 학생이 그렇다.\n\t */\n\t@Transactional(readOnly = true)\n\tpublic Optional<SessionResponse> findCurrent(UUID userId) {\n\t\tOptional<SessionHead> found = repository.findCurrent(userId);\n\t\t// 한 사람이 동시에 들고 있는 살아 있는 세션은 많아야 1차·재시험·다시 보기 셋이다. 상한에 걸린\n\t\t// 것을 하나씩 닫으며 내려가되, 예기치 못한 데이터로 무한히 돌지 않도록 횟수를 묶어 둔다.\n\t\tfor (int attempt = 0; attempt < MAX_EXPIRY_SWEEPS && found.isPresent(); attempt++) {\n\t\t\tif (!guard.expireIfTimedOut(found.get())) {\n\t\t\t\tbreak;\n\t\t\t}\n\t\t\tfound = repository.findCurrent(userId);\n\t\t}\n\t\treturn found.map(head -> SessionResponse.of(head, repository.findStages(head.sessionId())));\n\t}\n\n\t/**\n\t * 인트로 동의와 함께 세션을 연다. 이미 진행 중이면 그대로 돌려준다 — 새로고침 후 다시 눌러도\n\t * 커서가 처음으로 돌아가지 않아야 한다.\n\t */\n\t@Transactional\n\tpublic SessionResponse start(UUID userId, UUID sessionId) {\n\t\tSessionHead head = guard.live(userId, sessionId);\n\t\tif ("READY".equals(head.status())) {\n\t\t\trepository.start(sessionId, INTRO_NOTICE_VERSION,\n\t\t\t\t\tInstant.now().plus(Duration.ofMinutes(timeLimitMinutes)));\n\t\t}\n\t\tSessionHead started = guard.owned(userId, sessionId);\n\n\t\t// 갱신 건수가 아니라 "실제로 시작됐는가"를 다시 읽어 확인한다. 두 가지를 함께 걸러야 해서다.\n\t\t//   · 단계가 한 건도 없는 세션 — 문제 3개가 전부 NOT_GENERATED면 READY인데 물을 것이 없다.\n\t\t//     start의 UPDATE가 단계 하나를 찾아 커서를 세우므로 이때 0건이 되고, 그대로 두면\n\t\t//     화면은 200을 받고 전체화면으로 넘어가지만 서버는 시작되지 않은 상태로 남는다.\n\t\t//   · 동시 요청 — 다른 요청이 먼저 시작시켰으면 이쪽 UPDATE도 0건이지만 그건 정상이다.\n\t\t// 갱신 건수로 판정하면 뒤엣것을 오류로 만든다. 최종 상태로 판정하면 둘이 정확히 갈린다.\n\t\tif (!"IN_PROGRESS".equals(started.status())) {\n\t\t\tthrow new SessionException(SessionErrorCode.STAGE_NOT_FOUND);\n\t\t}\n\n\t\t// 학생이 인트로를 읽고 첫 답을 쓰기까지 몇 분이 남아 있다. 그 사이에 AI를 깨워 두면 첫 채점이\n\t\t// 잠든 원본을 깨우느라 멈추지 않는다(37차 R1). 응답을 늦추지 않도록 뒤에서 돈다.\n\t\tasyncWarmUp.wakeInBackground("session-start");\n\t\treturn SessionResponse.of(started, repository.findStages(sessionId));\n\t}\n\n\t/**\n\t * 문제 하나의 활동(코드·질문·지금까지의 문답).\n\t *\n\t * <p><b>지금 문제만 열어 준다.</b> 정의서 §3 — 끝난 문제를 다시 열면 지금 문제와 무관한 데 시간을\n\t * 쓰고 "아까 그거 틀린 것 같은데"만 남는다. 아직 시작하지 않은 뒤 문제도 같은 이유로 막는다.\n\t */\n\t@Transactional(readOnly = true)\n\tpublic ProblemActivityResponse findProblem(UUID userId, UUID sessionId, int problemNo) {\n\t\tSessionHead head = guard.owned(userId, sessionId);\n\t\tList<SessionProblem> problems = repository.findProblems(sessionId, head.sourceSubmissionId());\n\t\tSessionProblem problem = problems.stream()\n\t\t\t\t.filter(candidate -> candidate.problemNo() == problemNo)\n\t\t\t\t.findFirst()\n\t\t\t\t.orElseThrow(() -> new SessionException(SessionErrorCode.PROBLEM_NOT_FOUND));\n\n\t\tboolean isCurrent = head.currentProblemId() != null\n\t\t\t\t&& head.currentProblemId().equals(problem.problemId());\n\t\tif (!isCurrent && !head.isEnded()) {\n\t\t\tthrow new SessionException(SessionErrorCode.PROBLEM_ALREADY_CLOSED);\n\t\t}\n\t\treturn ProblemActivityResponse.of(head, problem, problems.size(), problemTimeLimitMinutes);\n\t}\n\n\t/**\n\t * 힌트를 연다. <b>AI를 부르지 않는다</b> — 힌트 문구는 분석 시점에 {@code problem_stage}에\n\t * 동결돼 있고 세션은 그것을 꺼내 보여줄 뿐이다("힌트는 재진술만").\n\t *\n\t * <p>표시 시각을 남기는 것이 이 경로의 존재 이유다. 그 값이 없으면 힌트를 열어 둔 채 새로고침했을 때\n\t * {@code hintsUsed}가 0으로 되돌아가 학생이 힌트를 세 번, 네 번 쓰게 된다.\n\t */\n\t@Transactional\n\tpublic HintResponse openHint(UUID userId, UUID sessionId) {\n\t\tSessionHead head = guard.running(userId, sessionId);\n\t\tSessionStage stage = guard.currentStage(head);\n\n\t\tint hintsUsed = stage.hintsUsed();\n\t\tif (hintsUsed >= 2) {\n\t\t\tthrow new SessionException(SessionErrorCode.HINT_EXHAUSTED);\n\t\t}\n\n\t\t// 힌트가 열리는 경로는 둘이다 — 미달이면 자동으로 열리고(SessionTurnStore.autoHint), 학생이\n\t\t// 원할 때 이 경로로 직접 연다. 화면의 `다시 설명해 주세요`는 답변란이 비어 있어도 `2번 남음`과\n\t\t// 함께 활성이므로, 여기서 "먼저 답해야 한다"를 요구하면 정상 흐름이 409로 막힌다.\n\t\t//\n\t\t// 그래서 막을 것은 <b>이미 끝난 질문</b>뿐이다. 통과했으면 더 설명할 것이 없고, 마지막 힌트까지\n\t\t// 쓰고 미달이면 그 질문은 NOT_PASSED로 닫혀 있다.\n\t\tif (stage.isTerminal()) {\n\t\t\tthrow new SessionException(SessionErrorCode.HINT_NOT_AVAILABLE);\n\t\t}\n\n\t\tAnswerSlot opening = AnswerSlot.ofHintsUsed(hintsUsed + 1);\n\t\tif (repository.openHint(stage.problemStageId(), opening, stage.rowVersion()) == 0) {\n\t\t\tthrow new SessionException(SessionErrorCode.ANSWER_ALREADY_SUBMITTED);\n\t\t}\n\t\tString hintText = opening == AnswerSlot.FIRST_HINT ? stage.firstHintText() : stage.secondHintText();\n\t\treturn new HintResponse(stage.problemId(), stage.axisCode(), hintText,\n\t\t\t\thintsUsed + 1, 2 - (hintsUsed + 1));\n\t}\n\n\t/**\n\t * 응시 중 관찰 신호를 남긴다. AI를 부르지 않고 진행 상태도 바꾸지 않는다 — 오직 기록이다.\n\t *\n\t * <p><b>왜 별도 경로인가.</b> 이탈은 답변 제출과 짝이 맞지 않는다. 학생은 답을 쓰지 않고도 창을\n\t * 열 번 드나들 수 있고, 그 답변이 영영 제출되지 않을 수도 있다. 제출에 실어 보내면 그때 전부\n\t * 사라진다 — 정작 의심스러운 응시일수록 기록이 안 남는다.\n\t *\n\t * <p><b>귀속 자리는 서버 커서가 정한다.</b> 창 이탈과 첫 타이핑 지연은 지금 답을 쓰고 있는\n\t * 슬롯({@link SessionStage#nextSlot()})에 붙는다. 화면 정의서 TR-03 §4의 "이탈은 세션이 아니라\n\t * 답변에 붙인다"가 이것이고, 세션 합계는 무효 응시 판정이 따로 보므로 함께 올린다.\n\t *\n\t * <p>다시 보기(REVIEW)도 막지 않는다. 판정에 반영되지 않을 뿐 매니저 브리프는 같은 값을 읽는다.\n\t */\n\t@Transactional\n\tpublic void recordActivity(UUID userId, UUID sessionId, SessionActivityRequest request) {\n\t\tif (request.isEmpty()) {\n\t\t\tthrow new SessionException(SessionErrorCode.ACTIVITY_SIGNAL_REQUIRED);\n\t\t}\n\t\tSessionHead head = guard.running(userId, sessionId);\n\t\tSessionStage stage = guard.currentStage(head);\n\t\tAnswerSlot slot = stage.nextSlot();\n\n\t\tif (request.awaySeconds() != null) {\n\t\t\trepository.recordAway(sessionId, stage.problemStageId(), slot, request.awaySeconds());\n\t\t}\n\t\tif (request.disconnectedSeconds() != null) {\n\t\t\trepository.recordConnectionLoss(sessionId, stage.problemStageId(), request.disconnectedSeconds());\n\t\t}\n\t\tif (request.firstKeystrokeDelayMs() != null) {\n\t\t\trepository.recordFirstKeystroke(sessionId, stage.problemStageId(), slot, request.firstKeystrokeDelayMs());\n\t\t}\n\t}\n\n\t/**\n\t * 관찰 신호 이벤트 1건을 발생 시작 시각과 함께 남긴다. {@link #recordActivity}와 귀속 규칙\n\t * (서버 커서)은 같지만, 이벤트마다 호출 1회로 {@code occurredAt}을 실측값 그대로 싣는다 — 서버가\n\t * {@code now() - duration}으로 근사하지 않는다.\n\t *\n\t * <p>카운터(문제·세션 누적)는 {@link #recordActivity}가 갱신하는 것과 같은 컬럼을 같은 방식으로\n\t * 올린다 — 어느 경로로 들어오든 무효 응시 판정·매니저 브리프가 읽는 숫자가 어긋나지 않아야 한다.\n\t */\n\t@Transactional\n\tpublic void recordActivityEvent(UUID userId, UUID sessionId, SessionActivityEventRequest request) {\n\t\tSessionHead head = guard.running(userId, sessionId);\n\t\tSessionStage stage = guard.currentStage(head);\n\t\tAnswerSlot slot = stage.nextSlot();\n\n\t\tswitch (request.eventType()) {\n\t\t\tcase WINDOW_LEAVE -> repository.recordAway(sessionId, stage.problemStageId(), slot,\n\t\t\t\t\ttoSeconds(request.durationMs()), request.occurredAt());\n\t\t\tcase CONNECTION_LOSS -> repository.recordConnectionLoss(sessionId, stage.problemStageId(),\n\t\t\t\t\ttoSeconds(request.durationMs()), request.occurredAt());\n\t\t\tcase FIRST_KEYSTROKE_DELAY -> repository.recordFirstKeystroke(sessionId, stage.problemStageId(), slot,\n\t\t\t\t\trequest.durationMs(), request.occurredAt());\n\t\t}\n\t}\n\n\t/** {@code assessment_session}·{@code problem_stage}의 이탈·연결 끊김 카운터는 초 단위 컬럼이다. */\n\tprivate static int toSeconds(int durationMs) {\n\t\treturn Math.round(durationMs / 1000f);\n\t}\n\n\t/**\n\t * 답변을 제출하고 채점 결과로 다음 자리를 정한다.\n\t *\n\t * <p>세 구간이다 — ① 읽기(트랜잭션) ② 채점(트랜잭션 밖) ③ 쓰기(트랜잭션). ②가 몇 초 걸려서 나눈\n\t * 것이고, 그 사이 다른 요청이 같은 자리에 답하면 ③의 낙관적 잠금이 거절한다.\n\t */\n\tpublic AnswerSubmitResponse submitAnswer(UUID userId, UUID sessionId, AnswerSubmitRequest request,\n\t\t\tString traceId) {\n\t\tString answerText = request.answerText() == null ? null : request.answerText().trim();\n\t\tGradingInput input = turnStore.loadForGrading(userId, sessionId, answerText);\n\t\tAnswerResult result = grader.grade(input.head(), input.problems(), input.stage(), input.slot(),\n\t\t\t\tanswerText, traceId);\n\t\treturn turnStore.applyGrading(input, result, answerText);\n\t}\n}\n',
    lineStart: 257,
    lineEnd: 270,
    references: [
      {
        type: 'PRIMARY_BLOCK',
        path: 'src/main/java/com/bigproject/backend/domain/assessment/application/AssessmentSessionService.java',
        lineStart: 257,
        lineEnd: 270,
        axisCode: '',
      },
      {
        type: 'QUESTION_HIGHLIGHT',
        path: 'src/main/java/com/bigproject/backend/domain/assessment/application/AssessmentSessionService.java',
        lineStart: 257,
        lineEnd: 270,
        axisCode: 'L1',
      },
      {
        type: 'QUESTION_HIGHLIGHT',
        path: 'src/main/java/com/bigproject/backend/domain/assessment/application/AssessmentSessionService.java',
        lineStart: 257,
        lineEnd: 270,
        axisCode: 'L2',
      },
      {
        type: 'QUESTION_HIGHLIGHT',
        path: 'src/main/java/com/bigproject/backend/domain/assessment/application/AssessmentSessionService.java',
        lineStart: 257,
        lineEnd: 270,
        axisCode: 'L3',
      },
      {
        type: 'QUESTION_HIGHLIGHT',
        path: 'src/main/java/com/bigproject/backend/domain/assessment/application/AssessmentSessionService.java',
        lineStart: 257,
        lineEnd: 270,
        axisCode: 'L4',
      },
      {
        type: 'CALLER',
        path: 'src/main/java/com/bigproject/backend/domain/assessment/presentation/AssessmentSessionController.java',
        lineStart: 1,
        lineEnd: 1,
        axisCode: '',
      },
    ],
    stages: [
      {
        axisCode: 'L1',
        questionText:
          '`submitAnswer`가 `turnStore`와 `grader`를 각각 어떤 순서로 부르고, 앞에서 받은 값이 뒤로 어떻게 넘어가는지 코드에 적힌 대로 설명해 주세요.',
        hints: [
          '짧게 나눠 묻겠습니다. `submitAnswer` 안에서 다른 객체를 부르는 줄은 몇 개인가요. 각각 무엇을 돌려받나요.',
          '순서대로 답해 주세요. 먼저 `turnStore.loadForGrading`이 무엇을 돌려주는지 말해 주세요. 그다음 그 값이 `grader.grade`에 어떻게 쓰이는지, 마지막으로 `turnStore.applyGrading`이 무엇을 받아 무엇을 돌려주는지 이어 주세요.',
        ],
      },
      {
        axisCode: 'L2',
        questionText:
          '`submitAnswer`는 이 클래스 안에서 세 줄로 끝나고 실제 일은 `turnStore`와 `grader`가 나눠 합니다. 이 클래스에 남긴 것과 밖으로 넘긴 것을 이렇게 가른 판단의 근거를 말해 주세요.',
        hints: [
          '같은 질문을 다르게 물어보겠습니다. 왜 이 일들을 한 클래스에 다 두지 않았나요. 나눌 때 무엇을 기준으로 삼았나요.',
          '나눠서 답해 봅시다. 먼저 `turnStore`가 맡은 일이 무엇인지 말해 주세요. 그다음 `grader`가 맡은 일이 무엇인지 말해 주세요. 마지막으로 그 둘을 왜 이 클래스가 직접 하지 않았는지 이어 주세요.',
        ],
      },
      {
        axisCode: 'L3',
        questionText:
          '이 클래스가 `JdbcSessionRepository`를 직접 필드로 들고 있습니다. 이 의존을 지금처럼 두지 않고 다르게 둘 수도 있었습니다. 그 방식과 지금 방식이 이 코드에서 각각 무엇을 얻고 무엇을 잃는지 비교해 주세요.',
        hints: [
          '다시 묻겠습니다. 이 자리에 `JdbcSessionRepository`가 아닌 다른 것을 둘 수도 있었을까요. 그 방식은 어떤 모습인가요.',
          '순서대로 답해 주세요. 먼저 다른 방식 하나를 구체적으로 말해 주세요. 그다음 그 방식이 지금보다 나은 점을 말해 주세요. 마지막으로 그 방식이 지금보다 못한 점을 말해 주세요.',
        ],
      },
      {
        axisCode: 'L4',
        questionText:
          '이 클래스가 `presentation.dto`의 응답 타입을 그대로 돌려주는 지금 구조에서, 화면 쪽 요구가 바뀌었을 때 곤란해지는 상황을 하나 들고 어느 자리가 먼저 흔들리는지 말해 주세요.',
        hints: [
          '같은 질문을 다르게 물어보겠습니다. 화면 쪽이 바뀌면 이 클래스도 같이 바뀌게 되나요. 어떤 변경이 그런가요.',
          '나눠서 답해 봅시다. 먼저 화면 쪽 변경을 하나만 구체적으로 들어 주세요. 그다음 그 변경이 이 클래스의 무엇을 건드리게 되는지 말해 주세요. 마지막으로 그때 무엇이 잘못되는지 이어 주세요.',
        ],
      },
    ],
  },
] as const

export const RECORDED = [
  {
    problemNo: 1,
    axisCode: 'L1',
    hintsUsed: 0,
    score: 5,
    answerText:
      '`setUp`은 `@BeforeEach`라서 시험 메서드마다 먼저 돕니다. 61~62번 줄에서 `AiClient`와 `AsyncAiProxyWarmUp`을 `mock`으로 만들고, 63번 줄에서 그 둘을 생성자에 넣어 `grader`를 새로 만듭니다. 그다음 64~66번 줄에서 `aiClient.post`가 어떤 인자로 불리든 `AnswerResult` 하나를 돌려주도록 미리 정해 둡니다. 그래서 시험 메서드가 `grader.grade(...)`를 부르면 `grader`가 안에서 요청 본문을 조립해 `aiClient.post`를 부르고, 그 자리에서 준비해 둔 `AnswerResult`가 그대로 돌아옵니다. `문제마다_네_단계와_힌트_두_개를_모두_싣는다`는 그다음 `capture()`로 `aiClient.post`에 실제로 넘어간 인자를 꺼내 `AnswerSubmit`의 `problems`를 들여다봅니다. 이 시험에서 확인 대상은 `aiClient`가 돌려준 값이 아니라 `aiClient`에게 넘어간 값입니다.',
    evidence:
      '"확인 대상은 `aiClient`가 돌려준 값이 아니라 `aiClient`에게 넘어간 값입니다" — 61~66번 줄의 대역 조립과 `capture()`의 역할을 줄 단위로 짚고 둘을 하나의 흐름으로 이었다.',
    matchedLevel: '해당 코드가 하는 일과 데이터 흐름을 파일·함수·라인 단위로 정확히 기술한다',
  },
  {
    problemNo: 1,
    axisCode: 'L2',
    hintsUsed: 0,
    score: 4,
    answerText:
      '이 시험이 보려는 건 AI가 뭐라고 답하느냐가 아니라 우리가 AI에게 무엇을 보내느냐입니다. 응답은 `capture()`로 꺼내 보는 대상이 아니고 `post`가 예외만 던지지 않으면 되기 때문에 실제 구현이 필요 없습니다. 그래서 `AiClient`를 `mock`으로 세우고 응답은 껍데기만 채워 뒀습니다.',
    evidence:
      '"응답은 `capture()`로 꺼내 보는 대상이 아니고 `post`가 예외만 던지지 않으면 되기 때문에" — 검증 대상이 요청 본문이라는 것을 근거로 들었다.',
    matchedLevel: '이유를 대지만 제약과 실제 구조 사이의 연결이 한 단계 비어 있다',
  },
  {
    problemNo: 1,
    axisCode: 'L3',
    hintsUsed: 0,
    score: 2,
    answerText:
      '`mock`으로 두는 게 제일 간단합니다. 실제 `AiClient`를 쓰면 네트워크를 타야 해서 시험이 느려지고 불안정해집니다. 지금 방식이 빠르고 매번 같은 결과가 나와서 좋습니다.',
    evidence:
      '"지금 방식이 빠르고 매번 같은 결과가 나와서 좋습니다" — 대안을 묻는 질문에 현재 구현의 장점만 들었다. 다른 방식이 하나도 제시되지 않았다.',
    matchedLevel: '대안을 묻는데 현재 구현의 장점만 반복한다',
  },
  {
    problemNo: 1,
    axisCode: 'L3',
    hintsUsed: 1,
    score: 2,
    answerText:
      '다른 걸 놓으려고 해도 결국 `AiClient` 인터페이스를 만족해야 하니까 `mock`이랑 크게 다르지 않을 것 같습니다. 지금처럼 두는 게 코드도 짧고 `verify`로 호출 인자까지 바로 볼 수 있어서 이만한 방법이 없다고 봅니다.',
    evidence:
      '"이만한 방법이 없다고 봅니다" — 대안을 검토하는 대신 다시 현재 구현의 장점(코드가 짧다, `verify`가 편하다)으로 돌아왔다.',
    matchedLevel: '대안을 묻는데 현재 구현의 장점만 반복한다',
  },
  {
    problemNo: 1,
    axisCode: 'L3',
    hintsUsed: 2,
    score: 3,
    answerText:
      '`AiClient`를 구현한 가짜 클래스를 시험용으로 하나 직접 만들어서 넣는 방법이 있습니다. `post`가 받은 인자를 필드에 쌓아 두고 정해 둔 `AnswerResult`를 돌려주는 식으로요.',
    evidence:
      '"`AiClient`를 구현한 가짜 클래스를 시험용으로 하나 직접 만들어서 넣는 방법" — 대안을 구체적으로 특정했다.',
    matchedLevel: '대안의 이름만 대고 비교는 하지 못한다',
  },
  {
    problemNo: 1,
    axisCode: 'L4',
    hintsUsed: 0,
    score: 2,
    answerText:
      '`aiClient.post`가 실패하는 경우가 문제일 텐데, 그건 아래쪽 `AI_실패는_GRADING_FAILED로_접는다`에서 이미 다 잡고 있습니다. 그래서 이 시험이 통과하면 실제 채점도 문제없다고 봐도 됩니다.',
    evidence:
      '"이 시험이 통과하면 실제 채점도 문제없다고 봐도 됩니다" — 같은 파일 167~175번 줄 주석이 "목 기반 시험이 잡지 못하는 종류"를 명시하고 그 때문에 별도 시험을 두었다고 적고 있어, 코드 사실과 어긋나는 주장이다.',
    matchedLevel: '반례를 방어하려다 코드 사실과 어긋나는 주장으로 넘어간다',
  },
  {
    problemNo: 1,
    axisCode: 'L4',
    hintsUsed: 1,
    score: 2,
    answerText:
      'AI 서버가 응답 형식을 바꾸면 곤란할 것 같습니다. 그런데 `AnswerResult`가 레코드라서 형식이 바뀌면 컴파일이 안 되니까 그 전에 걸립니다.',
    evidence:
      '"레코드라서 형식이 바뀌면 컴파일이 안 되니까" — 상대 서버의 JSON이 바뀌는 것은 우리 쪽 컴파일과 무관하다. 반례를 들었다가 코드 사실과 어긋나는 근거로 방어했다.',
    matchedLevel: '반례를 방어하려다 코드 사실과 어긋나는 주장으로 넘어간다',
  },
  {
    problemNo: 1,
    axisCode: 'L4',
    hintsUsed: 2,
    score: 2,
    answerText:
      '시험이 느려지거나 다른 시험과 순서가 꼬이면 통과가 흔들릴 수 있습니다. 다만 `@BeforeEach`가 매번 `setUp`을 다시 돌리기 때문에 상태가 남지 않아서 실제로는 그런 일이 안 생깁니다.',
    evidence:
      '"실제로는 그런 일이 안 생깁니다" — 세 번째 시도에서도 반례를 든 뒤 곧바로 방어로 넘어갔고, 이 시험이 놓치는 것이 무엇인지는 끝내 나오지 않았다. 실행 순서는 이 시험이 못 잡는 결함의 성격과도 무관하다.',
    matchedLevel: '반례를 방어하려다 코드 사실과 어긋나는 주장으로 넘어간다',
  },
  {
    problemNo: 2,
    axisCode: 'L1',
    hintsUsed: 0,
    score: 5,
    answerText:
      '먼저 51~53번 줄에서 `answerText`가 비어 있으면 `ANSWER_TEXT_REQUIRED`로 바로 끊습니다. 그다음 54번 줄 `guard.running`이 그 사용자의 세션이 진행 중인지 보고, 상한을 넘겼으면 그 자리에서 세션이나 문제를 닫고 예외를 던집니다. 55번 줄 `guard.currentStage`가 커서가 서 있는 단계를 가져옵니다. 57번 줄에서 그 단계의 `nextSlot`으로 이번에 채울 슬롯을 정하고, 58~60번 줄에서 그 슬롯에 이미 답이 있으면 `ANSWER_ALREADY_SUBMITTED`로 막습니다. 마지막으로 61번 줄에서 `repository.findProblems`가 이 세션의 문제를 전부 읽어 오고, 62번 줄에서 `head`·`problems`·`stage`·`slot` 네 개를 `GradingInput`에 담아 돌려줍니다. 이 넷이 그대로 채점 요청의 재료가 됩니다.',
    evidence:
      '"`head`·`problems`·`stage`·`slot` 네 개를 `GradingInput`에 담아 돌려줍니다. 이 넷이 그대로 채점 요청의 재료가 됩니다" — 두 읽기 지점과 두 차단 지점을 줄 단위로 짚고 반환값까지 이었다.',
    matchedLevel: '해당 코드가 하는 일과 데이터 흐름을 파일·함수·라인 단위로 정확히 기술한다',
  },
  {
    problemNo: 2,
    axisCode: 'L2',
    hintsUsed: 0,
    score: 2,
    answerText:
      '`loadForGrading`으로 읽고 `applyGrading`으로 쓰는 구조라 각각에 `@Transactional`을 붙였습니다. 읽기 트랜잭션이 끝난 다음 채점이 돌고, 그 결과를 가지고 쓰기 트랜잭션이 시작됩니다.',
    evidence:
      '"읽기 트랜잭션이 끝난 다음 채점이 돌고, 그 결과를 가지고 쓰기 트랜잭션이 시작됩니다" — 이유를 묻는 질문에 실행 순서 설명으로 되돌아갔다.',
    matchedLevel: '이유를 묻는 질문에 동작 설명(L1 수준)으로 되돌아간다',
  },
  {
    problemNo: 2,
    axisCode: 'L2',
    hintsUsed: 1,
    score: 4,
    answerText:
      '트랜잭션이 열려 있는 동안에는 커넥션 하나가 계속 잡혀 있습니다. 채점은 우리 쪽 연산이 아니라 AI 서버 응답을 기다리는 시간이라 몇 초씩 걸리는데, 그걸 트랜잭션 안에 두면 그 몇 초 동안 커넥션이 아무 일도 안 하면서 잠겨 있게 됩니다. 동시에 응시하는 인원이 늘면 커넥션 풀이 그만큼 먼저 마릅니다. 그래서 읽기까지만 한 트랜잭션으로 닫고, 기다리는 구간은 트랜잭션 밖으로 빼고, 결과가 오면 다시 트랜잭션을 열어 쓰도록 경계를 끊었습니다.',
    evidence:
      '"그 몇 초 동안 커넥션이 아무 일도 안 하면서 잠겨 있게 됩니다. 동시에 응시하는 인원이 늘면 커넥션 풀이 그만큼 먼저 마릅니다" — 제약(커넥션 점유)과 목표(동시 응시 수용)를 밝히고 경계 분리로 이었다.',
    matchedLevel: '이유를 대지만 제약과 실제 구조 사이의 연결이 한 단계 비어 있다',
  },
  {
    problemNo: 2,
    axisCode: 'L3',
    hintsUsed: 0,
    score: 1,
    answerText:
      '두 개로 나누는 것 말고 다른 방법은 없다고 봅니다. Spring에서 트랜잭션은 이렇게 쓰는 거라고 배웠고 다른 형태는 생각해 본 적이 없습니다.',
    evidence: '"다른 방법은 없다고 봅니다" — 대안이 없다고 답했다.',
    matchedLevel: '대안이 없다고 답한다',
  },
  {
    problemNo: 2,
    axisCode: 'L3',
    hintsUsed: 1,
    score: 2,
    answerText:
      '지금처럼 두 개로 나눠 두면 채점이 오래 걸려도 커넥션을 안 잡고 있어서 좋습니다. 실패하면 학생이 다시 제출하면 되고 멱등키도 같아서 비용이 안 늘어납니다. 그래서 이대로가 낫습니다.',
    evidence:
      '"그래서 이대로가 낫습니다" — 다른 묶는 방식을 묻는데 현재 구현의 장점만 다시 들었다.',
    matchedLevel: '대안을 묻는데 현재 구현의 장점만 반복한다',
  },
  {
    problemNo: 2,
    axisCode: 'L3',
    hintsUsed: 2,
    score: 3,
    answerText:
      '채점까지 포함해서 세 구간을 전부 하나의 `@Transactional` 안에 넣는 방식이 있습니다. 그러면 `submitAnswer` 하나에만 애너테이션을 붙이면 되고 클래스를 둘로 나눌 필요도 없어집니다.',
    evidence:
      '"세 구간을 전부 하나의 `@Transactional` 안에 넣는 방식" — 대안을 구체적으로 특정했다.',
    matchedLevel: '대안의 이름만 대고 비교는 하지 못한다',
  },
  {
    problemNo: 3,
    axisCode: 'L1',
    hintsUsed: 0,
    score: 2,
    answerText:
      '답변을 제출하는 메서드입니다. 학생이 쓴 답을 받아서 채점하고 결과를 돌려줍니다. 이름 그대로 답변 제출을 처리하는 자리입니다.',
    evidence:
      '"이름 그대로 답변 제출을 처리하는 자리입니다" — 메서드 이름과 위 주석을 다시 진술했을 뿐 본문에서 무슨 일이 일어나는지는 없다.',
    matchedLevel: '코드의 표면적 동작만 반복 진술한다(이름·주석을 읽는 수준)',
  },
  {
    problemNo: 3,
    axisCode: 'L1',
    hintsUsed: 1,
    score: 2,
    answerText:
      '세 줄입니다. `loadForGrading`을 부르고, `grade`를 부르고, `applyGrading`을 부릅니다. 셋 다 답변을 처리하는 데 필요한 것들이라 차례로 부릅니다.',
    evidence:
      '"셋 다 답변을 처리하는 데 필요한 것들이라 차례로 부릅니다" — 호출 이름만 나열했고 각각이 무엇을 돌려주는지는 여전히 없다.',
    matchedLevel: '코드의 표면적 동작만 반복 진술한다(이름·주석을 읽는 수준)',
  },
  {
    problemNo: 3,
    axisCode: 'L1',
    hintsUsed: 2,
    score: 3,
    answerText:
      '265번 줄에서 요청의 `answerText`를 꺼내 앞뒤 공백을 지웁니다. 266번 줄에서 `turnStore.loadForGrading`을 불러 `GradingInput`을 받습니다. 267번 줄에서 `grader.grade`를 불러 `AnswerResult`를 받습니다. 269번 줄에서 `turnStore.applyGrading`을 부르고 그 결과를 그대로 돌려줍니다.',
    evidence:
      '"266번 줄에서 `turnStore.loadForGrading`을 불러 `GradingInput`을 받습니다" — 네 줄이 각각 무엇을 하고 무엇을 돌려받는지 순서대로 짚었다.',
    matchedLevel: '개별 구성 요소는 설명하지만 그것들이 어떻게 이어지는지는 설명하지 못한다',
  },
  {
    problemNo: 3,
    axisCode: 'L2',
    hintsUsed: 0,
    score: 1,
    answerText:
      '세 조각에 우선순위가 있어서 그렇습니다. `loadForGrading`이 가장 중요한 단계라 이 클래스가 직접 부르게 뒀고, 나머지 둘은 보조라서 다른 클래스로 뺐습니다.',
    evidence:
      '"`loadForGrading`이 가장 중요한 단계라 이 클래스가 직접 부르게 뒀고" — 266~269번 줄에서 세 호출이 모두 이 클래스에서 나가고 있어 사실과 맞지 않는다. 그 자리에서 지어낸 근거다.',
    matchedLevel: '이유가 없다고 답하거나 그 자리에서 지어낸 근거를 댄다',
  },
  {
    problemNo: 3,
    axisCode: 'L2',
    hintsUsed: 1,
    score: 1,
    answerText:
      '클래스가 너무 길어지면 안 된다고 해서 나눴습니다. 한 클래스가 200줄 넘어가면 쪼개는 게 규칙이라 그 기준에 맞춰 뺐습니다.',
    evidence:
      '"한 클래스가 200줄 넘어가면 쪼개는 게 규칙이라" — 이 파일 자체가 271줄이고 그 규칙이 적용된 흔적이 없다. 다시 지어낸 근거다.',
    matchedLevel: '이유가 없다고 답하거나 그 자리에서 지어낸 근거를 댄다',
  },
  {
    problemNo: 3,
    axisCode: 'L2',
    hintsUsed: 2,
    score: 2,
    answerText:
      '`turnStore`는 DB를 읽고 쓰는 걸 맡고 `grader`는 AI에 보내서 점수를 받아오는 걸 맡습니다. 이 클래스는 그 셋을 순서대로 부르기만 합니다. `loadForGrading` 다음에 `grade`가 오고 그다음 `applyGrading`이 옵니다.',
    evidence:
      '"이 클래스는 그 셋을 순서대로 부르기만 합니다. `loadForGrading` 다음에 `grade`가 오고" — 앞의 두 물음에는 답했지만 마지막 물음(왜 이 클래스가 직접 하지 않았는지)에서 다시 실행 순서 설명으로 되돌아갔다.',
    matchedLevel: '이유를 묻는 질문에 동작 설명(L1 수준)으로 되돌아간다',
  },
] as const

/*
  회차 검증 개념 — 리포트의 「교안 어디를 보라」가 이 값을 쓴다.
  출처: 00_meta.json 의 teaches. 문제 순서와 같다.
*/
export const TEACHES = [
  {
    label: '테스트 경계와 대역 설계',
    unitId: 'U-28',
    source: 'spring_backend_v1.pdf v1 · p.28~30',
    summary:
      '무엇을 실제로 돌리고 무엇을 대역으로 세울지 경계를 정하는 문제. 대역은 협력 객체를 대신하는 것이지 검증 대상을 대신하는 것이 아니다. 대역을 어디에 세우느냐가 그 시험이 무엇을 지켜 주는지를 결정한다.',
  },
  {
    label: '트랜잭션 경계 설정',
    unitId: 'U-22',
    source: 'spring_backend_v1.pdf v1 · p.22~24',
    summary:
      '트랜잭션을 어디서 열고 어디서 닫을지의 문제. 커넥션은 트랜잭션이 열려 있는 동안 점유되므로 외부 I/O를 경계 안에 두면 대기 시간만큼 커넥션이 잠긴다. 경계를 나누면 그 사이의 동시 변경을 따로 막아야 한다.',
  },
  {
    label: '계층 분리와 의존성 방향',
    unitId: 'U-32',
    source: 'spring_backend_v1.pdf v1 · p.32~35',
    summary:
      '표현·응용·도메인·인프라를 나누고 의존이 안쪽으로만 향하게 하는 문제. 응용 계층이 인프라 구현체나 표현 계층 타입을 직접 참조하면 방향이 뒤집히고, 바깥이 바뀔 때 안쪽이 함께 바뀐다.',
  },
] as const
