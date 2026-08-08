# 백엔드 API — 8차 요청

> 1차: [backend-api-requests.md](backend-api-requests.md) · 2차: [backend-api-requests-2.md](backend-api-requests-2.md) · 3차: [backend-api-requests-3.md](backend-api-requests-3.md) · 4차: [backend-api-requests-4.md](backend-api-requests-4.md) · 5차: [backend-api-requests-5.md](backend-api-requests-5.md) · 6차: [backend-api-requests-6.md](backend-api-requests-6.md) · 7차: [backend-api-requests-7.md](backend-api-requests-7.md)
>
> **5·6·7차 전부 반영해 주셔서 SA-02 기관 상세 네 탭이 실서버에 붙었습니다.** 확인 내역은 §4에 있습니다.
>
> 이번 것은 **새로 들어온 프로젝트 실행·교안 API 24개**를 받으면서 나왔습니다. 요청 3건이고, **지금 저희 화면을 막지는 않습니다**(그 도메인은 아직 화면이 없습니다).

---

## 0. 한눈에

| | 무엇 | 우선순위 |
|---|---|---|
| **R1** | `ReplaceRequirementsRequest`에 `required`가 없다 | 🟠 중간 |
| **R2** | `SectionItemResponse.description` — 설명은 `null` 가능인데 타입이 아니다 | 🔴 **런타임에 터진다** |
| **R3** | 도메인 에러 코드 — 새 API 16개가 HTTP 상태를 옮긴 코드뿐 | 🟠 중간 |
| (참고) | 공용 enum 재사용 2건 | 🟡 낮음 |

**저희 검사기 기준으로 error 2 · warn 18입니다.** 새 API가 24개 들어오면서 1·2차 때 고쳤던 것과 **같은 패턴이 반복**됐습니다.

---

## 1. 🔴 R2 — `SectionItemResponse.description`이 제일 급합니다

먼저 적습니다. **셋 중 유일하게 런타임에 터지는 것**입니다.

```jsonc
"description": {
  "type": "string",                                  // ← null이 없다
  "description": "정의문. definitionMissing이 true면 null"   // ← 설명은 null이라고 한다
}
```

`required`에도 들어 있어서, 저희 타입은 이렇게 나옵니다.

```ts
description: string        // 항상 문자열이라고 믿는다
```

**컴파일러가 `null` 검사를 요구하지 않는데 런타임에 `null`이 옵니다.** `description.trim()` 같은 한 줄에서 바로 죽습니다.

> `optional`(`?`)보다 나쁩니다. optional이면 최소한 컴파일러가 "있나 확인해라"라고 시키는데, 이건 **아무도 안 막습니다.**

### 요청

```jsonc
"description": { "type": ["string", "null"], "description": "정의문. definitionMissing이 true면 null" }
```

`required`에는 그대로 두시면 됩니다 — **키는 항상 오되 값이 `null`일 수 있다**는 뜻이 되어 설명과 정확히 맞습니다.

---

## 2. 🟠 R1 — `ReplaceRequirementsRequest`에 `required`가 없다

```jsonc
{
  "type": "object",
  "description": "프로젝트 요구사항 전체 교체 요청",
  "properties": {
    "requirementTitles": { "type": "array", "items": { "type": "string" } }
  }
  // required 없음
}
```

**요청 DTO라 문제가 됩니다.** 저희 타입에서 `requirementTitles`가 선택이 되어, 빠뜨려도 컴파일이 통과합니다.

```ts
replaceRequirements({ path: { projectId }, body: {} })   // ✅ 컴파일 통과 → 400
```

> **PATCH 본문이면 전부 선택인 게 맞습니다**(6차 R1로 저희가 요청했던 것). 하지만 이건 `PUT` 전체 교체이고, 설명도 *"보낸 목록이 최종 상태가 된다"* 입니다. **빈 요청과 "전부 지우기"를 구분할 수 없습니다.**

### 요청

`"required": ["requirementTitles"]` 추가.

빈 배열로 전부 지우는 것이 정상 동작이라면, 그것도 `description`에 한 줄 적어 주시면 좋겠습니다 — 화면에서 확인 모달을 띄울지 판단이 갈립니다.

---

## 3. 🟠 R3 — 새 API 16개가 일반 코드뿐입니다

1차·2차 때 도메인 코드 60종을 만들어 주셔서 지금 화면이 케이스별로 다른 문장을 띄우고 있습니다. **새로 들어온 API에는 그게 없습니다.**

| 오퍼레이션 | 지금 오는 코드 |
|---|---|
| `PUT /projects/{projectId}/requirements` | `UNAUTHENTICATED` · `NOT_FOUND` |
| `PUT /projects/{projectId}/concepts` | `VALIDATION_FAILED` · `BAD_REQUEST` · `UNAUTHENTICATED` · `NOT_FOUND` |
| `POST /projects/{projectId}/curricula` | 위 + `CONFLICT` |
| `POST /curricula` | `VALIDATION_FAILED` · `BAD_REQUEST` · `UNAUTHENTICATED` |
| `POST /curricula/{materialId}/analyses` | `UNAUTHENTICATED` · `NOT_FOUND` |
| … 총 16건 | |

**화면이 케이스를 못 가릅니다.** `NOT_FOUND` 하나로는

