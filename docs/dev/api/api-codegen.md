# IZ codegen 설계 — 기존 툴킷 해부와 결정 지점 전량

> **목적:** 참고 툴킷 두 벌(원본 npm 패키지와 그것을 벤더링해 개선한 사본)을 뜯어
> **무엇이 결정이었고 무엇이 그냥 그렇게 된 것인지** 가른 뒤, IZ용 생성기의 결정을 하나씩 정한다.
>
> **전제 1 — 뷰만 안 깨지면 다 갈아엎어도 된다.** 지금의 `api.ts`·`mockDb.ts`·`AuthContext`·
> `useAsync`는 전부 API가 없던 동안의 임시 구조다.
> **전제 2 — 스펙의 절반이 아직 없다.** 55 오퍼레이션은 세팅·계정 절반이고 제품 핵심
> 루프(제출→세션→리포트→면담)는 스펙에 없다([backend-api-requests.md](../backend/backend-api-requests.md) 4절).
> **그래서 "생성물과 목이 공존한다"가 요구사항이지 과도기 편법이 아니다.**

---

# 1부 · 기존 툴킷 해부

## 1-1. 두 폴더의 관계

```
원본 툴킷 (npm 패키지 형태)
  └─ 벤더링본  ← 통째로 복사해 프로젝트 안에 넣고 일반화
```

**벤더링 쪽이 더 낫다.** 실제로 개선된 것들:

| | |
|---|---|
| 태그 전략 | 경로 첫 세그먼트 → **OpenAPI `tags`**(`specLoader`가 path→tag 맵을 만들고 `tagContext`가 단일 출처) |
| 하드코딩 제거 | 특정 서버·태그 제외 룰 → `tagFilters.exclude` 설정으로 |
| 플랫폼 누수 | `useToast:false`면 웹 전용 토스트 import를 아예 안 만든다 |
| 진입점 | 번들 CLI 대신 명시적 러너(`generate.mjs`) — 서버 단위로 컨텍스트 격리 |

**즉 참고 대상은 벤더링본이다.** 원본은 그 조상으로만 본다.

## 1-2. 파이프라인 실제 동작

```
OpenAPI JSON
  → [openapi-typescript]  src/types/{srv}/schema.d.ts     (paths/components/operations)
  → [TypeGenerator]       validated.ts   operationId별 _Body/_Params/_Response/_RO
  → [TagsGenerator]       tags.ts
  → [DomainAPIGenerator]  api/{srv}/{tag}/{tag}API.ts     openapi-fetch 호출 함수
  → [ReactQueryGenerator] use{Tag}Queries.ts / Mutations.ts
손으로 쓰는 계약 2개: _contract/fetcher.ts (createClient + 인증 미들웨어)
                      _contract/handlers.ts (handleAPIResponse · ApiError)
```

## 1-3. ★ 근본 결함 — 텍스트 → 정규식 → 텍스트 파이프라인

**이 툴킷은 OpenAPI 문서를 자료구조로 다루지 않는다. 자기가 방금 만든 TypeScript 파일을
정규식으로 다시 읽는다.**

```js
// TypeGenerator — schema.d.ts '문자열'에서 응답 타입을 찾는다
operationDetails.match(/responses:\s*\{[\s\S]*?(?:20\d|default):[\s\S]*?['"](?:application\/json|\*\/\*)['"]:\s*components\[...\]\[['"]([^'"]+Response)['"]\]/)
// 못 찾으면
generatedTypes.push(`export type ${operationId}_Response = any;`)   // ← README가 인정한 그 폴백

// ReactQueryGenerator — 방금 만든 {tag}API.ts '텍스트'를 정규식으로 파싱
const functionRegex = /export const (\w+) = async \((.*?)\) => \{([\s\S]*?)\n\};/g
// 그리고 query냐 mutation이냐를 '함수 이름 접두어 문자열'로 판정한다
if (functionName.startsWith('create') || functionName.startsWith('modify') || ...)
```

**여기서 파생된 증상이 전부 README의 「알려진 한계」다.**

| 증상 | 진짜 원인 |
|---|---|
| 응답 타입이 `any`로 폴백 | 정규식이 스키마 이름 패턴(`...Response`로 끝남)에 의존. 이름이 다르면 못 찾음 |
| 함수명이 `createApiAuthOauth2Id` | 경로에서 만들었고 `{provider}` → `Id`로 뭉갬. **`operationId: oauthLogin`이 바로 옆에 있는데 안 씀** |
| query/mutation 오분류 위험 | HTTP 메서드(스펙에 있는 사실)가 아니라 **함수명 접두어**(우리가 만든 문자열)로 판정 |
| 태그 이름 하이픈 처리 버그성 코드 | `tagName.replace(/-./g, x => x[1].toUpperCase())`가 생성기 여러 곳에 흩어져 중복 |

> **결론: 재사용할 것은 이 코드가 아니라 이 코드가 만들어 낸 "산출물의 모양"이다.**
> IR(중간표현)을 한 번 만들고 거기서 렌더하면 위 증상이 **전부 원인 단계에서 사라진다.**

## 1-4. 그 외 실측된 문제

