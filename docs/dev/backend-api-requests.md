# 백엔드 API 문서 — 진단과 수정 요청

> 대상: `https://backend-production-37e3.up.railway.app/v3/api-docs` (OpenAPI 3.1.0 · IZ-Get v0.1)
> 측정 시점 기준 **48 경로 · 55 오퍼레이션 · 108 스키마 · 9 태그**.
> 이 문서의 모든 숫자는 스펙 JSON을 스크립트로 센 값이다 — 재현 방법은 부록.
>
> **목적:** 프론트가 이 스펙으로 타입·API 클라이언트를 **자동 생성**하려는데, 지금 상태로
> 생성하면 **타입이 거짓말을 한다.** 무엇을 고쳐야 하는지와 **왜 그것이 프론트에서 무엇을
> 못 하게 만드는지**를 짝지어 적는다.

---

## 0. 먼저 — 잘 되어 있는 것

지적만 나열하면 전체가 나쁜 것처럼 읽히므로 먼저 적는다. **이 스펙은 대충 만든 것이 아니다.**

| | |
|---|---|
| **설명 품질** | `description`이 55개 오퍼레이션 **전부**에 있고, 그냥 있는 게 아니라 요청/응답 필드 표까지 마크다운으로 들어 있다. 이런 스펙은 흔치 않다 |
| **화면 코드 연결** | 태그 설명이 `v2 IA: SA-01 / SA-02`처럼 우리 화면정의서를 가리킨다 — 어느 화면 것인지 바로 갈린다 |
| **에러 케이스 인지** | 4xx/5xx를 **99건** 선언했다. 400·401·403·404·409·410·422·500·502가 상황별로 갈려 있다 — 케이스를 안 세고 200만 적는 스펙이 훨씬 많다 |
| **파생값 구분** | `operatorUnassigned`·`budgetExceeded`처럼 "저장 상태가 아니라 파생 배지"라고 설명에 명시했다. 프론트가 조합으로 유추하지 않아도 된다 |
| **준비 상태 표기** | `summary`에 `✅ 사용 가능 / ⚠️ 사용 보류 / ⚠️ 사용 불가`를 붙였다 — 46 / 3 / 6. 이걸 표시해 준 것 자체가 큰 도움이다 |

**문제는 "정보가 없다"가 아니라 "정보가 `description` 문자열에만 있고 스키마에는 없다"는 것이다.**
사람은 읽을 수 있지만 **기계가 못 읽는다.** 아래 지적은 거의 전부 이 한 문장의 변주다.

---

## 0.5. ⛔ 실서버 실측 — **문서가 아니라 구현 문제인 것** (추가 전달)

> 아래는 스펙이 아니라 **배포된 서버에 실제로 요청을 보내 받은 응답**이다.
> 보낸 것: `GET /consents`(공개) · `GET /organizations`(토큰 없이) · `POST /auth/login` 3종
> (없는 계정 / 빈 바디 / 이메일 형식 위반) · 없는 경로. **상태를 바꾸는 요청은 보내지 않았다.**
>
> **1절의 C1(에러 스키마)보다 이쪽이 먼저다.** C1은 "문서에 스키마를 붙여 달라"였는데,
> 실측해 보니 **문서에 적힌 에러 코드가 응답 바디에 아예 실리지 않는다.** 스키마만 붙이면
> 없는 필드를 문서화하게 된다.

### ⛔ L1. 에러 코드가 응답에 **없다**

실제 에러 바디는 네 필드뿐이고 `code`가 없다.

```jsonc
// GET /api/v0/organizations (토큰 없음)
{"timestamp":"2026-08-07T11:31:00.900517422Z","status":401,"error":"Unauthenticated","message":"로그인이 필요합니다."}
// POST /api/v0/auth/login (없는 계정)
{"timestamp":"2026-08-07T11:33:51.413550899Z","status":400,"error":"400 BAD_REQUEST","message":"로그인을 실패했습니다"}
// POST /api/v0/auth/login (빈 바디)
{"timestamp":"2026-08-07T11:33:51.716797111Z","status":400,"error":"Validation Failed","message":"요청 값이 올바르지 않습니다."}
```

