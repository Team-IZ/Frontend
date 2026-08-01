# 질문 소재 선별 — 교안 정제와 코드 매칭

> **이 문서가 정하는 것:** 학생이 제출한 코드에서 **무엇에 대해 물을지**를 고르는 로직.
> **정하지 않는 것:** 고른 소재로 질문을 어떻게 만들고 어떻게 채점하는지 — 그건 [12번 채점·진행 규칙](12-scoring-rules.md)에 있다.
>
> 개발·리뷰는 이 문서에서 한다. 임계값은 11절에 모아뒀다.

---

## 0. 한 장 요약

```
[교안당 1회 · 저장]                        [학생 제출마다]

교안 분석 결과                              학생 repo
   │                                            │
   ├─ 정제 (4절)                                ├─ 구조 스캔 (기존 tier A 재활용)
   ├─ 사전 lexicon.json    ───────────────→     ├─ 식별자 grep
   ├─ 형제 siblings.json   ───────────────→     ├─ AST 블록 확장
   └─ 경고 warns_map.json  ───────────────→     ├─ 결정 여지 점수
                                                └─→ 상위 3개 span = 문제 3개

요구사항 (선택)  ─────────────────────────→   P/F 체크 (별도 트랙)
```

| | 결정 |
|---|---|
| **선별 기준** | 결함이 아니라 **"학생이 선택을 한 지점"** |
| **두 축** | 교안 교집합(물을 자격) × 결정 여지(변별력) |
| **출력 단위** | 파일이 아니라 **함수/클래스 블록 (파일:라인범위)** |
| **핵심 경로 LLM** | **0회** |
| **요구사항 P/F** | LLM 2회 · 선택 · **자동 확정 안 함** |
| **폐기** | fan_in 기반 중요도 · `duplicate-definition` · `idiom_filter` |
| **재활용** | import 그래프(tie-breaker·문맥·고립 파일 제외) · `architecture-diffusion` 아이디어 |

---

## 1. 현재 방식의 문제

지금 선별은 `two_tier_scan.py` + `score_findings.py`가 하고, 중요도 신호가 **두 개**뿐이다.

```
fan_in (몇 개 파일이 나를 import하나)  →  find_hub / isolated / diffusion
정의 중복 횟수                          →  repeated-pattern
보안 키워드                             →  tier B (이해도와 무관)
```

### 1-1. fan_in은 결정 밀도와 음의 상관이다

fan_in이 높다 = 많은 파일이 나를 참조한다 = **공용 모듈**이다.

| fan_in 상위에 오는 것 | 결정이 있나 |
|---|---|
| `types.ts` · `constants.ts` | 없음 |
| `apiClient.ts` | 거의 없음 |
| `XxxContext.tsx` | **프레임워크가 시킨 것** |
| `useXxxQueries.ts` | **라이브러리 컨벤션** |

**공용 모듈이 되려면 범용적이어야 하고, 범용적이려면 특정 판단이 빠져 있어야 한다.** 정말 중요한 결정은 보통 한 곳에서 한 번 이뤄지고(State 스키마 설계, 분기 로직, 에러 전파 방식) 그건 fan_in이 낮다.

### 1-2. 팀이 이미 알고 있었다 — 주석이 증거다

패치 이력이 전부 **같은 종류의 오탐**이다.

> **D3-COST 해소:** "관용 패턴 vs 진짜 설계 결정" 구분은 `idiom_filter.py`로 분리 구현 — **useAuth Context 같은 프레임워크 관례가 질문가치를 과대평가받던 문제**

> **D21:** `useBooksQueries.ts`가 fan_in=6으로 diffusion 후보에 올랐는데 내용은 react-query 공식 문서가 권장하는 표준 패턴이라 … **"설계 판단"보다 "라이브러리 컨벤션"에 가까움**

> **D130:** `test_` 접두 이름은 **나쁜 복붙이 아니라 대칭 구조를 의도적으로 맞춘 좋은 테스트 관례**

> **`find_architecture_diffusion_point` docstring:** 이 자체는 **관용 패턴(React Context 등)일 수도**, 진짜 설계 판단일 수도 있다

`idiom_filter.py`가 별도 모듈로 존재한다는 것 자체가 **원하는 게 "진짜 설계 결정"인데 fan_in이 그걸 못 잡는다는 인정**이다.

### 1-3. denylist라 끝이 없다

```
createContext 잡음      → 예외 추가
useQuery 나옴           → 예외 추가
Redux Toolkit slice     → 아직 미탐지 (주석에 명시돼 있음)
Vue / Svelte / Spring   → 프레임워크 수만큼
```

