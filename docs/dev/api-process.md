# API 코드는 어떻게 만들어지나 — 전 과정

> **이 문서의 목적:** `npm run api:gen`을 쳤을 때 **무슨 일이 순서대로 일어나는지**를 하나도 빠짐없이 이해하는 것.
> **[API 붙이는 법](api-usage.md)** 이 "어떻게 쓰나"라면 이 문서는 **"어떻게 만들어지나"** 다. 쓰기만 할 거면 저쪽만 읽어도 된다. 이 문서는 **생성기를 고쳐야 할 때** 필요하다.
> **사전 지식은 필요 없다.** 용어는 처음 나올 때 정의한다.

---

## 목차

1. [전체 그림 — 한 장](#1-전체-그림--한-장)
2. [왜 이 구조인가 — 3분](#2-왜-이-구조인가--3분)
3. [1단계 · `api:pull` — 스펙을 받는다](#3-1단계--apipull--스펙을-받는다)
4. [2단계 · `api:check` — 스펙을 검사한다](#4-2단계--apicheck--스펙을-검사한다)
5. [3단계 · `api:gen` — 코드를 만든다](#5-3단계--apigen--코드를-만든다)
   - [스펙에 뭐가 들어 있나 (Swagger 구조)](#5-0-1-그-전에--스펙에는-대체-뭐가-들어-있나)
   - [뽑을 수 있는 것 전부 · 우리가 고른 것](#스펙에서-뽑을-수-있는-것-전부--그리고-우리가-고른-것)
   - [5-1. IR을 만든다 (핵심)](#5-1-ir을-만든다--이-문서에서-제일-중요한-절)
   - [5-2. 걸러낸다](#5-2-걸러낸다)
   - [5-3. 렌더러 6개](#5-3-렌더러-6개)
   - [5-4. 포맷하고 끝](#5-4-포맷하고-끝)
6. [만들어진 코드를 따라가 보기](#6-만들어진-코드를-따라가-보기--요청-한-번의-전체-경로)
7. [생성기를 고쳐야 할 때](#7-생성기를-고쳐야-할-때)
8. [자주 나오는 질문](#8-자주-나오는-질문)

---

## 1. 전체 그림 — 한 장

```
 백엔드 서버
     │  ① npm run api:pull    HTTP로 받아서 파일로 저장
     ▼
 api/openapi.json                    ← 저장소에 커밋된다
     │  ② npm run api:check   품질 검사 11종 (읽기만 함, 아무것도 안 만듦)
     │
     │  ③ npm run api:gen
     ├──────────────► npx openapi-typescript ──► src/api/schema.d.ts
     │                                            (스펙 전체의 원본 타입)
     ▼
  buildIR(spec)  ── 스펙을 딱 한 번 읽는다 ──►  Operation[]  (메모리 위 배열)
                                                    │
                        ┌───────────────────────────┼───────────────────────────┐
                        ▼            ▼              ▼             ▼             ▼
                 renderDomainTypes  renderDomainApi  renderQueryKeys  renderQueries  renderMutations
                        │            │              │             │             │
                        ▼            ▼              ▼             ▼             ▼
                  {tag}Types.ts  {tag}Api.ts   {tag}Keys.ts  use{Tag}Queries.ts  use{Tag}Mutations.ts

                 + renderErrorCodes ──► src/api/errorCodes.ts
                 + renderPending    ──► src/api/PENDING.md
                        │
                        ▼
                 npx prettier --write   (마지막에 한 번)
```

**기억할 모양은 하나다.** 스펙을 **한 번** 읽어 `Operation[]`이라는 배열을 만들고, **6개의 렌더러가 전부 그 배열 하나만 본다.** 화살표가 세로로 이어지지 않고 **한 점에서 부챗살로 퍼진다.**

---

## 2. 왜 이 구조인가 — 3분

### 먼저 "안 그렇게 만들면" 어떻게 되는지

사내에 참고할 생성기가 있었다. 그건 이렇게 생겼다.

```
스펙 → [타입 생성] → 타입 파일 → [API 생성] → API 파일 → [훅 생성] → 훅 파일
                        ↑                        ↑
                   방금 만든 파일을          또 그 파일을
                   정규식으로 다시 읽음      정규식으로 다시 읽음
```

**각 단계가 앞 단계가 만든 `.ts` 파일을 텍스트로 다시 읽는다.** 실제 코드가 이랬다.

```js
// 방금 만든 API 파일에서 함수를 정규식으로 찾아낸다
const functionRegex = /export const (\w+) = async \((.*?)\) => \{([\s\S]*?)\n\};/g

// 그리고 "조회냐 변경이냐"를 함수 이름 접두어로 판정한다
if (functionName.startsWith('create') || functionName.startsWith('modify') || …)
```

> **정규식(Regular Expression)** 은 문자열에서 패턴을 찾는 도구다. `\w+`는 "글자 여러 개" 같은 뜻이다. **텍스트를 다루는 도구지, 코드의 의미를 아는 도구가 아니다.**

### 그래서 무슨 일이 생겼나

그 저장소의 README에 「알려진 한계」가 적혀 있었는데, **셋 다 같은 원인**이었다.

| 증상 | 왜 |
| --- | --- |
| 응답 타입이 `any`가 된다 | 정규식이 "스키마 이름이 `Response`로 끝난다"는 패턴에 기대고 있었다. 이름이 다르면 못 찾고 `any`로 떨어진다 |
| 함수명이 `createApiAuthOauth2Id` | 주소에서 이름을 만들었고 `{provider}`를 `Id`로 뭉갰다. **스펙에 `oauthLogin`이라는 이름이 이미 있는데** 안 썼다 |
| 조회/변경을 잘못 나눌 수 있다 | **`GET`인지 `POST`인지가 스펙에 적혀 있는데** 함수 이름으로 다시 추측했다 |

**세 번째가 문제의 성격을 가장 잘 보여준다.** HTTP 메서드는 **스펙에 명시된 사실**이다. 그걸 우리가 만든 이름 문자열에서 다시 추론하는 건 **정보를 버렸다가 되찾으려는 것**이고, 되찾기는 반드시 실패한다.

### 그래서 IR을 쓴다

> **IR(Intermediate Representation, 중간표현)** 이란 **입력을 한 번 읽어서 만든 구조화된 데이터**다. 컴파일러가 소스 코드를 바로 기계어로 바꾸지 않고 중간 형태를 한 번 거치는 것과 같은 발상이다.
>
> 여기서 IR은 **"오퍼레이션 목록"** 이라는 평범한 자바스크립트 배열이다. 대단한 게 아니다.

```js
// 이게 IR이다. 그냥 객체 배열이다.
[
  { id: 'findOrganizations', method: 'GET', path: '/api/v0/organizations',
    tagName: 'organization', hasQuery: true, listProp: 'content', errorCodes: [...] },
  { id: 'createOrganization', method: 'POST', path: '/api/v0/organizations',
    tagName: 'organization', hasBody: true, ... },
  ...
]
```

이 배열이 생기고 나면 앞의 문제가 **원인 단계에서 사라진다.**

- 조회냐 변경이냐 → `op.method`를 본다. 추측이 없다
- 응답 타입 → `$ref`를 따라간다. `any`로 떨어질 자리가 없다
- 함수 이름 → `op.id`(= 스펙의 `operationId`)를 그대로 쓴다

**그리고 렌더러끼리 서로를 모른다.** 훅 렌더러는 API 렌더러가 만든 파일을 안 읽는다. 둘 다 같은 배열을 볼 뿐이다.

---

## 3. 1단계 · `api:pull` — 스펙을 받는다

파일: `scripts/api-pull.mjs` (100줄)

### 하는 일

```
설정에서 주소를 읽는다 → HTTP로 받는다 → JSON인지 확인 → 정규화 → 파일로 저장 → 달라졌는지 보고
```

### 왜 파일로 저장하나

생성할 때마다 서버에서 바로 받아도 된다. **안 그렇게 한 이유가 셋이다.**

| | |
| --- | --- |
| ① | 스펙 변화가 **PR diff로 보인다** — "백엔드가 무엇을 바꿨나"가 리뷰 대상이 된다 |
| ② | 네트워크 없이 빌드·생성이 된다 (CI가 백엔드 가동에 의존하지 않는다) |
| ③ | **무엇을 기준으로 생성했는지가 커밋에 박힌다** |

### ⚠️ 캐시버스터 — 이 스크립트가 존재하는 이유의 절반

```js
// 주소 뒤에 매번 다른 값을 붙이고, 헤더로도 캐시를 거부한다
const bust = `${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`
const res = await fetch(bust, { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } })
```

**실제로 사고가 났던 부분이다.** 백엔드가 스펙을 고쳤다고 했는데 받아보니 **이전 파일과 바이트 단위로 똑같았다.** "아직 배포를 안 했구나" 하고 잘못 판단했다.

원인은 **배포 플랫폼의 엣지 서버가 옛 스펙을 캐시**하고 있던 것이었다. 위 두 줄을 붙이니 새 파일이 나왔다.

> **`Date.now()`를 주소에 붙이면** 매번 다른 주소가 되어 캐시가 "이건 처음 보는 요청"으로 취급한다. 캐시는 주소를 키로 쓰기 때문이다.

### 저장할 때 정규화한다

```js
const next = JSON.stringify(spec, null, 2) + '\n'
```

서버는 JSON을 **한 줄로** 준다. 그대로 저장하면 diff가 "1줄이 바뀌었습니다"가 되어 **무엇이 바뀌었는지 볼 수 없다.** 2칸 들여쓰기로 펴서 저장하면 필드 단위로 보인다.

### 달라졌는지 알려준다

```
↓ https://…/v3/api-docs
  api/openapi.json  v0.1 · 경로 49 · 오퍼레이션 56 · 스키마 120
  sha256 3f2a91c04e7b (이전 8d10bb2e5c33)

★ 바뀌었습니다 — 오퍼레이션 55 → 56 · 스키마 118 → 120
  다음: npm run api:check
```

> **sha256(해시)** 은 파일 내용을 고정 길이 문자열로 요약한 값이다. 내용이 1글자만 달라도 값이 완전히 바뀐다. **"정말 바뀐 파일인가"를 눈으로 확인하는 용도**다.

이전과 같으면 이렇게 나온다.

```
= 이전과 동일합니다. 백엔드가 아직 재배포하지 않았을 수 있습니다.
```

### 주소는 어디서 오나

```js
const CONFIG = 'api/codegen.config.json'
const args = { url: process.env.IZ_API_DOCS_URL || cfg.spec.url, out: cfg.spec.file }
```

**생성기와 같은 설정 파일에서 읽는다.** 두 곳에 적어 두면 한쪽만 바꿨을 때 **"받은 스펙"과 "코드를 만든 스펙"이 서로 다른 서버 것**이 된다. 실제로 백엔드 서버를 옮기면서 그럴 뻔했다.

---

## 4. 2단계 · `api:check` — 스펙을 검사한다

파일: `scripts/api-check.mjs`

### 하는 일

**아무것도 만들지 않는다. 읽고 세기만 한다.** 규칙 11종을 돌려 위반을 출력한다.

### 왜 필요한가

백엔드의 OpenAPI 문서는 **코드에서 자동 생성**된다. 그래서 백엔드 개발자가 애너테이션(코드에 붙이는 표시)을 빠뜨리면 **문서가 조용히 틀린다.** 대표적인 것이 이거다.

```
에러 응답에 "무엇이 오는지"를 안 적으면
  → 문서 생성기가 "성공했을 때 오는 것"을 그대로 복사해 넣는다
  → 문서가 "409 실패일 때 기관 객체가 옵니다"라고 말하게 된다
  → 그걸로 타입을 만들면 타입이 거짓말을 한다
```

**1차 검사 때 이런 게 99건 있었다.**

### 규칙 11종

| id | 무엇을 보나 |
| --- | --- |
| `error-schema` | 에러 응답이 성공 응답과 같은 스키마를 가리키나 |
| `required` | 객체 스키마에 `required` 목록이 있나 (없으면 타입이 전부 선택이 된다) |
| `nullable` | 설명문엔 "null 가능"인데 타입은 아닌가 |
| `content-type` | 응답이 `application/json`인가 |
| `operation-id` | 이름이 없거나 중복이거나 `_1` 같은 접미사가 붙었나 |
| `readiness` | `x-readiness` 표시가 있나 |
| `security` | 인증 표기가 있나 |
| `error-examples` | 에러 응답에서 코드를 뽑을 수 있나 |
| `generic-only` | 에러 코드가 HTTP 상태 이름뿐인가 |
| `enum-inline` | 같은 값 목록이 여러 곳에 복사돼 있나 |
| `list-envelope` | 목록 응답 봉투 모양 |

### error와 warn을 가르는 기준

```
error  계약이 깨진다. 이 상태로 생성하면 타입이 거짓말을 한다  → 종료코드 1
warn   개선 요청 중이거나 우리가 흡수하는 것                    → 종료코드 0
```

**기준은 "이 상태로 코드를 생성해도 되나" 하나다.**

> **종료코드**는 명령이 끝날 때 남기는 숫자다. `0`이면 성공, 그 외는 실패다. CI(자동 검사)가 이 값을 보고 통과 여부를 정한다.

### 이 단계를 따로 둔 진짜 이유

**위반 목록이 그대로 백엔드에 보낼 요청서가 된다.**

```
❌ [error-schema] 에러 응답이 성공 응답과 같은 스키마를 가리킨다 — 99건
     springdoc이 content를 안 적으면 핸들러 반환 타입을 물려준다. …
     · POST /api/v0/organizations 409
     · POST /api/v0/cohorts 400
```

`gen` 안에 묻어 두면 이 목록이 안 나온다. **그리고 실패했을 때 대응 주체가 다르다** — 이건 백엔드가 고칠 일이고, `gen` 실패는 내가 고칠 일이다.

### 기성 린터를 안 쓴 이유

OpenAPI 린터(Spectral 등)가 이미 있다. **그런데 우리 문제를 거의 못 잡는다** — 위 문제들은 **문법적으로 완전히 올바른 문서**다. "OpenAPI를 잘못 썼다"가 아니라 "우리가 쓰려는 방식과 안 맞는다"이기 때문이다.

---

## 5. 3단계 · `api:gen` — 코드를 만든다

파일: `scripts/api-gen.mjs` (약 470줄)

여기가 본체다. 순서대로 따라간다.

### 5-0. 시작 — 스펙 전체를 타입으로

```js
execFileSync('npx', ['openapi-typescript', cfg.spec.file, '-o', `${sharedDir}/schema.d.ts`])
```

**외부 도구를 하나 쓴다.** `openapi-typescript`는 OpenAPI 문서를 TypeScript 타입으로 바꿔 주는 라이브러리인데, **런타임 코드를 하나도 만들지 않는다.** 타입만 나온다.

결과물은 이렇게 생겼다.

```ts
export interface paths {
  '/api/v0/organizations': {
    get: operations['findOrganizations']
    post: operations['createOrganization']
  }
  ...
}
export interface operations {
  findOrganizations: {
    parameters: { query?: { page?: number; size?: number } }
    responses: { 200: { content: { 'application/json': { content: {...}[] } } } }
  }
}
```

**이 파일은 사람이 직접 안 쓴다.** 너무 길고 중첩이 깊다. 우리가 만드는 별칭(`findOrganizations_Response` 등)이 이걸 가리킨다.

> 이 파일이 **한 벌뿐인 이유**: 스펙이 하나이기 때문이다. 도메인이 여러 개로 나뉘어도 원본 타입은 하나다.

---

### 5-0-1. 그 전에 — 스펙에는 대체 뭐가 들어 있나

IR을 이해하려면 **재료가 뭔지** 먼저 알아야 한다. 이 절은 `api/openapi.json`을 실제로 열어 센 것이다.

> **OpenAPI가 처음이면** [OpenAPI(스웨거)가 뭔가](openapi-basics.md)를 먼저 읽는다 — 무엇이고, 누가 만들고, 어떤 용도가 있는지를 사전 지식 0에서 설명한다. **이 절은 그 위에서 "우리 스펙에는 실제로 뭐가 얼마나 들어 있나"를 센다.**
>
> 한 줄 요약: 명세 = **OpenAPI**(JSON 파일), 그걸 그려주는 화면 = **Swagger UI**. **우리가 받는 건 화면이 아니라 JSON 원본**이다(`/v3/api-docs`).

#### 최상위 구조 — 7개뿐이다

```jsonc
{
  "openapi": "3.1.0",          // 명세 버전
  "info":    { … },            // 제목·설명·버전
  "servers": [ … ],            // 서버 주소
  "security":[ … ],            // 전역 인증 방식
  "tags":    [ … ],            // 분류 9개
  "paths":   { … },            // ★ 주소 49개 — 여기가 본체
  "components": { … }          // ★ 재사용 부품 (스키마 120개 + 인증 정의 1개)
}
```

**실질적으로 `paths`와 `components` 둘이다.** 나머지 다섯은 합쳐도 20줄이 안 된다.

#### `paths` — 주소 하나가 어떻게 생겼나

```
paths
 └ "/api/v0/organizations"          ← 주소
    ├ "get"  → 오퍼레이션 객체       ← 주소 × 메서드 = 하나의 API
    └ "post" → 오퍼레이션 객체
```

> **오퍼레이션(operation)** 은 **"주소 + HTTP 메서드" 한 쌍**이다. 같은 `/organizations`라도 `GET`(목록 조회)과 `POST`(생성)는 **다른 오퍼레이션**이다.
>
> 우리 스펙은 주소가 49개인데 오퍼레이션은 56개다. 한 주소에 메서드가 둘 이상 달린 게 있기 때문이다.

#### 오퍼레이션 객체에 실제로 있는 키 — 전수로 셌다

| 키 | 56개 중 몇 개에 있나 | 무엇 |
| --- | --- | --- |
| `tags` | **56** | 분류. `["Organization"]` |
| `summary` | **56** | 한 줄 설명 |
| `description` | **56** | 긴 설명(마크다운) |
| `operationId` | **56** | **고유 이름.** `findOrganizations` |
| `responses` | **56** | 상태코드별 응답 |
| `security` | **56** | 인증 필요 여부 |
| `x-readiness` | **56** | ⚠️ **표준이 아니다.** 아래 설명 |
| `parameters` | 45 | 주소·쿼리·헤더·쿠키 파라미터 |
| `requestBody` | 29 | 요청 본문 |

**앞의 일곱은 전부 100%다.** 처음부터 그랬던 건 아니고, 1차 검사에서 빠진 것들을 백엔드에 요청해 채운 결과다.

> **`x-`로 시작하는 키는 확장 필드다.** OpenAPI는 `x-`로 시작하는 아무 키나 넣을 수 있게 허용한다. **표준 도구는 무시하고, 아는 도구만 읽는다.** `x-readiness`는 **우리가 백엔드에 요청해서 만든 우리끼리의 약속**이다.

#### 실제 값 — 하나를 통째로 보자

```jsonc
// paths["/api/v0/organizations"]["get"]
{
  "tags": ["Organization"],
  "summary": "기관 목록 조회 | ✅ 사용 가능",
  "description": "SA-01 기관 목록 표를 채운다. …(마크다운 표 40줄)",
  "operationId": "findOrganizations",
  "x-readiness": "available",
  "security": [{ "bearerAuth": [] }],
  "parameters": [
    { "name": "query", "in": "query", "required": false, "schema": { "type": "string" } },
    …
  ],
  "responses": {
    "200": { "content": { "application/json": {
      "schema": { "$ref": "#/components/schemas/OrganizationListResponse" }
    }}}
  }
}
```

#### `$ref` — 같은 모양을 여러 곳에서 쓰는 법

```jsonc
"schema": { "$ref": "#/components/schemas/OrganizationListResponse" }
```

> **`$ref`** 는 **"저기 정의된 걸 여기다 쓴다"** 는 참조다. `#/components/schemas/X`는 같은 파일의 `components.schemas.X`를 가리킨다.
>
> 응답 모양을 오퍼레이션마다 통째로 적으면 문서가 거대해지고 **같은 걸 여러 번 적게 된다.** 그래서 `components.schemas`에 한 번 정의하고 참조한다. **우리 스펙의 스키마 120개가 그것이다.**

`listProp`을 뽑을 때 이 참조를 따라가는 게 그래서다 — `$ref` 문자열에서 이름만 떼어 `components.schemas`에서 찾는다.

#### 에러 응답 — 여기서 코드가 나온다

```jsonc
// POST /api/v0/organizations 의 409
"409": {
  "description": "ORG_NAME_TAKEN · ORG_IDEMPOTENCY_CONFLICT",
  "content": { "application/json": {
    "schema": { "$ref": "#/components/schemas/ErrorResponse" },
    "examples": {
      "ORG_NAME_TAKEN":           { "value": { "code": "ORG_NAME_TAKEN", "message": "이미 있는 기관명입니다." } },
      "ORG_IDEMPOTENCY_CONFLICT": { "value": { "code": "ORG_IDEMPOTENCY_CONFLICT", "message": "…" } }
    }
  }}
}
```

**`examples`의 키 이름이 곧 에러 코드다.** 이건 표준이 강제하는 게 아니라 **백엔드와 맺은 규약**이다. 원래 `examples`는 "예시 응답을 여러 개 보여주는" 용도인데, **키에 코드명을 넣기로 해서 기계 추출이 가능해졌다.**

---

### 스펙에서 뽑을 수 있는 것 전부 — 그리고 우리가 고른 것

여기가 이 절의 핵심이다. **뽑을 수 있는 게 훨씬 많은데 우리는 일부만 쓴다.**

| 스펙에 있는 것 | 뽑으면 뭘 할 수 있나 | 우리가 쓰나 |
| --- | --- | --- |
| `paths` 주소 문자열 | 호출 함수의 URL | ⭕ **그대로** |
| HTTP 메서드 | 조회/변경 판정, 클라이언트 메서드 | ⭕ |
| `operationId` | 함수·훅·타입 이름 | ⭕ **모든 이름의 뿌리** |
| `tags` | 폴더·파일 분류 | ⭕ |
| `parameters` (`in: path/query`) | 함수 인자 | ⭕ |
| `parameters` (`in: cookie`) | — | 🔺 **있는지만 보고 채워 준다** |
| `parameters` (`in: header`) | 헤더 인자 | ❌ 아래 설명 — **다시 볼 것 하나 있다** |
| `required` (파라미터) | 인자를 선택으로 둘지 | ⭕ |
| `requestBody` 존재 | 인자에 `body`를 넣을지 | ⭕ |
| `requestBody` content-type | multipart 걸러내기 | ⭕ |
| 성공 응답 상태코드 | 응답 타입을 어디서 꺼낼지 | ⭕ |
| 성공 응답 본문 유무 | 반환 타입 `void` 판정 | ⭕ |
| 성공 응답 `$ref` | **목록 항목 타입** | ⭕ |
| 에러 응답 `examples` 키 | **에러 코드 유니온** | ⭕ |
| `summary` | 생성 코드 주석 | ⭕ |
| `x-readiness` | 준비 안 된 API 제외 | ⭕ |
| `components.schemas` 전체 | 모든 타입 | ⭕ **단, 우리가 아니라 `openapi-typescript`가** |
| `description` (마크다운 40줄) | 문서 생성 | ❌ |
| `security` | 인증 필요 여부 분기 | ❌ |
| `servers` | 기본 주소 | ❌ |
| `info` | 버전 표시 | ❌ |
| 스키마의 `example` 값 | **자동 목 데이터** | ❌ |
| 스키마의 `minLength`·`pattern` 등 | **폼 검증 규칙** | ❌ |
| 에러 응답의 `message` 문구 | 화면 에러 문구 | ❌ |

### 안 쓰기로 한 것들 — 왜

**① `description` (오퍼레이션당 마크다운 40줄)**

우리 스펙에는 요청·응답 필드 표까지 마크다운으로 들어 있다. **읽을 가치가 매우 높은데 기계가 쓸 수는 없다.** 자유 텍스트라 파싱하면 문구가 조금만 바뀌어도 깨진다.

**사람이 읽는 용도로만 쓴다.** 실제로 이 문서를 만들면서 여러 번 참고했다.

**② `security` — 인증 필요 여부**

전 오퍼레이션에 `[{ "bearerAuth": [] }]`가 붙어 있다. 이걸로 "이 API는 로그인이 필요하다"를 알 수 있다.

**안 쓴다. 토큰 부착이 오퍼레이션별 결정이 아니기 때문이다.** 통신 계층 미들웨어가 **토큰이 있으면 항상 붙인다.** 로그인이 필요 없는 API에 토큰이 붙어도 서버가 무시한다.

> 오퍼레이션마다 분기하면 **분기 하나가 더 생기는데 얻는 게 없다.**

**③ `servers` — 서버 주소**

스펙에 배포 서버 주소가 적혀 있다. **안 쓴다.**

**환경마다 주소가 다르기 때문**이다. 스펙의 주소를 쓰면 로컬 개발에서도 배포 서버를 부르게 된다. 주소는 **빌드 시점 환경 변수**로 넣는다.

**④ `parameters` 중 `in: header` — 16개 있는데 안 쓴다**

세어 보니 세 종류였고, **전부 `required: false`** 다.

| 헤더 | 몇 개 | 스펙 설명 | 안 쓰는 이유 |
| --- | --- | --- | --- |
| `X-Request-Id` | 11 | *"추적용 식별자이며 **생략 시 서버가 생성합니다**"* | 서버가 만든다. 우리가 만들면 오히려 추적이 갈린다 |
| `X-Swagger-Client-Origin` | 3 | *"Swagger UI 테스트 시 실제 프론트엔드 Origin. **일반 프론트 요청에서는 생략합니다**"* | **스펙이 직접 쓰지 말라고 적어 뒀다.** 브라우저가 `Origin`을 자동으로 붙인다 |
| `Idempotency-Key` | 2 | *"재시도 안전을 위한 멱등성 키(UUID). 생략 가능."* | ⚠️ **아래** |

앞의 둘은 명확하다. **세 번째는 다르다.**

> **멱등성(idempotency)** 이란 **같은 요청을 여러 번 보내도 결과가 한 번 보낸 것과 같은** 성질이다. `Idempotency-Key`는 "이 키로 이미 처리했으면 또 만들지 말고 같은 결과를 돌려달라"는 요청이다.
>
> 붙어 있는 곳이 `POST /organizations`(기관 생성)와 `DELETE /organizations/{id}`(기관 삭제)다 — **두 번 실행되면 안 되는 것들**이다.

**지금 안 쓰는 이유:** 생성 버튼에 `isPending` 잠금이 걸려 있고 변경 요청은 재시도하지 않게 해 뒀다(`mutations: { retry: 0 }`). **중복 요청이 나갈 경로가 지금은 없다.**

**다시 볼 조건:** 사용자가 새로고침·뒤로가기로 같은 생성을 두 번 보내는 사례가 **실제로 관측되면**. 그때는 IR에 필드를 더해 생성 함수가 키를 만들어 붙이게 한다.

> 그리고 이게 **`description`을 사람이 읽어야 하는 이유의 실례**다. 이 셋을 구분한 근거가 전부 설명문에 있었다 — 기계는 "헤더 파라미터 16개"까지만 알려준다.

> 참고로 `in: cookie`는 2개 있고, **그건 IR에 담았다**(`hasCookie`). 헤더와 달리 **`required: true`로 선언돼 있어서** 안 다루면 타입 검사가 실패하기 때문이다. **IR 필드는 필요해서 생기지, 미리 만들어 두지 않는다.**

**⑤ 스키마의 `example` 값 → 자동 목 데이터**

스펙에 예시 값이 있으니 목 데이터를 자동 생성할 수 있다. **안 한다.**

**우리 목은 값이 아니라 상황을 재현한다** — 이름이 없는 계정, 반이 0개인 기수, 무효 처리된 응시. 자동 생성물은 `name: "string"` 같은 것만 만든다. **화면이 검증해야 하는 케이스를 만들지 못한다.**

**⑥ 스키마의 검증 규칙(`minLength`·`pattern`·`maxLength`) → 폼 검증**

이건 **가장 아까운 것**이다. 서버가 "비밀번호 8자 이상"을 알고 있는데 우리가 또 적고 있다.

**지금은 안 쓴다.** 이유가 둘이다.

- 우리 폼이 4개뿐이고 규칙이 4종이다. **생성기를 만드는 비용이 이득보다 크다**
- 진짜 필요한 건 **폼 검증이 아니라 서버 실패를 필드에 표시하는 것**이다(`fieldErrors`)

> **다시 열 조건:** 폼이 10개를 넘고 스펙의 검증 규칙과 우리 규칙이 실제로 어긋나기 시작하면, **스키마 검증 라이브러리를 스펙에서 생성**하는 방식으로 검토한다. **손으로 쓰는 방식은 안 한다** — 생성 타입과 갈린다.

**⑦ 에러 응답의 `message` 문구**

`"이미 있는 기관명입니다."` 같은 문구가 스펙에 있다. **화면에 그대로 띄우지 않는다.**

**그건 개발자용 문구이고, 화면 문구는 우리가 정한다** — 백엔드도 그렇게 명시했다. 우리가 쓰는 건 **`code`뿐**이고, 문장은 화면이 상황에 맞게 쓴다.

### → 그래서 IR이 이렇게 생겼다

위 표에서 ⭕만 남기면 **정확히 IR 필드 17개가 된다.**

```
스펙의 오퍼레이션 객체 (키 9개, 그 안에 중첩 수십 개)
        │
        │  ⭕만 뽑는다
        ▼
IR의 Operation 객체 (평평한 필드 17개)
```

**IR은 "스펙의 축소판"이 아니라 "우리가 쓰기로 한 것만 평평하게 편 것"이다.** 그래서 렌더러가 `op.hasQuery`처럼 **한 단계로** 읽을 수 있고, `op.parameters.filter(p => p.in === 'query').length > 0` 같은 걸 여섯 군데에서 반복하지 않는다.

> **판정 로직이 IR에 한 번만 있다는 게 핵심이다.** `queryRequired`를 렌더러 셋이 각자 계산했다면 셋 중 하나만 고쳐 놓고 넘어가는 일이 생긴다.

---

### 5-1. IR을 만든다 — 이 문서에서 제일 중요한 절

```js
const spec = JSON.parse(readFileSync(cfg.spec.file, 'utf8'))
const ir = buildIR(spec, cfg.tags)
```

**이 두 줄 아래로는 스펙 JSON을 다시 열지 않는다.** 그게 전부다.

`buildIR`은 스펙의 모든 경로 × 모든 메서드를 돌면서 객체 하나씩 만든다.

```js
for (const [path, item] of Object.entries(spec.paths ?? {})) {
  for (const [method, op] of Object.entries(item)) {
    if (!op || typeof op !== 'object' || !op.responses) continue
    ops.push({ ... })
  }
}
```

> **`if (!op.responses) continue`가 왜 있나** — `spec.paths['/x']` 아래에는 `get`·`post` 같은 메서드 말고 `parameters`·`summary` 같은 다른 키도 올 수 있다. **응답 정의가 있는 것만 오퍼레이션이다.**

#### IR 필드 전체 — 한 줄씩

각 필드가 **왜 있는지**가 중요하다. 아무거나 담은 게 아니라, **어떤 렌더러가 그걸 필요로 해서** 있다.

| 필드 | 어디서 나오나 | 왜 필요한가 |
| --- | --- | --- |
| `id` | `op.operationId` | **함수·훅·타입 이름의 뿌리.** 없으면 생성이 중단된다 |
| `method` | 객체 키 (`get`/`post`…) | **조회냐 변경이냐를 여기서 판정한다.** 이름으로 추측하지 않는다 |
| `path` | 객체 키 (`/api/v0/…`) | 호출 함수에 **문자열 그대로** 박힌다. 가공하지 않는다 |
| `tag` | `op.tags[0]` | 백엔드가 정한 분류 |
| `tagName` | `tags[tag]` 또는 camelCase 변환 | **폴더·파일 이름이 된다.** `Academic Operations` → `academic` |
| `readiness` | `op['x-readiness']` | 준비 안 된 API를 걸러낸다 |
| `summary` | `op.summary`의 `|` 앞부분 | 생성 코드의 주석 문구 |
| `hasPath` | 파라미터에 `in: 'path'`가 있나 | 함수 인자에 `path`를 넣을지 |
| `hasQuery` | `in: 'query'` | 인자에 `query`를 넣을지 |
| `queryRequired` | `in: 'query'` 중 `required: true`가 있나 | **하나라도 필수면 인자를 선택으로 만들면 안 된다** |
| `hasCookie` | `in: 'cookie'` | ⚠️ 아래 설명 |
| `hasBody` | `op.requestBody` 존재 | 인자에 `body`를 넣을지 |
| `isMultipart` | 요청 본문 타입이 `multipart/`로 시작하나 | 파일 업로드는 **생성하지 않는다** |
| `successCode` | 2xx 중 가장 작은 것 | 응답 타입을 어느 코드에서 꺼낼지 |
| `hasResponseBody` | 성공 응답에 `application/json`이 있나 | 없으면 반환 타입이 `void`(예: 204) |
| `listProp` | 아래 별도 설명 | 목록의 **항목 타입**을 뽑기 위해 |
| `errorCodes` | 4xx 응답들의 `examples` 키 | 에러 코드 유니온을 만들기 위해 |

#### ⚠️ `hasCookie`가 왜 필요한가

우리 인증은 재발급 토큰을 **httpOnly 쿠키**로 받는다. 그건 브라우저가 자동으로 싣고 **JavaScript는 읽을 수조차 없다.**

그런데 스펙이 그 쿠키를 `required` 파라미터로 선언해 뒀다. 그대로 두면 **타입이 우리에게 값을 요구**한다 — 줄 수 없는 값을.

```js
// 생성기가 대신 채워 준다. 호출자에게 묻지 않는다
op.hasCookie && 'cookie: undefined as never'
```

> **이런 게 IR에 필드가 하나 늘어나는 전형적인 이유다.** "타입 검사가 실패한다 → 왜? → 쿠키 파라미터 때문 → IR에 `hasCookie`를 담아서 렌더러가 처리하게 한다."

#### `errorCodes`를 어떻게 뽑나

백엔드와 **"에러 응답의 `examples` 키 이름을 에러 코드명으로 쓴다"** 는 규약을 맺었다. 그래서 이렇게 뽑힌다.

```js
const errorCodes = Object.entries(op.responses)
  .filter(([c]) => Number(c) >= 400)
  .flatMap(([, r]) => Object.keys(r.content?.['application/json']?.examples ?? {}))
```

스펙에 이렇게 적혀 있으면:

```jsonc
"409": { "content": { "application/json": {
  "examples": { "ORG_NAME_TAKEN": {...}, "DOMAIN_TAKEN": {...} }
}}}
```

`['ORG_NAME_TAKEN', 'DOMAIN_TAKEN']`이 나온다. 지금 전체 **58종**이다.

#### `listProp` — 목록의 항목 타입 뽑기

```js
function listPropertyOf(spec, response) {
  const ref = response?.content?.['application/json']?.schema?.$ref
  if (!ref) return null
  const schema = spec.components?.schemas?.[ref.split('/').pop()]
  const arrays = Object.entries(schema?.properties ?? {}).filter(([, p]) => p.type === 'array')
  return arrays.length === 1 ? arrays[0][0] : null
}
```

한 줄씩 읽으면:

1. 성공 응답이 **다른 스키마를 참조**하는가(`$ref`) — 아니면 포기
2. 그 스키마를 찾아간다 (`#/components/schemas/OrgListResponse` → 이름만 떼서 조회)
3. 그 안에서 **배열인 속성**을 전부 찾는다
4. **정확히 하나일 때만** 그 이름을 돌려준다

> **왜 "정확히 하나"인가** — 배열이 둘이면 어느 것이 "목록의 본체"인지 알 방법이 없다. **모르면 안 만든다.** 추측해서 틀린 타입을 만드는 것보다 안 만드는 게 낫다.

이게 있으면 `findOrganizations_Item` 같은 타입이 생기고, 표 컴포넌트가 그걸 쓴다.

---

### 5-2. 걸러낸다

IR이 만들어지면 세 번 거른다.

#### ① 이름 없는 것은 즉시 중단

```js
const missingId = ir.filter((op) => !op.id)
if (missingId.length) {
  console.error(`✗ operationId가 없는 오퍼레이션 ${missingId.length}건 — npm run api:check`)
  process.exit(1)
}
```

**이름이 없으면 함수를 만들 수 없다.** 여기서 멈추고 `api:check`를 보라고 안내한다.

#### ② 준비 안 된 것은 제외

```js
const available = ir.filter((op) => op.readiness === 'available')
const pending  = ir.filter((op) => op.readiness !== 'available')
```

`x-readiness`는 **우리가 백엔드에 요청해서 붙인 확장 필드**다.

| 값 | 뜻 |
| --- | --- |
| `available` | 써도 된다 |
| `hold` | 구현은 있는데 **환경이 막고 있다**(예: 메일 발송 불가) |
| `unavailable` | 아직 없다 |

**`available`이 아니면 호출 함수를 만들지 않는다.** 이유는 하나다 — **함수가 있으면 누군가 쓴다.**

대신 `pending` 목록은 `PENDING.md`로 나간다. **코드에서 사라지는 대신 문서로 남는다.**

> **`hold`가 왜 중요한가** — 환경 문제라 **백엔드가 `available`로 바꾸면 우리는 재생성만 하면 된다.** 조건문으로 걸렀다면 그 조건문을 찾아 지워야 했다. **데이터로 거르기 때문에 공짜다.**

#### ③ 파일 업로드는 제외

```js
const callable    = available.filter((op) => !op.isMultipart)
const handwritten = available.filter((op) =>  op.isMultipart)
```

우리가 쓰는 HTTP 클라이언트는 **JSON 직렬화를 전제**한다. 파일 업로드는 `FormData`를 직접 만들어야 해서 밖에서 손으로 쓴다. **타입은 만들어 두므로 그 손 코드가 타입 안전하게 쓸 수 있다.**

---

### 5-3. 렌더러 6개

여기서부터가 부챗살이다. **전부 `Operation[]`만 받는다. 서로의 결과물을 안 읽는다.**

먼저 태그로 묶는다.

```js
const byTag = new Map()
for (const op of callable) byTag.set(op.tagName, [...(byTag.get(op.tagName) ?? []), op])
```

그리고 태그마다 폴더 하나씩 만든다.

```js
for (const [tagName, ops] of byTag) {
  const dir = fill(cfg.paths.domain, { tagName, TagName: pascal(tagName) })
  write(`${dir}/${tagName}Types.ts`, renderDomainTypes(ops, cfg))
  write(`${dir}/${tagName}Api.ts`,   renderDomainApi(ops, cfg))
  write(`${dir}/${tagName}Keys.ts`,  renderQueryKeys(ops, cfg))
  const queries = renderQueries(ops, cfg);     if (queries)   write(…, queries)
  const mutations = renderMutations(ops, cfg); if (mutations) write(…, mutations)
}
```

> **`if (queries)`가 왜 있나** — `GET`이 하나도 없는 도메인이 있다(예: `auth`는 전부 `POST`다). 그럴 때 렌더러가 `null`을 돌려주고, **빈 파일을 만들지 않는다.**

#### 렌더러 ① `renderDomainTypes` → `{tag}Types.ts`

원본 타입은 사람이 쓸 수 없게 생겼다.

```ts
operations['login']['requestBody']['content']['application/json']
```

그래서 별칭을 만든다. 규칙은 **`{operationId}_{접미사}`** 하나뿐이다.

```ts
export type login_Body     = NonNullable<operations['login']['requestBody']>['content']['application/json']
export type login_Response = operations['login']['responses'][200]['content']['application/json']
export type login_Errors   = 'VALIDATION_FAILED' | 'LOGIN_INVALID' | …
```

**목적은 "찾지 않아도 되는 것"이다.** 백엔드가 스키마를 `LoginResponseDto`라고 이름 붙였든 뭐든, **`operationId`만 알면 타입 이름이 나온다.**

만드는 조건이 필드마다 다르다.

```js
if (op.hasPath)  → _Path
if (op.hasQuery) → _Query
if (op.hasBody)  → _Body
항상             → _Response  (본문이 없으면 void)
if (op.listProp) → _Item
if (op.errorCodes.length) → _Errors
```

> **`_Errors`가 특별한 이유** — 유니온 타입이라 `switch`가 **exhaustive**(모든 경우를 다뤘는지 컴파일러가 검사)해진다. **백엔드가 코드를 추가하면 컴파일이 알려준다.** 손으로 적은 목록은 영원히 안 알려준다.

#### 렌더러 ② `renderDomainApi` → `{tag}Api.ts`

실제로 서버를 부르는 함수다.

```ts
/** 기관 목록 조회 — `GET /api/v0/organizations` */
export const findOrganizations = (
  params: { query?: findOrganizations_Query } & RequestOptions = {},
) =>
  unwrap<findOrganizations_Response>(
    izClient.GET('/api/v0/organizations', {
      params: { query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )
```

여기서 결정이 셋 들어가 있다.

**하나, 인자를 객체 하나로 받는다.** `fn(id, query)`처럼 순서를 외우게 하지 않는다. 밑에 있는 클라이언트가 이미 이 모양이라 **변환이 없다.**

**둘, 필수 인자가 하나도 없으면 객체에 기본값을 준다.**

```js
const allOptional = !op.hasPath && !op.hasBody && !op.queryRequired
const sig = `params: {…} & RequestOptions${allOptional ? ' = {}' : ''}`
```

이게 없으면 `findConsents()`를 부를 수 없고 `findConsents({})`라고 써야 한다. **실제로 이걸 빠뜨려 실행 중에 터진 적이 있다.**

**셋, `signal`을 항상 넘긴다.** 화면을 떠나거나 검색어가 바뀌면 **이전 요청이 실제로 끊긴다.**

> **`as never`가 왜 붙나** — 우리가 만든 경로 문자열이 클라이언트의 타입 시스템에서 유니온으로 잡히는데, 그 조합을 컴파일러가 다 풀어내지 못한다. 안전성은 `unwrap<...>`의 반환 타입이 지킨다.

#### 렌더러 ③ `renderQueryKeys` → `{tag}Keys.ts`

> **쿼리 키**는 캐시 라이브러리가 데이터를 식별하는 배열이다. 같은 키면 같은 데이터로 보고, "다시 읽어라"도 이 키로 지정한다.

```ts
export const organizationKeys = {
  all: ['organization'] as const,
  findOrganizations: (params) => [...organizationKeys.all, 'findOrganizations', params.query ?? null] as const,
  findOrganization:  (params) => [...organizationKeys.all, 'findOrganization',  params.path  ?? null] as const,
}
```

**`GET`만 만든다** (`ops.filter((op) => op.method === 'GET')`). 변경에는 캐시가 없다.

**`all`이 맨 앞에 오는 게 핵심이다.** 캐시 라이브러리는 **접두어로 매칭**한다. `['organization']` 하나를 지우면 그 아래가 전부 지워진다.

참고 툴킷은 이랬다.

```ts
queryKey: ['fetchApiHomeFeed', params]   // 접두어가 없다
```

**"이 도메인 전부 다시 읽어라"를 표현할 방법이 없다.**

#### 렌더러 ④ `renderQueries` → `use{Tag}Queries.ts`

```ts
export function useFindOrganizations(
  params: { query?: findOrganizations_Query } = {},
  options?: QueryOptions<findOrganizations_Response>,
) {
  return useQuery({
    queryKey: organizationKeys.findOrganizations(params),
    queryFn: ({ signal }) => findOrganizations({ ...params, signal }),
    ...options,
  })
}
```

**하는 일이 없다.** 키(③)와 함수(②)를 잇고 취소 신호를 넘길 뿐이다. **판단이 0이라 생성해도 안전하다.**

`options`로 화면이 덮어쓸 수 있지만 `queryKey`·`queryFn`은 **뺐다** — 그 둘은 생성기가 정하는 값이고, 화면이 바꾸면 캐시가 갈라진다.

#### 렌더러 ⑤ `renderMutations` → `use{Tag}Mutations.ts`

**여기가 유일하게 "판단"이 들어간 렌더러다.**

```ts
export function useCreateOrganization(options?: MutationOptions<…>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars) => createOrganization(vars),
    ...options,
    onSuccess: (...args) => {
      // 기본 무효화 — 이 도메인의 조회를 전부 다시 읽는다
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      options?.onSuccess?.(...args)
    },
  })
}
```

**"무엇을 다시 읽어야 하나"는 스펙에 없다.** 기관을 만들면 기관 목록을 다시 읽어야 한다는 건 **도메인 지식**이지 문서에 적힌 사실이 아니다.

그래서 이렇게 갈랐다.

| | 생성 가능한가 |
| --- | --- |
| "정확히 어느 목록" | ❌ 모른다 |
| **"이 도메인 전체"** | ⭕ **넓게 지우는 것은 틀리지 않는다** — 과잉 재조회일 뿐 |

**순서도 결정이다.** 기본 무효화가 **먼저**, 화면 콜백이 **나중**. 반대면 화면이 무효화 전에 이동해서 낡은 목록을 잠깐 본다.

**`...args`로 흘려보내는 이유**: `onSuccess`의 인자 개수가 라이브러리 버전에 따라 바뀐다. 실제로 하나 늘어서 컴파일이 깨진 적이 있다.

#### 렌더러 ⑥ `renderErrorCodes` / `renderPending` → 공용 파일

```ts
// src/api/errorCodes.ts — 모든 도메인의 코드를 합쳐 정렬
export type ApiErrorCode =
  | 'ACCESS_DENIED'
  | 'ALREADY_INVITED'
  | …   // 58종
```

```md
<!-- src/api/PENDING.md -->
| readiness | 엔드포인트 | |
| `hold` | POST /api/v0/organizations/{id}/operators/invitations | 오퍼레이터 초대 |
```

**`PENDING.md`가 생성물이라는 게 중요하다.** 손으로 적은 목록이면 백엔드가 API를 켰을 때 **문서가 안 따라온다.** 스펙을 읽어 만들기 때문에 **다음 생성에서 자동으로 사라지고 함수가 생긴다.**

---

### 5-4. 포맷하고 끝

```js
execFileSync('npx', ['prettier', '--write', …])
```

**렌더러는 들여쓰기를 신경 쓰지 않는다.** 문자열을 대충 이어 붙이고 마지막에 포매터가 정리한다. 이게 템플릿 엔진을 안 쓴 이유이기도 하다 — **포맷은 우리 문제가 아니다.**

> **생성물을 포매터 검사 대상에서 빼지 않았다.** 일부러다. 안 빼면 **"생성한 뒤에 누가 손댔는지"까지 `format:check`가 잡아 준다.**

출력은 이렇게 나온다.

```
  src/api/ — schema.d.ts · errorCodes.ts · PENDING.md
  src/api/organization/ — organization 11개
  src/api/academic/ — academic 10개
  src/api/auth/ — auth 10개
  ...
  호출 함수 46 · 미준비 9 · 손으로 쓸 것 1
```

---

## 6. 만들어진 코드를 따라가 보기 — 요청 한 번의 전체 경로

화면에서 훅을 부르면 무슨 일이 일어나는지 **끝까지** 따라가 보자.

```tsx
const { data } = useFindOrganizations({ query: { page: 0, size: 20 } })
```

```
① use{Tag}Queries.ts     생성물
   queryKey = ['organization', 'findOrganizations', { page: 0, size: 20 }]
   캐시에 이 키가 있고 신선하면 → 여기서 끝. 요청 안 나간다
        │ 없거나 오래됐으면
        ▼
② {tag}Api.ts            생성물
   izClient.GET('/api/v0/organizations', { params: { query }, signal })
        │
        ▼
③ _contract/client.ts    손으로 쓴 것
   onRequest 미들웨어:
     · 토큰이 있으면 Authorization 헤더를 붙인다
     · 본문이 있으면 재시도용 복제본을 미리 떠 둔다
        │
        ▼
④ 실제 네트워크 요청 (credentials: 'include' — 쿠키가 실린다)
        │
        ▼
⑤ _contract/client.ts    onResponse 미들웨어
   401이면? → 재발급 1회(동시 요청은 한 번으로 합침) → 성공하면 원요청 재시도
   그 외    → 그대로 통과
        │
        ▼
⑥ unwrap()               손으로 쓴 것
   성공 → data를 그대로 반환
   실패 → ApiError를 throw (네트워크 실패는 status 0으로 구분)
        │
        ▼
⑦ 캐시 라이브러리가 받는다
   성공 → data에 담기고 화면이 그린다
   throw → isError = true, 화면이 실패 UI를 그린다
```

**②까지가 생성물이고 ③부터는 손으로 쓴 것이다.** 경계가 폴더로 갈린다.

| | 누가 쓰나 | 스펙이 바뀌면 |
| --- | --- | --- |
| `src/api/{tag}/` · `schema.d.ts` · `errorCodes.ts` | **생성기** | **통째로 다시 만들어진다** |
| `src/api/_contract/` | **사람** | 그대로 남는다 |

---

## 7. 생성기를 고쳐야 할 때

### 어디를 고치나

**생성된 파일을 고치지 않는다.** 다음 생성 때 날아간다. 고칠 곳은 상황마다 다르다.

| 고치고 싶은 것 | 어디를 |
| --- | --- |
| 파일이 놓이는 위치·이름 | **`api/codegen.config.json`** — 코드는 안 건드린다 |
| 태그 이름을 짧게 | 같은 파일의 `tags` 매핑 |
| 생성되는 코드의 모양 | `scripts/api-gen.mjs`의 해당 `render*` 함수 |
| 스펙에서 새로 읽어야 할 것 | `buildIR`에 필드 추가 → 렌더러에서 사용 |
| 스펙 검사 규칙 | `scripts/api-check.mjs` |

### 설정 파일이 값을 한 실제 사례

생성물을 처음엔 **화면 폴더 옆**(`features/{역할}/{도메인}/api/`)에 뒀다가 **중앙**(`src/api/{도메인}/`)으로 옮겼다.

이유는 **태그가 화면과 1:1이 아니어서**다. 한 태그를 두 역할의 화면이 같이 쓴다. 화면 폴더에 넣으면 ① 어느 화면 것인지 임의로 골라야 하고 ② 다른 역할이 쓸 때 **레이어 린트에 막힌다.**

**옮기는 데 파일을 손으로 하나도 안 건드렸다.** 설정의 경로 항목을 고치고 재생성한 게 전부다.

> **"어디에 만드나"는 가장 자주 바뀌는 결정이다.** 코드에 박으면 바꿀 때마다 파일을 옮기고 import를 고치게 된다.

### 고친 뒤 반드시 확인할 것

```bash
npm run api:gen        # 다시 생성
npm run typecheck      # 생성물이 컴파일되나 — 생성기 버그를 여기서 잡는다
npm run api:test       # 생성기 자체 테스트 13개
```

**타입 검사가 생성기의 검증 도구다.** 실제로 이렇게 잡은 버그가 있다.

| 버그 | 원인 |
| --- | --- |
| 필수 쿼리 파라미터를 선택으로 만듦 | IR에 `queryRequired`를 안 담았다 |
| 쿠키 파라미터를 호출자에게 요구 | IR에 `hasCookie`가 없었다 |
| multipart 요청을 JSON으로 가정 | 요청 본문 타입을 안 봤다 |

**생성물이 컴파일되지 않으면 생성기가 틀린 것이다.**

### 생성기 테스트는 어떻게 생겼나

`scripts/api-gen.test.mjs`에 **오퍼레이션 8개짜리 고정 스펙**을 넣고, **결정이 걸린 지점만** 확인한다.

```js
test('인자 모양 — 필수가 없으면 인자 없이 부를 수 있다', () => {
  assert.match(code, /findThings = \(params: \{ query\?: findThings_Query \} & RequestOptions = \{\}\)/)
  assert.match(code, /checkThing = \(params: \{ query: checkThing_Query \} & RequestOptions\)/)
})

test('경로는 스펙 문자열 그대로 — 뭉개지 않는다', () => {
  assert.ok(code.includes("izClient.GET('/api/v0/things/{thingId}'"))
})

test('제외 규칙 — 준비 안 된 것과 multipart는 호출 함수를 만들지 않는다', () => {
  assert.ok(!code.includes('findSecret'))
  assert.ok(!code.includes('uploadThings'))
})
```

> **전체 스펙을 스냅샷으로 잡지 않았다.** 그러면 백엔드가 뭘 고칠 때마다 깨지고, 사람들이 내용을 안 보고 갱신하게 된다. **그 순간 테스트가 아니라 의식이 된다.**
>
> **고정 입력을 쓰면 깨지는 이유가 하나뿐이다 — 생성기가 바뀐 것.**

### 드리프트를 CI가 막는다

```yaml
- run: npm run api:gen
- run: git diff --exit-code -- src/api   # 생성물이 스펙과 어긋나면 실패
```

**스펙만 갱신하고 생성을 안 돌린 변경**을 막는다.

---

## 8. 자주 나오는 질문

**Q. 왜 명령이 3개인가? 파이프라인은 7단계 아닌가?**

내부 단계는 지금도 7개(렌더러 6 + 타입 생성 1)다. **명령은 "파이프라인 단계"가 아니라 "실패했을 때 누가 대응하나"로 갈랐다.**

| 명령 | 실패하면 | 누가 |
| --- | --- | --- |
| `api:pull` | 네트워크·서버 다운 | 기다린다 |
| `api:check` | 스펙 품질 | **백엔드에 요청서를 보낸다** |
| `api:gen` | 생성기 버그 | **내가 생성기를 고친다** |

`gen` 내부를 더 쪼개지 않은 이유는 **대응이 전부 같고**(생성기를 고친다), **부분 생성이 위험하며**(타입만 만들고 훅을 안 만들면 어긋난 상태가 커밋된다), **1초면 끝나기** 때문이다.

**Q. `orval` 같은 도구를 쓰면 다 해주지 않나?**

해준다. 대신 **쿼리 키 모양·에러 타입·파일 배치·목 전략을 그 도구가 정한다.** 우리는 **API가 절반만 나와서 나머지 화면이 목으로 돌아야** 하는데, 그 공존을 설정으로 구부리면 다음 버전에서 깨진다.

**재평가 조건을 남겼다** — 스펙이 안정되고 화면 규약이 굳으면 다시 검토한다.

**Q. 왜 백엔드 스펙이 이상한 걸 생성기가 고쳐주지 않나?**

**생성물이 거짓말을 하게 되기 때문이다.** 실제 사례로, 어떤 필드가 `type: integer`인데 값 목록은 문자열(`["90","180","365"]`)로 적혀 있어서 타입이 이상하게 나온다.

이걸 생성기에서 보정하면 **문서와 생성물이 다르다는 사실이 숨겨진다.** 대신 **호출부 한 곳에서, 이유를 주석으로 적고** 우회한다. 백엔드가 고치면 그 함수만 지우면 된다.

> **생성물은 스펙의 거울이어야 한다.** 스펙이 이상하면 생성물도 이상한 게 맞다.

**Q. 왜 훅까지 생성하나? 무효화는 도메인 지식이라면서.**

처음엔 "훅은 생성하지 않는다"였다가 **뒤집었다.** 참고 툴킷의 실패는 *"훅을 생성한 것"* 이 아니라 *"무효화를 비워둔 것"* 이었다 — **증상을 원인으로 오인했다.**

조회 훅은 판단이 0이라 순수 보일러플레이트고, 무효화도 **"이 도메인 전체"까지는 유도된다.** 오퍼레이션 46개를 손으로 감싸면 그 손 코드가 화면마다 미묘하게 갈린다.

**Q. IR에 필드를 추가하고 싶으면?**

`buildIR`의 `ops.push({...})`에 한 줄 더하고, 그 값을 쓰는 렌더러를 고친다. **렌더러는 스펙을 다시 열지 않는다** — 필요한 게 있으면 IR을 넓히는 게 원칙이다.

**Q. 생성 파일에 주석을 달고 싶다.**

**달 수 없다.** 다음 생성 때 날아간다. 설명이 필요하면 ① 렌더러가 주석을 같이 생성하게 하거나 ② `_contract/`나 화면 쪽에 적는다.

---

## 더 읽을 것

- [API 붙이는 법](api-usage.md) — 쓰는 법 (이 문서보다 먼저 읽어도 된다)
- [API 계층 결정 지점](api-layer-decisions.md) — 층·훅·키·타입·에러를 왜 이렇게 했나
- [codegen 설계](api-codegen.md) — 결정 41개 전량(후보·판단·근거)
- [API 경계](api-boundary.md) — 화면이 하면 안 되는 서버 판정
- [인증·세션 설계](auth-design.md) — 토큰 저장 위치와 401 재발급