그런데 문서에는 `ORG_NAME_TAKEN` · `ORG_IDEMPOTENCY_CONFLICT` 같은 **코드가 설명에 적혀 있다.**
**즉 코드 체계는 설계돼 있는데 응답에 실리지 않는다.**

**요청:** `ErrorResponse`에 **`code`를 실제로 담아 내려준다.** 이게 C1의 진짜 내용이다.
지금 있는 `timestamp·status·error·message`는 유지해도 되고, **`code` 한 필드가 추가되면 된다.**

### ⛔ L2. 로그인 실패 케이스가 **전부 한 덩어리 400**이다 ← 프론트에서 가장 아픈 것

문서의 `400` 설명이 *"요청 형식 오류 **또는** 로그인 정보 불일치"* 다. 실제로도 그렇다 —
**빈 바디 · 이메일 형식 위반 · 없는 계정이 전부 400**이고 `message`만 다르다.

**우리 로그인 화면은 케이스가 9개다**(미활성 · 스로틀 · 토큰 발급 실패 · 롤백 · 쿠키 실패 ·
컨텍스트 없음 …). 케이스마다 **화면 문구와 다음 행동이 다르고**, 그중 일부는 보안 규칙이
문구에 실려 있다(계정 열거 방지 — "이메일 또는 비밀번호가 올바르지 않습니다"로 **합쳐서** 보여야 하는 것).

지금 상태로는 프론트가 **`message` 문자열을 비교**하는 수밖에 없다. 그건 계약이 아니다 —
백엔드가 문구를 다듬는 순간 화면 분기가 조용히 깨진다.

**요청:** 로그인 실패의 **원인별 `code`를 구분해서 내려준다.**
`AUTH_INVALID_CREDENTIALS` · `AUTH_INACTIVE` · `AUTH_THROTTLED`(+ `retryAfterSeconds`) ·
`AUTH_TOKEN_ISSUE` … **HTTP 상태는 지금처럼 400/403이어도 된다.** 코드만 갈리면 된다.
> 계정 열거 방지는 유지된다 — **화면 문구를 합쳐서 보여주는 건 프론트가 한다.**
> 서버가 코드를 구분해 줘야 "미활성이면 재발송 안내"처럼 **다른 행동**을 붙일 수 있다.

### ⛔ L3. 검증 실패에 **어느 필드가 틀렸는지가 없다**

빈 바디와 이메일 형식 위반이 **완전히 같은 응답**이다(`Validation Failed` / `요청 값이 올바르지 않습니다.`).

**요청:** `fieldErrors: [{ field, code, message }]`를 담아 준다.
Spring이면 `MethodArgumentNotValidException` 핸들러에서 `BindingResult`를 펴면 끝난다.
**폼 화면(초대·기수 생성·명단 등록)이 필드 밑에 오류를 붙이려면 이게 필요하다.**

### ⛔ L4. **없는 경로가 404가 아니라 401**을 준다 — 프론트에서 강제 로그아웃을 유발한다

```
GET /api/v0/nope → 401 {"error":"Unauthenticated","message":"로그인이 필요합니다."}
```

Spring Security가 인증 필터를 먼저 태워서 생기는 흔한 현상이다. 보안상 나쁘진 않지만
**프론트에서 실제 사고가 된다.**

> 우리 클라이언트는 401을 만나면 **토큰 갱신 → 재시도 → 실패하면 로그아웃**한다.
> 그런데 401이 "토큰 만료"인지 "우리가 URL을 틀렸다"인지 구분이 안 된다.
> **결과: 프론트 오타 하나가 사용자를 로그아웃시킨다.** 원인 추적도 거의 불가능하다.