**교안 기반은 allowlist다.** "교안에 있는 것만"이라 유한하다. React Context가 교안에 없으면 후보에 안 들어오고, 있으면 배운 거니까 물어도 된다. → **`idiom_filter.py`가 통째로 불필요해진다.**

### 1-4. 결정적 — AI가 짠 코드에 가장 관대하다

```
제품 명제:  "AI로 코드를 만들 수 있으니 산출물만으로는 학습 여부를 모른다"
현재 선별:  "코드 품질 결함이 있는 곳을 묻는다"
```

**복붙·중복 정의 같은 신호는 사람이 급하게 짤 때 나오지 AI가 짤 때 나오지 않는다.** AI 코드는 구조가 표준적이라 결함 신호가 적다.

**→ AI 대필 학생이 가장 사소한 질문을 받는다.** 튜닝으로 고칠 문제가 아니다.

---

## 2. 교안 분석 결과 — 현재 품질 (LLMOps 교안, refine-OFF)

`AI_LLMOps_교안` · 청크 16개 · extractor `pdftotext` · 12개 섹션 · 그래프 290노드 313관계

**이전(pdfjs) 결과보다 급이 다르게 좋다.**

| | 이전 | 현재 |
|---|---|---|
| **정의 품질** | `"A pattern that routes requests…"` 동어반복 | **`"JSON은 데이터를 저장·교환하기 위한 문자열 기반 표준 형식으로, API 응답·설정 파일·LLM 구조화 출력·DB 저장 등에 사용되며 Python에서 json.loads()로 읽으면 dict/list 형태로 변환된다"`** |
| **중복** | `Router Pattern`×3 · `Network Pattern`×2 | 거의 없음 |
| **섹션 범위** | `Overview p.1-103` (전체 덮음) | `Overview p.1-6` · `LLMOps p.7-10` · `통제가능 p.11-14` · `설계절차 p.15-20` — **연속·비겹침** |
| **`shows_code`** | 개념과 구분 안 됨 | **실제 코드 예시로 분리** |

**정제 규칙을 크게 손볼 필요가 없어졌다.** 남은 것은 4절의 6개뿐이다.

---

## 3. 두 가지 발견

### 3-1. `shows_code` 정의에 코드 식별자가 그대로 들어 있다

**개념별 코드 키워드 사전을 LLM으로 생성할 필요가 없다.** 정의에서 정규식으로 뽑으면 된다.

| `shows_code` 항목 | 페이지 | 추출되는 식별자 |
|---|---|---|
| AgentState에 HITL 필드 추가 | p.54 | `AgentState` `TypedDict` `human_decision` `human_reason` `next_step` |
| HITL Trigger 조건 함수 | p.55 | `should_trigger_hitl` `max_iterations` `REJECTED` |
| human_review 노드 구현 | p.56 | `human_review` `APPROVE` `REVISE` `ABORT` |
| Supervisor 노드의 흐름 결정 로직 | p.57 | `supervisor` `plan` `execution_result` `planner` `executor` `critic` |
| SQLite DB와 테이블 생성 | p.135 | `sqlite3.connect` `cursor.execute` `commit` `close` |
| JSON 읽기와 저장하기 | p.131 | `json` `dumps` `loads` `dump` `load` |
| Streamlit 예제1 | p.146 | `st.title` `st.markdown` `st.button` |

`concept` 정의에서도 나온다.

| concept | 식별자 |
|---|---|
| State 정의서 — "각 Key에 대해 … **Reducer·Overwrite** 구분" | `Reducer` `Overwrite` |
| Checkpoint와 **parent_checkpoint_id** (branch 개념) | `parent_checkpoint_id` |
| Streamlit의 핵심 동작 방식과 **st.write()** | `st.write` |
| Python dict와 JSON의 차이 — "**json.loads()**가 실패한다" | `json.loads` |

**어떤 교안이든 동작한다.** Kubernetes 교안이면 같은 방식으로 `kubectl apply` · `ClusterIP` · `PersistentVolumeClaim`이 나온다.

### 3-2. `warns`가 0건이다 — 2단 질문 재료가 없다

화면 어디에도 **주의사항(WARNS)** 블록이 없다. 섹션별 연결 항목이 전부 `개념 + 코드 예시`뿐이다.

| 섹션 | 개념 | 코드예시 | **warns** |
|---|---|---|---|
| HITL | 9 | 4 | **0** |
| 역할 기반 설계 | 9 | 1 | **0** |
| Agent 시스템 구축 | 11 | 6 | **0** |
| AI Agent 설계 | 16 | 0 | **0** |