| # | | 근거 |
|---|---|---|
| 1 | **모든 API 파일이 `const { GET, POST, PUT, PATCH, DELETE } = fetcher`를 뽑는다** — 실제로 POST만 쓰는 파일도 5개 전부 | `authAPI.ts` |
| 2 | **쿼리 키가 `['fetchApiHomeFeed', params]`** — 계층이 없어 `기수 하나만 무효화` 같은 게 불가능 | `useHomeQueries.ts` |
| 3 | **무효화가 아예 없다.** mutation 훅에 `onSuccess` 없음 → 생성·수정 후 목록이 안 갱신된다 | `useAuthMutations.ts` |
| 4 | **에러 타입이 `Error`** — `handleAPIResponse`는 `ApiError`(status·code)를 던지는데 훅 시그니처는 `Error`라 `error.code`에 못 닿는다 | 두 파일 대조 |
| 5 | **`_RO` 타입을 만들지만 아무도 안 쓴다** — 봉투 해제를 생성 코드가 안 하므로 화면이 `res.data.x`를 손으로 판다 | `validated.ts` ↔ `authAPI.ts` |
| 6 | **`AbortSignal`을 안 넘긴다** — React Query가 주는 `signal`을 fetch에 안 꽂아 화면 이탈 후에도 요청이 산다 | 훅 템플릿 |
| 7 | **suspense 변형을 항상 같이 만든다** — 안 쓰는 쪽이 절반 | 훅 템플릿 |
| 8 | 설정 항목이 40개가 넘는데 **실제 의미를 갖는 것은 10개 남짓** (`deepSchema`·`endpoints`는 꺼둔 채로 코드가 남아 있음) | `<프로젝트>.config.json` |
| 9 | 생성물에 **"자동 생성물이니 손대지 마라"** 표식이 없다(주석·`.gitattributes`·lint 제외 전부 없음) | 생성 파일 헤더 |

**공정하게 — 잘 된 것도 있다.** `fetcher.ts`의 **토큰 게터/refresh 핸들러 주입**과
**401 single-flight + 요청 clone 재시도**는 제대로 된 설계다. 순환 의존을 구조로 끊었고,
동시 401에서 refresh가 한 번만 돌게 했다. **이 두 가지는 그대로 가져온다.**

---

# 2부 · 결정 지점 전량

각 항목: **후보 → 판단 → 근거**. `★`는 되돌리기 비싼 것(먼저 정한다), `☆`는 나중에 바꿔도 싼 것.

## A. 스펙을 어떻게 취급하나

### ★ A1. 스펙 소스 — 라이브 URL vs 커밋된 스냅샷
| 후보 | |
|---|---|
| 매번 원격 URL fetch (현행) | 백엔드가 배포하면 우리 생성물이 **말없이 바뀐다**. 오프라인·CI에서 실패 |
| **스냅샷을 레포에 커밋** ✅ | `api/openapi.json`을 커밋. `npm run api:pull`로만 갱신 |

**판단: 스냅샷 커밋.** 스펙 갱신이 **PR diff로 보인다** — "백엔드가 무엇을 바꿨나"가 리뷰
대상이 된다. 지금 백엔드가 스펙을 자주 바꿀 단계라 이게 결정적이다. CI 재현성은 덤.

> **재검(8/7) — 근거가 하나 더 생겼다.** Railway 엣지가 **옛 스펙을 캐시해서 준다.**
> 1차 수정 직후 받아보니 이전 파일과 **바이트 단위로 동일**해서 "반영 안 됐다"고 오판했고,
> 캐시버스터(`?cb=<타임스탬프>` + `Cache-Control: no-cache`)를 붙이니 243KB 새 파일이 나왔다.
> **`api:pull`은 반드시 캐시를 무력화하고, 받은 파일의 해시를 찍어 남긴다.**

### ★ A2. 스펙 검증 게이트
**판단: 자체 검사 스크립트를 만든다**(외부 린터 도입 안 함).
[backend-api-requests.md](../backend/backend-api-requests.md)에서 센 것들(에러 스키마 = 성공 스키마, `required` 없음,
`nullable` 0건, 목록 봉투 불일치, `operationId` 중복)을 **그대로 검사 규칙으로 굳힌다.**
- Spectral/Redocly는 규칙이 방대하지만 **우리 문제 대부분을 잡지 못한다**(문법은 valid하다).
- `api:pull` 뒤 자동 실행 → **위반 목록이 곧 백엔드에 보낼 요청서**가 된다. 문서를 손으로 다시 쓰지 않는다.
- 실패시켜 막지는 않는다(경고). 지금 전부 위반이라 막으면 아무것도 못 한다.

### ☆ A3. 생성물 커밋 vs 빌드 타임 생성
**판단: 커밋한다.** 리뷰에서 diff가 보이고(계약 변화가 눈에 띈다), CI·배포가 백엔드 가동에
의존하지 않는다. 대신 **`--check` 모드로 드리프트를 CI가 잡는다**(`design-doc.mjs`가 이미 쓰는 방식 — D10).

---

## B. 전송 계층

### ★ B1. HTTP 클라이언트 — fetch / axios / openapi-fetch / ky
| 후보 | 크기 | 타입 | 판단 근거 |
|---|---|---|---|
| 생 `fetch` | 0 | ❌ 수동 | 인터셉터·에러 정규화를 우리가 다 만든다. 결국 작은 axios를 재발명 |
| `axios` | ~13kB | ❌ 제네릭 수동 | 인터셉터·취소 성숙. 그러나 **경로·바디 타입이 스펙과 연결 안 됨** — 우리가 얻으려는 것의 절반을 포기 |
| **`openapi-fetch`** ✅ | ~2kB | ✅ `paths`에서 자동 | 경로·파라미터·바디·응답이 **스펙 타입에서 직접** 온다. 미들웨어 있음 |
| `ky` | ~4kB | ❌ | fetch 래퍼로는 좋지만 스펙 연동 없음 |

**판단: `openapi-fetch` 유지.** 벤더링본의 선택이 옳았다 — 다만 **이유가 기록돼 있지 않았다.**
결정적 근거: **잘못된 경로 문자열·빠뜨린 path param이 컴파일에서 걸린다.** axios였다면
`api.get('/api/v0/organizations/' + id)`가 오타여도 통과한다. 우리 화면 15개가 목록·상세
왕복이라 경로 실수가 가장 흔한 사고다.
> 반대 근거 하나는 인정: **파일 업로드(ZIP 제출)·다운로드(CSV)** 는 openapi-fetch가 어색하다.
> → 그 둘만 별도 얇은 함수로 뺀다(B9).

