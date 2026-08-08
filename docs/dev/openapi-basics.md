# OpenAPI(스웨거)가 뭔가 — 아무것도 모르는 상태에서

> **이 문서를 읽는 사람:** "스웨거", "OpenAPI", "API 문서"라는 말을 들어봤지만 **그게 정확히 뭔지는 모르는** 사람.
> **사전 지식 0.** HTTP·JSON도 여기서 설명한다.
> **읽는 데 15분.** 다 읽으면 우리 프로젝트의 [API 붙이는 법](api-usage.md)이 무슨 말인지 알게 된다.

---

## 1. 이게 없으면 어떻게 되는지부터

프런트엔드에서 서버 데이터를 가져오려면 **네 가지**를 알아야 한다.

| 알아야 하는 것 | 예 |
| --- | --- |
| **주소** | `https://서버/api/v0/consents` |
| **방식** | 가져오기(`GET`)인가 만들기(`POST`)인가 |
| **뭘 보내나** | `role=MANAGER` |
| **뭐가 오나** | `[{ code: "...", title: "...", required: true }]` |

> **HTTP 메서드**란 "서버에 무엇을 하려는가"를 나타내는 동사다. `GET`은 가져오기, `POST`는 만들기, `PUT`/`PATCH`는 수정, `DELETE`는 삭제.
>
> **JSON**은 데이터를 글자로 적는 형식이다. `{ "이름": "값" }` 모양이고, 서버와 브라우저가 데이터를 주고받을 때 거의 항상 이걸 쓴다.

### 이걸 어떻게 알아내나 — 세 가지 방법

**① 백엔드에게 물어본다.** 슬랙으로. 가장 흔하고 가장 나쁘다.

```
나: 약관 목록 주소가 뭐예요?
백엔드: /api/v0/consents 요
나: 응답에 뭐가 와요?
백엔드: code, title, required 있고… 아 policyVersion도요
나: (한 시간 뒤) required가 boolean이에요 string이에요?
```

**문제는 답이 어디에도 안 남는다는 것이다.** 다음 사람이 또 묻는다. 그리고 백엔드가 필드를 하나 바꿔도 **아무도 안 알려준다** — 화면이 깨지고 나서야 안다.

**② 사람이 문서를 쓴다.** 노션이나 위키에.

**문제는 반드시 낡는다는 것이다.** 코드를 고칠 때 문서를 같이 고치는 사람은 드물다. 그리고 **낡은 문서는 없는 문서보다 나쁘다** — 사람들이 믿기 때문이다.

**③ 코드에서 문서를 자동으로 뽑는다. ← 이게 OpenAPI다.**

---

## 2. OpenAPI란 무엇인가

**서버가 "내 API는 이렇게 생겼습니다"를 기계가 읽을 수 있는 형식으로 적어 둔 파일**이다.

핵심이 셋이다.

| | |
| --- | --- |
| **기계가 읽는다** | 사람이 읽는 산문이 아니라 **정해진 구조의 JSON**이다. 그래서 프로그램이 처리할 수 있다 |
| **서버가 만든다** | 사람이 손으로 쓰지 않는다. **백엔드 코드에서 자동으로 나온다** |
| **표준이다** | 형식이 정해져 있어서 **아무 도구나 읽을 수 있다** |

세 번째가 특히 크다. 우리가 쓰는 도구들(타입 생성기·문서 화면)은 **우리 백엔드를 전혀 모른다.** 그냥 "OpenAPI 형식"을 읽을 뿐이다.

### 이름 정리 — Swagger? OpenAPI?

**같은 것을 가리킨다.** 역사가 이렇다.

```
2011  Swagger 라는 도구 모음이 나옴 (명세 + 문서 화면 + 코드 생성기)
2015  그 '명세' 부분이 재단에 기증되어 표준이 됨 → 이름이 OpenAPI 로 바뀜
지금  명세 = OpenAPI      도구 = Swagger UI, Swagger Editor …
```

그래서 실무에서는 이렇게 쓰인다.

| 말 | 정확히 무엇 |
| --- | --- |
| "스웨거 문서" | 대개 **OpenAPI 문서(JSON)** 를 뜻한다 |
| "스웨거 열어봐" | 대개 **Swagger UI**(웹 화면)를 뜻한다 |
| **OpenAPI** | 명세, 즉 **JSON 파일 그 자체** |

**둘은 완전히 다른 것이다.** 하나는 데이터 파일이고 하나는 그 파일을 그려주는 화면이다.

```
백엔드 코드
    ↓ 자동 생성
OpenAPI 문서 (JSON)  ──┬──► Swagger UI      사람이 브라우저로 본다
   /v3/api-docs        └──► 코드 생성기      ← 우리가 쓰는 쪽
```

