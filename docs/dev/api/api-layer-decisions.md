# API 계층 — 결정 지점 전량과 근거

> **이 문서가 답하는 것:** 지금 `src/api/` 구조가 왜 이 모양인가. 각 결정마다
> *무슨 선택지가 있었고 · 왜 이걸 골랐고 · 언제 되돌리는가*.
>
> **읽는 법:** 위에서 아래로 읽을 필요 없다. 고치려는 자리의 번호만 찾아 읽는다.
> `★` 되돌리기 비쌈 · `☆` 나중에 바꿔도 쌈 · `⚠️` **지금 알려진 결함**
>
> 관련 문서 — [api-codegen.md](api-codegen.md)(생성기 자체) · [auth-design.md](auth-design.md)(인증) ·
> [api-boundary.md](api-boundary.md)(무엇이 서버 것인가)

---

# 0. 지금 구조 — 층과 의존 방향

```
                    ┌─────────────────────────────────────────┐
  화면              │ OrgListScreen.tsx                       │
                    └───────────────┬─────────────────────────┘
                                    │ 이 화면이 아는 유일한 경계
  어댑터(손)        ┌───────────────▼─────────────────────────┐
                    │ features/superadmin/orgs/api.ts         │  목 or 생성물을 고른다
                    └───────────────┬─────────────────────────┘
                                    │
  ─────────────────────────────────────────────────────── 여기부터 자동 생성
  훅                │ useOrganizationQueries / Mutations      │  useQuery · useMutation
  키                │ organizationKeys                        │  캐시 식별·무효화
  호출              │ organizationApi                         │  unwrap(izClient.GET(...))
  타입              │ organizationTypes                       │  findOrganizations_Item …
  스키마            │ schema.d.ts                             │  openapi-typescript 원본
  ─────────────────────────────────────────────────────── 여기부터 손으로 씀
  계약              │ _contract/ client · errors · options ·   │  전송·에러·인증 브리지
                    │            authBridge · page            │
```

**의존은 아래로만 흐른다.** 생성물은 `_contract`를 알지만 `_contract`는 생성물의 도메인을
모른다(스펙 타입만 안다). 화면은 어댑터만 알고 생성물을 직접 모른다.

---

# A. 계층을 몇 개 둘 것인가

## ★ A1. 어댑터(`features/…/api.ts`)를 남길 것인가

> **2026-08 갱신.** 아래 판단은 **목이 절반이던 시점**의 것이고, 지금은 조건이 바뀌었다.
> 원문을 지우지 않고 남긴다 — 무엇이 왜 바뀌었는지가 판단의 일부다.

### 지금 규칙 — **변환이 있을 때만 감싼다**

```
변환 없음  →  화면이 생성 훅을 직접 쓴다        (superadmin/orgs · settings)
변환 있음  →  도메인 훅으로 감싼다              (operator/projects · analysis · dashboard)
```

**층을 둘지가 아니라 변환이 실재하는지가 기준이다.** 슈퍼어드민은 `findOrganizations_Item`을
그대로 그려서 감쌀 것이 없고, 오퍼레이터 세 화면은 다르다.

| | 변환 |
|---|---|
| OP-03·04 | 상태 두 축(`status`+`readiness`) 합성 · 생성 **4콜** 오케스트레이션 · 교안 차집합 · 스코프 2콜 합성 |
| OP-02 | 셀↔열 매칭(`assessmentRoundId`) · 팀 계층 분기 · 열 번호 재매김 · 출처 문자열 조립 |
| OP-01 | 조회 3콜 병렬 + 블록별 부분 실패 |

**그 변환을 화면으로 옮기면 사라지지 않고 흩어진다.** 상태 합성을 화면이 하면 배지·필터·
정렬 세 곳이 각자 규칙을 갖고, 생성 오케스트레이션은 모달이 알게 된다.

**한 번의 호출로 끝나고 변환이 없는 쓰기는 화면이 생성 훅을 직접 쓴다** — 감싸면 위임
한 줄만 늘어난다(`useReplaceRequirements`·`useUpdateSchedule`·`useDeleteProject`).

### 원래 판단(2026-07) — 왜 뒤집혔나

당시 후보와 판단은 이랬다.

| 후보 | |
|---|---|
| 화면이 생성 훅을 직접 사용 | 층이 하나 줄어든다. **그러나 스펙에 없는 화면이 절반이라 그 화면들은 갈 곳이 없다** |
| 생성물을 그대로 화면 API로 | 목이 낄 자리가 없다 |
| **어댑터를 남긴다** ✅ | 화면은 무엇에 붙었는지 모른다. 전환이 한 줄 |