### ★ B2. 타입 생성기 — openapi-typescript / orval / kubb / hey-api / openapi-generator
| 후보 | |
|---|---|
| **`openapi-typescript`** ✅ | 타입만 만든다(런타임 0). `paths`·`components` 한 벌 → 우리가 원하는 만큼만 위에 얹는다 |
| `orval` / `kubb` / `hey-api` | **훅·클라이언트까지 다 만들어 준다.** 강력하지만 **생성 형태가 그들의 결정**이다 — 쿼리 키·에러 타입·파일 배치·목 전략이 남의 규약이 되고, 우리 화면 규약(`api.ts` 경계·목 공존)과 부딪히면 설정으로 우회하게 된다 |
| `openapi-generator`(Java) | JVM 의존. 산출물이 무겁다. 논외 |

**판단: `openapi-typescript`로 타입만 받고, 그 위 얇은 층을 우리가 만든다.**
> **이건 "직접 만들자"는 취향이 아니다.** 우리가 통제해야 하는 것이 딱 셋인데
> (① 목/실서버 공존 ② `features/*/api.ts` 경계 유지 ③ 에러 코드 계약) **전부 생성 형태에 걸린다.**
> orval을 쓰면 이 셋을 설정으로 구부리게 되고, 구부린 설정은 다음 버전에서 깨진다.
> **다만 재평가 조건을 남긴다:** 스펙이 안정되고 화면 규약이 굳으면 orval 재검토.

### ★ B3. 클라이언트 인스턴스 — 모듈 싱글톤 vs 팩토리 vs Context
| 후보 | |
|---|---|
| **모듈 싱글톤** (현행) | `export const client = createClient(...)`. 단순. 테스트에서 갈아끼우려면 모듈 목킹 필요 |
| 팩토리 + 주입 | `createApiClient(config)`를 앱이 만들어 Context로 배포. 테스트·다중 환경에 유리. **보일러플레이트가 화면까지 번진다** |
| Context | 위와 같되 훅으로 접근 |

**판단: 모듈 싱글톤 유지. 단 `createClient` 호출을 팩토리 함수로 감싸 export한다.**
```ts
export function createIzClient(opts) { /* … */ }   // 테스트·스토리북이 쓸 문
export const izClient = createIzClient({ baseUrl: BASE_URL })  // 앱이 쓰는 기본 인스턴스
```
**근거:** 우리는 서버가 하나고 테넌트별 base URL도 없다 → DI의 실익이 거의 없다.
그런데 **테스트에서 인스턴스를 만들 문 하나는 있어야 한다** — 그 비용이 3줄이라 지금 낸다.
(2줄 추가로 되돌릴 수 있는 문이므로 YAGNI 예외가 정당하다.)

### ☆ B4. baseURL 주입 시점
**판단: 빌드 타임 `import.meta.env.VITE_API_BASE`.** 우리는 Vite SPA고 환경이 배포마다
고정이다. 런타임 config(`/config.json` 로딩)는 앱 부팅에 왕복이 하나 더 붙는데 얻는 게 없다.
**단, 값이 없으면 부팅 시점에 던진다** — 조용히 `undefined/api/...`로 요청 가는 것이
참고 툴킷에서 실제로 있었던 일이다(`[임시 진단] baseUrl` 로그가 그 흔적).

### ★ B5. 인증 토큰 주입 — 직접 import vs setter 주입
**판단: setter 주입 유지(벤더링본 방식).** 클라이언트가 auth 스토어를 모른다 → 순환 의존이
**구조적으로** 불가능하고, 테스트에서 토큰을 꽂기 쉽다. 참고 툴킷 `fetcher.ts` 주석이 근거를
길게 적어 뒀는데 **그 판단은 그대로 옳다.**
> 개선 1: 전역 `let` 두 개 대신 **작은 객체 하나**(`authBridge`)로 묶는다 — 셋 이상 늘어날 때
> (로그아웃 콜백·조직 스코프 헤더) 파일 전역 변수가 흩어지는 것을 미리 막는다.
> 개선 2: **주입 안 된 상태로 인증 API가 불리면 개발 모드에서 경고**한다. 지금은 조용히 `null`.

### ★ B6. 401 처리 — refresh single-flight
**판단: 벤더링본 구현을 거의 그대로 가져온다**(clone 재시도 + `refreshing` 공유 + refresh 경로 자기제외).
**추가할 것 셋:**
1. **refresh 실패 → 로그아웃 + 로그인 이동**을 브리지 콜백으로 명시(지금은 401을 그대로 반환하고 "상위에서 처리"라고만 적혀 있다).
2. **재시도는 1회.** 두 번째 401은 그대로 던진다(무한 방지).
3. **세션 화면(TR-03) 예외 검토** — 검증 세션은 30~70분 전체화면이고 중간 이탈이 불가하다.
   세션 중 refresh 실패로 로그인 화면으로 튕기면 **응시가 통째로 날아간다.** → 세션 중에는
   재시도 후 실패해도 **화면을 유지하고 답변을 로컬에 보존**하는 경로가 필요하다(H2).

### ★ B7. 토큰 저장소
| 후보 | |
|---|---|
| `localStorage` | XSS에 노출. 새로고침 생존 |
| **메모리 + refresh는 httpOnly 쿠키** ✅ | access는 메모리, refresh는 서버가 쿠키로. XSS 내성 최상 |
| `sessionStorage` | 탭마다 격리 — 새 탭에서 로그인 풀림 |

**판단: 메모리 + httpOnly 쿠키. ✅ 확정(재검 8/7).**
`POST /auth/refresh`의 스펙 설명이 명확했다 — *"인증은 리프레시 토큰 쿠키로만 한다.
클라이언트가 직접 다룰 필요가 없다(`credentials:'include'`만 켜면 된다). 401을 받으면
재시도하지 말고 로그인 화면으로 보내야 한다."* `requestBody`도 실제로 없다.