**그런데 교안에 경고 재료가 있다. 전부 concept으로 잘못 분류됐다.**

| 지금 concept | 실제로는 |
|---|---|
| **HITL이 필요한 이유** — "무한 재시도로 인한 **비용 증가**, Tool/API 호출 **비용 리스크**, 정책 위반으로 인한 **법적·보안 사고**" | **warns** |
| **AI-Augmented 개발의 코드 품질 저하와 생산성 역설** | **warns** |
| **설계 없는 개발이 만드는 이슈들** | **warns** |
| **기술 부채 (Technical Debt)** | **warns** |
| **모델 드리프트의 업무/기술적 리스크와 대응 방안** | **warns** |
| **문서 검토의 현재 문제점** — "1건당 평균 20분 소요" | **warns** |

**고칠 곳은 추출 프롬프트(②단계)다.** 어휘를 쓰지 않고 이렇게 규정한다.

> 어떤 항목이 **"이렇게 하면 어떤 나쁜 결과가 생기는가"** 를 설명하면 `caution`으로 분류하고 `parent`에 대상 개념 이름을 넣어라.
> — 비용 증가, 성능 저하, 오류 전파, 보안·법적 리스크, 유지보수 부담, 실패 조건이 서술되면 전부 여기 해당한다.
> — **"~가 필요한 이유"** 형태는 대개 "없으면 생기는 문제"를 말하므로 caution일 가능성이 높다.

마지막 줄이 핵심이다. **"HITL이 필요한 이유"가 곧 "HITL 없으면 터지는 것"** 이고, 그게 그대로 2단 질문이 된다.

---

## 4. 교안 정제 규칙 — 6개, 전부 어휘 무관

**원칙: 어휘 사전을 만들지 않는다.** 의미 판단은 ②단계 LLM이, 구조 판단은 ③단계 규칙이 한다. 교안이 한글이든 영어든, LangGraph든 Kubernetes든 같은 규칙이 돈다.

### R1 · 섹션을 페이지 순으로 정렬

지금 순서가 뒤죽박죽이다.

```
현재  p.128-150 → p.1-6 → p.7-10 → p.21-35 → … → p.11-14 → p.15-20
수정  p.1-6 → p.7-10 → p.11-14 → p.15-20 → p.21-35 → …
```

매니저가 섹션을 고를 때 **강의 순서대로** 보여야 한다. 정렬 한 줄.

### R2 · 섹션 겹침 해소

앞부분은 깔끔한데 후반부가 겹친다.

| 섹션 | 범위 | |
|---|---|---|
| Trace 실행 관측 | p.77-**154** | |
| Agent 시스템 평가 | p.95-**156** | ← Trace와 겹침 |
| Agent 시스템 구축 (JSON/SQLite/Streamlit) | p.128-150 | ← **두 섹션 안에 완전히 들어감** |

**소속 개념의 페이지 분포에서 이상치를 제거하고 재계산.** 다른 섹션과 50% 이상 겹치면 경고 표시.

### R3 · 비교 항목 → 형제 관계로 변환

지금 별도 개념 노드로 갇혀 있다. **이게 결정 여지 신호의 핵심 공급원이다.**

| 지금 노드 | → 엣지 |
|---|---|
| DevOps vs MLOps comparison | DevOps ↔ MLOps |
| MLOps vs LLMOps comparison | MLOps ↔ LLMOps |
| Functioning Agent vs Controllable Agent | 형제 |
| 조건부 루프 vs Supervisor 구조 비교 | 형제 |
| Snapshot vs LangSmith Trace 비교 | 형제 |
| pandas 데이터프레임 vs DB 테이블 비교 | 형제 |
| LLM 평가 vs Agent 평가 | 형제 |

패턴 — 언어 2개만 처리한다.
```
(.+?)\s+vs\.?\s+(.+)      |  (.+?)와\s+(.+?)\s*비교
(.+?)\s+대\s+(.+)          |  (.+?)\s*↔\s*(.+)
```

### R4 · 섹션 마지막 페이지 항목 = 요약 → 개념에서 제외

**어휘 없이 위치로 잡힌다.**

| 항목 | 페이지 | 섹션 범위 | |
|---|---|---|---|
| AI Agent 설계 절차 요약 | p.35 | p.21-**35** | **마지막** |
| 역할 기반 설계 요약 | p.46 | p.37-**46** | **마지막** |
| HITL 요약 (Supervisor 패턴 핵심) | p.60 | p.48-**60** | **마지막** |
| Snapshot과 멀티 에이전트 디버깅 요약 | — | p.62-75 | 마지막 |
| LangSmith 추적 절차 요약 | — | p.77-154 | 마지막 |