근거 셋 중 **둘이 무너졌다.**

1. ~~스펙 커버리지가 절반이다~~ → **오퍼레이터 세 도메인에 목이 하나도 안 남았다.**
   "생성 훅 쓰는 화면과 목 쓰는 화면이 갈린다"는 걱정이 그 도메인에서는 사라졌다.
2. ~~이미 25개 화면이 이 경계를 지킨다~~ → **연동된 화면은 안 지켰다.** 이 문서가 예시로
   든 `superadmin/orgs/api.ts`는 **존재한 적이 없다** — 슈퍼어드민은 처음부터 훅 직접
   사용이었다. 문서와 구현이 갈린 채로 있었다.
3. **되돌릴 수 있다** — 이건 맞았다. 실제로 되돌리는 데 도메인당 화면 6~15개였고
   대부분 기계적 치환이었다.

> **아직 목인 화면(`manager/`·`trainee/`·`operator/admin`)은 그대로 둔다.** 거기는 근거 1이
> 여전히 살아 있다 — `lib/useAsync`를 26개 파일이 쓴다. **그 화면이 연동될 때 같이 옮긴다.**

## ☆ A2. 배럴(`index.ts`)을 둘 것인가

지금 화면은 세 경로를 안다.
```ts
import { useFindOrganizations } from '@/api/organization/useOrganizationQueries'
import { organizationKeys } from '@/api/organization/organizationKeys'
import type { findOrganizations_Item } from '@/api/organization/organizationTypes'
```

| 후보 | |
|---|---|
| 지금처럼 파일 직접 | import가 길다. 대신 **어디서 왔는지가 보인다** |
| 도메인 배럴 | `@/api/organization` 하나로 줄어든다. **다만 트리셰이킹이 번들러에 의존** |
| 전역 배럴 | 이름 충돌(`findOrganizations`가 여러 도메인에 있으면) |

**판단: 지금은 만들지 않는다. 화면 한 장을 붙여 보고 정한다.**
어댑터(A1)가 이미 화면을 가려 주므로 **긴 import를 보는 것은 어댑터 파일 하나뿐**이다.
화면이 직접 import하지 않는데 편의를 위해 층을 하나 더 두는 것은 순서가 틀렸다.

---

# B. 서버 상태 라이브러리

## ★ B1. 왜 TanStack Query인가

> **2026-08 실측.** 연동된 오퍼레이터 세 화면이 전환을 마쳤고, 얻은 것이 숫자로 나왔다.
>
> | | `useAsync` | 전환 후 |
> |---|---|---|
> | 목록 → 상세 → 목록 복귀 | 조회 **4건** | **0건** (캐시) |
> | 쓰기 뒤 갱신 | `reload()`를 화면이 손으로 | 생성 훅이 자동 무효화 |
> | 같은 목록을 두 모달이 쓸 때 | 요청 **2건** | **1건** (중복 제거) |
> | 기수 스코프 | 화면마다 따로 조회 | 한 번 |
>
> **StrictMode 이중 호출도 같이 없어졌다** — `useAsync`는 두 번째 호출이 첫 결과를 버려서
> 프록시가 502를 낼 때 성공한 응답이 버려지고 실패가 화면에 남았다.

| 후보 | 판단 |
|---|---|
| 직접(`useAsync`) | ~~지금 상태~~ · **아직 목인 화면들이 쓴다**(26파일). 캐시·중복제거·무효화·취소를 **화면마다 손으로** |
| **TanStack Query** ✅ | +13kB. 아래 다섯 가지가 기본 |
| SWR | 가볍다. **mutation·무효화가 약하다** — 우리 표 15개가 전부 "수정 후 목록 갱신"이다 |
| RTK Query | Redux 전제. 우리는 Redux를 안 쓴다 |

**결정적 근거는 캐시가 아니라 무효화다.** 우리 화면은
*목록 → 모달에서 생성/수정 → 목록 갱신* 이 **표 15개에서 전부 반복**된다.
지금은 `reload()`를 손으로 부르는데, 연동되면 **"이 변경이 어느 목록에 영향을 주나"가
화면 밖 지식**이 된다.

**그리고 우리가 이미 손으로 만든 것들이 이 라이브러리의 기본 기능이다.**

| 우리가 겪은 것 | 근거 | 라이브러리의 답 |
|---|---|---|
| 경합(먼저 보낸 요청이 늦게 도착) | `useAsync`의 `alive` 플래그 | 요청 취소 + 최신 것만 반영 |
| 닫힌 다이얼로그가 조회 | *"탭 하나 진입에 조회 8건 중 5건"* 실측 | `enabled` |
| 검색 타이핑당 3회 조회 | 실측 | dedupe + `staleTime` |