**그래서 따라오는 것 셋 — 전부 계약이다.**

| | |
|---|---|
| `createClient({ credentials: 'include' })` | 안 켜면 쿠키가 안 실려 **refresh가 통째로 동작하지 않는다** |
| **CORS 허용 오리진** | `localhost:5173`은 `allow-credentials: true`로 **이미 열려 있다**(실측). **배포 도메인은 403** — 배포 전에 백엔드에 등록 요청 |
| refresh 401은 **재시도하지 않는다** | 백엔드가 명시했다. 즉시 로그아웃 → 로그인 |

> 우리 제품은 평가 도구다. **학생 계정 탈취가 곧 대리 응시**라 저장소 결정이 보안 결정이다.

### ☆ B8. 요청 취소
**판단: React Query의 `signal`을 항상 fetch에 전달한다.** 우리 목록 화면은 필터 타이핑이
빈번해 취소가 실제로 값을 한다(`useAsync`의 `alive` 플래그가 지금 하는 일을 진짜 취소로 승격).

### ★ B9. 에러 표현 — throw vs result
**판단: `ApiError`를 throw.** React Query와 화면 `try/catch`가 둘 다 예외 기반이라 자연스럽다.

**재검(8/7) — 코드 유니온이 실제로 가능해졌다.** 백엔드가 99개 에러 응답 전부에
`examples` 키를 **에러 코드명으로** 넣어 줘서 스펙에서 **30종을 기계 추출**할 수 있다.
→ `ApiErrorCode` 유니온을 생성한다. 오타 난 코드로 분기하면 컴파일이 실패한다.

```ts
export type ApiErrorCode = 'ORG_NAME_TAKEN' | 'LAST_OPERATOR' | ... // 생성물
export class ApiError extends Error {
  status: number
  code: ApiErrorCode | (string & {})   // 유니온 자동완성 + 미지의 코드도 허용
  fieldErrors?: { field: string; message: string }[]
}
```

> **`(string & {})`를 붙이는 이유:** 서버가 스펙에 없는 코드를 보낼 수 있다(스펙이 늘 최신은
> 아니다). 유니온으로만 좁히면 **런타임에 온 미지의 코드를 타입이 부정**해 버린다.
> 이 표기는 **자동완성은 유니온으로 뜨되 다른 문자열도 받는다.**

**⚠️ 다만 코드가 다 쓸모 있는 건 아니다.** 에러 응답이 있는 37개 중 **24개가 일반 코드뿐**이다
(`BAD_REQUEST`·`CONFLICT`·`NOT_FOUND` — HTTP 상태를 옮긴 것). 2차 요청서로 개선을 요청했지만,
**그전까지 화면 분기는 `code`가 일반 코드면 `status`로 떨어지는 2단 구조**여야 한다.
`code`만 믿고 짜면 Auth·기수 화면이 전부 같은 분기로 몰린다.

**업로드/다운로드**는 여기 안 끼운다 — `openapi-fetch` 밖의 얇은 함수 2개로 별도.

---

## C. 서버 상태 — TanStack Query를 쓸 것인가

### ★ C1. 도입 여부
현재는 `lib/useAsync.ts`(38줄) + 화면별 `useCallback`. 실제로 겪은 문제는 문서에 남아 있다 —
경합(먼저 보낸 요청이 늦게 도착), 닫힌 다이얼로그의 불필요 조회, 검색 타이핑당 3회 조회.
**전부 React Query가 기본으로 푸는 문제들이다.**

| 후보 | |
|---|---|
| `useAsync` 유지 | 40줄. 캐시·무효화·재시도·중복제거를 **화면마다 손으로** |
| **TanStack Query** ✅ | 캐시·중복제거·취소·무효화·낙관적 업데이트. 번들 +13kB |
| SWR | 가볍지만 mutation·무효화가 약함 |

**판단: 도입한다.** 결정적인 것은 캐시가 아니라 **무효화**다. 우리 화면은
"목록 → 모달에서 생성/수정 → 목록 갱신"이 15개 표 화면 전부에서 반복된다. 지금은
`reload()`를 손으로 부르는데, **연동되면 "이 변경이 어느 목록에 영향을 주나"가 화면 밖 지식이 된다.**
> 반대 근거(정직하게): 우리 화면 상당수는 한 번 읽고 마는 문서형이다(OP-05 리포트). 거기선
> 과잉이다. 그래도 **두 벌을 유지하는 비용**이 더 크다 → 한 벌로 간다.

### ★ C2. 훅을 생성할 것인가 — **구현 중 뒤집었다**

| 후보 | |
|---|---|
| **훅까지 생성** ✅ | 화면이 바로 쓴다. 쿼리 키·기본 무효화가 생성기 결정이 된다 |
| 함수만 생성 | 화면이 매번 `useQuery`를 쓴다 — 보일러플레이트가 15화면에 흩어지고 **미묘하게 갈린다** |
| 함수 + 키만, 훅은 손으로 | ~~처음 판단~~ ↓ |

**처음엔 3안이었다.** 근거는 *"무효화는 도메인 지식이라 생성하면 반드시 비어 있다.
빈 훅을 만들면 사람들이 완성품으로 본다"* 였고, 참고 툴킷의 mutation 훅에 `onSuccess`가
하나도 없다는 것을 증거로 들었다.

**뒤집은 이유 — 증상을 원인으로 오인했다.** 그 툴킷의 실패는 *"훅을 생성한 것"* 이 아니라
*"무효화를 비워둔 것"* 이었다. 갈라 보면 이렇다.

| | 판단이 필요한가 | 생성 가능한가 |
|---|---|---|
| query 훅 | ❌ 전혀 — 키와 함수를 잇는 것뿐 | ⭕ **순수 보일러플레이트** |
| mutation 호출부 | ❌ | ⭕ |
| **mutation 무효화** | ⭕ 도메인 지식 | 🔺 **태그 루트까지는 유도된다** |
| 낙관적 업데이트 | ⭕⭕ 화면마다 다름 | ❌ 생성 안 함 |

