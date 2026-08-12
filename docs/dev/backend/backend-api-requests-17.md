# 백엔드 API — 17차 요청 · 교육생 도메인 반영본 검수

> 1차: [1](backend-api-requests.md) · 2차: [2](backend-api-requests-2.md) · 3차: [3](backend-api-requests-3.md) · 4차: [4](backend-api-requests-4.md) · 5차: [5](backend-api-requests-5.md) · 6차: [6](backend-api-requests-6.md) · 7차: [7](backend-api-requests-7.md) · 8차: [8](backend-api-requests-8.md) · 9차: [9](backend-api-requests-9.md) · 10차: [10](backend-api-requests-10.md) · 11차: [11](backend-api-requests-11.md) · 12차: [12](backend-api-requests-12.md) · 13차: [13](backend-api-requests-13.md) · 16차: [16](backend-api-requests-16.md)
>
> **16차 반영본을 받아 검수했습니다 — 오퍼레이션 96 → 118, 스키마 201 → 255.**
> 교육생 4화면이 필요로 하던 것이 거의 다 왔습니다. **§6에 반영 확인 내역**을 적었습니다.
>
> 다만 **`npm run api:check`가 error 37건**을 냅니다. 이 상태로는 코드 생성이 막혀서
> 새 API를 화면에 붙일 수가 없습니다. **R1~R3이 그것이고, 전부 같은 성격입니다 —
> 설명문에는 정확히 적혀 있는데 스키마가 그 사실을 담고 있지 않습니다.**

---

## 0. 한눈에

| | 무엇 | 우선순위 |
|---|---|---|
| **R1** | **설명문은 `enum`이라는데 스키마엔 제약이 없습니다** — 홈 응답만 35필드 | 🔴 **최우선** |
| **R2** | `required` 누락 **9개 스키마** — 교육생 화면이 쓰는 것들입니다 | 🔴 높음 |
| **R3** | `nullable` 불일치 **28건** — 설명은 `null?`인데 타입이 아닙니다 | 🔴 높음 |
| **Q1** | `DisclosureScope`에 **`PRIVATE`**이 있습니다 — 저희가 모르던 값 | 🟡 확인 |
| **Q2** | `ReportCompletionStatus`(`FULL`·`PARTIAL`)가 무엇인가요 | 🟡 확인 |
| **Q3** | 답변 제출 응답에 **점수가 없습니다** — 의도인지 | 🟡 확인 |
| **Q4** | **0단 서술의 톤** — 원인이 넷이라 능력을 단정하면 안 됩니다 | 🟡 확인 |
| **Q5** | 세션 API 7개가 전부 `⚠️ 사용 불가`입니다 — 예정 시점 | 🟡 확인 |

> **R1~R3은 새 기능 요청이 아닙니다.** 이미 만들어 주신 것을 저희가 **쓸 수 있게**
> 하는 스키마 표기 문제입니다.

---

## 1. 🔴 R1 — 설명문은 `enum`이라는데 스키마엔 제약이 없습니다

### 관측

`GET /assessment-rounds`(교육생 홈)의 설명문은 값 집합을 **표로 완전히 정의**해 두셨습니다.

```
representativeStatus 값 집합
  REVIEW_REQUIRED · ASSESSMENT_COMPLETED · ASSESSMENT_WINDOW_CLOSED ·
  ASSESSMENT_IN_PROGRESS · ASSESSMENT_AVAILABLE · ANALYSIS_FAILED ·
  SUBMISSION_MISSED · SUBMISSION_REQUIRED · ANALYZING · NO_ACTIVE_ROUND

defaultActionCode 값 집합
  VIEW_REPORT · WAIT_FOR_REPORT · START_REVIEW · RESUME_ASSESSMENT ·
  START_ASSESSMENT · RESUBMIT_REPOSITORY · RESUBMIT_ZIP · CONTACT_MANAGER ·
  SUBMIT_CODE · WAIT_FOR_ANALYSIS · NONE
```