## ☆ B2. Suspense 변형을 생성할 것인가

**판단: 안 만든다.** 우리 레이아웃 시스템이 **빈 상태 3종**을 화면마다 다르게 정의하고,
부분 실패("그 줄만 실패")를 요구하는 화면이 있다(MG-01 인박스). Suspense는 **경계 단위로
통째로** 처리하는 도구라 그 요구와 안 맞는다.

> 되돌리는 조건: 문서형 화면(OP-05 리포트)처럼 "전부 오거나 전부 없거나"인 화면이 늘면
> 그 화면만 `useSuspenseQuery`를 손으로 쓴다. 생성은 그때도 안 한다 — **선택이 화면마다 다르다.**

## ⚠️ B3. 기본 옵션 — **여기 결함이 하나 있다**

지금 `main.tsx`:
```ts
queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false }
```

**`retry: 1`이 4xx도 재시도한다.** 400·403·404는 다시 보내도 같은 답이고, 특히
**로그인 실패를 두 번 보내면 실패 카운터가 두 번 오른다**(백엔드가 차단을 붙이면 바로 문제).

**고칠 값:**
```ts
retry: (count, error) => error instanceof ApiError && error.status >= 500 && count < 1
```

**나머지 둘의 근거**

| | 값 | 왜 |
|---|---|---|
| `staleTime` | 30초 | 우리 데이터는 사람이 만든다(기수·반·명단). 초 단위로 안 바뀐다. 0이면 화면 전환마다 재조회 |
| `refetchOnWindowFocus` | `false` | **TR-03 검증 세션이 창 이탈을 기록하는 화면**이다. 복귀마다 네트워크가 튀는 것은 그 화면의 성격과 정면으로 안 맞는다 |

> **`refetchOnWindowFocus`는 전역으로 끄는 것이 과할 수 있다.** 운영 관리 화면은 오래 열어
> 두므로 켜는 편이 나을 수 있다. **화면 단위로 켜는 것이 맞고, 전역 기본은 끔**이 안전한 방향이다
> (모르고 켜져 있어 세션이 방해받는 것보다, 모르고 꺼져 있어 새로고침을 한 번 더 하는 게 싸다).

## ☆ B4. 에러 타입을 `ApiError`로 좁힌 이유

```ts
export type QueryOptions<TData> = Omit<UseQueryOptions<TData, ApiError, TData>, 'queryKey' | 'queryFn'>
```

기본값은 `Error`다. 그러면 화면에서 `error.code`에 못 닿아 **매번 좁히는 코드를 쓴다.**
참고 툴킷이 정확히 그 상태였다 — 던지는 것은 `ApiError`인데 훅 시그니처는 `Error`.

---

# C. 훅 생성

## ★ C1. 훅을 생성할 것인가 — **한 번 뒤집은 결정**

**처음 판단(틀림):** *"무효화는 도메인 지식이라 생성하면 반드시 비어 있다. 빈 훅을 만들면
사람들이 완성품으로 본다."* 근거로 참고 툴킷의 mutation 훅에 `onSuccess`가 하나도 없다는 것을 들었다.

**뒤집은 이유:** **그 툴킷의 실패는 "훅을 생성한 것"이 아니라 "무효화를 비워둔 것"이었다.**
증상을 원인으로 오인했다. 실제로 갈라 보면:

| | 판단이 필요한가 | 생성 가능한가 |
|---|---|---|
| **query 훅** | ❌ 전혀 — 키와 함수를 잇는 것뿐 | ⭕ **순수 보일러플레이트** |
| **mutation의 호출부** | ❌ | ⭕ |
| **mutation의 무효화** | ⭕ 도메인 지식 | 🔺 **태그 루트까지는 유도된다**(D3) |
| 낙관적 업데이트 | ⭕⭕ 화면마다 다름 | ❌ |

**판단: query·mutation 훅을 생성한다. 무효화는 태그 루트를 기본으로 넣고 덮어쓸 수 있게 한다.**
45개 오퍼레이션을 손으로 감싸는 것은 낭비이고, 그 손 코드가 **화면마다 미묘하게 달라진다.**

## ★ C1-1. 생성 훅을 쓸 것인가, 호출 함수를 직접 쓸 것인가

**기본은 생성 훅이다.** 어댑터(`_/api/api.ts`)도 예외가 아니다 — 감싸는 이유는
*변환*이지 *다시 짜기*가 아니다.

