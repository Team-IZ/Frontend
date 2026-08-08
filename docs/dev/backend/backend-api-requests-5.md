# 백엔드 API — 5차 요청

> 1차: [backend-api-requests.md](backend-api-requests.md) · 2차: [backend-api-requests-2.md](backend-api-requests-2.md) · 3차: [backend-api-requests-3.md](backend-api-requests-3.md) · 4차: [backend-api-requests-4.md](backend-api-requests-4.md)
>
> **새 스펙(오퍼레이션 56 → 65)을 받아 코드를 다시 생성하면서 나온 것들이다.**
> 요청 2건이고 **둘 다 한 줄 수정**이다. 하나는 지금 우리 작업을 막고 있다.

---

## 0. 한눈에

| | 무엇 | 우선순위 |
|---|---|---|
| **R1** | 오퍼레이터 초대 3종의 `x-readiness`가 `hold`인데 **서버는 정상 동작한다** | 🔴 **막힘** |
| **R2** | 새 `Item` 스키마 — 이름·`required`·enum 재사용 셋 다 | 🟠 중간 |

**확인 보고**

| | |
|---|---|
| 새 API 9개 수신 | 명단 조회·상태 변경, 매니저 목록, 프로젝트 반별 진행 4개는 **바로 씀** |
| 리포트·분석 계열 | `unavailable`이라 호출 함수를 만들지 않았다. 열리면 재생성만 하면 된다 |

---

## 1. 🔴 R1 — 초대 3종의 `x-readiness`를 `available`로

### 대상

```
POST   /api/v0/organizations/{organizationId}/operators/invitations
POST   /api/v0/organizations/{organizationId}/operators/invitations/{tokenId}/resend
DELETE /api/v0/organizations/{organizationId}/operators/invitations/{tokenId}
```

셋 다 `x-readiness: hold` · `summary`에 `⚠️ 사용 보류`.

### 왜 지금 요청하나 — 보류 사유가 해소됐다

`hold`가 붙은 이유는 **Railway 프리티어의 SMTP 제약**으로 알고 있다. 그런데

- **App Runner로 옮긴 뒤 메일 발송을 실제로 확인했다.** 4개 주소로 초대 메일이 전부 도착했다(학교 계정은 스팸함)
- 지금 스펙의 `servers`도 App Runner를 가리킨다

### 그리고 엔드포인트가 살아 있다 — 실측

일부러 형식이 틀린 이메일로 호출해 **메일 발송 전에 멈추게** 했다.

```
POST /api/v0/organizations/{id}/operators/invitations
     { "email": "이건이메일이아님" }

→ 400
{"status":400,"error":"BAD_REQUEST","code":"VALIDATION_FAILED",
 "message":"요청 값이 올바르지 않습니다.",
 "fieldErrors":[{"field":"email","message":"must be a well-formed email address"}]}
```

**인프라에서 막힌 것이 아니라 정상 처리됐다.** 검증이 돌고 `fieldErrors`까지 규약대로 왔다.

### 이게 우리를 막는 이유

우리 생성기는 **`x-readiness`가 `available`이 아니면 호출 함수를 만들지 않는다.** 함수가 있으면 누군가 쓰기 때문이다.

```
서버        ✅ 동작
스펙        🔴 hold
생성물      ❌ 함수 없음      ← 스펙을 따른 결과다
```

그래서 **SA-02 기관 상세의 오퍼레이터 탭이 절반만 붙는다.** 목록·정지·재활성은 되는데 초대·재발송·취소는 목으로 남는다.

> **손으로 함수를 쓰는 방법은 일부러 안 쓴다.** 나중에 `available`이 되면 그 손 코드를 지워야 하는데, 아무도 안 지운다. **스펙 한 줄이 고쳐지면 재생성만으로 붙는다.**

### 요청

**셋의 `x-readiness`를 `available`로, `summary`의 `⚠️ 사용 보류` 표기 제거.**

혹시 **다른 이유로 보류 중이라면** 그 사유를 알려주시면 됩니다 — 저희가 잘못 알고 있을 수 있습니다. 그 경우 `description`에 사유를 한 줄 남겨 주시면 다음에 같은 질문을 안 드립니다.

> ⚠️ 확인 못 한 것 하나 — `resend`·`cancel`은 **존재하지 않는 토큰**으로 호출해봤는데 응답이 오지 않고 멈췄습니다(15초 이상). 404가 나올 것으로 기대했습니다. 없는 토큰일 때의 동작도 함께 봐 주시면 좋겠습니다.

---

## 2. 🟠 R2 — 새 `Item` 스키마 세 가지

`GET /api/v0/reports/managed`의 응답(`ManagedReportListResponse`)이 참조하는 스키마입니다.

```
ManagedReportListResponse → Item
```

**이 API는 `unavailable`이라 급하지 않습니다.** 다만 **열리기 전에 고치는 편이 훨씬 쌉니다** — 화면이 붙은 뒤에는 타입에 의존한 코드를 같이 고쳐야 합니다.

### 2-1. 이름이 `Item`이다

전역 이름 공간에 `Item` 하나가 있습니다. 자동 생성된 내부 클래스 이름으로 보입니다.