필드 표에도 `enum` · `enum?`이라고 적혀 있습니다. **그런데 스키마에는 그 제약이 없습니다.**

```jsonc
// components.schemas.CurrentRoundResponse.properties
"representativeStatus": { "type": "string" },   // ← enum 없음
"defaultActionCode":    { "type": "string" },   // ← enum 없음
"analysisPhase":        { "type": "string" },   // ← enum 없음
```

**`CurrentRoundResponse`의 string 필드 35개 중 `enum`이 붙은 것이 0개**입니다.

### 화면에서 무슨 일이 생기나

생성되는 타입이 전부 `string`이 됩니다.

```ts
// 지금 생성되는 것
representativeStatus: string
defaultActionCode: string

// 그래서 화면이 이렇게 됩니다
switch (round.representativeStatus) {
  case 'SUBMISSION_REQUIRED': …   // ← 오타가 나도 컴파일이 통과합니다
  case 'ANALYZNIG': …             // ← 이것도 통과합니다
}
```

**교육생 홈은 이 두 값으로 카드 전체가 갈리는 화면입니다.** 배지·안내문·버튼이
`representativeStatus` 10종 × `defaultActionCode` 11종의 조합으로 정해지는데, 지금은
그 목록을 **저희가 설명문에서 손으로 옮겨 적어야** 합니다. 옮겨 적는 순간 그 목록은
사본이 되고, 백엔드가 값을 하나 더하면 **화면은 그것을 영원히 모릅니다** — `default`로
조용히 떨어집니다.

`enum`이 스키마에 있으면 정반대가 됩니다. 값이 추가될 때 **저희 빌드가 깨져서** 알려
줍니다(union이 exhaustive해집니다).

### 요청

**설명문 표에 있는 값 집합을 스키마 `enum`으로 그대로 박아 주세요.**

```jsonc
"representativeStatus": {
  "type": "string",
  "enum": ["REVIEW_REQUIRED", "ASSESSMENT_COMPLETED", "ASSESSMENT_WINDOW_CLOSED",
           "ASSESSMENT_IN_PROGRESS", "ASSESSMENT_AVAILABLE", "ANALYSIS_FAILED",
           "SUBMISSION_MISSED", "SUBMISSION_REQUIRED", "ANALYZING", "NO_ACTIVE_ROUND"]
}
```

**이미 그렇게 해 주신 곳이 있습니다** — `MySubmissionResponse.status`,
`AnswerSubmitResponse.outcome`, `DisclosureScope`, `TraineeReleaseStatus`는 `enum`이
정상으로 들어가 있습니다. 같은 방식이면 됩니다.

**대상**(설명문에 값 집합이 있는데 스키마에 `enum`이 없는 것):

| 스키마 | 필드 |
|---|---|
| `CurrentRoundResponse` | `roundStatus` · `projectCategory` · `representativeStatus` · `defaultActionCode` · `actionUnavailableReasonCode` · `warningCodes[]` · `commitEmailStatus` · `availableSubmissionMethods[]` · `submissionMethod` · `submissionStatus` · `analysisPhase` · `analysisJobStatus` · `initialAttemptStatus` · `initialSessionStatus` · `reviewStatus` · `reportPublishStatus` · `traineeReleaseStatus` · `explanationStatus` · `reportPublishMode` |
| `UpcomingRoundResponse` | `roundStatus` |
| `PastRoundResponse` | `reviewStatus` 외 |
| `Problem` | `generationStatus` · `problemType` · `notGeneratedReason` |
| `MySubmissionResponse` | `method` · `failureCode` |

> `analysisFailureCode`(15종)처럼 값이 많고 화면이 분기하지 않는 것은 `string`으로 두셔도
> 됩니다. **화면이 분기에 쓰는 값만** 필요합니다 — 위 표가 그 목록입니다.

---