```tsx
// ✗ 어댑터 안에서 손으로 — 키·queryFn·signal이 두 벌이 된다
useQuery({ queryKey: assessmentKeys.getMyAssessmentRounds(), queryFn: ({signal}) => … })

// ⭕ 생성 훅 위에 변환만 얹는다
const query = useGetMyAssessmentRounds()
const data = useMemo(() => query.data && toHomeView(query.data), [query.data])
```

**손으로 짜면 키가 갈릴 수 있다는 게 핵심이다.** 생성기가 키를 정하는 이유가 D1이고,
어댑터가 그 키를 다시 적는 순간 그 보장이 사라진다. 지금은 같아 보여도 생성기가 키
모양을 바꾸면 어댑터만 옛 키에 남는다 — 그리고 **아무도 모른다.**

### 직접 써도 되는 자리

| | 예 |
|---|---|
| 여러 응답을 합칠 때 | OP-01 — 3콜을 `Promise.all`로 부르고 블록별 부분 실패를 담는다 |
| 순서가 있는 오케스트레이션 | OP-03 — 회차 생성이 4콜이고 뒤 호출이 앞의 id를 쓴다 |
| 훅을 못 쓰는 자리 | `authStore`의 재발급 — React 밖이다 |

**공통점은 "훅 하나로 표현이 안 된다"이다.** 변환만 필요하면 위 예처럼 생성 훅 위에
얹으면 되고, 그때는 직접 쓸 이유가 없다.

> **직접 쓸 때는 주석으로 이유를 남긴다.** 안 남기면 다음 사람이 "여기선 이렇게 하는구나"로
> 읽고 복제한다 — 실제로 TR-01 홈을 붙이면서 그렇게 짰다가 되돌렸다.

## ☆ C2. 훅 시그니처 — `(params, options)`

```ts
export function useFindOrganizations(
  params: { query?: findOrganizations_Query } = {},
  options?: QueryOptions<findOrganizations_Response>,
)
```

| 후보 | |
|---|---|
| **`(params, options)`** ✅ | 첫 인자가 "무엇을 부르나", 둘째가 "어떻게 부르나". 필수 없으면 `= {}` |
| `({ params, options })` | 한 겹 더 감싸 호출부가 길어진다 |
| `(params)`만 | `enabled`를 못 준다 — **닫힌 다이얼로그 조회 문제가 되살아난다** |

**`enabled`를 위해 `options`가 반드시 필요하다.** 우리가 실측으로 겪은 문제(탭 진입에 조회 8건
중 5건이 안 쓰는 것)의 해법이 그것이다.

## ☆ C3. mutation의 variables 모양

```ts
useCreateOrganization()  // mutate({ body: {...} })
```

**`{ path, query, body }` 객체 하나로 통일했다.** 호출 함수와 **모양이 같아서** 그대로 넘긴다
(`mutationFn: (vars) => createOrganization(vars)`). `body`만 받게 하면 path 파라미터가 있는
오퍼레이션에서 시그니처가 갈려 규칙이 둘이 된다.

## ★ C4. 무효화 기본값 — 태그 루트

```ts
onSuccess: (...args) => {
  queryClient.invalidateQueries({ queryKey: organizationKeys.all })
  options?.onSuccess?.(...args)
}
```

**순서가 결정이다.** 기본 무효화가 **먼저**, 화면이 준 `onSuccess`가 **나중**.
반대면 화면이 무효화 전에 이동해 버려 낡은 목록을 잠깐 보게 된다.

**`...args`로 흘려보내는 이유:** `onSuccess`의 인자 개수가 라이브러리 버전에 따라 바뀐다
(실제로 v5에서 4번째 인자가 늘어 컴파일이 깨졌다). 이름을 붙이면 그때마다 생성기를 고친다.

## ⚠️ C5. 무효화가 **도메인 경계를 못 넘는다** — 알려진 한계

```
POST /cohorts (academic 태그) 성공
  → academicKeys.all 무효화 ⭕
  → organizationKeys.all 은 그대로 ❌
```

그런데 `OrganizationResponse`에 **`cohorts: { total, running, closed }`** 가 있다.
**즉 기수를 만들면 SA-01 기관 목록의 "기수 3(진행 2·종료 1)"이 낡는다.**

| 후보 | |
|---|---|
| 전역 무효화(`invalidateQueries()`) | 안전하지만 **쓰기 한 번에 화면 전체가 다시 조회**된다 |
| 태그 간 의존을 설정에 선언 | `"academic": ["organization"]` — **가능하고 싼 편** |
| **화면이 `options.onSuccess`에서 추가 무효화** ✅ 지금 | 정확하지만 **잊으면 조용히 낡는다** |

