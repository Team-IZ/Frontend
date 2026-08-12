# 백엔드 API — 19차 요청 · 17차 반영 확인 + 마지막 2건

> **17차를 전수 검증했습니다 — R1·R2·R3 거의 다 반영됐습니다.**
> `api:check` **error 37건 → 2건**. 상세는 §5에 있습니다.
>
> ## 🔴 R1 두 줄만 고쳐 주시면 그날 붙입니다
> 남은 error 2건이 **`@Schema(nullable = true)` 두 줄**입니다. 그것만 들어오면
> 스펙을 커밋하고 교육생 화면 연동을 시작할 수 있습니다 — **나머지 요청(R2·R3)은
> 붙이면서 병행할 수 있으니 급하지 않습니다.**

---

## 0. 한눈에

| | 무엇 | 우선순위 |
|---|---|---|
| **R1** | `nullable` 표기 **2건** — 17차 R3에서 두 필드만 빠졌습니다 | 🔴 **이것만 막고 있습니다** |
| **R2** | 같은 enum이 **2~4곳에 복사**됐습니다 — 공용 스키마가 있는데도 인라인 | 🟡 중간 |
| **R3** | 17차 보류분 2필드의 값 집합 — **저희가 답을 드립니다** | 🟡 회신 |
| **Q1** | 생성 실패(`PARTIAL`)와 문항 없음(`asked:false`)이 **화면에서 같아 보입니다** | 🟡 확인 |

---

## 1. 🔴 R1 — `nullable` 2건 (이것만 막고 있습니다)

17차 R3을 **문서화된 전 범위로 확장**해 주셔서 30필드가 정확해졌는데, 두 필드만 빠졌습니다.
회신서 3장 "수정된 파일"에 **두 파일 다 들어 있어서** 누락으로 보입니다.

```
SubmissionAnalysisResultResponse.resolvedBranch
ProblemActivityResponse.current
```

### 왜 이것만 급한가

**저희 교육생 화면은 이 두 필드를 안 씁니다.** `resolvedBranch`는 분석 결과 조회에,
`current`는 세션 API(아직 `사용 불가`)에 있습니다.

그런데도 최우선인 이유는 **저희 CI가 `api:check` 종료코드로 통과를 판정**하기 때문입니다.

```
CI "API spec" 단계:  npm run api:check   →  error 2건이면 종료코드 1  →  빌드 실패
```

스펙을 커밋해야 생성 코드도 커밋할 수 있는데(드리프트 검사), 지금 커밋하면 `develop`이
빨개집니다. **화면은 다 준비돼 있고 이 두 줄이 유일한 관문입니다.**

### 요청

다른 필드에 이미 적용하신 것과 같은 방식이면 됩니다.

```java
@Schema(nullable = true)
String resolvedBranch;      // SubmissionAnalysisResultResponse

@Schema(nullable = true)
… current;                  // ProblemActivityResponse
```

> 설명문에 두 필드 모두 `?`가 붙어 있어 17차 R3의 기준(*"설명문에 `?`가 붙은 것"*)에
> 그대로 해당합니다.

---

## 2. 🟡 R2 — 같은 enum이 여러 곳에 복사됐습니다

17차 R1을 반영하시면서 값 집합을 **필드마다 인라인**으로 넣어 주셔서, 같은 개념이
2~4곳에 복사됐습니다. `api:check`가 warn으로 잡습니다(7건).

| 값 집합 | 어디에 |
|---|---|
| `GITHUB_URL` · `ZIP_WITH_GITLOG` | `SubmissionResponse.method` · `MySubmissionResponse.method` · `CurrentRoundResponse.availableSubmissionMethods[]` **(3곳)** |
| `REVIEW_REQUIRED` … `NO_ACTIVE_ROUND` (10종) | `CurrentRoundResponse.representativeStatus` · `PastRoundResponse.representativeStatus` |
| `NOT_CONFIGURED` · `WITHHELD` · `RELEASED` | **`TraineeReleaseStatus` 공용 스키마가 이미 있는데** `CurrentRoundResponse.traineeReleaseStatus`에 인라인이 또 있습니다 |
| `PENDING` · `UNVERIFIED` · `VERIFIED` | 2곳 |
| `VALIDATING` · `ACCEPTED` · `FETCH_FAILED` · `INVALID` | 2곳 |
| `MINI_PROJECT` · `BIG_PROJECT` | 2곳 |
| `PLANNED` · `OPEN` · `CLOSED` · `COMPLETED` | 2곳 |

### 무엇이 문제인가

인라인 enum은 **필드마다 별개의 익명 타입**이 됩니다.