## 2. 🔴 R2 — `required` 누락 9개 스키마

```
ReportDisclosureResponse · ConceptReportResponse · RoundReportResponse ·
MySubmissionResponse · SubmissionContent · Cell · ManagerHeatmapResponse · Row · Scope
```

`required`가 비어 있으면 **전 필드가 optional**이 되어 화면이 `?`·`!`를 남발하게 됩니다.

특히 심한 곳이 리포트입니다.

```ts
// RoundReportResponse — required: [] 라서
report.status?.toUpperCase()      // status가 없을 수 있다고 컴파일러가 우깁니다
report.concepts?.map(…)           // 개념 배열도 optional입니다
concept.name ?? '(이름 없음)'      // 개념에 이름이 없는 경우를 그려야 하나요?
```

**실제로는 항상 오는 값일 텐데** 화면이 "없을 때"를 매번 상상해서 처리하게 됩니다.
그 처리는 죽은 코드이고, 진짜로 값이 빠졌을 때는 오히려 조용히 넘어갑니다.

### 요청

**항상 오는 필드를 `required`에 넣어 주세요.** `CurrentRoundResponse`는 44필드 전부를
`required`로 선언해 주셨는데(`null`은 허용하되 키는 항상 존재), 그 방식이 정확합니다 —
같은 기준을 위 9개에도 적용해 주시면 됩니다.

---

## 3. 🔴 R3 — `nullable` 불일치 28건

설명문에는 `UUID?` · `datetime?` · *"미제출이면 `null`"* 이라고 적혀 있는데 스키마 타입이
`null`을 허용하지 않습니다.

```jsonc
// 설명문:  submissionMethod | enum? | 실제 제출 수단. 미제출이면 null
// 스키마:
"submissionMethod": { "type": "string" }     // ← null이 못 옵니다
```

**이건 optional보다 나쁩니다.** 컴파일러가 null 검사를 요구하지 않는데 런타임에는 `null`이
옵니다 — 화면이 `.toUpperCase()`를 부르는 순간 터집니다. 8차 R1에서 같은 문제를 고쳐
주셨던 항목입니다.

**주요 대상**(전량은 `npm run api:check --verbose`로 나옵니다):

```
CurrentRoundResponse.assessmentRoundId · teamId · commitEmailStatus ·
  roundAssessmentOpenAt · roundAssessmentDueAt · assessmentOpenAt · assessmentCloseAt
MembershipResponse.cohortId · classId
AnswerSubmitResponse.nextProblemNo · next · hint
SessionResponse.currentProblemNo · Turn.hintText · Problem.codeSnippet
SubmissionResponse.supersedesSubmissionId · repositoryVerificationId · artifactId
SubmissionAnalysisResponse.analysisJobId · executionNo · codeAnalysisId
CommitEmailResponse.commitEmail · verificationMethod
UpcomingRoundResponse.roundAssessmentOpenAt · roundAssessmentDueAt
PastRoundResponse.reviewStatus
```

### 요청

`"type": ["string", "null"]`(OpenAPI 3.1) 또는 `"nullable": true`로 표기해 주세요.
**설명문에 `?`가 붙은 것이 기준**입니다 — 표기만 맞으면 됩니다.

---

## 4. 🟡 확인 5건

### Q1 — `DisclosureScope`에 `PRIVATE`이 있습니다

```jsonc
"DisclosureScope": { "enum": ["SUMMARY", "PRIVATE", "FULL"] }
```

16차에서는 `FULL`·`SUMMARY` 둘로 이해했는데 `PRIVATE`이 하나 더 있습니다.
그런데 **`TraineeReleaseStatus`에 이미 `WITHHELD`(비공개)가 있습니다.**

| 저희 이해 | |
|---|---|
| `releaseStatus = WITHHELD` | 매니저가 아직 안 열었다 → 학생은 못 본다 |
| `scope = PRIVATE` | ? |