**판단: 지금은 화면 책임으로 두고, 같은 누락이 두 번 나오면 설정으로 올린다.**
지금 태그 간 의존을 추측해서 선언하면 그 표가 곧 두 번째 스키마가 된다.
**대신 이 한계를 여기 적어 둔다** — 모르고 당하는 것과 알고 두는 것은 다르다.

## ☆ C6. 훅 이름 — `useFindOrganizations`

| 후보 | |
|---|---|
| **`use{operationId}`** ✅ | `useFindOrganizations`. 읽으면 어색하지만 **operationId만 알면 이름이 나온다** |
| `useOrganizationsQuery` | 자연스럽다. 그러나 **생성기가 리소스 이름을 지어내야 한다** |
| `organization.useFind…` | 이름공간은 깔끔한데 tree-shaking·자동완성이 나빠진다 |

**규칙의 예측 가능성이 읽는 맛보다 중요하다** — 타입 별칭(`login_Body`)을 규칙으로 정한 것과 같은 이유다.

## ⚠️ C7. 무효화를 `await`하지 않는다

`invalidateQueries`는 Promise를 반환하는데 지금은 기다리지 않는다.
→ **`isPending`이 "저장 완료"까지만 덮고 "목록 갱신"은 안 덮는다.** 저장 직후 버튼이 풀리고
표는 잠깐 옛 값이다.

**지금 그대로 두는 이유:** 기다리면 느린 목록 하나가 버튼을 계속 잡는다.
**바꿀 자리:** 모달을 닫고 목록으로 돌아가는 흐름에서 깜빡임이 실제로 보이면, 그 화면만
`onSuccess`에서 `return queryClient.invalidateQueries(...)`로 기다린다.

---

# D. 쿼리 키

## ★ D1. 키 팩토리를 생성한다

```ts
export const organizationKeys = {
  all: ['organization'] as const,
  findOrganizations: (params) => [...all, 'findOrganizations', params.query ?? null] as const,
}
```

**손으로 쓰면 반드시 갈린다.** 같은 조회를 두 화면이 다른 키로 부르면 **캐시가 갈라지고,
무효화가 한쪽만 맞는다.** 이건 조용히 틀리는 종류라 눈에 안 띈다.

## ★ D2. 왜 2단인가 — `all` → `operationId` → `params`

| 후보 | 표현할 수 있는 것 |
|---|---|
| `['findOrganizations', params]` (참고 툴킷) | **개별 조회만.** "이 도메인 전부"를 표현할 방법이 없다 |
| **`[tag, operationId, params]`** ✅ | 도메인 전체 · 오퍼레이션 전체 · 특정 파라미터 |
| `[tag, 'list'/'detail', id, params]` | 위 + "이 목록만" / "이 상세만" |

**4단(list/detail)까지 안 간 이유:** 경로 끝이 `{id}`인지로 목록·상세는 가를 수 있다.
그런데 **"이 상세가 어느 목록에 속하는가"는 스펙에 없다.** 생성기가 추측하면 틀릴 때
화면이 낡은 목록을 보여준다. **`all`로 넓게 지우는 것은 틀리지 않는다** — 과잉 재조회일 뿐이다.

> **무효화는 접두어 매칭**이라 `invalidateQueries({queryKey: ['organization']})` 하나가
> 그 아래를 전부 지운다. 2단만으로 "도메인 전체"가 표현되는 이유다.

## ☆ D3. 파라미터를 객체째 키에 넣는 것

```ts
[...all, 'findOrganizations', params.query ?? null]
```

**안전하다.** TanStack Query는 키를 해시할 때 **객체 키를 정렬**하므로
`{status, page}`와 `{page, status}`가 같은 캐시를 가리킨다. `undefined` 값은 직렬화에서
빠지므로 `{q: undefined}`와 `{}`도 같다.

**`?? null`을 붙이는 이유:** `undefined`는 배열 원소로 두면 뒤 원소와 자리가 밀려 헷갈린다.
`null`은 명시적으로 "없음"이다.

> **주의할 것 하나** — 키에 **화면 상태**를 섞지 않는다. 예를 들어 "선택된 행"을 키에 넣으면
> 클릭할 때마다 새 조회가 된다. 키는 **서버 요청을 식별하는 것**이지 화면 상태가 아니다.

## ☆ D4. 접두어를 태그로 쓰는 것

`['organization', …]`은 **OpenAPI 태그**다. 리소스 이름(`orgs`)이 아니다.

**태그를 쓰는 이유:** 무효화 단위가 **생성 단위와 같아야** 사람이 예측할 수 있다.
`organizationKeys.all`이 무엇을 지우는지 = `organization/` 폴더에 뭐가 있는지.
리소스 이름을 따로 지으면 그 매핑을 사람이 외워야 한다.