개념에서 빼고 **섹션 설명으로 승격**한다. 요약문이 곧 "이 섹션이 무엇을 다루는가"이므로 매니저가 섹션 고를 때 보여주면 유용하다.

### R5 · 이름 포함 → 부모-자식

```
개념 A의 이름이 개념 B에 완전히 포함 + B가 더 길다  →  B는 A의 자식
```

HITL 섹션이 교과서적 사례다.

```
HITL
 ├ HITL 개념 정의
 ├ HITL이 필요한 이유          → R3-3에서 warns로
 ├ HITL 적용 사례 비교
 ├ HITL의 위치와 역할
 ├ HITL Design Checklist…
 └ HITL 요약                   → R4로 섹션 설명
```

**13개가 `HITL` 하나 아래로 묶인다.** Supervisor · Streamlit · SQLite도 같다. 언어 무관이다.

### R6 · 이름의 괄호·콜론 뒤 부연 제거

```
면접 준비 및 진행 절차 (서류 검토 → 면접 전략 수립 → 질문 및 답변 → 면접 평가)
  → 면접 준비 및 진행 절차

Streamlit 예제3: Charts ② - 데이터 캐싱/필터링/구분자
  → Streamlit 예제3
```

부연은 정의로 옮긴다. 이름이 짧아야 프롬프트에 넣기 좋고 R5도 잘 걸린다.

### 부수 · 언어 혼재

`Overview` · `LLMOps 개념 이해` 섹션만 영어다(`Course introduction and learning outcomes`, `DevOps vs MLOps comparison`). 청크 1·2에서 LLM이 영어로 출력했다. ②에 **"출력은 한국어로 통일"** 한 줄.

---

## 5. 데이터 계약

```
[교안 1회 · 저장]                       [학생 제출마다]

lexicon.json      ───────────────→   selector  ──→  spans.json (상위 3)
siblings.json     ───────────────→       ↑
warns_map.json    ───────────────→       │
                                    structure.json (기존 tier A)

요구사항 (선택)   ───────────────→   requirement_check  ──→  checks.json
```

---

## 6. 로직 1 · 교안 사전 구축 (교안당 1회, LLM 0)

### 입력
정제 완료된 `concept` · `shows_code` · `caution` 항목 전체 (이름 + 정의 + 페이지 + parent)

### 추출

```python
for 항목 in 교안전체:
    text = 항목.이름 + " " + 항목.정의
    for term in 정규식_3종(text):
        if term in DENYLIST: continue
        if len(term) <= IDENT_MIN_LEN: continue
        lexicon[term].sources.append({
            node: 항목.이름, type: 항목.타입,
            page: 항목.페이지, parent: 항목.parent
        })
```

**정규식 3종**

| kind | 패턴 | 예 |
|---|---|---|
| snake | `[a-z][a-z0-9]*(_[a-z0-9]+)+` | `should_trigger_hitl` `max_iterations` |
| pascal | `[A-Z][a-zA-Z0-9]*[a-z][A-Z][a-zA-Z0-9]*` | `AgentState` `TypedDict` |
| call·attr | `[\w.]+\(\)` · `\.[a-z]\w+` | `json.loads()` `st.button()` `.dumps` |

**DENYLIST — 언어별 고정 목록 (약 50개씩)**
```
python  def class self return import str int list dict None True False print
js      function const let var return export default import async await
공통     data result value item index temp main test config utils
```

### 출력 `lexicon.json`

```json
{
  "should_trigger_hitl": {
    "kind": "snake",
    "sources": [{ "node": "HITL Trigger 조건 함수", "type": "shows_code",
                  "page": 55, "parent": "HITL" }]
  },
  "AgentState": {
    "kind": "pascal",
    "sources": [{ "node": "AgentState에 HITL 필드 추가", "type": "shows_code",
                  "page": 54, "parent": "HITL" }]
  }
}
```

---

## 7. 로직 2 · 형제 관계 추출 (교안당 1회, LLM 0)

**세 규칙을 순서대로 적용하고 하나라도 걸리면 형제 확정.**

### R-a · 비교 항목 파싱 (가장 강함)

```python
for 항목 in 개념목록:
    m = 비교패턴.match(항목.이름)          # 4절 R3의 패턴
    if m:
        A = fuzzy_match(m[1], 개념목록)     # 토큰 포함 또는 편집거리
        B = fuzzy_match(m[2], 개념목록)
        if A and B:
            siblings.add(A, B)
            항목.타입 = "comparison"        # 개념 목록에서 제외
```