**판단: query·mutation 훅을 생성하고, 무효화는 태그 루트를 기본으로 넣어 덮어쓸 수 있게 한다.**
45개 오퍼레이션을 손으로 감싸는 것은 낭비이고, 그 손 코드가 화면마다 갈린다.

> 상세(시그니처·`onSuccess` 순서·알려진 한계)는 [api-layer-decisions.md](api-layer-decisions.md) C절.

### ★ C3. 쿼리 키 전략
**판단: 도메인별 키 팩토리를 생성한다. 단 계층은 2단이다(구현하며 축소).**
```ts
export const organizationKeys = {
  all: ['organization'] as const,                                    // 도메인 전체 무효화
  findOrganizations: (p?: unknown) => [...all, 'findOrganizations', p ?? null] as const,
  findOrganization:  (p?: unknown) => [...all, 'findOrganization',  p ?? null] as const,
}
```
벤더링본의 `['fetchApiHomeFeed', params]`는 **부분 무효화가 불가능하다** — 접두어가 없어
"이 도메인 전부"를 표현할 수 없다. `all`을 앞에 붙이는 것만으로 그게 가능해진다.

> **`lists/detail`까지 유도하려다 그만뒀다.** 경로 끝이 `{id}`인지로 목록·상세를 가를 수는
> 있지만, **"이 상세가 어느 목록에 속하는가"는 스펙에 없다.** 결국 생성기가 추측하게 되고,
> 추측이 틀리면 화면이 낡은 목록을 보여준다. **`all`로 넓게 지우는 것은 틀리지 않는다** —
> 과잉 재조회가 실측으로 문제가 될 때 그 도메인만 계층을 넣는다.

### ☆ C3-2. 훅을 안 만들면 무효화는 누가 쓰나
생성물은 **키까지만** 준다. 도메인의 `api.ts` 또는 훅에서 이렇게 쓴다.
```ts
useMutation({ mutationFn: createOrganization,
  onSuccess: () => qc.invalidateQueries({ queryKey: organizationKeys.all }) })
```
**이 한 줄이 스펙에서 유도할 수 없는 도메인 지식**이고, 그래서 사람이 쓴다(C2).

### ☆ C4. suspense 변형
**판단: 생성하지 않는다.** 우리 셸은 화면마다 로딩·부분 실패 표현이 다르고(빈 상태 3종이
레이아웃 시스템에 정의돼 있다), Suspense 경계를 아직 안 쓴다. **필요해지면 그 화면에서 손으로.**

### ☆ C5. 기본 옵션
**판단(제안값):** `staleTime: 30s` · `retry: 1`(4xx는 0) · `refetchOnWindowFocus: false`.
- 포커스 재조회를 끄는 이유: **검증 세션 화면은 창 이탈을 기록하는 화면**이다. 이탈 복귀마다
  네트워크가 튀는 것은 그 화면의 성격과 정면으로 안 맞는다.
- 4xx 재시도 0: 권한·검증 실패를 세 번 보내봐야 같은 답이다.

---

## D. 생성물의 모양

### ★ D1. 함수명 — 경로 기반 vs `operationId` 기반
**판단: `operationId` 기반.** `createApiAuthOauth2Id` 대신 `oauthLogin`.
경로 기반은 `{provider}` → `Id`처럼 정보를 잃고, 경로가 바뀌면 함수명이 바뀐다.
**단 전제: `operationId`가 전역 고유해야 한다** — 지금 `list`·`resendInvitation_1`이 있어
백엔드에 요청했다(M3). **고유하지 않은 동안은 `{tag}.{operationId}` 이름공간으로 피한다.**

### ★ D2. 그룹핑 축
| 후보 | |
|---|---|
| **OpenAPI `tags`** ✅ | 백엔드가 정한 도메인. 9개(`Organization`·`Auth`·`Academic Operations`…) |
| 경로 세그먼트 | `/api/v0/...`라 첫 세그먼트가 전부 `api`. 쓸모없다 |
| 우리 화면 코드 | 한 화면이 여러 태그를 부른다(OP-06은 기수+반+명단+매니저+비용). **N:M이라 파일이 안 나뉜다** |

**판단: `tags`.** 다만 **태그 이름에 공백이 있다**(`Academic Operations` · `Platform Governance`) →
폴더/식별자 변환 규칙을 한 곳(`toSlug`)에 두고 전 생성기가 공유한다.
참고 툴킷은 이 변환이 여러 파일에 흩어져 있었다.

### ★ D3. 파라미터 시그니처
| 후보 | |
|---|---|
| `fn(params, body)` (현행) | 인자 순서를 외워야 함. 옵셔널 조합에서 지저분 |
| **`fn({ path, query, body })` 단일 객체** ✅ | 순서 무관, 필드 이름이 문서. openapi-fetch의 `params` 모양과 같아 변환이 없다 |

**판단: 단일 객체.** 파라미터가 없으면 인자도 없다(`fn()`).

### ☆ D4. 응답 언랩
**판단: 언랩하지 않는다 — 언랩할 봉투가 없다.** IZ 스펙은 `{success,data,error}` 봉투를
쓰지 않고 DTO를 직접 반환한다(참고 툴킷과 다른 점). **`_RO` 타입 개념은 통째로 버린다.**

### ★ D4-2. 목록 응답 정규화 — **재검(8/7)에서 새로 들어온 결정**

백엔드 목록 봉투가 **5가지**다. 2차 요청서에서 **통일 요청을 철회하고 우리가 흡수하기로** 했다.

```
content · page · size · totalElements · totalPages   Organization · Cohort
content · activeCount                                SuperAdmin
organizationId · content · activeCount               Operator
classrooms                                           Classroom
enrollments                                          Enrollment
```

