# 백엔드 API — 23차 요청 · 20차 반영 확인 + 남은 4건

> **20차를 전수 검증했습니다.** 스펙을 다시 받고(`오퍼레이션 119 · 스키마 264`)
> 실계정으로 응답까지 대조했습니다. **R1·R2·R5·R9는 확인했고 R7은 회신대로입니다.**
>
> `level`이 `0`에서 **3·2·2**로 바뀐 것을 실제로 봤습니다 — 뷰 컬럼을 추적해
> 원인을 찾아 주신 것이 그대로 값에 나타납니다.
>
> 기다리신 답 둘(**축 순서**·**회차 마감 밀기**)을 §1에 먼저 적었습니다.
> 요청은 **`api:check` error 1건**을 포함해 넷입니다.

---

## 0. 한눈에

### 저희 회신

| | 무엇 | 답 |
|---|---|---|
| **A1** | 3단·4단 축 순서 (20차 §2) | **뒤집으신 것이 맞습니다** — 3단 대안 비교 · 4단 반례 대응 |
| **A2** | 회차 마감을 30일 뒤로 밀어도 되나 (20차 §8) | **밀어 주세요.** `trainee01` 화면이 바뀌어도 괜찮습니다 |

### 요청

| | 무엇 | 우선순위 |
|---|---|---|
| **R1** | `SubmissionContent`에 `required`가 없습니다 — **`api:check` error 1건 · CI가 빨개집니다** | 🔴 **이것만 막고 있습니다** |
| **R2** | `isRetryTarget`이 아직 규칙과 어긋납니다 — `level: 2`인데 `true`입니다 | 🔴 확인 |
| **R3** | `content`의 `fileName`·`fileSize`가 **스키마에만 있고 실응답에는 없습니다** | 🟡 확인 |
| **R4** | `AI_SERVER_UNAVAILABLE`이 설명문에만 있고 **응답 정의에는 없습니다** | 🟡 중간 |
| **R5** | R6(뷰) DB 적용 · R7(세션 API) — 대기 중임을 확인만 합니다 | 🟢 대기 |

---

## 1. 저희 회신 — 기다리신 것 둘

### A1. 축 순서 — 뒤집으신 것이 맞습니다

```
1단 코드 이해 → 2단 설계 논리 → 3단 대안 비교 → 4단 반례 대응
```

**확정 모델(2026-08-11)이 정본이고, 그것에 맞추신 것이 맞습니다.** AI 채점 쪽도
같은 순서로 확인했습니다. 3단을 *"대안까지 비교했지만 어떤 상황에서 이 방식이
깨지는지는 답하지 못했습니다"* 로 바꾸신 것이 정확합니다.

> 저희 저장소에도 AI 채점 계약 문서가 없어 축 의미를 코드로 대조할 수단이 없다는
> 점은 같습니다. **이 순서가 바뀌면 양쪽에 동시에 알리는 경로가 필요합니다** —
> 지금은 서로의 문서를 보고 맞추는 구조라 한쪽만 바뀌면 조용히 어긋납니다.

### A2. 회차 마감 밀기 — 밀어 주세요

**`trainee01`의 홈 카드 상태가 달라져도 괜찮습니다.** 지금 그 계정이
`ASSESSMENT_WINDOW_CLOSED`라 **제출 폼을 그리는 경로에 아무도 들어갈 수 없습니다.**
멱등키와 50MB 상한을 한 번도 실제로 태워 보지 못한 상태라, 경로를 여는 쪽이 낫습니다.

`trainee-draft`·`trainee-failed` 두 계정과 함께 **회차 마감을 30일 뒤로 밀어 주세요.**

> 계정 정보를 받으면 저희 `.env.local`에 넣어 역할 전환 버튼에 추가합니다.
> 저장소에는 올라가지 않습니다.

---

## 2. 🔴 R1 — `SubmissionContent`에 `required`가 없습니다

R4를 반영해 주시면서 `fileName`·`fileSize`가 들어왔는데, **다섯 필드가 전부
optional**이 됐습니다.

```ts
// 지금 생성되는 타입
SubmissionContent: {
  repoUrl?: string
  branch?: string
  fileName?: string
  fileSize?: number
  lastCommit?: SubmissionCommitResponse
}
```

`api:check`가 error로 잡습니다.

```
❌ [required] 객체 스키마에 required가 없다 — 1건
     · SubmissionContent
error 1건 · warn 5건
```

### 왜 이것만 급한가

**저희 CI가 `api:check` 종료코드로 통과를 판정합니다.** 스펙을 커밋해야 생성 코드도
커밋할 수 있는데(드리프트 검사), 지금 커밋하면 `develop`이 빨개집니다.
19차 R1(`nullable` 2줄)과 같은 자리에서 막혔습니다.

### 내용으로도 문제가 있습니다

*"GitHub이면 `repoUrl`, ZIP이면 `fileName`"* 이라는 **배타 관계가 타입에 안 보입니다.**
그래서 화면이 이렇게 씁니다.

```ts
// 지금 — "둘 다 없을 수도 있다"고 타입이 말한다
content.fileName ?? content.repoUrl ?? '알 수 없음'
```