우리 프로젝트가 받아오는 건 **왼쪽의 JSON**이지 오른쪽 화면이 아니다.

### 누가 이걸 쓰나 — 아무도 안 쓴다

여기가 처음 보면 가장 헷갈리는 부분이다. **OpenAPI 문서를 손으로 쓰는 사람은 없다.**

백엔드 개발자는 평범한 코드를 쓴다.

```java
@GetMapping("/api/v0/consents")
public List<ConsentItemResponse> findConsents(@RequestParam Role role) { … }
```

그러면 라이브러리(우리 백엔드는 `springdoc`)가 **이 코드를 읽어서** 문서를 만든다.

- 주소 → `@GetMapping("...")` 에서
- 메서드 → `@GetMapping` 이라는 이름에서
- 파라미터 → `@RequestParam Role role` 에서
- 응답 모양 → 반환 타입 `List<ConsentItemResponse>` 에서

> ⚠️ **그래서 문서가 코드를 따라간다는 게 장점이자 함정이다.** 코드에 없는 정보(예: "이 필드는 `null`일 수 있다")는 **백엔드가 따로 표시를 붙여야** 문서에 나온다. 안 붙이면 **문서가 조용히 틀린다.**
>
> 우리도 처음 받은 문서에 문제가 99건 있었다. 그래서 [검사 스크립트](api-process.md#4-2단계--apicheck--스펙을-검사한다)를 따로 만들었다.

---

## 3. 실제로 어떻게 생겼나 — API 하나를 통째로

말로 하면 안 와닿으니 **우리 프로젝트에서 제일 작은 API 하나**를 처음부터 끝까지 본다.

### 이 API가 하는 일

가입 화면에 보여줄 **동의 항목 목록**을 가져온다.

```
GET /api/v0/consents?role=MANAGER
  → [ { code: "TERMS_OF_SERVICE", title: "서비스 이용약관", required: true, … }, … ]
```

### 문서에 이렇게 적혀 있다

```jsonc
{
  "tags": ["Consent"],                          // ① 분류
  "summary": "약관 목록 조회 | ✅ 사용 가능",      // ② 한 줄 설명
  "description": "가입 화면이 표시할 동의 항목을 역할별로 받아온다. 인증 없이 호출한다. …",
  "operationId": "findConsents",                // ③ 이 API의 고유 이름 ★
  "x-readiness": "available",                   // ④ 우리끼리 정한 표시
  "security": [],                               // ⑤ 로그인 없이 호출 가능

  "parameters": [                               // ⑥ 뭘 보내나
    {
      "name": "role",
      "in": "query",                            //    주소 뒤 ?role=... 자리
      "required": false,                        //    안 보내도 된다
      "schema": { "$ref": "#/components/schemas/Role", "default": "MANAGER" }
    }
  ],

  "responses": {                                // ⑦ 뭐가 오나
    "200": {                                    //    성공했을 때
      "content": { "application/json": {
        "schema": { "type": "array", "items": { "$ref": "#/components/schemas/ConsentItemResponse" } }
      }}
    },
    "400": {                                    //    잘못 보냈을 때
      "content": { "application/json": {
        "schema": { "$ref": "#/components/schemas/ErrorResponse" },
        "examples": { "VALIDATION_FAILED": { … }, "BAD_REQUEST": { … } }
      }}
    }
  }
}
```

**이게 전부다.** API 하나가 이 객체 하나로 표현된다.

### `$ref` — "저기 적어둔 걸 여기서 쓴다"

위에서 `"$ref": "#/components/schemas/Role"` 이 나왔다. 이건 **참조**다.

```
"$ref": "#/components/schemas/Role"
         ↑  ↑          ↑        ↑
         │  │          │        └ 이름
         │  │          └ 스키마 모음
         │  └ 재사용 부품 창고
         └ "이 파일 안에서" 라는 뜻
```

따라가 보면 이렇게 정의돼 있다.

```jsonc
// components.schemas.Role
{
  "type": "string",
  "description": "계정 역할. SUPER_ADMIN · OPERATOR · MANAGER · TRAINEE",
  "enum": ["SUPER_ADMIN", "OPERATOR", "MANAGER", "TRAINEE"]
}
```

> **왜 참조를 쓰나** — `Role`은 우리 문서에서 **수십 군데**에 나온다. 나올 때마다 값 목록 네 개를 다시 적으면 ① 문서가 거대해지고 ② 하나만 고치고 나머지를 잊는다.
>
> **한 곳에 정의하고 이름으로 부른다.** 프로그래밍에서 변수를 쓰는 것과 같은 이유다.

> **`enum`(열거형)** 은 **"이 값들 중 하나만 올 수 있다"** 는 뜻이다. 이게 문서에 있으면 우리 타입도 `'SUPER_ADMIN' | 'OPERATOR' | …`가 되고, **오타를 치면 컴파일이 막아준다.**

### 응답 모양도 참조로 정의돼 있다

```jsonc
// components.schemas.ConsentItemResponse
{
  "type": "object",
  "properties": {
    "code":          { "type": "string",  "example": "TERMS_OF_SERVICE" },
    "title":         { "type": "string",  "example": "서비스 이용약관" },
    "description":   { "type": "string" },
    "requestField":  { "type": "string",  "example": "serviceTermsAgreed" },
    "required":      { "type": "boolean", "description": "필수 동의 여부…" },
    "policyVersion": { "type": "integer", "example": 1 }
  },
  "required": ["code", "description", "policyVersion", "requestField", "required", "title"]
}
```

**두 개의 `required`가 나와서 헷갈리기 쉽다.** 완전히 다른 것이다.

| 어디 | 뜻 |
| --- | --- |
| `properties.required` | **필드 이름이 `required`인 것.** "이 약관에 반드시 동의해야 하나" |
| 맨 아래 `"required": [...]` | **문법.** "응답에 이 필드들은 항상 들어 있다" |

두 번째가 중요하다. 여기 이름이 있으면 우리 타입이 `code: string`이 되고, **없으면 `code?: string`(있을 수도 없을 수도)이 된다.** 그러면 화면에서 매번 "있나?"를 확인해야 한다.

> 우리가 백엔드에 이 목록을 채워달라고 요청한 이유가 이것이다. 처음엔 **108개 스키마 중 79개에 이게 없었다.**

---

## 4. 문서 전체는 어떻게 생겼나

API 하나를 봤으니 이제 파일 전체다. **최상위 키가 7개뿐이다.**

```jsonc
{
  "openapi": "3.1.0",        // 명세 버전 (문법 버전. 3.0과 3.1은 문법이 좀 다르다)
  "info":    { "title": "IZ-Get", "version": "v0.1" },
  "servers": [{ "url": "https://…" }],
  "security":[{ "bearerAuth": [] }],           // 기본 인증 방식
  "tags":    [ … 9개 … ],                       // 분류 목록과 설명
  "paths":   { … 49개 … },                      // ★ 본체
  "components": { "schemas": { … 120개 … } }    // ★ 재사용 부품
}
```

**실질적으로 `paths`와 `components` 둘이다.** 나머지 다섯을 합쳐도 20줄이 안 된다.

### `paths` — 주소별로 묶여 있다

```
paths
 ├ "/api/v0/consents"
 │   └ "get"  → { operationId: "findConsents", … }
 └ "/api/v0/organizations"
     ├ "get"  → { operationId: "findOrganizations", … }
     └ "post" → { operationId: "createOrganization", … }
```

> **오퍼레이션(operation)** = **주소 + 메서드 한 쌍**. 같은 `/organizations`라도 `GET`(목록)과 `POST`(생성)는 **다른 API**다.
>
> 우리 문서는 **주소 49개 · 오퍼레이션 56개**다. 한 주소에 메서드가 둘 이상 달린 게 있어서 숫자가 다르다.

### `components` — 부품 창고

```
components
 ├ schemas          120개    데이터 모양 정의 (Role, ConsentItemResponse, ErrorResponse …)
 └ securitySchemes    1개    인증 방식 정의 (bearerAuth = "Authorization 헤더에 토큰")
```

`paths` 안의 `$ref`들이 전부 여기를 가리킨다.

---

## 5. 이걸로 뭘 할 수 있나 — 다섯 가지 용도

여기가 **"어떤 상황에 쓰나"** 에 대한 답이다.

### 용도 ① 사람이 읽는 문서 — Swagger UI

JSON을 그대로 읽을 순 없으니, 그려주는 화면이 있다. 주소 끝에 `/swagger-ui.html` 같은 걸 붙이면 나온다.

```
[GET]  /api/v0/consents      약관 목록 조회
       파라미터: role (선택)
       응답 200: [ { code, title, required, … } ]
       [ Try it out ]  ← 여기서 바로 호출해볼 수 있다
```

**우리 프로젝트에서 쓰는 방식:** 백엔드가 "이 API 나왔어요" 하면 여기서 먼저 눈으로 본다. **"이 API가 뭘 하는 건지"는 여기 설명문이 제일 정확하다.**

### 용도 ② 실제로 호출해보기

Swagger UI의 `Try it out` 버튼이나 터미널로 직접 부를 수 있다.

```bash
curl "https://서버/api/v0/consents?role=MANAGER"
```

**우리 프로젝트에서 쓰는 방식:** **화면을 만들기 전에** 먼저 불러본다. 문서에 적힌 것과 실제 응답이 다를 수 있기 때문이다 — 실제로 다른 적이 있었다.

### 용도 ③ 코드 자동 생성 ← 우리가 제일 많이 쓰는 것

문서가 기계가 읽는 형식이므로, **프로그램이 읽어서 코드를 만들 수 있다.**

```
OpenAPI 문서 → [생성기] → TypeScript 타입 + 호출 함수 + 훅
```

**우리 프로젝트에서 쓰는 방식:** `npm run api:gen` 하나로 `src/api/` 폴더 전체가 만들어진다. 주소도 타입도 손으로 안 적는다.

> 이 과정의 상세는 [API 코드는 어떻게 만들어지나](api-process.md)에 있다.

### 용도 ④ 가짜 서버 만들기 (목)

문서에 예시 값이 있으니, 그걸로 **서버 없이 응답하는 가짜 서버**를 만들 수 있다.

**우리 프로젝트에서는 안 쓴다.** 자동 생성 목은 `name: "string"` 같은 것만 만드는데, 우리가 화면에서 확인해야 하는 건 **"이름이 없는 계정", "반이 0개인 기수"** 같은 상황이기 때문이다. 목은 손으로 만든다.

### 용도 ⑤ 계약이 깨졌는지 검사하기

문서가 곧 계약이므로 **"이 계약이 쓸 만한가"를 프로그램으로 검사**할 수 있다.

**우리 프로젝트에서 쓰는 방식:** `npm run api:check`가 규칙 11종을 돌린다. 위반 목록이 그대로 **백엔드에 보내는 요청서**가 된다.

---

## 6. 우리 프로젝트에서의 전체 흐름

지금까지 나온 걸 한 줄로 잇는다.

```
백엔드가 코드를 씀
    ↓ springdoc이 자동 생성
서버의 /v3/api-docs 에 OpenAPI 문서(JSON)가 뜬다
    ↓ npm run api:pull      우리가 받아서 파일로 저장 (api/openapi.json)
    ↓ npm run api:check     쓸 만한 문서인가 검사 → 문제가 있으면 백엔드에 요청
    ↓ npm run api:gen       읽어서 src/api/ 코드 생성
화면이 훅을 부른다:  useFindConsents()
```

**우리가 손으로 적는 주소·타입이 하나도 없다.** 백엔드가 필드를 바꾸면 다시 생성했을 때 **타입 에러로 튀어나온다.**

---

## 7. 처음에 헷갈리는 것들

| 헷갈리는 것 | 정리 |
| --- | --- |
| Swagger랑 OpenAPI가 다른 건가 | 명세 = **OpenAPI**, 화면 도구 = **Swagger UI**. 실무에선 뒤섞어 부른다 |
| 이 문서를 우리가 고쳐야 하나 | ❌ **백엔드 코드에서 나온다.** 우리가 고치면 다음 배포에 날아간다. **요청을 보낸다** |
| `api/openapi.json`은 뭔가 | 서버에서 받아 **저장소에 커밋한 사본**. 바뀐 게 PR에 보이라고 |
| 자동 생성이니 항상 정확한가 | ❌ **코드에 없는 정보는 안 나온다.** 그래서 검사기가 있다 |
| `paths`랑 `components` 중 뭘 봐야 하나 | 먼저 `paths`에서 API를 찾고, `$ref`가 나오면 `components`로 따라간다 |
| `x-`로 시작하는 건 뭔가 | **확장 필드.** 표준이 아니라 우리끼리 정한 것. 모르는 도구는 무시한다 |
| 오퍼레이션이 뭔가 | **주소 + 메서드 한 쌍.** API 하나를 세는 단위 |
| `operationId`가 왜 중요한가 | **우리 함수·훅·타입 이름이 전부 여기서 나온다.** 없으면 생성이 멈춘다 |

---

## 8. 요약

**OpenAPI = 서버가 자기 API를 기계가 읽는 형식으로 적어 둔 계약서. 백엔드 코드에서 자동으로 나온다.**

```
최상위 7개 중 실질은 둘
  paths       주소 → 메서드 → 오퍼레이션 (뭘 보내고 뭐가 오나)
  components  재사용 부품 ($ref 로 가리킨다)

쓰는 법 다섯
  ① 읽는다 (Swagger UI)
  ② 불러본다 (curl / Try it out)
  ③ 코드를 만든다      ← 우리가 제일 많이 쓴다
  ④ 가짜 서버를 만든다  (우리는 안 씀)
  ⑤ 계약을 검사한다     ← 우리가 만들어 쓴다
```

---

## 다음에 읽을 것

- [**API 붙이는 법**](api-usage.md) — 화면에서 실제로 쓰는 법 (다음은 이걸 읽으면 된다)
- [API 코드는 어떻게 만들어지나](api-process.md) — 생성 과정 전체. 생성기를 고칠 때
- [백엔드 API 문서 진단 — 1차](backend-api-requests.md) — "자동 생성인데 왜 틀리나"의 실제 사례 99건