```ts
// 지금 생성되는 것 — 같은 개념인데 타입이 셋
SubmissionResponse.method:            'GITHUB_URL' | 'ZIP_WITH_GITLOG'
MySubmissionResponse.method:          'GITHUB_URL' | 'ZIP_WITH_GITLOG'
CurrentRoundResponse.availableSubmissionMethods: ('GITHUB_URL' | 'ZIP_WITH_GITLOG')[]

// 하고 싶은 것 — 하나의 타입
type SubmissionMethod = 'GITHUB_URL' | 'ZIP_WITH_GITLOG'
```

값이 하나 늘 때 **세 곳을 다 고쳐야 하는데, 한 곳만 고쳐도 빌드가 통과합니다.**
그러면 화면이 "여기서는 되는데 저기서는 안 되는" 상태가 되고, 그건 조용히 틀립니다.

`TraineeReleaseStatus`는 **이미 공용 스키마로 잘 빼 두신 것**이라 그 방식이 정답입니다 —
다만 `CurrentRoundResponse.traineeReleaseStatus`가 그것을 `$ref`로 참조하지 않고 값을
다시 적고 있습니다.

### 요청

**Java enum이 이미 있는 것들은 `@Schema(implementation = …)` 또는 enum 타입을 그대로
노출**해서 `$ref`로 참조되게 해 주세요. 회신서 1장에 `SubmissionMethod`·`SubmissionStatus`·
`AnalysisJobStatus`·`SubmissionAnalysisPhase`·`TraineeReleaseStatus` 같은 Java enum과
대조하셨다고 적혀 있으니, **그 enum들을 그대로 스키마에 내보내면** 됩니다.

> 급하지 않습니다. R1이 해결되면 저희는 연동을 시작할 수 있고, 이건 그동안 정리되면
> 됩니다. **다만 지금 안 잡으면 타입이 갈린 채로 굳습니다.**

---

## 3. 🟡 R3 — 17차 보류분 2필드 · 저희 회신

17차에서 값 집합이 닫혀 있지 않아 보류하신 두 필드입니다.
**보류하신 판단이 맞습니다** — 불완전한 union을 만들면 다음에 나오는 값을 컴파일 타임에
거부하게 되어, R1이 고치려던 문제를 반대 방향으로 재현합니다.

### `CurrentRoundResponse.initialSessionStatus`

설명문이 `READY · IN_PROGRESS · PAUSED · COMPLETED 등`으로 **"등"** 이 붙어 있습니다.

**저희 화면은 이 값으로 분기하지 않습니다.** 세션 진행 여부는 `representativeStatus`
(`ASSESSMENT_IN_PROGRESS`)와 `defaultActionCode`(`RESUME_ASSESSMENT`)로 이미 갈립니다.

→ **`string`으로 두셔도 됩니다.** "등"을 지우고 값 집합을 확정하실 계획이 있으면 그때
같이 넣어 주시고, 아니면 그대로 두시면 됩니다.

### `CurrentRoundResponse.reviewStatus` · `PastRoundResponse.reviewStatus`

값 집합이 문서화돼 있지 않습니다.

**이건 저희가 씁니다** — 지난 회차 목록에 `다시 보기 1개 완료` 같은 문구를 그립니다.
지금은 `completedReviewCount`(숫자)로만 그리고 있어서 당장 막히지는 않지만,
**"다시 보기를 아직 안 함 / 하는 중 / 마침"을 갈라야 할 때** 필요합니다.

→ **값 집합을 알려 주시면 enum으로 받겠습니다.** 저희가 기대하는 모양은
`NOT_ASSIGNED` · `PENDING` · `COMPLETED` 정도인데(재시험은 1회뿐이므로),
실제 코드의 값이 다르면 그쪽을 따르겠습니다.

---

## 4. 🟡 Q1 — `PARTIAL`(생성 실패)과 `asked: false`(문항 없음)를 화면이 구분할 수 있나요

17차 Q2에 **"같은 컬럼을 두 리포트가 쓰는데 뜻이 다르다"** 고 답해 주셨습니다.

| | `PARTIAL`의 뜻 |
|---|---|
| 교육생 리포트(TR-04) | 일부 문제의 **AI 생성 실패** — 시스템 장애 |
| 기수 리포트(OP-05) | 미응시·무효·중단으로 **정상 제외** — 정상 동작 |

*"두 화면이 같은 문구를 쓰면 한쪽이 정상 동작을 장애처럼 보여준다"* 는 지적 그대로
받아들여 **TR-04 전용 문구를 따로 쓰겠습니다.**

### ⚠️ 그런데 화면에서 두 상황이 똑같이 보입니다

교육생 리포트에서 **개념이 3개 미만으로 오는 경우가 두 가지**인데 뜻이 정반대입니다.