**요청:** 매핑되지 않은 경로는 **404**를 준다(`spring.mvc.throw-exception-if-no-handler-found` +
`NoHandlerFoundException` 핸들러, 또는 시큐리티에서 미매핑 경로를 permitAll로 흘려보내기).
L1의 `code`가 붙으면 차선책은 된다(`AUTH_REQUIRED` vs `NOT_FOUND`).

### 🟠 L5. `error` 필드의 어휘가 셋으로 갈린다

`"Unauthenticated"` · `"400 BAD_REQUEST"` · `"Validation Failed"` — 사람이 읽는 라벨인지,
HTTP 상태 문자열인지, 분류명인지가 응답마다 다르다.

**요청:** `code`가 생기면 **`error` 필드는 없애도 된다.** 남긴다면 한 가지 어휘로 통일한다.

### 🟠 L6. `LoginResponse.redirectPath`가 **우리 라우트에 없는 경로**다

스펙 예시가 `"/cohorts/12%EA%B8%B0"`(URL 인코딩된 `/cohorts/12기`)인데,
프론트에 그런 라우트가 없다. 우리 실제 진입 경로는 역할별로
`/superadmin/orgs` · `/operator/dashboard` · `/manager/dashboard` · `/trainee/home` 이다.

**서버가 내려준 경로로 이동하는 설계 자체는 좋다**(역할→화면 매핑을 클라이언트가 안 갖는다).
다만 **값이 실제 라우트여야 한다** — 아니면 로그인 직후 없는 페이지로 떨어진다.

**요청:** `redirectPath`가 낼 수 있는 값의 **전체 목록**을 알려 달라. 프론트 라우트 표와
대조해서 다르면 어느 쪽을 맞출지 정하자. (예시값만 바뀐 것이라면 예시를 실제 값으로 고쳐 달라.)

### ✅ L7. 해결된 것 — refresh 토큰은 **httpOnly 쿠키**

`POST /api/v0/auth/refresh`의 설명이 명확했다 — *"인증은 리프레시 토큰 쿠키로만 한다.
클라이언트가 직접 다룰 필요가 없다(`credentials:'include'`만 켜면 된다). 401을 받으면
재시도하지 말고 로그인 화면으로 보내야 한다."* `requestBody`도 실제로 없다.
**프론트가 물어보려던 것(B7)이 이 설명 하나로 끝났다. 이런 설명이 표준이면 좋겠다.**

> 확인만 하나: 로그인 응답의 `Set-Cookie`에 **`SameSite`·`Secure`·`Domain`**이 어떻게 붙는가.
> 프론트 배포 도메인이 백엔드와 다르면 `SameSite=None; Secure`가 아니면 쿠키가 안 실린다.
> CORS도 `Access-Control-Allow-Credentials: true` + 정확한 Origin(와일드카드 불가)이 필요하다.

---

## 1. 치명 — 이것부터. 고치기 전에는 자동 생성이 의미가 없다

### 🔴 C1. 에러 응답 99건 전부가 **성공 응답 스키마**를 가리킨다

가장 큰 문제이고, 가장 쉽게 고쳐진다.

```jsonc
// POST /api/v0/organizations
"201": { "content": { "*/*": { "schema": { "$ref": ".../OrganizationResponse" } } } },
"409": { "description": "ORG_NAME_TAKEN · ORG_IDEMPOTENCY_CONFLICT",
         "content": { "*/*": { "schema": { "$ref": ".../OrganizationResponse" } } } }
//                                                    ^^^^^^^^^^^^^^^^^^^^ 409가 기관 정보를 반환할 리 없다
```

**전수 확인: 4xx/5xx 응답 99건 중 별도 에러 스키마를 가진 것 0건.** 전부 성공 DTO를 가리킨다.

**원인(추정):** springdoc은 `@ApiResponse(responseCode = "409", description = "...")`처럼 **`content`를
안 적으면 그 핸들러의 반환 타입 스키마를 그대로 물려준다.** 의도한 게 아니라 기본 동작에
당한 것이다.

