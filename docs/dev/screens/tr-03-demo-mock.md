# 시연용 목업 세션 — 설계

> **왜 있나.** 2026-08-26 시연에서 AI 서버가 죽으면 교육생 플로우(제출 분석 → 이해도
> 확인 세션 → 리포트)가 통째로 멈춘다. 그때 그대로 꽂아 쓸 대역 화면이다.
>
> **기존 코드는 한 줄도 안 고친다.** `src/features/demo/` 하나를 새로 파고, 기존
> 컴포넌트는 **읽기 전용으로 import만** 한다. 데모 폴더 밖으로 나가는 import는 없다.

---

## 1. 무엇이 실제와 같고 무엇이 다른가

| | 실제(TR-01·03·04) | 데모 |
|---|---|---|
| 화면 구성·컴포넌트 | — | **같다**(같은 컴포넌트를 import) |
| 진행 규칙 | 서버가 커서를 정한다 | **같은 규칙**을 `engine.ts`가 순수 함수로 |
| 교안·코드·질문·힌트 | AI 분석 산출 | **고정**(동결된 JSON) |
| 답변 | 학생이 타이핑 → AI 채점 | **시연자가 0~5점 클릭** = 채점 결과를 직접 지정 |
| 인증 | 로그인 필수 | **없다**(무인증 주소) |
| 네트워크 | 실서버 | **0회**. 서버가 다 죽어도 돈다 |

**시연자가 누르는 0~5점은 "답변"이 아니라 "채점 결과"다.** 실제로는 AI가 정하는 값을
사람이 대신 정하는 것이고, 그 뒤 플로우는 실제 규칙 그대로 갈린다.

---

## 2. 데이터

`~/Downloads/demo-verification-session/`에서 가져와 `src/features/demo/data/`에 둔다.

| 파일 | 무엇 | 쓰는 곳 |
|---|---|---|
| `fixture.ts` | 문제 3 · 질문 12 · 힌트 24 · 코드 3파일 전문 · 교안 근거 · 녹화 20턴 | 코드 패널 · 질문 · 힌트 · 리포트 |
| `rubric.ts` | `docs/plan/v2/14-verification-design.md` 부록의 L1~L4 × 0~5 문장 | 점수 버튼 라벨 |
| `answerBank.ts` | **답변 144개** — 축 × 점수 × 시도마다 하나 | 답변 말풍선 |
| `answers.ts` | 녹화본 우선 조회 → 없으면 은행 | 〃 |

> **JSON이 아니라 `.ts`인 이유** — `tsconfig.app.json`에 `resolveJsonModule`이 없어
> `import x from './a.json'` 이 `tsc -b`에서 터진다. tsconfig는 안 고쳤다.

### 2-1. 답변 말풍선에 무엇을 띄우나

```
answerFor(problemNo, axis, hintsUsed, score):
  녹화 20턴 중 (problemNo, axis, hintsUsed)가 맞고 점수까지 같으면  → 그 진짜 답변
  아니면                                                          → answerBank의 그 자리
```

녹화본이 먼저인 이유는 실제 채점기가 매긴 답변이고 근거문(`evidence`)까지 함께 있어서다.

**은행이 왜 144개인가.** 시연자가 누르는 점수는 "채점이 N점으로 나왔다"는 뜻이고,
그러면 그 점수를 받을 만한 답변이 말풍선에 있어야 한다. 축이 다르면 묻는 것이 다르므로
같은 3점이라도 다른 답변이어야 하고, 같은 축에서 미달을 세 번 눌러도 세 번 다 달라야
한다 — 같은 문장이 반복되면 "설명을 듣고 다시 답한 것"이 아니라 "같은 답을 복사한
것"으로 보인다.

```
통과(3·4·5)   12축 × 3         =  36   통과하면 즉시 다음 축이라 한 자리에 한 번뿐
미달(0·1·2)   12축 × 3 × 3시도 = 108   힌트 전 · 힌트1 후 · 힌트2 후가 각각 다르다
                                 ─────
                                   144
```