| | 무엇 | 학생에게 |
|---|---|---|
| `asked: false` | 제출한 코드에 그 개념이 없어 문항이 안 만들어짐 | **정상.** "못한 게 아니에요" |
| `PARTIAL` | AI 생성이 실패해 개념 카드가 빠짐 | **장애.** 학생 잘못이 아닌데 결과가 덜 나왔다 |

**생성이 실패한 개념도 `asked: false`로 오나요?**

그렇다면 화면이 장애를 *"이 개념은 묻지 않았어요 — 못한 것이 아니에요"* 라고 말하게 됩니다.
사실이 아닌 데다, **학생이 손해를 보는 상황에서 괜찮다고 안심시키는** 것이라 그대로 두기
어렵습니다.

**갈라 주실 수 있으면 갈라 주세요.** 예를 들어 배열에서 아예 빼시거나(그러면 `completionStatus`
로만 판정), `asked`와 별개인 표시를 하나 주시면 됩니다. 이미 갈라져 있다면 어떤 필드로
구분하는지만 알려 주시면 그대로 쓰겠습니다.

### 복구 가능성 — 기술적 사실만 확인 부탁드립니다

`PARTIAL`로 끝난 리포트가 **나중에 다시 생성되어 채워질 수 있나요?**

- 채워진다면 → 화면은 *"곧 채워집니다"* 로 안내하고 재조회하면 됩니다
- 그 회차는 그대로 끝이라면 → **학생에게 알리는 문구와 매니저 통보 경로**를 저희가 설계해야 합니다

**"실제로 재생성을 돌릴 것인가"는 저희 기획에서 정하겠습니다** — 여기서는 *가능한가*만
알려 주시면 됩니다.

---

## 5. 17차 반영 확인 ✅

**전수 검증했습니다.** `api:check` **error 37건 → 2건**.

| 17차 요청 | 결과 |
|---|---|
| **R1 enum** | ✅ `CurrentRoundResponse`에 **14필드** 적용(전엔 0). `representativeStatus` 10종·`defaultActionCode` 11종 요청 그대로. 순수 `string`으로 남은 것은 `asOfAt`(날짜)뿐 |
| **R2 required** | ✅ **9개 스키마 전부**. `ConceptReportResponse` 4 · `Cell` 7 · `ManagerHeatmapResponse` 8 등 |
| **R3 nullable** | ✅ **30필드**. `submissionMethod`가 `["string","null"]`로 정확히 나옵니다 |

**특히 좋았던 것 둘을 남깁니다.**

**하나 — `@JsonInclude(NON_NULL)` 위치를 옮기신 것.** 클래스 레벨에 걸려 있어서
`ResponseRecordRequiredConverter`가 스키마 전체를 required 대상에서 제외하고 있었다는
분석이 정확합니다. 필드별로 옮기면서 **각 DTO를 채우는 서비스 코드를 직접 추적해
"실제로 조건부인 필드"를 가려내신 것**이 결과에 그대로 드러납니다 — `RoundReportResponse`가
`id`·`label`·`status` 셋만 required인 것이 상태 6종을 정확히 반영한 값입니다.

**둘 — 배열 항목 스키마(`@ArraySchema`)로 처리하신 것.** `warningCodes[]`·
`availableSubmissionMethods[]`가 배열 자체가 아니라 **항목**에 enum이 걸려서, 생성 타입이
`('SUBMISSION_DEADLINE_PASSED' | …)[]`로 정확히 나옵니다.

### Q1~Q5 회신도 전부 반영했습니다

- **Q1** `PRIVATE`이 `WITHHELD`의 내부 표현이고 DB CHECK로 `RELEASED+PRIVATE`이 차단된다 →
  화면은 **`releaseStatus`만 보고 분기**하도록 이미 그렇게 돼 있습니다
- **Q3** 점수 비노출 유지 → 그대로 두겠습니다. `outcome`만으로 충분합니다
- **Q4** 서술 톤은 이 저장소가 아니라 **AI 프롬프트 관리 쪽** 소관 → 그쪽으로 전달하겠습니다.
  `curriculumRef`가 도달 단계와 무관하게 나간다는 확인은 감사합니다(0단에서 빠지지 않음)
- **Q5** 세션 API 활성화는 배포 일정 → 정해지면 알려 주세요. 그때까지 목으로 둡니다

---

## 6. 저희 쪽 상태

교육생 4화면이 **목으로 완성**돼 있고, 2026-08-11 확정 채점 모델(개념 3 × 단계 4(0~4단) ×
시도 3 · 힌트 2 · 재시험 1회)까지 반영을 마쳤습니다.

```
R1(2줄) 해결  →  api:pull · check · gen  →  홈·제출·리포트 연동 시작
```

**바뀔 것은 `features/trainee/*/api.ts` 안쪽뿐입니다** — 화면 컴포넌트는 그대로입니다.