- 다른 목록 응답에도 `Item`이 생기면 **충돌하거나 한쪽이 덮입니다**
- 저희 타입 별칭은 `operationId` 기준이라 직접 문제는 아니지만, **스펙을 읽는 사람이 무엇의 항목인지 알 수 없습니다**

**요청:** `ManagedReportItem`처럼 무엇의 항목인지 드러나는 이름으로.

### 2-2. `required` 목록이 없다

저희 검사기가 `error`로 잡았습니다. `required`가 없으면 **전 필드가 optional**이 되어 화면이 `?`·`!`를 남발하게 됩니다.

**요청:** 항상 오는 필드를 `required`에 넣어 주세요.

> 참고로 저희 검사기를 이번에 고쳐서, **아직 `available`이 아닌 API의 스키마는 검사하지 않도록** 했습니다. 그래서 지금은 error가 아닙니다 — `available`로 바뀌는 순간 다시 error가 됩니다.

### 2-3. 공용 enum이 있는데 값을 복사했다 ← **이게 제일 중요합니다**

`Item`의 두 필드가 **이미 있는 공용 스키마와 같은 값**을 인라인으로 갖고 있습니다.

| `Item`의 필드 | 인라인 값 | 이미 있는 공용 스키마 |
|---|---|---|
| `scope` | `PRIVATE` · `SUMMARY` · `FULL` | **`DisclosureScope`** (`SUMMARY` · `PRIVATE` · `FULL`) |
| `releaseStatus` | `NOT_CONFIGURED` · `WITHHELD` · `RELEASED` | **`TraineeReleaseStatus`** (같음) |

값 집합이 완전히 같고 **순서만 다릅니다.**

**왜 문제인가** — 프런트 타입이 이렇게 갈립니다.

```ts
ReportDisclosureResponse.scope  →  DisclosureScope        (공용 타입)
Item.scope                      →  'PRIVATE'|'SUMMARY'|'FULL'   (그 자리에만 있는 별개 타입)
```

**같은 개념인데 타입이 둘이 됩니다.** 나중에 값이 하나 추가되면 **한쪽만 바뀌고 아무도 모릅니다.**

**요청:** 두 필드를 `$ref`로 바꿔 주세요.

```jsonc
"scope":          { "$ref": "#/components/schemas/DisclosureScope" },
"releaseStatus":  { "$ref": "#/components/schemas/TraineeReleaseStatus" }
```

---

## 3. 확인 보고 — 새 API 9개

| readiness | 엔드포인트 | 저희 상태 |
|---|---|---|
| `available` | `GET /cohorts/{cohortId}/trainees` | ✅ 생성됨 (OP-06 명단 탭에서 쓸 예정) |
| `available` | `PATCH /cohorts/{cohortId}/trainees/{traineeId}/status` | ✅ 생성됨 |
| `available` | `GET /managers` | ✅ 생성됨 |
| `available` | `GET /projects/{projectId}/class-progress` | ✅ 생성됨 — **`Project` 태그 신설** |
| `unavailable` | `GET /reports/managed` | ⏸ 함수 없음 |
| `unavailable` | `GET /cohorts/{id}/analytics/risk-trainees` | ⏸ |
| `unavailable` | `GET /cohorts/{id}/analytics/group-gaps` | ⏸ |
| `unavailable` | `GET /cohorts/{id}/analytics/cohort-comparison` | ⏸ |
| `unavailable` | `GET /cohorts/{id}/analytics/actions` | ⏸ |

**전체 65개 중 사용 가능 51 · `hold` 3 · `unavailable` 11.**

`unavailable` 11개는 전부 리포트·분석·공개범위 계열이라, **OP-02 분석 · OP-05 리포트 · TR-04는 아직 목으로 돕니다.**

---

## 4. 이번에 저희 쪽에서 고친 것 (참고)

새 스펙을 검사하다 **저희 검사기의 버그를 두 개** 찾았습니다. 백엔드 조치는 필요 없고, **지난 회차에 놓친 것이 있을 수 있다는 뜻**이라 남깁니다.

**하나 — 참조를 따라가는 코드가 첫 글자를 잘라먹고 있었습니다.** `required` 규칙이 검사 대상을 하나도 못 찾아 **위반이 없어서가 아니라 대상이 없어서** 통과할 뻔했습니다.

**둘 — enum 중복 검사가 값 순서에 의존했습니다.** 그래서 위 2-3의 `DisclosureScope` 중복을 **놓쳤습니다.** 정렬해서 비교하도록 고치니 1건이던 것이 2건이 됐습니다.

둘 다 회귀 테스트를 붙였습니다.

---

## 부록 — 저희가 쓰는 `x-readiness` 규약

| 값 | 뜻 | 저희 동작 |
|---|---|---|
| `available` | 써도 된다 | **호출 함수·훅 생성** |
| `hold` | 구현은 있는데 환경이 막고 있다 | 함수 안 만듦 · `PENDING.md`에 기록 |
| `unavailable` | 아직 없다 | 같음 |

**`hold`와 `unavailable`을 가르는 실익이 여기 있습니다.** `hold`는 *"환경이 풀리면 재생성만 하면 된다"* 는 뜻이라 저희가 화면을 미리 준비해 둡니다. 이번 R1이 정확히 그 경우입니다.