### R-b · 부모 정의 내 나열

```python
for P in 개념목록:
    children = [C for C in 개념목록
                if C.이름 in P.정의
                and 0 < C.페이지 - P.페이지 <= SIBLING_PAGE_GAP]
    if len(children) >= SIBLING_MIN_CHILDREN:
        siblings.add_all(children)          # 서로 형제
        for C in children: C.parent = P
```

### R-c · 공통 토큰 + 페이지 인접

```python
for A, B in 개념쌍:
    if A.유닛 == B.유닛 \
       and abs(A.페이지 - B.페이지) <= SIBLING_PAGE_GAP \
       and 공통토큰(A.이름, B.이름):
        siblings.add(A, B)
```

### 출력 `siblings.json`
```json
[["조건부 루프", "Supervisor 구조"], ["Reducer", "Overwrite"],
 ["DevOps", "MLOps"], ["MLOps", "LLMOps"], …]
```

---

## 8. 로직 3 · 코드 선별 (런타임, LLM 0) ← 핵심

### 단계

```python
1  files  = find_src_files(repo)                  # 기존 함수 재활용
2  struct = tier_a_structural_scan(files)         # 기존 함수 재활용 → fan_in, isolated

3  hits = []
   for f in files:
       for line_no, line in enumerate(f):
           for term in lexicon:
               if term in line:
                   hits.append((f, line_no, term))

4  spans = {}
   for (f, line, term) in hits:
       block = expand_to_block(f, line)           # 로직 5
       spans[(f, block.start, block.end)].terms.add(term)

5  for span in spans:
       span.concepts = union(lexicon[t].sources for t in span.terms)
       span.parents  = {c.parent for c in span.concepts}

6  score(span)                                    # 아래

7  spans = [s for s in spans if s.file not in struct.isolated]
   spans.sort(key=(-score, -fan_in))
   return spans[:MAX_SPANS]
```

**7번의 `isolated` 제외가 중요하다.** 교안 개념이 매칭됐어도 그 파일이 어디서도 import되지 않으면 **실제로 동작하지 않는 코드**다. 기존 `cognition-isolation`이 여기서 정반대 용도로 살아난다 — 후보에서 **제외**하는 데 쓴다.

### 점수 계산 — 완전 명세

```python
def score(span):
    s, detail = 0, {}

    # 형제 +3
    if any((c, x) in siblings for c in span.concepts for x in all_concepts):
        s += W_SIBLING; detail["sibling"] = W_SIBLING

    # warns +3
    if any(warns_map.get(p) for p in span.parents | span.concepts):
        s += W_WARNS; detail["warns"] = W_WARNS

    # 교안 예시와 차이 +2
    for c in span.concepts:
        if c.type == "shows_code":
            expected = lexicon_terms_of(c)         # 그 shows_code의 식별자 전체
            found    = expected & span.terms
            if 0 < len(found) < len(expected):     # 일부만 = 다르게 구현
                s += W_GAP; detail["gap"] = W_GAP
                span.gap = {expected, found, expected - found}
            # 전부 일치 = 교안 그대로 따라함 → 0점

    # 매직 넘버 +1
    if re.search(r'(?<![\w.])[2-9]\d*(?![\w.])', span.code):
        s += W_MAGIC; detail["magic"] = W_MAGIC

    # 비자명 분기 +1
    if any(cond_complexity(if_) >= 2 for if_ in span.ifs):
        s += W_BRANCH; detail["branch"] = W_BRANCH

    span.score, span.score_detail = s, detail
```

**`gap` 계산이 4단 질문의 직접 재료다.**

| | |
|---|---|
| 교안 `shows_code` p.55 식별자 | `위험키워드` · `REJECTED` · `max_iterations` |
| 학생 span의 식별자 | `REJECTED` · `max_iterations` |
| **missing** | **`위험키워드`** → "교안은 세 조건인데 왜 두 개만?" |

### 채점 예시

가상의 LLMOps 과제:
```python
state.py   class AgentState(TypedDict):
               human_decision: str
               plan: list
               max_iterations: int = 3
nodes.py   def should_trigger_hitl(state): ...
           def human_review(state): ...
           def supervisor(state): ...
db.py      sqlite3.connect("app.db"); cursor.execute("CREATE TABLE …")
app.py     st.title(…); st.button(…)
```