**판단(구현하며 뒤집음): 생성 함수는 서버 응답을 그대로 주고, `toPage()` 헬퍼가 변환한다.**

처음엔 생성기가 호출 함수의 반환값을 통째로 `Page`로 바꾸게 하려 했다. **구현하다 보니
그러면 봉투에 같이 실려 오는 값이 사라진다** — `SuperAdminListResponse.activeCount`처럼
화면이 실제로 쓰는 것들이다. 정규화가 손실 변환이 되어 버린다.

```ts
// 생성물은 서버 응답 그대로 (손실 없음)
const res = await findOrganizations({ query })
// 표에 넘기기 직전, 화면 어댑터에서 한 번 통과 (src/api/page.ts)
return toPage(res)                          // content 봉투
return toPage({ content: res.classrooms })  // 이름이 다른 둘만 여기서 맞춘다
```

| 페이지 필드 | `total` |
|---|---|
| 있음 | `totalElements` 그대로 |
| **없음** | `items.length` — **`pagedByServer: false`를 같이 준다** |

> **왜 표식이 필요한가:** 나중에 백엔드가 그 목록에 페이징을 붙이면 `items.length`가
> **한 페이지 개수를 전체로 보고**하기 시작한다. 조용히 틀리는 종류라 표식이 없으면 못 잡는다.

**교훈:** "생성기가 다 해 준다"가 항상 더 나은 게 아니다. **변환이 손실이면 생성물이 아니라
호출부에서 해야 한다** — 어느 쪽이 원본을 갖고 있는지가 기준이다.

### ★ D5. 생성물과 `features/*/api.ts`의 관계 ← **가장 중요한 결정**
현재 규약: *"화면은 목이 아니라 `api.ts`의 함수 시그니처에 의존한다"*([api-boundary.md](api-boundary.md)).
스펙 커버리지가 절반이므로 **생성물이 이 경계를 대체할 수 없다.**

| 후보 | |
|---|---|
| 화면이 생성 훅을 직접 사용 | 절반은 그런 훅이 없다. **화면이 두 세계로 갈린다** |
| 생성물을 그대로 `api.ts`로 삼음 | 목이 갈 곳이 없다 |
| **`api.ts`가 얇은 어댑터로 남고 그 안에서 생성 함수 or 목을 고른다** ✅ | 화면은 무엇에 붙었는지 모른다. 전환이 **파일 한 줄** |

**판단: 3안.**
```ts
// features/superadmin/orgs/api.ts — 화면이 유일하게 의존하는 곳(지금과 동일)
import { izApi } from '@/api/generated'
export const listOrgs = (q: OrgQuery) => izApi.organization.findOrganizations({ query: q })
//  ↑ 아직 API가 없는 도메인은 이 줄만 mockDb 버전으로 남는다
```
**이 결정이 사는 이유:** 이미 **모든 화면이 이 경계를 지키고 있다.** 15개 표 화면을 안 건드리고
백엔드를 붙일 수 있다는 뜻이고, 반대로 붙였다가 문제가 생기면 **한 줄로 목으로 되돌린다.**
> 대가는 인정한다 — 얇은 위임 함수가 도메인마다 생긴다. **그 대가가 화면 25개 재작성보다 훨씬 싸다.**

### ☆ D6. 타입 별칭 — `{operationId}_{접미사}` (팀 컨벤션 유지)
**판단: `login_Body` · `login_Response` · `login_Errors` · `findOrganizations_Item`.**

한때 `LoginBody`(PascalCase 결합)로 바꾸려 했으나 **팀 컨벤션을 유지하기로 했다.**
목적이 *"스키마 이름을 몰라도 화면에서 바로 찾는 것"* 이고, 그러려면 **규칙이 눈에 띄어야**
한다 — `_` 뒤에 붙는 접미사 목록이 자동완성에 뜬다. 결합하면 길어져 읽기도 나쁘다.

`paths['/api/v0/...']['post']['requestBody']['content']['application/json']`을 화면이 직접 쓰는 것은
읽을 수 없다. **`_RO`·`Props_*`(DeepSchema)는 만들지 않는다** — 참고 툴킷에서 아무도 안 썼다.

### ★ D7. 파일 배치 — OpenAPI 태그 = 도메인 = 폴더

```
src/api/
├─ _contract/          ← 손. client · errors · authBridge · page · options · index
├─ schema.d.ts         생성 — openapi-typescript 원본 (스펙이 하나라 한 벌)
├─ errorCodes.ts       생성 — 전역 에러 코드 유니온
├─ PENDING.md          생성 — 아직 못 쓰는 API
└─ {tag}/              생성 — auth · organization · usage · academic · member · platform · consent
   ├─ {tag}Types.ts       operationId별 별칭
   ├─ {tag}Api.ts         호출 함수
   ├─ {tag}Keys.ts        쿼리 키
   ├─ use{Tag}Queries.ts
   └─ use{Tag}Mutations.ts
```

**한 번 화면 폴더 안(`features/{역할}/{도메인}/api/`)에 뒀다가 되돌렸다.**
태그가 화면과 1:1이 아니기 때문이다 — 백엔드 문서에 명시돼 있다:

```
Usage Metering → SA-02 + OP-06 · Disclosure → TR-04 + MG-08 · Reporting → TR-04 + OP-05
```

화면 폴더에 넣으면 ① **어느 화면 것인지 임의로 골라야** 하고 ② 다른 역할이 쓸 때
**레이어 린트(`features/A` → `features/B` 금지)에 막힌다.** 앞으로 올 프로젝트·교안·리포트는
거의 다 두 역할 이상이 쓴다.

그리고 화면은 어차피 **어댑터(`features/…/api.ts`)를 통해** 쓰므로(D5) 옆에 있을 필요가 없다 —
*"생성물이 화면 옆에 있어 뭘 부르는지 보인다"* 는 장점이 **어댑터에 가려 실효가 없었다.**