**프론트에서 무슨 일이 생기나**

- 생성된 타입이 *"409를 받으면 `OrganizationResponse`가 온다"* 고 말한다 → **에러 처리 코드가 전부 잘못된 타입 위에 서게 된다.**
- 진짜 에러 코드(`ORG_NAME_TAKEN`)는 **`description` 문자열 안에만** 있다. 문자열을 파싱해 상수를 만들 수는 없으므로 **프론트가 에러 코드를 손으로 다시 적게 된다** — 그 순간 백엔드가 코드명을 바꾸면 조용히 깨진다.
- 우리 화면은 **케이스별로 문구가 다르다**(로그인 9케이스, 비밀번호 재설정 7케이스…). 에러 코드가 계약이 아니면 그 분기를 만들 수 없다.

**요청**

1. **공통 에러 스키마 하나**를 만든다. 이름은 `ErrorResponse` 정도면 된다.

   ```jsonc
   ErrorResponse: {
     type: "object",
     required: ["code", "message"],
     properties: {
       code:    { type: "string", description: "기계가 분기하는 값. 화면 문구는 프론트가 정한다",
                  example: "ORG_NAME_TAKEN" },
       message: { type: "string", description: "사람이 읽는 기본 메시지(로그·폴백용)" },
       // 선택: 필드 단위 검증 실패용
       fieldErrors: { type: "array", items: { $ref: "#/components/schemas/FieldError" } },
       traceId: { type: "string", description: "장애 문의 시 대조용" }
     }
   }
   ```

2. **모든 4xx/5xx 응답이 이 스키마를 가리키게 한다.** 스프링이면 컨트롤러마다 적지 말고
   `OpenApiCustomizer`(또는 `@ApiResponses`를 묶은 커스텀 애너테이션) 하나로 **전역 적용**하는 편이 빠르다.

3. **각 응답이 실제로 낼 수 있는 `code` 값 목록을 스키마에 넣는다.** 지금 `description`에
   `ORG_NAME_TAKEN · ORG_IDEMPOTENCY_CONFLICT`라고 적어 둔 그 값들이다.

   ```jsonc
   "409": { "description": "...",
            "content": { "application/json": { "schema": { "$ref": ".../ErrorResponse" },
              "examples": {
                "ORG_NAME_TAKEN":          { "value": { "code": "ORG_NAME_TAKEN", "message": "이미 사용 중인 기관명입니다" } },
                "ORG_IDEMPOTENCY_CONFLICT":{ "value": { "code": "ORG_IDEMPOTENCY_CONFLICT", "message": "..." } }
              } } } }
   ```

   > `examples`의 **키를 에러 코드로** 쓰면 스펙에서 코드 목록을 기계적으로 뽑을 수 있다.
   > 더 좋은 것은 `code`를 `enum`으로 좁히는 것이지만(응답별로 다른 enum), 부담되면 examples만으로도 충분하다.

**우선순위 이유:** 이거 하나가 프론트의 에러 처리 **전체**를 좌우한다. 나머지를 다 고쳐도
이게 남으면 우리는 결국 에러 코드를 손으로 적어야 한다.

---

### 🔴 C2. `required`가 없어서 **모든 필드가 선택(optional)** 이 된다

**전수: 객체 스키마 108개 중 `required`가 있는 것 29개, 없는 것 79개.**

`OrganizationResponse`에도 없다 — `organizationId`조차 optional로 생성된다.

**프론트에서 무슨 일이 생기나**

```ts
// 생성된 타입 (required가 없으면 openapi-typescript는 전부 ?를 붙인다)
type OrganizationResponse = { organizationId?: string; name?: string; status?: '...' }

// 화면 코드가 이렇게 된다
org.name?.trim() ?? ''          // 반드시 오는 값인데 매번 방어
rows.map(o => o.organizationId!) // 또는 ! 남발 → 타입 검사를 스스로 끄는 것
```