**서버가 실수로 둘 다 안 보내도 컴파일이 통과합니다.** 그리고 실제로 지금 그렇게
오고 있습니다(§4).

### 요청 — `oneOf`로 두 갈래를 나눠 주세요

```
SubmissionContent = GithubSubmissionContent | ZipSubmissionContent

GithubSubmissionContent  required: [repoUrl, branch]
ZipSubmissionContent     required: [fileName, fileSize]
lastCommit               둘 다 optional (분석 후에 붙으므로)
```

그러면 저희 쪽은 이렇게 갈립니다.

```ts
'repoUrl' in content
  ? <저장소 행 />
  : <파일 행 />          // 컴파일러가 두 갈래를 강제한다
```

**한쪽을 빠뜨리면 서버 쪽에서도 스키마 검증에 걸립니다.**

> `oneOf`가 부담스러우시면 **`required`만이라도 채워 주세요** — 그것만으로 CI는
> 풀립니다. 다만 그때는 배타 관계를 화면 주석으로만 지키게 됩니다.

---

## 3. 🔴 R2 — `isRetryTarget`이 아직 규칙과 어긋납니다

**`level`은 고쳐졌습니다.** 같은 리포트를 다시 받아 확인했습니다.

| 개념 | 20차 때 | 지금 |
|---|---|---|
| 예외 처리와 롤백 전략 | `level: 0` | **`level: 3`** ✅ |
| API 응답 계약 설계 | `level: 0` | **`level: 2`** ✅ |
| 영속성 매핑과 지연 로딩 | `level: 0` | **`level: 2`** ✅ |

그런데 `isRetryTarget`이 이렇게 옵니다.

```
level: 3  →  isRetryTarget: false     ✅
level: 2  →  isRetryTarget: true      ❌
level: 2  →  isRetryTarget: true      ❌
```

### 규칙과 반대입니다

회신 §3에 적어 주신 산출 규칙입니다.

```
AI가 준 retest 가 있으면 그 값
없으면            reachedLevel < 2
```

**`level: 2`는 `2 < 2`가 거짓**이라 `false`여야 합니다. 확정 모델의
*"불합격(2단 미만) 개념만 재시험"* 과도 같습니다 — **2단은 합격선입니다.**

`AI가 준 retest`가 `true`여서 그 값이 이긴 것이라면, **AI 판정이 확정 정책과
어긋난다**는 뜻이 됩니다.

### 요청

**둘 중 어느 쪽인지** 알려 주세요.

- `reachedLevel < 2`로 계산됐는데 `true`가 나온다 → 계산 쪽 문제입니다
- **AI가 준 `retest`가 `true`라서 그 값이 이겼다** → AI 판정이 "2단 미만" 규칙을
  안 따르고 있습니다. 그러면 **AI 값을 그대로 쓰지 말고 정책으로 덮어야** 합니다

화면에는 그대로 두면 **2단을 통과한 개념이 재시험 목록에 들어갑니다.** 학생은
합격한 개념을 다시 보게 되고, 재시험은 1회뿐이라 **정작 봐야 할 개념을 볼 기회를
잃습니다.**

### 곁들여 — 발행된 리포트의 `said`가 옛 문구로 얼어 있습니다

`level: 3`인 개념의 문장이 아직 이렇습니다.

```
"실패 조건까지 짚었지만, 같은 요구사항을 다른 방법으로 구현하는 대안은 제시하지 못했습니다."
```

축 순서를 바로잡으신 뒤라면 *"대안까지 비교했지만 어떤 상황에서 이 방식이
깨지는지는 답하지 못했습니다"* 가 나와야 합니다. **`report_evidence`가 발행 시점에
얼어붙는 스냅샷이라 옛 리포트는 그대로 남는 것**으로 이해하고 있는데, 맞나요?

맞다면 **이미 발행된 리포트에서는 `level`과 `said`가 계속 어긋난 채로 남습니다.**
새로 발행되는 것부터 맞으면 저희는 그것으로 충분합니다 — **확인만 부탁드립니다.**

---

## 4. 🟡 R3 — `fileName`·`fileSize`가 실응답에 없습니다

스키마에는 정확히 들어왔습니다.

```
SubmissionContent 필드: repoUrl, branch, fileName, fileSize, lastCommit  ✅
```

그런데 `trainee01`의 ZIP 제출을 조회하면 **`content` 키 자체가 없습니다.**

```json
{
  "status": "LOCKED",
  "method": "ZIP_WITH_GITLOG",
  "submittedAt": "2026-07-30T16:59:00Z",
  "analyzedAt": "2026-07-31T15:15:00Z"
}
```

분석이 끝난(`analyzedAt`이 있는) 제출이라 회신 §4의 *"분석 성공 후에 붙는다"* 는
조건은 충족합니다.

### 요청

**기존 데이터라서 그런 것인지** 확인 부탁드립니다. 20차 이전에 만들어진 제출이라
아티팩트 행이 없어 못 채우는 것이라면 **그대로 두셔도 됩니다** — R8 계정으로
새로 제출해 보면 확인됩니다.