> **옮기는 데 파일을 손대지 않았다.** `api/codegen.config.json`의 `paths` 한 줄과 재생성뿐이다.
> 배치를 설정으로 뺀 것의 값어치가 여기서 드러났다.

**생성물을 `src/api/` 한 트리에 가둔다** — "지울 것이 검색 한 번에 나와야 한다"는 기존 규약과 같은 원칙.
`features/` 아래에는 **손으로 쓴 것만** 남는다.

### ☆ D8. 생성물 표식
**판단: 셋 다 한다.** ① 파일 머리에 `/* 자동 생성 — 손으로 고치지 마세요. npm run api:gen */`
② `.gitattributes`에 `linguist-generated=true`(PR diff에서 접힌다) ③ prettier·oxlint 대상에서 제외.
**참고 툴킷은 셋 다 없어서** 생성 파일에 손주석을 달았다가 날아간 흔적이 `handlers.ts` 머리에 남아 있다.

---

## E. 파이프라인 구현

### ★ E1. IR 기반 vs 텍스트 정규식 기반
**판단: IR을 만든다.** 1-3절의 근본 결함을 여기서 끊는다.
```
spec.json → parse → Operation[] { id, method, path, tag, pathParams, queryParams,
                                   bodyRef, responseRef, errorCodes[], readiness }
                  → render(types.ts) / render(client.ts) / render(keys.ts)
```
**모든 생성기가 같은 배열을 읽는다.** 생성물을 다시 파싱하는 단계가 사라지고,
"query냐 mutation이냐"는 `method`를 보면 되고, 응답 타입은 `$ref`를 따라가면 된다 — `any` 폴백이 없어진다.

### ☆ E2. 렌더 방식
**판단: 템플릿 리터럴 문자열 조립 + 마지막에 prettier 한 번.**
ts-morph는 정확하지만 이 규모(파일 20개)에 과하고, handlebars는 의존성이 하나 늘 뿐 이득이 없다.
**포맷은 우리가 신경 쓰지 않는다 — prettier가 한다.**

### ★ E3. 부분 스펙 대응
**판단: `x-readiness`로 준비된 것만 생성하고, 나머지는 `src/api/PENDING.md`에 남긴다.**

**재검(8/7): 폴백이 필요 없어졌다.** 백엔드가 55개 **전부**에 `x-readiness`를 붙였다
(`available` 46 · `hold` 3 · `unavailable` 6). `summary` 문자열 파싱 계획은 폐기한다.

`unavailable`·`hold` 9건은 **함수를 만들면 안 된다** — 있으면 누군가 쓴다.
목록 문서를 같이 만드는 이유: **"이건 아직 목이다"가 코드가 아니라 문서로 보여야 한다.**
> `hold` 3건(오퍼레이터 초대·취소·재발송)과 `unavailable` 중 초대 관련은 **Railway 프리티어
> SMTP 제약**이라 구현이 없는 게 아니다 — 배포 환경이 바뀌면 `available`로 돌아온다.
> **그래서 코드가 아니라 데이터(`x-readiness`)로 거르는 것이 맞다.**

### ☆ E4. 드리프트 감지
**판단: `npm run api:gen -- --check`를 CI에.** 스펙을 갱신하고 생성을 안 돌린 PR을 막는다.
(`check-design`·`doc:design`이 이미 쓰는 방식이라 새 개념이 아니다.)

### ☆ E5. 실행 시점
**판단: 수동(`npm run api:pull && npm run api:gen`).** precommit에 넣지 않는다 — 네트워크가
커밋을 막게 된다. **CI는 `--check`만.**

---

## F. 목과 실서버의 공존

### ★ F1. 목을 남길 것인가
**판단: 남긴다.** 스펙에 없는 화면이 12개 이상이다. 논쟁 대상이 아니다.

### ★ F2. 목의 위치 — MSW vs `api.ts` 내부
| 후보 | |
|---|---|
| **`api.ts` 안의 목(현행)** ✅ | 네트워크를 안 탄다. 지금 25화면이 전부 이 방식으로 돈다 |
| MSW | 네트워크 레벨 가로채기 → 실서버와 코드가 동일. 그러나 **핸들러를 스펙 모양으로 새로 다 써야 한다**(지금 목은 그 모양이 아니다) |

**판단: 지금 방식 유지.** MSW는 **테스트(E2E·통합)를 도입할 때** 그 목적으로 검토한다 —
지금 도입하면 목을 두 벌 갖게 된다.

### ☆ F3. 스펙 기반 목 자동 생성
**판단: 안 한다.** 자동 목은 `example`과 랜덤값을 뱉는데, 우리 목은 **화면 케이스를 재현하기
위한 시나리오 데이터**다(`공백 1건 / 2건 이상`, `반 0개`, `무효 응시`…). 자동 생성물은 그걸 못 만든다.

---

## G. 런타임 검증

### ★ G1. 응답을 zod로 검증할 것인가
| 후보 | |
|---|---|
| 안 함 | 타입은 컴파일 타임 약속일 뿐 — **서버가 다르게 주면 화면에서 터진다** |
| 전량 검증 | 번들·런타임 비용. 250명 명단 파싱마다 검증 |
| **경계만 검증** ✅ | 인증 응답(토큰 모양)·세션 응답처럼 **틀리면 복구가 안 되는 것**만 |

**판단: 3안. 그리고 지금은 안 만든다.**

**재검(8/7) — 미결이 풀렸다.** C2·C3가 고쳐졌고 생성 타입을 실물로 확인했다:
`organizationId: string`(required 반영) · `slug: string | null`(nullable 반영) ·
`Role: "SUPER_ADMIN" | ...`(공유 enum). **타입이 실제와 일치한다.**
그 상태에서 전량 런타임 검증은 비용만 남는다 → **zod를 안 넣는다.**
> 되돌리는 조건: 연동 중 *"타입엔 있는데 실제로 안 오는 필드"* 를 두 번 이상 만나면 경계 검증을 붙인다.
> 폼 입력 검증은 별개다 — `react-hook-form`이 이미 있고 zod는 필요할 때 그때 붙인다.