**"어차피 다 오니까 괜찮다"가 아니다.** 요청 DTO에도 `required`가 없어서
(`UpdateModelPricingRequest` 등) **필수 입력을 빠뜨린 요청이 컴파일에서 안 걸린다.**
지금은 400을 받아봐야 안다.

**요청**

- **응답 DTO:** 항상 존재하는 필드를 `required`에 전부 넣는다. Java record면 대부분
  "null이 될 수 있는 필드"만 빼면 된다.
- **요청 DTO:** 필수 입력을 `required`에 넣는다. `@NotNull`·`@NotBlank`를 이미 붙였다면
  springdoc이 자동으로 채워 주므로, **검증 애너테이션이 빠진 곳을 찾는 편이 빠를 수 있다.**
- Kotlin이면 non-null 타입이 자동으로 required가 되므로 대부분 공짜다.

---

### 🔴 C3. `null`이 온다는 사실이 **설명문에만** 있다

**전수: `nullable` 표기(3.1이면 `"type": ["string","null"]`) 0건. 그런데 `description`에
"null" 이라고 적힌 필드 35건.**

```jsonc
"slug": { "type": "string",
          "description": "...지정하지 않은 기관은 null." }   // ← 타입은 null을 허용하지 않는다
```

**프론트에서 무슨 일이 생기나**

타입이 `string`이라 **컴파일러가 null 검사를 요구하지 않는데 런타임에 null이 온다.**
이건 optional(C2)보다 나쁘다 — optional은 최소한 방어를 강제하지만, 이건 **거짓말을 하고
런타임에 터진다.** `slug.toUpperCase()`가 프로덕션에서만 깨진다.

**요청** — OpenAPI 3.1이므로 타입 배열을 쓴다.

```jsonc
"slug": { "type": ["string", "null"], "description": "미지정이면 null" }
```

Java면 `@Schema(nullable = true)`, Kotlin이면 `String?`이 자동 반영된다.
**"설명에 null이라고 썼다"는 곳 35군데가 그대로 체크리스트다.**

---

## 2. 중요 — 자동 생성의 품질이 갈린다

### 🟠 M1. 응답 content-type이 `*/*`

55 오퍼레이션 **전부** `"*/*"`다. 컨트롤러에 `produces`를 안 적었을 때의 springdoc 기본값이다.

**영향:** 생성기가 응답을 JSON으로 확정하지 못하고, 생성 타입에 `"*/*"` 키가 그대로 박힌다.
치명적이진 않지만 **모든 생성물이 지저분해지고**, 나중에 파일 다운로드(CSV·ZIP) 같은
진짜 다른 content-type이 생겼을 때 구분이 안 된다.

**요청:** `@RestController` 레벨에서 `produces = MediaType.APPLICATION_JSON_VALUE` 한 번.

---

### 🟠 M2. 목록 응답 봉투가 **5가지**다

| 스키마 | 필드 |
|---|---|
| `OrganizationListResponse` · `CohortListResponse` | `content · page · size · totalElements · totalPages` |
| `SuperAdminListResponse` | `content · activeCount` |
| `OperatorListResponse` | `organizationId · activeCount · content` |
| `ClassroomListResponse` | `classrooms` |
| `EnrollmentListResponse` | `enrollments` |

**프론트에서 무슨 일이 생기나**

우리 표 화면은 **15개**고 전부 같은 3단 배치(헤더 총개수 / 툴바 / 푸터 `1–25 / 138` + 페이저)를
쓴다. 봉투가 통일돼 있으면 **표 컴포넌트 하나가 모든 목록을 받는다.** 지금처럼 5가지면
목록마다 어댑터를 하나씩 쓰게 되고, 그 어댑터는 순수하게 **낭비**다.

**요청**

1. **페이징이 있는 목록은 필드 이름을 하나로 통일한다.** `content · page · size · totalElements · totalPages`가
   이미 둘 있으니 이걸 표준으로 삼으면 된다.