| span | 형제 | warns | gap | 기타 | **합** |
|---|---|---|---|---|---|
| **nodes.py:12-18 `should_trigger_hitl`** | HITL Design Checklist 3방안 ✓ | **HITL이 필요한 이유** ✓ | 교안 3조건 중 2개만 ✓ | 매직넘버 `3` | **9** |
| **nodes.py:35-52 `supervisor`** | **조건부 루프 vs Supervisor 구조 비교** ✓ | Supervisor 운영상 장점 ✓ | — | — | **6** |
| state.py:1-8 `AgentState` | State 정의서 Reducer↔Overwrite ✓ | — | — | — | **3** |
| db.py:3-15 | pandas 데이터프레임 vs DB 테이블 비교 ✓ | — | — | — | 3 |
| app.py:5-40 `st.title` | 없음 | 없음 | 없음 | 없음 | **0** |

**`st.title`이 자동으로 0점으로 밀린다.** 배운 것이지만 **선택의 여지가 없다** — `st.title`을 쓸지 말지에 판단이 없다. fan_in 방식이라면 `app.py`가 참조를 많이 받아 상위로 왔을 것이다.

### 출력 `spans.json`

```json
{
  "spans": [{
    "file": "nodes.py", "lines": [12, 18], "code": "…",
    "concepts": [{ "name": "HITL Trigger 조건 함수", "page": 55,
                   "type": "shows_code", "parent": "HITL",
                   "definition": "should_trigger_hitl 함수는 위험 키워드 포함 여부와 REJECTED + max_iterations 도달 여부로 HITL 개입을 결정한다" }],
    "siblings": [{ "name": "HITL Design Checklist과 사용자 부담 Trade-off", "page": 58 }],
    "warns":    [{ "name": "HITL이 필요한 이유", "page": 49,
                   "text": "무한 재시도로 인한 비용 증가, Tool/API 호출 비용 리스크, 정책 위반으로 인한 법적·보안 사고" }],
    "gap": { "expected": ["위험키워드","REJECTED","max_iterations"],
             "found": ["REJECTED","max_iterations"],
             "missing": ["위험키워드"] },
    "score": 9,
    "score_detail": { "sibling": 3, "warns": 3, "gap": 2, "magic": 1 },
    "context": { "imported_by": ["graph.py"], "fan_in": 2 }
  }]
}
```

**이 블록이 그대로 질문 생성 프롬프트 입력이다.**

| 단계 | 쓰는 필드 |
|---|---|
| 1단 기술 | `code` + `concepts[].definition` |
| 2단 한계 | **`warns[].text`** |
| 3단 대안 | **`siblings[]`** |
| 4단 판단 | **`gap.missing`** |

**네 턴 모두 교안이 재료를 공급한다.** 지금은 네 턴을 전부 LLM이 상상해서 "10,000권 규모라면" 같은 교안 무관 질문이 나온다.

---

## 9. 로직 4 · 요구사항 P/F (런타임, LLM 2회, 선택)

### 성질이 다르다

| | 매칭할 것 |
|---|---|
| **교안 개념** | `should_trigger_hitl` · `TypedDict` — **문자열이 정해져 있음** |
| **요구사항** | "좋아요 버튼" — `like` `Like` `favorite` `heart` `thumbUp` `bookmark` `추천` … **뭐라도 될 수 있음** |

**문자열 매칭으로는 안 된다. LLM이 필요하다.**

### 단계

```python
1  items = 요구사항.split("\n")                    # 줄바꿈으로 항목 분리

2  [LLM 1회] items 전체를 한 번에
   출력: { item → [키워드 5~8개] }
   프롬프트: "각 요구사항이 코드에서 어떤 이름으로 나타날 수 있는지 나열.
             영어·한글, camelCase·snake_case 변형 포함"

3  for item in items:                              # LLM 0
       item.후보 = grep(item.키워드)[:REQ_CAND_FILES]
       item.후보블록 = [expand_to_block(h) for h in 히트]

4  [LLM 1회] 전 항목의 후보 블록을 한 번에
   출력: { item, verdict, evidence[{file,lines}], confidence }
```

### 신뢰도 기준 — 프롬프트에 명시

| verdict | confidence | 조건 |
|---|---|---|
| **P** | **high** | 이름 매칭 + **동작 연결** (이벤트 핸들러 → 상태 변경 **또는** API 호출) |
| **P** | **low** | 이름은 있으나 본문이 비었거나 `TODO`/`pass`만 |
| **?** | low | 관련 변수·타입만 있고 실행 경로 없음 |
| **F** | — | 매칭 0 |

### 출력 `checks.json` → 매니저 화면