### ☆ G2. 생성기 자체를 어떻게 검증하나 — **재검에서 빠진 것을 발견**

생성기는 조건 분기가 많은 코드다(경로 파라미터 유무 · 페이징 유무 · readiness 필터 ·
태그 슬러그화). **검증이 없으면 스펙이 바뀔 때 조용히 잘못 생성한다.**

**판단: 스냅샷 테스트 하나.** 작은 고정 스펙(오퍼레이션 5개 — GET 목록 · GET 상세 ·
POST · 페이징 없는 목록 · `unavailable` 1개)을 넣고 **생성 결과 문자열을 비교**한다.
프레임워크 없이 `node --test`면 된다.
> 전체 스펙을 스냅샷으로 잡지 않는다 — 백엔드가 뭘 고칠 때마다 스냅샷이 깨져서
> **아무도 안 보게 된다.** 고정 입력이라야 "생성기가 바뀐 것"만 잡는다.

---

## H. IZ 고유 요구 — 다른 프로젝트 툴킷에는 없던 것

### ★ H1. 역할 4개 · 화면 분리
우리는 **흐린 버튼 게이팅을 하지 않는다**(화면이 다르다). → 클라이언트에 권한 분기 인터셉터가
**필요 없다.** 403은 "라우팅이 잘못된 것"이므로 **에러 화면으로 보내면 된다.**
> 생성기에 권한 관련 기능을 넣지 않는다.

### ★ H2. 검증 세션(TR-03) — 다른 API와 성격이 다르다
30~70분 전체화면 · 중간 이탈 불가 · 답변 유실 금지 · 창 이탈을 답변 단위로 기록.
**필요한 것:** 답변 제출 실패 시 **로컬 보존 + 재시도**, refresh 실패해도 화면 유지(B6-3),
그리고 **이탈 로그를 잃지 않는 전송**(세션 종료 시 `sendBeacon` 검토).
**→ 세션 API는 생성물을 쓰되 그 위 정책은 세션 도메인이 갖는다.** 생성기 일반 규칙에 넣지 않는다.

### ☆ H3. 업로드·다운로드
코드 제출(ZIP/GitHub) · 명단 CSV 등록(`registerTraineesFromCsv`) · 리포트 인쇄/CSV.
**멀티파트와 파일 응답은 `openapi-fetch` 밖 얇은 함수 2개**로 뺀다(B1 단서).

### ☆ H4. 날짜·타임존
**서버는 시각을, 화면이 남은 시간을 계산한다**(api-boundary 2-3에서 이미 결정).
생성기는 날짜를 `string`으로 두고 변환하지 않는다 — **`date-fns`가 화면에서 한다.**
> 백엔드에 오프셋 표기를 확인 요청해 뒀다(N3).

---

# 3부 · 진행 상황

| 순서 | | 상태 |
|---|---|---|
| **0** | 백엔드에 스펙 품질 전달 (1·2차 요청서) | ✅ **전부 반영됨** — 에러 스키마·required·nullable·operationId·enum·`x-readiness`·도메인 코드 60종 |
| **1** | `api:pull` + `api:check` + 검사기 테스트 | ✅ 검사 11종 · **현재 스펙 error 0 · warn 0** |
| **2** | 손으로 쓰는 계약 — `client`·`errors`·`authBridge`·`options`·`page` | ✅ 실서버로 4가지 시나리오 검증 |
| **3** | IR + 생성기 (타입·함수·키·**훅**) | ✅ 45개 호출 함수 · 7개 도메인 · 생성기 테스트 8개 |
| **3-1** | TanStack Query 도입 · 인증을 Zustand 스토어로 (`AuthContext` 삭제) | ✅ |
| **4** | **AU-01 로그인 실연동** | 🔴 **막힘** — 쿠키 `SameSite=Lax`라 재발급이 동작하지 않는다([3차 요청](../backend/backend-api-requests-3.md) R1) |
| **5** | 나머지 도메인 · 첫 표 화면(SA-01) | ⏳ |

**4번이 여전히 핵심이다.** 로그인은 케이스가 여러 개라 **에러 계약을 가장 세게 시험한다.**
다만 지금은 **우리 쪽이 아니라 백엔드 쿠키 설정에 막혀 있다** — 생성 코드·계약 계층은
실계정으로 전 구간이 통과했다(4계정 로그인 · 에러 코드 분기 · 인증 헤더 주입 · 401 처리).

---

## 미결 — 백엔드 답이 필요한 것

| | 상태 |
|---|---|
| ~~refresh 토큰이 바디인가 쿠키인가~~ | ✅ **httpOnly 쿠키.** 스펙 설명에 명시돼 있었다 |
| ~~에러 `code` 값 목록~~ | ✅ **60종.** `examples` 키에서 기계 추출된다 |
| ~~`date-time` 타임존~~ | ✅ ISO-8601 UTC(`Z`) |
| ~~`accessTokenExpiresIn` 단위~~ | ✅ **밀리초**(`3600000` = 1시간). 관측으로 확인 |
| **쿠키 `SameSite=None; Secure`** | 🔴 **막힘** — 지금 `Lax`라 크로스사이트에서 쿠키가 안 실린다 |
| **배포 도메인 Origin 등록** | 🔴 막힘 — 서버가 403으로 거절한다(CORS와 별개) |
| **`GET /members/me`** | 🟠 세션 복원의 전제. 없으면 역할을 저장소에 남겨야 한다 |
| `totalElements`가 필터 적용 후 개수인가 | 🟡 미확인 |
| 미구현 API 출시 순서 | 🟡 우리 연동 순서를 거기 맞춘다 |