2. **페이징이 없는 목록도 `content`로 통일한다.** `classrooms`·`enrollments`처럼 도메인 이름을
   쓰면 제네릭이 안 만들어진다. 개수가 적어 페이징이 없더라도 **필드 이름은 같아야 한다.**
3. `activeCount`처럼 그 목록에만 있는 집계는 **추가 필드로 남겨도 된다** — 공통 필드 이름만 맞으면 된다.

> **부탁 하나 더:** 총개수는 우리 화면 푸터(`1–25 / 138`)와 헤더(`총 138개`)가 **둘 다** 쓴다.
> 필터를 걸었을 때 `totalElements`가 **필터 적용 후 개수**인지 확인 부탁한다(우리는 그렇게 가정 중).

---

### 🟠 M3. `operationId` 품질 — 함수 이름이 여기서 나온다

| 값 | 문제 |
|---|---|
| `list` (`GET /consents`) | **너무 일반적.** 다른 태그에 같은 이름이 생기면 충돌한다 |
| `findSettings` (`GET .../operations/settings`) | 무엇의 설정인지 없다 |
| `resendInvitation_1` | **springdoc이 중복을 만나 자동으로 붙인 접미사다.** `Organization`의 `resendInvitation`과 `Auth`의 것이 같은 이름이라 뒤엣것에 `_1`이 붙었다 |

**프론트에서 무슨 일이 생기나**

`operationId`는 우리 쪽에서 **함수명·타입명·쿼리 키의 원천**이 된다.
`resendInvitation_1()`이라는 함수가 코드에 남고, 나중에 다른 API가 하나 추가되면
**`_1`이 다른 오퍼레이션으로 옮겨갈 수 있다** — 이름이 조용히 바뀌는 것이 가장 나쁘다.

**요청**

- **전역 고유하게 짓는다.** 태그를 접두어로 쓰면 자동으로 해결된다:
  `authResendInvitation` / `orgResendInvitation`, `consentList` → `findConsents`, `findSettings` → `findOrganizationOperationSettings`.
- 스프링이면 메서드 이름이 그대로 `operationId`가 되므로 **메서드 이름을 바꾸거나
  `@Operation(operationId = "...")`** 로 명시한다.
- **한 번 정하면 바꾸지 않는다.** 이건 URL만큼이나 계약이다 — 바뀌면 프론트 함수명이 전부 바뀐다.

---

### 🟠 M4. 같은 enum이 여러 곳에 **복사**돼 있다 (공유 스키마 0건)

| 반복 | 값 |
|---|---|
| 5회 | `ACCURACY_FIRST · BALANCED · COST_FIRST` |
| 5회 | `PENDING · ACTIVE · INACTIVE` |
| 4회 | `SUMMARY · PRIVATE · FULL` |
| 4회 | `ACTIVE · SUSPENDED · DELETION_PENDING · DELETED` |
| 2회 | `SUPER_ADMIN · OPERATOR · MANAGER · TRAINEE` |
| 2회 | `90 · 180 · 365` (보존기간) |

**`components.schemas`에 enum으로 등록된 것은 0건이다** — 전부 인라인 복사본이다.

**프론트에서 무슨 일이 생기나**

- 생성 타입에서 **같은 개념이 서로 다른 타입**이 된다. `기관 상태`를 다루는 함수 하나를
  만들어 목록·상세에 같이 쓰려 하면 타입이 안 맞는다.
- **한쪽만 값이 추가되면 아무도 모른다.** 실제로 `PENDING·ACTIVE·INACTIVE`가 5곳에 있는데
  그중 한 곳에만 상태가 추가되는 사고는 흔하다.

**요청:** 공유 enum은 **별도 타입으로 빼서 `$ref`** 한다(Java `enum` 클래스를 DTO에서 참조하면
springdoc이 자동으로 `components.schemas`에 올린다). 우선순위는 위 표의 위에서부터.

---

## 3. 보통 — 있으면 좋다