---

# E. 타입

## ★ E1. `{operationId}_{접미사}` 규칙

```ts
login_Body · login_Response · login_Errors
findOrganizations_Query · findOrganizations_Item
findOrganization_Path
```

**목적은 "찾지 않아도 되는 것"이다.** 스펙의 스키마 이름(`OrganizationListResponse`)을
몰라도, **operationId만 알면 타입 이름이 나온다.**

`LoginBody`(PascalCase 결합) 대신 `login_Body`인 이유는 **길이**다. 규칙이 눈에 띄어야
`Ctrl+Space`로 뒤에 붙는 접미사 목록을 볼 수 있다.

## ☆ E2. `_Item`을 추가한 이유

목록 응답에서 **항목 타입**을 뽑는다.
```ts
export type findOrganizations_Item = findOrganizations_Response['content'][number]
```
표 컴포넌트가 실제로 쓰는 것이 이쪽이다. 없으면 `OrganizationResponse`라는 **스키마 이름을
알아야** 해서 E1의 목적이 절반만 달성된다.

**판정 규칙:** 성공 응답이 `$ref`이고 그 스키마에 **배열 속성이 정확히 하나**일 때만 만든다.
둘 이상이면 어느 것이 "항목"인지 알 수 없어 안 만든다.

### ⚠ TODO — 이 결정은 걷어내기로 했다 (2026-08-13)

**위의 근거가 틀렸다.** `_Item`이 없을 때의 대안은 `OrganizationResponse`가 아니라
**바로 윗줄의 우변**이다 — `findOrganizations_Response['content'][number]` 에는 스키마
이름이 없다. 규약 안에 그대로 남는다. 즉 `_Item`이 사는 값은 「스키마 이름 은닉」이
아니라 **글자 수**뿐이다.

그 대가가 크다. 다른 다섯 별칭은 **부르는 함수만 알면** 있는지가 나오는데
(`_Path`는 경로에 `{}`가 있으면, `_Query`는 쿼리가 있으면 …), `_Item` 혼자
**응답 몸통 안**을 봐야 안다. 그래서 두 가지가 따라온다.

- **조용히 사라진다.** 명단 응답에 `rounds`가 붙어 배열이 둘이 되자 `findTraineeRoster_Item`이
  없어졌다 — 백엔드가 필드 하나 늘린 것이 공개 타입을 지웠다.
  같은 일이 `createProject`·`updateSchedule`·`findCurrentProject`에도 이미 일어났다
- **뜻이 제각각이다.** 배열이 하나면 그게 뭐든 붙어서
  `assignTrainees_Item = string`(교육생 id) · `updateTraineeStatus_Item = integer` 같은 것이 나온다
- **39개 만들어 16개 쓴다** (스펙 119 오퍼레이션 기준 · 2026-08-13 실측)

**바꿀 방향:** `_Item` 폐기. 화면은 `_Response['<속성>'][number]`를 직접 쓴다.
그러면 규칙이 한 문장이 된다 — *「오퍼레이션이 갖고 있는 것만 별칭이 된다」.*
화면이 새로 알아야 할 정보도 없다. `_Item`이 외워 주던 건 배열 속성 이름 하나인데,
화면은 어차피 `data.content.map(...)`으로 그 이름을 쓴다.
쓰는 8종은 모두 `required`라 `NonNullable`도 필요 없다.

**작업 범위**

| 어디 | 무엇 |
|---|---|
| `scripts/api-gen.mjs` | `listPropertyOf` · `op.listProp` · `_Item` 렌더 블록 삭제, 헤더 주석 1줄 |
| `scripts/api-gen.test.mjs` | `_Item` 테스트 2개 삭제 (TS2537 회귀는 `_Body`가 같은 것을 지킨다) |
| 화면 **16곳** | 슈퍼어드민 7 · 오퍼레이터 9. 전부 `type X = …` 한 줄이라 그 줄만 바뀐다 |
| 문서 | 이 절 · `api-usage.md` · `api-process.md` · `api-codegen.md` D6 |

**왜 지금 안 하나:** 16곳 중 7곳이 슈퍼어드민이라 다른 세션과 겹칠 수 있다.
OP-06을 끝내고, 슈퍼어드민을 건드려도 되는 때에 한 번에 한다.