새 제출에서도 안 채워지는 것이라면 그때는 붙일 곳이 없어집니다.

---

## 5. 🟡 R4 — `AI_SERVER_UNAVAILABLE`이 응답 정의에 없습니다

회신 §1에 **두 오퍼레이션 에러 표에 넣으셨다**고 적어 주셨는데, 배포된 스펙에서는
**설명문(`description`)에만 있습니다.**

```
paths./api/v0/submissions.post.description          ← 여기에만
paths./api/v0/submissions/zip.post.description      ← 여기에만

/submissions     post.responses 키: ["200"]
/submissions/zip post.responses 키: ["200"]
```

### 왜 이게 문제인가

저희 생성기는 **`responses`의 에러 예시에서 코드를 뽑아** 화면이 쓸 상수를
만듭니다. 설명문은 사람이 읽는 자리라 코드가 나오지 않습니다.

그래서 지금은 **503을 받아도 `AI_SERVER_UNAVAILABLE`로 갈라낼 근거가 없습니다.**
회신에 *"재시도하면 되는 오류이고 첫 호출은 80초까지 걸린다"* 고 적어 주셨는데,
바로 그 안내(*"AI 서버를 깨우는 중이에요 — 최대 2분 걸릴 수 있어요"*)를 띄우려면
이 코드가 필요합니다. 지금 구조로는 **다른 503과 구분되지 않아** 일반 실패 문구가
나갑니다.

### 요청

두 오퍼레이션의 `responses`에 **503 응답을 예시와 함께** 넣어 주세요. 다른
오퍼레이션들이 이미 그렇게 돼 있어서 같은 방식이면 됩니다.

```json
"503": {
  "content": { "application/json": {
    "examples": { "aiServerUnavailable": { "value": { "code": "AI_SERVER_UNAVAILABLE" } } }
  } }
}
```

> 타임아웃 상한(150초)도 알려 주셨는데, **저희 클라이언트 타임아웃이 그보다
> 짧으면 화면이 먼저 포기합니다.** 제출 요청만 상한을 늘려 두겠습니다.

---

## 6. 🟢 R5 — 대기 중인 것 확인

### R6(뷰) — 아직 적용 전입니다

실계정으로 지금도 같은 조합이 나옵니다.

```
representativeStatus:  ASSESSMENT_WINDOW_CLOSED
defaultActionCode:     RESUME_ASSESSMENT      ← NONE이 아직 아닙니다
```

**DB 작업이라 배포와 별개**라고 하셨으니 예상대로입니다. 적용하시면 알려 주세요 —
화면은 `representativeStatus`를 우선하도록 돼 있어 지금도 틀리게 보이지는 않습니다.

### R7(세션 API) — 8개 그대로

스펙에서 확인했습니다. `POST /submissions`만 빠져 8개가 `unavailable`입니다.
**TR-03은 목으로 둡니다.** 일정이 잡히면 알려 주세요.

---

## 7. 20차 반영 확인 ✅

스펙을 다시 받아(`sha256 86d71821…`) 전수 대조했습니다.

| 20차 요청 | 결과 |
|---|---|
| **R1** GitHub 제출 | ✅ `POST /submissions` `available`. 생성기가 `useSubmitGithubUrl`을 만들었습니다 |
| **R2** `level` | ✅ `["integer","null"]` · `minimum 0` · `maximum 4`. 실값도 `0` → **3·2·2** |
| **R3** `isRetryTarget` | 🔶 원천은 같아졌는데 값이 규칙과 어긋납니다 (§3) |
| **R4** ZIP `content` | 🔶 스키마 ✅ · 실응답 ❌ (§4) |
| **R5** `reviewStatus` | ✅ `MeasurementAttemptStatus` 8종 `$ref`. `null` 포함 정확합니다 |
| **R9** enum 인라인 | ✅ **0건** |
| **Q1** 생성 실패 vs `asked:false` | ✅ 배열에서 아예 빠진다 — `missingConceptCount`로 판정하겠습니다 |

**특히 좋았던 것 하나를 남깁니다.** `level`을 뷰 컬럼에서 떼어 내면서
**`report_evidence.trace_payload.reachedLevel`을 원천으로 삼고, 그 키가 없는 옛
스냅샷은 `problem_stage`에서 다시 세도록** 이중으로 가신 것입니다. 마이그레이션
없이 옛 데이터까지 살아나서, 저희가 지금 가진 리포트 4건이 전부 제대로 나옵니다.
Testcontainers로 케이스를 고정하신 것도 뷰 컬럼이 되살아나는 것을 막아 줍니다.

---

## 8. 저희 쪽 상태

```
TR-01 홈       ✅ 실서버 연동 완료
TR-02 제출     ✅ 실서버 연동 완료 — R1이 풀리면 GitHub 제출 폼을 붙입니다
TR-04 리포트   ⏳ level이 고쳐져 붙일 수 있습니다 — R2(재시험 판정)만 확인하면 시작합니다
TR-03 세션     ⏳ API 사용 불가 — 목 유지
```

**R1(`required`)만 CI를 막고 있습니다.** 나머지는 붙이면서 병행할 수 있습니다.