```
요구사항 체크 · 매니저 확인 필요

 ✓  좋아요 버튼    LikeButton.tsx:8-24 · api/like.ts:12     높음
 ✓  댓글 작성      CommentForm.tsx:15-40                    높음
 ?  정렬 기능      BookList.tsx:55  (sortBy 변수만)          낮음  ← 확인
 ✗  검색           —
```

### 실패 모드 — 자동 확정을 안 하는 이유

| | 예 |
|---|---|
| **False Negative** | `bookmarkToggle`이 실제로 좋아요인데 못 잡음 |
| **False Positive** | `handleLike`가 껍데기만 있는데 P로 판정 ← **더 위험** |

**두 번째 때문에 자동 확정하지 않는다.** 근거 위치와 신뢰도를 붙여 매니저가 확인하는 구조가 맞고, 기존 원칙(확정은 사람이)과도 일치한다.

### 이해도 점수와 섞지 않는다

**"좋아요 버튼을 구현했는가"는 산출물 검사이지 이해도 측정이 아니다.**

- 구현했다 → 이해했다? **아니다.** AI가 짜줬을 수 있다
- 구현 안 했다 → 이해 못 했다? **아니다.** 시간이 없었을 수 있다

**별도 트랙으로 둔다.** 쓸모는 셋이다.

| 쓰임 | |
|---|---|
| **진도 파악** | 매니저가 "이 팀이 어디까지 왔나"를 안다 — 매니징 도구니까 이것만으로도 가치 있음 |
| **질문 소재 필터** | **P인 것만 물어야 한다.** 구현 안 한 걸 물으면 답할 게 없다 → 로직 3의 span 후보에 가중 +1 |
| **4단 질문 재료** | **미구현이 오히려 좋은 4단 질문이다** — "검색은 왜 안 하셨나요?" 우선순위 판단을 묻는 것 |

### UI 요구사항 하나

지금 요구사항이 자유 텍스트 한 칸이다. **P/F를 하려면 항목이 쪼개져 있어야 한다.**

```
❌  "좋아요 버튼, 댓글, 검색 기능을 구현하세요"    ← 항목 분리 불가

✅  요구사항 (한 줄에 하나)
    ├ 좋아요 버튼
    ├ 댓글 작성
    └ 검색
```

**줄바꿈 분리만으로 충분하다.** 별도 UI를 만들 필요는 없다.

---

## 10. 로직 5 · 블록 확장 (라인 범위)

```python
def expand_to_block(file, line):
    if file.ext == ".py":
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, (FunctionDef, ClassDef)) \
               and node.lineno <= line <= node.end_lineno:
                return innermost(node)
    else:
        return brace_or_indent_fallback(file, line)
```

### 폴백 (Python 외)

```
1  line에서 위로 스캔 → def|function|class|=>|: 발견
2  거기서 아래로 스캔 → 중괄호 균형 0 복귀 또는 들여쓰기 원위치
3  못 찾으면 line ± BLOCK_FALLBACK_LINES
```

### 상한

```python
if block.length > BLOCK_MAX_LINES:
    return (line - 30, line + 30)      # 거대 함수 방어
```

**매칭 라인 하나만 주면 안 된다.** 한 줄만 인용하면 학생이 문맥을 찾아야 하고, 파일 전체를 주면 어디를 보라는 건지 모른다.

---

## 11. 임계값 — 전부 이름 붙인 상수로

기존 `score_findings.py`가 이미 그 관례(`DIFFUSION_FAN_IN_THRESHOLD` 등)를 쓰고 있어 파라미터 편집 UI가 그대로 붙는다.

| 상수 | 값 | 근거 |
|---|---|---|
| `IDENT_MIN_LEN` | 4 | 3자 이하는 노이즈 |
| `SIBLING_PAGE_GAP` | 5 | 슬라이드 교안 기준 |
| `SIBLING_MIN_CHILDREN` | 2 | 1개면 형제가 성립 안 함 |
| `REQ_CAND_FILES` | 3 | LLM 입력 크기 |
| `BLOCK_MAX_LINES` | 200 | 초과 시 ±30 |
| `BLOCK_FALLBACK_LINES` | 15 | |
| `MAX_SPANS` | **3** | 문제 3개 |
| `W_SIBLING` | **3** | 가장 강한 결정 여지 신호 |
| `W_WARNS` | **3** | 2단 질문이 공짜로 나옴 |
| `W_GAP` | **2** | 명시적 이탈 |
| `W_MAGIC` · `W_BRANCH` | 1 | 보조 |