- 프로젝트가 없는 건지
- 교안이 없는 건지
- 요구사항 항목이 없는 건지

를 알 수 없어서, **셋 다 같은 문장 하나**로 뭉치게 됩니다.

`CONFLICT`도 마찬가지입니다 — "이미 연결된 교안"인지 "다른 사람이 먼저 바꿨다"인지에 따라 사용자가 **할 일이 다릅니다.**

### 요청

**급하지 않습니다.** 그 도메인 화면을 붙일 때 필요하고, 지금은 목으로 돕니다.

다만 **지금 붙이는 편이 쌉니다** — 나중에는 이미 화면이 일반 코드로 분기해 둔 뒤라 그걸 다 고쳐야 합니다. 1·2차 때 그랬습니다.

우선순위를 매기자면 `NOT_FOUND`·`CONFLICT`가 오는 곳부터입니다. `VALIDATION_FAILED`는 `fieldErrors`가 함께 오므로 화면이 필드별로 표시할 수 있어 상대적으로 덜 급합니다.

---

## 4. 🟡 참고 — 공용 enum이 있는데 값을 복사했습니다

5·6차에서 고쳐 주신 것과 **같은 패턴**이라 적어 둡니다. 급하지 않습니다.

| 위치 | 인라인 값 | 이미 있는 것 |
|---|---|---|
| `ProjectResponse.status` | `PLANNED` · `RUNNING` · `CLOSED` | **`CohortStatus`** (값이 같습니다) |
| `ProjectResponse.category` · `CreateProjectRequest.category` | `MINI_PROJECT` · `BIG_PROJECT` | (공용 스키마 없음) |

**첫 줄은 `$ref`로 바꾸면 됩니다.** 다만 *기수* 상태와 *프로젝트* 상태가 **개념이 다른데 값만 같은 것**이라면, 오히려 `ProjectStatus`를 따로 만드는 편이 맞습니다 — 나중에 한쪽에만 값이 추가될 수 있기 때문입니다. **판단은 도메인을 아는 쪽이 하는 게 맞다고 봅니다.**

**둘째 줄은 `ProjectCategory` 같은 공용 스키마를 새로 만들어** 두 곳이 참조하면 됩니다. 지금은 요청과 응답에 같은 값이 따로 적혀 있어, 한쪽에만 값이 늘면 갈립니다.

---

## 5. 확인 보고 — 5·6·7차 전부 반영됐습니다

| 요청 | 결과 |
|---|---|
| **5차 R1** 초대 3종 `hold` 해제 | ✅ 셋 다 `available` |
| **5차 R2** `Item` 스키마 | ✅ `ManagedReportItem`으로 개명 · `required` 9개 · `scope`·`releaseStatus` 둘 다 `$ref` |
| **6차 R1** 운영설정 `PUT` → `PATCH` | ✅ 부분 수정 · 필수 0/11 |
| **6차 R2** 빅프 기여도 필드 | ✅ 요청·응답 양쪽에서 제거 |
| **7차 R1** `Operator` 스키마 | ✅ **`OperatorListItem` 분리** · 9필드 |
| **7차 §4** `period` 형식 | ✅ `yyyy-MM` · `pattern` · 예시 · *"생략하면 이번 달(UTC)"* |

**그 결과 SA-02 기관 상세 네 탭이 전부 실서버에 붙었습니다.**

| 탭 | |
|---|---|
| 개요 | 기수 목록 · 저장량 · 예산 소진율 |
| 오퍼레이터 | 목록 · 정지/재활성 · **초대 · 재발송 · 취소** |
| 사용량 · 비용 | 기간(`yyyy-MM`) · 저장량 구성 · 모델별 비용 |
| 설정 | **항목별 모달 5개**(PATCH 부분 수정) |

목 데이터 파일(1,020줄)이 통째로 삭제됐습니다.

### 화면이 유추하던 것을 서버 값으로 바꿨습니다

`suspendable`·`operatorUnassigned`·`budgetUsageRate`·`activeSessionCount`·`invitationDeliveryFailed`를 주신 덕분에, 목일 때 화면이 세거나 추정하던 것들이 없어졌습니다.

특히 **저장량 증감률은 `+8%` 하드코딩**, **진행 세션 수는 `교육생 × 0.04` 추정**이었습니다.

### `costComplete`·`unpricedCallCount`도 화면에 붙였습니다

*"화면은 `일부 단가 미설정`을 함께 표시해야 한다"* 는 스펙 요구대로, 단가 미설정 호출이 있으면 경고와 함께 **빠진 호출 수**를 보여줍니다. 모델별 표에서도 그 행은 비용 대신 `단가 미설정`으로 표시합니다.

---

## 6. 남은 것 하나 — `dataRetentionDays`

1차 때부터 있던 것인데 아직 남아 있습니다.

```jsonc
"dataRetentionDays": { "type": "integer", "enum": ["90", "180", "365"], "example": 180 }
```

**타입은 정수인데 `enum` 값이 문자열입니다.** `example`은 숫자라 서버가 기대하는 것은 숫자로 보이고, 저희도 숫자로 보내고 있습니다.

생성 타입이 `'90' | '180' | '365'`로 나와서 **호출부에 캐스팅이 한 줄** 들어가 있습니다. 고쳐 주시면 그 줄만 지우면 됩니다.

```jsonc
"enum": [90, 180, 365]
```