**둘이 어떻게 다른가요?** 예를 들어 `releaseStatus=RELEASED`인데 `scope=PRIVATE`인
상태가 나올 수 있나요? 그렇다면 학생 화면에 무엇을 그려야 하는지 알려 주세요.

### Q2 — `ReportCompletionStatus`(`FULL` · `PARTIAL`)가 무엇인가요

`RoundReportResponse`에 `disclosureScope`와 **별개로** 이 필드가 있습니다.
이름이 `DisclosureScope`의 `FULL`과 겹쳐서 헷갈립니다.

*"리포트 자체가 완결됐나(중간에 끊긴 응시라 일부만 있나)"* 로 짐작하고 있는데 맞나요?
그렇다면 `PARTIAL`일 때 화면이 무엇을 더 말해 줘야 하는지도 알려 주세요.

### Q3 — 답변 제출 응답에 **점수가 없습니다**

16차 R3에서 `score`(0~5)를 요청드렸는데 `AnswerSubmitResponse`에 없습니다.

**빼신 것이 맞다고 봅니다** — 점수 비노출(A5)이 제품 원칙이고, 화면이 실제로 필요한 것은
`outcome`뿐입니다(`RETRY_WITH_HINT`면 힌트를 그리고 같은 질문에 머뭅니다). **의도적으로
빼신 것이면 그대로 두겠습니다.** 확인만 부탁드립니다.

> 리포트의 도달 단계(`level`)는 학생에게 보여주는 값이라 그건 그대로 씁니다.

### Q4 — 0단 서술(`narrative`)의 톤을 한 가지만 부탁드립니다

> 16차를 이미 보낸 뒤에 화면을 그리다 나온 것이라 여기 넣습니다.

리포트의 개념별 서술은 서버가 문장으로 주시는데, **0단일 때만 특별히 조심할 것이 있습니다.**

**0단은 원인이 하나가 아닙니다.** 1단(코드이해) 질문을 세 번 다 못 넘긴 것인데, 그 이유가
① 본인이 안 쓴 팀 코드가 걸렸거나 ② 알지만 말로 못 풀었거나 ③ 문제당 20분이 끝나 끊겼거나
④ 성의 없이 답했거나 — 넷 다 가능합니다. **팀 코드 전체로 묻기로 한 이상 ①이 실제로 자주
날 것입니다.**

그래서 **학생의 능력을 단정하는 문장은 피해 주세요.**

| | |
|---|---|
| ✗ | *"이 개념을 설명하지 못했습니다"* — ①③에는 사실이 아닙니다 |
| ✗ | *"이해도가 부족합니다"* — 판정이고, 점수 비노출(A5)과도 부딪힙니다 |
| ⭕ | *"이 코드가 무엇을 하는지부터 이야기가 닿지 않았어요. 어떤 요청을 받고 무엇을 돌려주는지 먼저 짚어 보면 좋겠습니다."* |

⭕ 쪽은 **무슨 일이 있었는지 + 다음에 무엇부터 보면 되는지**만 말합니다. 네 경우 어디에
써도 사실이고, 학생이 다음 행동을 알 수 있습니다.

> 화면의 배지도 같은 원칙으로 **"설명을 듣지 못했어요"** 로 정했습니다 — 시스템을 주어로
> 두면 시간초과·팀 코드 경우에도 사실이면서 아무도 탓하지 않습니다.
>
> **0단은 항상 재시험 대상이므로 `curriculumRef`(교안 위치)를 꼭 같이 주세요** —
> "어디부터 보면 되는지"가 없으면 다시 봐도 같은 자리에서 막힙니다.

### Q5 — 세션 API 7개가 전부 `⚠️ 사용 불가`입니다

```
POST /assessment-sessions/{id}/start · /answers · /hints · /activity
GET  /assessment-sessions/current · /problems/{problemNo}
PATCH /assessment-attempts/{id}/validity
```