**가중치는 가정값이다.** 운영 데이터로 조정한다.

---

## 12. 폴백

| 조건 | 처리 |
|---|---|
| span 3개 이상 · 점수 있음 | 상위 3 |
| span 1~2개 | 그것 + **코드 자체 신호만으로 점수 매긴 span** 보충 |
| span 0개 | **기존 스캐너 전량** + 매니저에게 *"배운 개념이 코드에 없음"* 표시 |
| span 있으나 **전부 0점** | 상위 3 + 매니저에게 *"판단 지점이 없는 코드"* 표시 |
| 교안 미연결 (= 빅프) | **기존 스캐너 경로** |

**네 번째가 의미 있다.** `st.title`·`st.button`만 잔뜩 있고 판단 지점이 없으면 "예제를 그대로 옮긴 코드"다. 매니저에게 알려줄 가치가 있다.

---

## 13. 기존 자산 처분

| 자산 | 처분 | 이유 |
|---|---|---|
| `tier_a_structural_scan` (import 그래프) | **재활용** | tie-breaker · 문맥 제공 · **고립 파일 제외** |
| `find_hub` / fan_in 중요도 | **선별 기준에서 폐기** | 결정 밀도와 음의 상관 (1-1) |
| fan_in | **tie-breaker로만** | 같은 개념의 여러 구현 중 하나 고르기 |
| `find_architecture_diffusion_point` | **아이디어만 재활용** | "흩어짐 = 전체 이해 요구"는 미프 취지와 맞음. 단 fan_in 기준은 폐기 |
| `find_duplicate_definitions` | **폐기** | 중복은 실수다. 물어야 "실수했네요"로 끝 |
| `idiom_filter.py` | **폐기** | allowlist로 바뀌어 관례를 걸러낼 이유가 사라짐 (1-3) |
| `tier_b_risk_triggered_scan` (보안) | 이해도 경로에서 제외 | 다른 목적 |

---

## 14. LLM 호출 총계

| | 시점 | 횟수 |
|---|---|---|
| 로직 1 사전 | 교안당 1회 · 저장 | **0** |
| 로직 2 형제 | 교안당 1회 · 저장 | **0** |
| 로직 3 선별 | 제출마다 | **0** |
| 로직 5 블록 | 제출마다 | **0** |
| 로직 4 P/F | 제출마다 · **요구사항 있을 때만** | 2 |

**핵심 경로가 LLM 0회다.** 기존 P02도 0회이므로 순증이 없고, 요구사항 P/F만 선택적으로 2회 붙는다.

---

## 15. 선행 조건과 착수 순서

### 선행 조건 두 개 — 없으면 점수의 6점 중 6점이 영구 0

| | 없으면 |
|---|---|
| **`warns` 분류** (현재 0건) | `W_WARNS` 3점이 영구 0. **2단 질문을 LLM이 계속 지어냄** |
| **비교 항목 → 형제 엣지** | `W_SIBLING` 3점이 영구 0. **4단 질문 재료 없음** |

### 순서

| 순위 | 작업 | 효과 | 난이도 |
|---|---|---|---|
| **1** | **②단계 `caution` 판정 강화** ("~가 필요한 이유" = 없으면 생기는 문제) | 2단 재료 확보 | 프롬프트 |
| **2** | **로직 2 R-a** 비교 항목 → 형제 엣지 | 4단 재료 확보 | 낮음 (정규식) |
| **3** | **로직 1** `shows_code`·`concept`에서 식별자 추출 | 코드 매칭 사전 | 낮음 (정규식 3개) |
| **4** | **로직 3** grep + 블록 확장 + 점수 | 선별 교체 | 중간 |
| 5 | 로직 5 AST 블록 (Python 우선, 나머지 폴백) | 라인 범위 정확도 | 중간 |
| 6 | R1·R2·R4·R5·R6 정제 | 노이즈 감소 · 섹션 UI 정상화 | 낮음 |
| 7 | 로직 4 요구사항 P/F | 진도 파악 · 4단 보조 | 중간 (LLM 2회) |
| 8 | `idiom_filter` · `duplicate-definition` 제거 | 코드 감소 | 낮음 |

**1·2·3이 가장 싸고 효과가 크다.** 전부 프롬프트 한 곳과 정규식 몇 개다.

> 이 교안은 **refine-OFF** 상태인데도 품질이 이 정도다. **1번 프롬프트 수정 후 refine-ON으로 한 번 돌려서 비교**하면 R2(섹션 겹침)와 `warns` 분류가 더 나아지는지 확인할 수 있다.