> 중간 대안 둘은 검토했고 **안 쓴다.**
> 배열 속성마다 이름을 붙이면(`_Content`·`_Rounds`) 결정적이지만 별칭이 120개로 불고
> `_Path`·`_Body` 같은 속성명과 충돌한다. `content`일 때만 만들면 12개로 줄지만
> 「있을 때도 없을 때도 있다」는 구멍이 그대로 남는다.

## ★ E3. `_Errors` — 오퍼레이션별 에러 코드 유니온

```ts
export type login_Errors = 'VALIDATION_FAILED' | 'LOGIN_INVALID' | 'LOGIN_ACCOUNT_INACTIVE' | …
```

**이게 손으로 적는 것과 결정적으로 다른 점:** switch가 exhaustive해져서
**백엔드가 코드를 추가하면 컴파일이 알려준다.** 손으로 적은 목록은 영원히 안 알려준다.

> 실제로 한 번 손으로 적었다가(`LoginErrorCode`) 이 방식으로 바꿨다.

## ☆ E4. `GENERIC_CODES`는 생성하지 않는다

**기준: 스펙에서 유도되는가.**

| | 어디에 |
|---|---|
| `login_Errors` (스펙에 있는 값) | **생성물** |
| `GENERIC_CODES` (무엇을 분기에 못 쓰나) | **`_contract`에 손으로** — 우리 정책이다 |

한 번 생성물에 넣었다가 되돌렸다. **생성물에 넣으면 스펙에서 나온 값처럼 보여서 거짓말이 된다.**

---

# F. 에러

## ★ F1. throw — result 튜플이 아니라

React Query도 화면 `try/catch`도 예외 기반이다. `{data, error}` 튜플로 받으면
**모든 호출부에서 분기**해야 하고, 그 분기를 빼먹으면 조용히 진행된다.

## ★ F2. 화면 분기는 2단이다 — `code` → `status`

```ts
if (isGenericCode(err.code)) { /* status로 */ } else { /* code로 */ }
```

**37개 오퍼레이션 중 3개가 아직 일반 코드뿐**이고(합의된 예외), 스펙에 없는 코드가 올 수도
있다(스펙이 늘 최신은 아니다). `code`만 믿고 짜면 그런 경우가 전부 `default`로 몰린다.

## ☆ F3. 문구는 프론트가 정한다

서버 `message`를 그대로 띄우지 않는다. 백엔드도 스펙에 *"message는 사람이 읽는 기본 문구라
바뀔 수 있다"* 고 명시했다. 그대로 쓰면 **백엔드가 문구를 다듬는 순간 계정 열거 방지 규칙이
조용히 깨진다.**

## ☆ F4. 네트워크 실패는 `status: 0`

서버에 닿지도 못한 것(오프라인·CORS·타임아웃)은 서버 코드가 없다.
`code: 'NETWORK'`는 **우리가 만든 값**이고, 그 사실을 `errors.ts`에 적어 뒀다.

---

# G. 전송

## ★ G1. `openapi-fetch`
경로·파라미터·바디·응답이 스펙 타입에서 직접 온다. **오타 난 경로가 컴파일에서 걸린다.**
표 15개가 목록↔상세를 왕복하므로 경로 실수가 가장 흔한 사고다.

## ☆ G2. `signal`을 fetch까지 전달
```ts
queryFn: ({ signal }) => findOrganizations({ ...params, signal })
```
화면을 떠나거나 검색어가 바뀌면 **요청이 실제로 끊긴다.** `useAsync`의 `alive` 플래그가
하던 일(결과를 버리기)의 진짜 버전이다 — 버리는 것과 안 보내는 것은 서버 부하가 다르다.

## ★ G3. 401 재발급 — 토큰을 실제로 보낸 요청만
```
토큰을 보냈나? ─ 아니오 → 그대로 던진다
                └ 예   → refresh 1회 → 성공하면 그 요청만 재시도
```
**이 백엔드는 매핑되지 않은 경로에도 401을 준다**(토큰 없을 때). 무조건 갱신하면
**경로 오타가 강제 로그아웃**이 된다. 실측으로 확인했고 그대로 동작한다.

---

# H. 인증 — 상세는 [auth-design.md](auth-design.md)

| | 판단 | 한 줄 근거 |
|---|---|---|
| ★ 토큰 위치 | 메모리(스토어) | 저장소에 남기면 XSS로 **지속 탈취** |
| ★ 상태 관리 | Zustand | 미들웨어가 **동기로** 읽어야 한다. React 상태면 옛 값에 갇힌다 |
| ★ 저장 금지 강제 | `partialize` | 주석이 아니라 **코드가** 토큰을 저장 대상에서 뺀다 |
| ☆ 주입 | `connectAuth` | client가 인증 스토어를 모른다 → 순환 의존 원천 차단 |
| ⚠️ 역할 저장 | sessionStorage(임시) | `/me`가 없어서. **역할이 낡는다** |