각 답변은 **그 축의 질문에 실제로 답하고**, **그 점수의 루브릭 단계에 맞고**,
**실제 소스의 줄 번호·식별자를 짚는다**(`Team-IZ/Backend@develop`에 대고 검증).
미달 3회는 점수는 그대로 두고 태도만 움직인다 — 힌트를 듣고 다시 시도한 티는 나되
루브릭 단계는 안 올라가야 그 점수가 거짓말이 아니다.

중복은 `scripts/check-demo-engine.mts`가 막는다(같은 축 안 중복 0건 · 축 간 중복 0건).

### 2-2. 루브릭 (점수 버튼 라벨)

`docs/plan/v2/14-verification-design.md:1190~1240`이 정본. 축마다 0~5 문장이 다르다.
데이터의 `matchedLevel` 문구와 다르지만 **문서 쪽이 SSOT**고 24칸이 다 차 있다
(데이터엔 10칸뿐).

3점이 도달 경계. L1·L2가 필수, L3·L4는 선택.

---

## 3. 진행 규칙 — `engine.ts`

순수 함수. React도 모르고 서버도 모른다. 그래서 테스트가 붙는다.

```
상태
  phase        INTRO | IN_PROBLEM | TRANSITION | ENDED
  problemIdx   0..2
  axisIdx      0..3            (L1~L4)
  hintsUsed    0..2
  turns        현재 문제의 끝난 턴들          — 기존 Turn 타입 그대로
  results      12칸 누적 (문제×축의 점수·상태)
```

```
ANSWER(score)
  턴을 쌓는다 (직전 힌트 + 답변)
  score >= 3   → 이 축 PASSED       → 다음 축
                 L4였으면            → 문제 종료(ALL_AXES) → TRANSITION 'NEXT'
  score <  3
    hintsUsed < 2  → 힌트 개방, 같은 축 재질문
    hintsUsed = 2  → 이 축 NOT_PASSED → 문제 종료(HINTS_EXHAUSTED) → TRANSITION 'STOP'
  마지막 문제였으면 TRANSITION 대신 ENDED

TIME_OUT (시연자 버튼)
  지금 문제를 PROBLEM_TIME_LIMIT으로 닫는다. 남은 축은 NOT_REACHED
  → TRANSITION 'STOP' (마지막 문제면 ENDED)

CONTINUE (전환 화면의 계속하기)
  → 다음 문제 IN_PROBLEM
```

**한 축이 힌트 2개를 다 쓰고도 미달이면 그 문제가 끝난다** — 실제 규칙 그대로다
(`docs/plan/v2/14-verification-design.md:140`, 녹화 데이터의 문제1·문제3이 그 경로).

### 3-1. 시간

실제 값(세션 60분 · 문제 20분)으로 시계는 돌지만 **시계로 종료시키지 않는다.**
시연 도중 예상 못 한 타이밍에 화면이 넘어가면 시연이 망가진다. 종료는 시연자의
「시간 초과」 버튼만 트리거한다.

---

## 4. 화면

### 4-1. 재사용 (수정 없이 import)

| 컴포넌트 | 그대로 쓰는 이유 |
|---|---|
| `session/components/CodePane` | `CodePane`·`Highlight` 타입만 맞추면 됨 |
| `session/components/QuestionThread` | `Turn[]` + `CurrentQuestion`을 engine이 만들어 준다 |
| `session/components/IntroScreen` · `TransitionScreen` | props가 전부 원시값 |
| `report/components/ConceptCard` · `RoundRail` | `ConceptReport`를 engine 결과로 조립 |
| `shells/Header` · `shells/Sidebar` | `DemoShell`이 데모 링크를 넣어 조립 |

### 4-2. 새로 만드는 것

| 파일 | 무엇 | 왜 새로 |
|---|---|---|
| `components/ScoreBar.tsx` | `ComposeBar` 자리 — 0~5 버튼 + 그 축의 루브릭 문장 + 「시간 초과」 | 텍스트 입력이 아니라 점수 선택이라 다른 컴포넌트 |
| `components/DemoTopBar.tsx` | 상단 진행·시계 | `SessionScreen.tsx` 안의 로컬 함수라 export가 없다 |
| `DemoShell.tsx` | Header + Sidebar(데모 링크) + main | `ConsoleShell`은 `/trainee/*` 링크를 그린다 — 시연 중 잘못 누르면 로그인으로 튄다 |
| `components/DemoEndScreen.tsx` | 세션 종료 화면 | 실제 `EndScreen`은 버튼이 `/trainee/home`으로 **하드코딩**돼 있다 |