계약이 다 나와 있어서 **응답 모양은 확인했습니다**(§6). `✅ 사용 가능`이 되는 시점만
알려 주시면 그때 붙이겠습니다. 그전까지 세션 화면은 목으로 둡니다.

---

## 5. 지금 저희가 막혀 있는 것

```
api:check  error 37건  →  api:gen 을 돌려도 타입이 실제와 어긋납니다
```

**R1~R3이 해결되면 그날 바로 붙일 수 있습니다.** 교육생 4화면이 전부 목으로 완성돼 있고,
바뀔 것은 `api.ts` 안쪽뿐입니다.

우선순위를 하나만 고르라면 **R1(enum)** 입니다 — R2·R3은 `?`가 늘어나는 불편이지만,
R1은 **화면이 백엔드의 값 목록을 손으로 베껴 적게** 만들어서 다음 변경 때 조용히 어긋납니다.

---

## 6. 16차 반영 확인 ✅

**대부분 그대로 반영해 주셨습니다.** 확인한 것을 남깁니다.

| 16차 요청 | 반영 |
|---|---|
| **R2 제출 현황 6종** | ✅ `MySubmissionResponse.status`가 `DRAFT`·`ANALYZING`·`READY`·`LOCKED`·`ANALYSIS_FAILED`·`SUBMISSION_CLOSED` **요청 그대로** |
| **R2 저장소 사전 확인** | ✅ `POST /submissions/repository-checks` 신설 |
| **R3 힌트 두 경로** | ✅ `POST /{id}/hints`(학생 요청) + 제출 응답의 `hint: AutoHint`(미달 지급) **둘 다** |
| **R3 힌트 잔여 수를 서버가** | ✅ `hintsUsed`·`hintsLeft` — 화면이 세지 않아도 됩니다 |
| **R3 `outcome`을 서버가 판정** | ✅ `RETRY_WITH_HINT`·`NEXT_TURN`·`NEXT_PROBLEM`·`PROBLEM_CLOSED`·`SESSION_ENDED` |
| **R4 리포트 `unavailable` 해제** | ✅ `findMyReports`·`findMyReport`·`findMyDisclosure`·`updateDisclosure` 넷 다 `✅ 사용 가능` |
| **R4 `release_status` 3종** | ✅ `TraineeReleaseStatus` = `NOT_CONFIGURED`·`WITHHELD`·`RELEASED` **요청 그대로** |
| **R4 개념별 공개 범위** | ✅ `DisclosureScope` + `VisibleFields{said, curriculumRef, qa}` — 필드 단위로 주시니 화면이 더 정확해집니다 |
| **R4 문항 없음 구분** | ✅ `ConceptReportResponse.asked` |
| **R4 리포트 목록 모양** | ✅ `TraineeReportsResponse { rounds, reportsById }` — 화면 구조와 그대로 맞습니다 |
| **Q1 팀 정보** | ✅ `current.teamId`·`teamNumber`·`teamName`. **회차 스코프에 두신 이유**(팀이 회차마다 바뀐다)까지 설명문에 적어 주셔서 화면 구조를 그에 맞췄습니다 |
| **커밋 이메일** | ✅ `GET`·`PUT /members/me/commit-email` |

### 홈 응답 구조에 대해

저희는 **상태 8종 union**을 제안드렸는데 **44필드 플랫 + `representativeStatus`**로
오셨습니다. **그쪽이 낫다고 봅니다** — 저희 8종은 "분석 실패 + 마감 임박"처럼 두 사실이
겹치는 경우를 담지 못하는데, `warningCodes[]`가 배열이라 그게 표현됩니다.

**다만 그래서 R1이 더 중요해졌습니다.** 카드 하나가 `representativeStatus` ×
`defaultActionCode` × `warningCodes[]` 조합으로 정해지므로, 그 값들이 `string`이면
화면이 조합 전체를 추측으로 다루게 됩니다.