### 🟡 N1. 인증 요구가 스펙에 안 붙어 있다

`bearerAuth`가 `securitySchemes`에 **정의만** 돼 있고, **전역 `security`도 없고 오퍼레이션별
`security`도 11건이 비어 있다.** 비어 있는 11건은 마침 전부 인증 불필요한 것들이지만
(`/auth/*` 10개 + `/consents`), **나머지 44건에도 표기가 없다면 "인증이 필요 없다"와 구분이 안 된다.**

**요청:** 루트에 `security: [{ bearerAuth: [] }]`를 전역으로 걸고, **공개 API에만
`security: []`로 해제**한다. 그러면 스펙만 보고 "이 API는 토큰이 필요한가"가 갈린다.

### 🟡 N2. 준비 상태 마커를 기계가 읽을 수 있게

지금 `summary`에 `... | ✅ 사용 가능` 형태로 붙어 있다. **이 관행 자체는 아주 좋다** — 다만
문자열이라 우리가 파싱해야 하고, Swagger UI 제목에도 계속 노출된다.

**요청:** 벤더 확장으로 같이 넣어 준다(문자열은 그대로 둬도 된다).

```jsonc
"x-readiness": "available" | "hold" | "unavailable"
```

**왜 필요한가:** 우리는 **API가 없는 화면을 목 데이터로 계속 굴려야 한다**(4절). 어떤
오퍼레이션이 실제로 붙었는지를 기계가 알면, **준비된 것만 자동으로 실서버에 연결**하고
나머지는 목으로 두는 전환을 스크립트가 대신할 수 있다.

### 🟡 N3. 날짜·시각 표기 규약 명시

`format: date-time` 21건, `date` 6건으로 잘 나뉘어 있다. 확인만 부탁한다.

- `date-time`은 **UTC(`Z`)로 내려주는가, KST 오프셋(`+09:00`)인가.** 우리는 마감 남은
  시간을 화면에서 계산하므로(서버가 `daysLeft`를 주면 캐시되는 순간 틀린다) **오프셋이 붙은
  ISO-8601**이면 가장 좋다.
- `date`(`2026-08-07`)는 타임존이 없는 값 — **기수 시작일처럼 시각이 무의미한 것에만** 쓰고
  마감처럼 시각이 있는 것에는 쓰지 않기.

### 🟡 N4. 서버 URL

`servers`가 Railway 주소 하나뿐(`Generated server url`)이다. 로컬·개발·운영이 갈리면
**환경별로 등록**해 주면 프론트가 스펙에서 base URL을 읽을 수 있다. 지금은 우리가 `.env`로
갖고 있으므로 급하지 않다.

---

## 4. 커버리지 — 제품의 어느 절반이 아직 없는가

**이건 지적이 아니라 우리 쪽 계획을 위한 확인이다.**

| 있는 것 (55 오퍼레이션) | 없는 것 |
|---|---|
| 인증·초대·활성화 · 계정/역할 · 기관 · 플랫폼 설정 · 기수/반/명단/매니저 배정 · 사용량·비용 · 동의 · 리포트(⚠️사용 불가) | **프로젝트**(OP-03/04) · **교안** · **코드 제출**(TR-02) · **검증 세션**(TR-03) · **히트맵**(MG-02) · **면담·브리프**(MG-03/04) · **교육생 상세**(MG-06) · **대시보드 2종**(MG-01·OP-01) · **분석**(OP-02) |

즉 **"세팅·계정" 절반은 나왔고, 제품의 핵심 측정 루프(제출→분석→세션→리포트→위험→면담)는
아직 스펙에 없다.**

**프론트 쪽 귀결(우리가 알아서 할 것):**
- 화면 25개 중 절반은 **당분간 목으로 계속 돈다.** 그래서 자동 생성 코드와 목이 **공존**해야
  하고, 화면은 둘 중 무엇에 붙어 있는지 몰라야 한다 — 지금 `api.ts` 경계가 그 역할이다.