### 4-3. 라우트 — 3개

`routes.tsx`가 `src/features/**/*.route.tsx`를 자동으로 훑으므로 **등록 파일을 안 고친다.**
`RequireRole`을 두르지 않는다(무인증).

| 경로 | 화면 |
|---|---|
| `/demo` | 홈 — 제출·분석 완료 고정, `이해도 확인 시작하기` |
| `/demo/session` | ★ 세션 |
| `/demo/report` | 리포트 — 시연자가 누른 점수로 생성 |

### 4-4. 상태를 어디에 두나

세 화면이 같은 세션 결과를 본다. `sessionStorage` 한 칸(`iz-demo-session`)에 engine
상태를 넣고 각 화면이 읽는다 — 전역 스토어를 새로 만들지 않는다. 새로고침해도
살아남고, 브라우저를 닫으면 사라진다(시연 후 정리 불필요).

---

## 5. 리포트를 어떻게 만드나

`results` 12칸 → 개념 3개 카드.

```
reachedLevel  = L1부터 연속으로 통과한 축 수 (0~4)
                L1 미달이면 0. L1·L2 통과 후 L3 미달이면 2.
isRetryTarget = reachedLevel < 2                     (L1·L2가 필수 구간)
qa            = 그 문제의 질문·힌트·답변 원문
explanation   = 막힌 축의 루브릭 문장 + 녹화 evidence(있으면)
```

---

## 6. 안 하는 것

- **제출(TR-02)·분석 대기 화면** — 홈이 완료 상태로 고정이라 필요 없다
- **다시 보기(REVIEW) 모드** — 1차 응시만
- **관찰 신호·이탈 토스트·오프라인 오버레이** — 서버로 보낼 데가 없다
- **점수 상한·무효 응시 판정** — 시연 한 번에 안 나온다
- **진행 기록 저장** — `sessionStorage`에만 남고 서버에는 아무것도 안 남는다. 교육생
  실습 기록으로 쓰려면 별도 설계가 필요하다

### 기존 코드를 건드린 곳 — 둘뿐

착수할 때 목표는 「기존 파일 수정 0」이었고 화면 쪽은 그대로 지켰다. 이후 두 가지가
추가로 요청되어 예외가 생겼다.

| 파일 | 무엇 |
|---|---|
| `auth/LoginScreen.tsx` | dev 블록에 데모 진입 링크 한 줄 |
| `trainee/report/labels.ts` 외 3 | 도달 단계 문구(0단·4단). 데모와 무관한 실제 화면 카피 변경이다 — 근거는 그 파일 머리 주석 |

---

## 7. 확인한 것

| | 결과 |
|---|---|
| `/demo` · `/demo/report` API 요청 수 | **0건** (브라우저 network 실측) |
| 세 종료 경로(전부 통과 · 힌트 소진 · 시간 초과) | 각각 다른 화면으로 이어짐 |
| 녹화 시나리오대로 눌렀을 때 | 20턴 전부 진짜 답변 |
| 답변 중복 | 같은 축 안 0건 · 축 간 0건 |
| `node --experimental-strip-types --test scripts/check-demo-engine.mts` | 22/22 |
| `npm run typecheck` · `lint` · `build` | 통과 |

## 8. 시연 중 알아둘 것

- 상태는 `sessionStorage`라 **탭 단위**다. 여러 사람이 동시에 열어도 서로 안 보이고,
  같은 사람이 탭 둘을 열면 각각 독립으로 돈다(실측 확인).
- 홈 우측 아래 **「처음부터 다시(시연용)」** 로 리셋한다. 실제 홈에는 없는 버튼이라
  눈에 안 띄게 뒀다 — 시연 중 잘못 누르면 진행이 통째로 날아간다.
- **「시간 초과시키기」** 는 그 문제만 닫고 남은 축을 `NOT_REACHED`로 남긴다.
  리포트에서 「못한 것」과 구분되어 나온다.