---

# I. 목과 실서버의 공존

## ★ I1. 어댑터에서 고른다
```ts
// features/superadmin/orgs/api.ts
export const listOrgs = (q) => findOrganizations({ query: q })   // 실서버
// export const listOrgs = (q) => MOCK.orgs                       // 목
```
**MSW를 안 쓰는 이유:** 지금 목은 **화면 케이스를 재현하는 시나리오 데이터**다
(`공백 2건`·`반 0개`·`무효 응시`). MSW로 옮기려면 그걸 전부 다시 써야 하고, 그동안 목이 두 벌이 된다.

## ☆ I2. `x-readiness`로 거른다
준비 안 된 9개는 **호출 함수를 만들지 않는다.** 있으면 누군가 쓴다.
`PENDING.md`에 목록으로 남겨 **"이건 아직 목이다"가 코드가 아니라 문서로** 보이게 한다.

---

# J. 생성 파이프라인 — 상세는 [api-codegen.md](api-codegen.md)

| | 판단 |
|---|---|
| ★ IR 기반 | 생성물을 다시 파싱하지 않는다. `method`를 보면 query/mutation이 갈린다 |
| ★ 설정 파일 | 경로·이름이 `api/codegen.config.json` 한 곳. **배치 변경 = 설정 + 재생성** |
| ☆ 드리프트 검사 | CI가 `api:gen` 후 `git diff --exit-code` |
| ☆ 생성기 테스트 | 고정 스펙 8 오퍼레이션. 전체 스펙 스냅샷은 백엔드가 고칠 때마다 깨져 의식이 된다 |

---

# K. 아직 안 정한 것

| | 언제 정하나 | 지금 아는 것 |
|---|---|---|
| **페이지네이션 훅** | 첫 표 화면 | 우리는 **페이저(1 2 3)** 라 `useInfiniteQuery`가 아니라 `useQuery` + `placeholderData: keepPreviousData`가 맞다 — 페이지 이동 때 표가 비지 않는다 |
| **낙관적 업데이트** | 체감 지연이 실제로 보일 때 | 생성 대상 아님. 화면마다 다르다 |
| **전역 에러 알림** | 5xx가 실제로 나면 | `QueryCache.onError`로 토스트. 다만 **화면이 이미 처리한 에러까지 두 번 뜨는** 문제가 있어 규칙이 필요 |
| **사전 갱신** | `SameSite` 고쳐진 뒤 | `accessTokenExpiresIn`이 밀리초(1시간)로 확인됨. **TR-03 70분 세션에 필요** |
| **다중 탭 로그아웃 동기화** | 나중 | `BroadcastChannel`. 쿠키는 공유되므로 **화면만 어긋난다** |
| **파일 업로드** | TR-02 제출 | `openapi-fetch` 밖 얇은 함수. 타입은 생성돼 있다 |
| **분석 진행 폴링/SSE** | 스펙이 나오면 | TR-01이 "분석 중"을 보여줘야 한다 |

---

# L. 되돌리기 비용

| 결정 | 바꾸는 비용 |
|---|---|
| 어댑터 유지(A1) | **높음** — 화면 25개 |
| 훅 생성(C1) | 낮음 — 생성기 렌더러 |
| 키 계층(D2) | 중간 — 키 팩토리 + 무효화 호출부 |
| 타입 별칭 규칙(E1) | 중간 — 전 화면 import |
| 파일 배치 | **낮음** — 설정 한 줄 + 재생성 |
| 기본 옵션(B3) | 낮음 |

**배치를 설정으로 뺀 것의 값어치가 여기서 보인다** — 한 번 옮겼고, 파일을 손대지 않았다.

---

# 부록 — 지금 알려진 결함 3건

| | 무엇 | 어디 |
|---|---|---|
| ⚠️ 1 | **`retry: 1`이 4xx도 재시도한다.** 로그인 실패가 두 번 카운트될 수 있다 | B3 |
| ⚠️ 2 | **무효화가 도메인 경계를 못 넘는다.** 기수 생성 후 기관 목록의 기수 수가 낡는다 | C5 |
| ⚠️ 3 | **무효화를 기다리지 않는다.** 저장 직후 표가 잠깐 옛 값 | C7 |

1번은 **지금 고치는 게 맞다**(값 한 줄). 2·3번은 **실제로 보일 때** 고친다 —
지금 고치면 추측으로 규칙을 만드는 것이고, 그게 이 프로젝트에서 반복적으로 틀렸던 방식이다.