- **먼저 붙일 대상**은 인증(AU-01~03)·슈퍼어드민(SA-01~03)·운영 관리(OP-06)다. 스펙 커버리지와
  화면 완성도가 겹치는 구간이 정확히 여기다.

**백엔드에 묻고 싶은 것:** 위 "없는 것" 중 **다음 스프린트에 나올 순서**를 알려 주면
프론트가 연동 순서를 거기 맞춘다. (특히 **검증 세션**은 화면이 턴 단위 대화라 계약 모양이
다른 API와 많이 다르다 — 설계 전에 한 번 같이 보면 좋겠다.)

---

## 5. 요약 — 우선순위와 예상 비용

| 순위 | 항목 | 백엔드 작업량(추정) | 안 고치면 프론트가 잃는 것 |
|---|---|---|---|
| **0** | ⛔ L1·L2 **응답에 `code`를 실제로 담기** + 로그인 실패 원인 구분 | 에러 응답 클래스 1필드 + 코드 부여 | **케이스 분기가 불가능.** `message` 문자열 비교밖에 방법이 없다 |
| **0** | ⛔ L4 미매핑 경로 **404** | 설정 1~2줄 | **프론트 오타가 강제 로그아웃을 유발** |
| **0** | ⛔ L3 `fieldErrors` | 검증 핸들러 1개 | 폼 화면이 필드별 오류를 못 붙임 |
| **1** | 🔴 C1 공통 `ErrorResponse` **스키마 문서화** (L1 구현이 먼저) | 전역 설정 1회 | 생성 타입이 에러를 성공 DTO로 안다 |
| **2** | 🔴 C2 `required` | 검증 애너테이션 점검 | 타입 안전. `?`·`!` 남발 |
| **3** | 🔴 C3 `nullable` (35곳) | 필드 단위 표기 | **런타임 오류.** 타입이 거짓말함 |
| **4** | 🟠 M2 목록 봉투 통일 | DTO 5개 필드명 정리 | 표 컴포넌트 공용화 |
| **5** | 🟠 M3 `operationId` 고유화 | 메서드명/애너테이션 | 함수명 안정성 |
| **6** | 🟠 M4 enum `$ref` | enum 클래스 추출 | 같은 개념이 다른 타입 |
| **7** | 🟠 M1 `produces` | 컨트롤러 1줄 | 생성물 청결 |
| **8** | 🟡 N1~N4 | 소 | 편의 |

**1·2·3은 사실상 springdoc 설정과 애너테이션 문제라 코드 로직 변경이 거의 없다.**
그런데 프론트에서의 효과는 가장 크다 — 그래서 이 순서다.

---

## 부록 — 이 문서의 숫자를 재현하는 법

```bash
curl -s https://backend-production-37e3.up.railway.app/v3/api-docs -o api-docs.json

# 에러 응답이 성공 스키마를 가리키는 건수
node -e "
const s=require('./api-docs.json');let n=0;
for(const [p,it] of Object.entries(s.paths)) for(const [m,op] of Object.entries(it)){
  if(!op?.responses)continue;
  const ok=Object.entries(op.responses).filter(([c])=>+c<400).map(([,r])=>JSON.stringify(r.content));
  for(const [c,r] of Object.entries(op.responses))
    if(+c>=400 && ok.includes(JSON.stringify(r.content))) n++;
}
console.log('에러=성공 스키마:',n);"

# required 없는 스키마 / nullable 표기 건수
node -e "
const sc=require('./api-docs.json').components.schemas;
const objs=Object.entries(sc).filter(([,v])=>v.properties);
console.log('required 없음:',objs.filter(([,v])=>!v.required?.length).length,'/',objs.length);
let nn=0;JSON.stringify(sc,(k,v)=>{if(v&&(v.nullable===true||(Array.isArray(v.type)&&v.type.includes('null'))))nn++;return v});
console.log('nullable 표기:',nn);"
```
