# 인증·세션 설계 — 무엇이 정석이고 우리는 무엇을 쓸 것인가

> **1~4절은 왜 이렇게 정했나(선택지 비교), 5절부터는 실제로 만든 것.**
> 옛 구조(`AuthContext` + `sessionStorage`에 토큰)는 **삭제됐다.**
>
> **결론:** 액세스 토큰은 메모리(Zustand), 리프레시는 httpOnly 쿠키 — 표준이 인정하는 형태다.
> 남은 것 하나는 **백엔드의 `GET /me`** 이고, 그게 없어서 역할만 임시로 저장하고 있다.

---

## 1. 브라우저에서 토큰을 어디에 두나 — 선택지 전량

| 저장 위치 | XSS로 털리나 | 새로고침 생존 | CSRF | 실무 평가 |
|---|---|---|---|---|
| `localStorage` | **한 줄로 전량 유출** | ⭕ | 무관 | **여전히 가장 흔하고, 권고에서는 배제된다** |
| `sessionStorage` | 〃 (탭 범위) | ⭕(같은 탭) | 무관 | localStorage와 보안 등급이 같다 |
| **JS 메모리**(모듈 변수) | 실행 중 코드에 붙어야 함 — **지속 탈취 불가** | ❌ | 무관 | **SPA에서 액세스 토큰의 정석** |
| **httpOnly 쿠키** | **JS가 읽을 수 없다** | ⭕ | **대책 필요**(SameSite) | 리프레시 토큰의 정석 |
| **BFF**(프론트 전용 백엔드가 토큰을 대신 보관) | 토큰이 브라우저에 **아예 안 온다** | ⭕ | 대책 필요 | 가장 안전. 서버가 하나 더 생긴다 |
| Service Worker 보관 | 메인 스레드에 토큰이 안 뜸 | ⭕ | 무관 | 복잡도 대비 이득이 애매해 잘 안 쓴다 |

**표준 문서가 권하는 순서**(IETF *OAuth 2.0 for Browser-Based Apps*):
**① BFF → ② Service Worker → ③ JS에 토큰을 둔다면 액세스는 메모리·짧은 수명, 리프레시는
httpOnly 쿠키 + 회전(rotation).**

### 우리는 어디에 있나 — ③이고, 그게 맞다

백엔드가 이미 이렇게 설계했다.

```
로그인 → 응답 본문: accessToken (+ 만료)      ← JS가 들고 있어야 한다
       → Set-Cookie: refresh_token (httpOnly) ← JS가 못 만진다. 브라우저가 자동으로 싣는다
```

**BFF로 안 가는 이유:** 프론트 전용 서버를 하나 더 세워 운영해야 한다. 우리는 정적 배포(Vercel)
+ 스프링 백엔드 구조이고, **부트캠프 내부 도구**라 공개 인터넷의 표적 가치가 낮다.
③은 표준이 인정하는 선택지이고, 액세스 토큰이 **메모리에만 있고 수명이 짧다면** 실질 위험이
크게 준다.

> **그래서 진짜 문제는 "sessionStorage에 액세스 토큰이 남아 있다"는 것 하나다.**
> 이건 ③이 아니라 ①·②(localStorage 계열)로 내려앉은 상태다.

---

## 2. 그런데 왜 sessionStorage를 쓰고 있었나 — 진짜 원인

메모리 저장의 대가는 **새로고침하면 토큰이 사라진다**는 것이다. 정석은 이렇다.

```
앱 부팅 → refresh() 1회 → 새 accessToken → 세션 복원
```

**우리는 이게 안 된다.** 스펙을 확인했다.

```jsonc
RefreshTokenResponse: { accessToken, accessTokenExpiresIn }   // 그게 전부다
```

**역할·이름·기관이 없다.** 그리고 `/me` 엔드포인트도 없다(있는 것은 `/members/me/enrollments`뿐).

즉 새로고침하면 **"토큰은 되살렸는데 이 사람이 누구인지 모르는"** 상태가 된다. 역할을 모르면
사이드바도 라우팅도 못 그린다. 그래서 `sessionStorage`에 `role`을 같이 저장해 둔 것이다.

> ### sessionStorage는 보안을 몰라서 쓴 게 아니라 `/me`가 없어서 쓴 우회다.
> 저장소만 메모리로 바꾸면 **새로고침할 때마다 로그아웃**된다. 순서가 있다.

### 부수 문제 — 클라이언트가 든 `role`은 낡는다

지금 구조는 로그인 시점의 역할을 브라우저가 계속 들고 있다. **그 사이 계정이 정지되거나
역할이 바뀌어도 화면은 모른다.** API는 403을 주지만 화면은 이미 그려진 뒤다.
`/me`가 있으면 역할이 **서버 진실**이 되어 이 틈이 닫힌다.

---

## 3. 요청 — `GET /api/v0/members/me` 하나

```jsonc
// 응답 (로그인 응답에 이미 있는 값들이다 — 새로 만들 것이 없다)
{ memberId, email, name, role, organizationId, status }
```

**이게 있으면 우리가 얻는 것**

| | |
|---|---|
| 저장소 0 | 액세스 토큰은 메모리, 신원은 서버. **브라우저에 남는 인증 정보가 없다** |
| 권한이 즉시 반영 | 정지·역할 변경이 다음 조회에서 바로 드러난다 |
| 새로고침·새 탭 자연 복원 | 쿠키가 있으면 되살아나고, 없으면 로그인 화면 |
| 로그인 응답 축소 여지 | `redirectPath`처럼 프론트가 안 쓰는 값을 나중에 정리할 수 있다 |

**대안은 있지만 다 나쁘다.** ① `refresh` 응답에 role을 얹는다 — 되지만 `/me`가 있으면 더
쓸 데가 많다. ② 지금처럼 저장한다 — 위 두 문제가 남는다.

---

## 4. 상태 관리 — Context · Zustand · TanStack Query 중 무엇인가

### 4-1. 요즘 정석은 "인증을 하나로 관리"하지 않는다. **셋으로 나눈다**

| 무엇 | 어디에 | 왜 |
|---|---|---|
| **액세스 토큰** | **스토어**(React 밖) | fetch 미들웨어가 **동기적으로** 최신 값을 읽어야 한다 |
| **사용자 신원**(role·name) | **TanStack Query `['me']`** | 서버 상태다. 캐시·재조회·무효화가 이미 있다 |
| **로그인/로그아웃 동작** | 얇은 함수 몇 개 | 상태가 아니라 명령이다 |

**핵심은 첫 줄이다.** 토큰을 React 상태에 두면 미들웨어가 **클로저에 갇힌 옛 값**을 본다.
지금 코드가 정확히 그 증상을 앓고 있다 — `useEffect([session])`으로 세션이 바뀔 때마다
`connectAuth`를 **다시 꽂아야** 했다. 그 재주입은 원인이 아니라 증상이다.

> **인증 Context를 직접 만들지 않는다.** `AuthContext`가 하던 일은
> ① 토큰 보관 → 스토어 ② 사용자 정보 → (`/me`가 오면) `['me']` 쿼리 ③ 로그인/아웃 → 함수.
> **셋 다 갈 곳이 있으므로 Context는 남는 게 없다.** 실제로 삭제했다.

### 4-2. Zustand는? → **쓴다** (한 번 뒤집은 결정)

처음엔 *"auth 상태가 문자열 하나(토큰)라 스토어를 도입할 이유가 없다"* 고 봤고,
모듈 변수 + `useSyncExternalStore`로 구독을 손으로 만들었다.

**그건 "값 하나짜리 Zustand를 라이브러리 없이 만드는 것"이었다.** 구독·선택자·persist를
직접 쓰게 되는데, 그게 정확히 이 라이브러리가 하는 일이다. 그리고 `persist`의
`partialize`가 **"토큰은 저장하지 않는다"는 규칙을 코드로 강제**해 준다 — 주석보다 강하다.

`frontend-architecture.md`가 적어 둔 *"스토어 2개만(auth, cohort scope)"* 중 첫째가 이것이다.

### 4-3. 왜 `['me']` 쿼리인가 — Context보다 나은 구체적 이유

| | Context 직접 구현 | `useQuery(['me'])` |
|---|---|---|
| 로딩·에러 상태 | 손으로 만든다 | 있다 |
| 창 복귀 시 재확인 | 손으로 | 옵션 하나 |
| 로그아웃 시 캐시 정리 | 화면마다 신경 | `queryClient.clear()` 한 줄 |
| 여러 화면 동시 조회 | 중복 요청 | 자동 dedupe |

---

## 5. 이렇게 만들었다 ✅

```
src/api/_contract/
├─ client.ts        미들웨어 · 401 재발급 (인증 스토어를 모른다)
└─ authBridge.ts    토큰 게터 · refresh · 세션 종료를 꽂는 빈칸

src/features/auth/
├─ authStore.ts     ★ Zustand — 토큰·세션·연결(connectSession)
└─ AuthContext.tsx  ✖ 삭제됨
```

## 5-1. Zustand를 쓴 이유 — 모듈 변수를 손으로 만들다 바꿨다

처음엔 `session.ts`에 모듈 변수를 두고 `useSyncExternalStore`로 구독하는 코드를 손으로 썼다.
**그건 "값 하나짜리 Zustand를 라이브러리 없이 만드는 것"** 이었다. 실무에서도 인터셉터가
`store.getState()`로 토큰을 꺼내는 것이 표준이고, 구독·선택자가 공짜로 딸려온다.

```ts
export const useAuthStore = create<AuthState>()(
  persist((set) => ({ accessToken: null, session: null, endReason: null, signIn, signOut }), {
    name: 'iz-get.auth',
    storage: createJSONStorage(() => sessionStorage),
    partialize: (s) => ({ session: s.session }),   // ★ 토큰은 저장 대상에서 구조적으로 빠진다
  }),
)
export const getAccessToken = () => useAuthStore.getState().accessToken
```

**`partialize`가 이 파일의 핵심이다.** *"토큰을 저장하지 마세요"* 를 주석으로 적는 대신
**저장 대상에서 빼 버렸다.** 나중에 누가 필드를 늘려도 토큰은 안 새어 나간다.

## 5-2. `connectSession()`은 부팅 때 한 번만 부른다

```ts
// main.tsx
connectSession()
```

**이게 스토어를 쓴 이유의 증거다.** 토큰이 React 상태였을 때는 세션이 바뀔 때마다
`useEffect([session])`로 다시 꽂아야 했다 — 그 재주입이 *"React 밖 코드가 옛 값에 갇힌다"* 는
문제의 **증상**이었다. 스토어로 옮기면서 그 `useEffect`가 통째로 사라졌다.

## 5-3. 재발급 실패는 이유를 나눠 받는다

```ts
onSessionExpired(reason)   // 'expired' | 'identity-changed'
```

백엔드가 실패를 두 코드로 가른다(`REFRESH_TOKEN_INVALID` / `REFRESH_IDENTITY_CHANGED`).

| 이유 | 화면 |
|---|---|
| `expired` | **조용히** 로그인으로. 흔한 일이라 매번 알리면 잔소리가 된다 |
| `identity-changed` | *"계정 정보가 변경되어 다시 로그인해 주세요"* — **안 말하면 버그로 읽힌다** |

## 5-4. 아직 안 만든 것 — 라우트 가드

화면이 `if (!session) return null`을 각자 하지 않고 **라우트가 막는 것**이 맞다.
다만 지금은 보호 라우트가 없어도 동작하므로(로그인 화면이 세션을 보고 되돌린다)
**첫 실연동 화면에서 같이 만든다.**

```tsx
function Protected({ allow }: { allow: Role[] }) {
  const session = useAuthStore((s) => s.session)
  if (!session) return <Navigate to="/shared/login" replace />
  if (!allow.includes(session.role)) return <Navigate to={homeFor(session.role)} replace />
  return <Outlet />
}
```

> 역할이 안 맞으면 **자기 홈으로 보낸다.** 권한 없음 화면을 만들지 않는다 —
> 제품 원칙이 *"할 수 있는 일이 다르면 화면이 다르다"* 이고, 남의 화면 존재를 알려 줄 이유가 없다.

---

# 6. 토큰 갱신 시점 — 401을 기다릴 것인가, 미리 바꿀 것인가

| | 동작 | 대가 |
|---|---|---|
| **사후(reactive)** — 지금 | 401 받고 갱신 후 재시도 | 요청 하나가 왕복 2번. 구현이 단순하고 확실 |
| **사전(proactive)** | 만료 임박하면 미리 갱신 | 매끄럽다. 타이머·시계 오차 관리가 붙는다 |

**정석은 둘 다다.** 사후를 안전망으로 두고 사전을 얹는다.

**우리에게는 사전 갱신이 실제 요구사항이다.** `TR-03 검증 세션`이 **30~70분 전체화면이고
중간 이탈이 불가능**하다. 그 도중에 토큰이 만료되면 답변 제출이 401 → 재발급 → 재시도로
가는데, **재발급이 실패하면 응시가 통째로 날아간다.** 미리 갱신하면 그 창 자체가 줄어든다.

> **단위는 확인됐다 — 밀리초다.** 실제 값이 `3600000`(1시간)이었다. 초라면 41일이라
> 성립하지 않는다. **사전 갱신을 붙일 수 있다.** 다만 `SameSite`가 고쳐져 재발급이 실제로
> 동작하기 전에는 의미가 없으므로([3차 요청](../backend/backend-api-requests-3.md) R1) 그 뒤에 붙인다.

**다중 탭 동기화**(한 탭에서 로그아웃하면 다른 탭도)는 `BroadcastChannel`로 나중에 붙인다.
쿠키는 탭이 공유하므로 동작 자체는 지금도 맞고, **화면이 어긋나는 것뿐**이라 급하지 않다.

---

## 7. 진행 상황

| | 상태 |
|---|---|
| 토큰을 저장소에서 빼기 | ✅ **메모리만.** `partialize`가 구조적으로 막는다 |
| `AuthContext` 삭제 | ✅ `authStore`로 대체 |
| 통신 계층 연결 | ✅ `connectSession()` 부팅 1회 |
| 재발급 실패 이유 구분 | ✅ `expired` / `identity-changed` |
| 역할 저장(임시) | ⏳ `/me`가 오면 `['me']` 쿼리로 대체. **화면 코드는 안 바뀐다** |
| 라우트 가드 | ⏳ 첫 실연동 화면에서 |
| 사전 갱신 | ⏳ `SameSite` 수정 후 |

**가장 큰 위험(액세스 토큰이 저장소에 남는 것)은 이미 사라졌다.**
남은 역할 저장은 토큰과 위험도가 다르다 — 훔쳐도 권한이 생기지 않는다.

---

## 8. 백엔드에 물을 것 — [3차 요청서](../backend/backend-api-requests-3.md)로 전달

| | 상태 |
|---|---|
| **쿠키 `SameSite=None; Secure`** | 🔴 **막힘.** 지금 `Lax`라 크로스사이트 fetch에 쿠키가 안 실린다 → **재발급 전면 불가**(로컬 포함) |
| **배포 도메인 Origin 등록** | 🔴 막힘. 서버가 403으로 거절한다 — CORS와 별개로 **로그인 자체가 안 된다** |
| **`GET /members/me`** | 🟠 이게 없어서 역할을 저장소에 남기고 있다 |
| ~~`accessTokenExpiresIn` 단위~~ | ✅ **밀리초**(3600000 = 1시간). 사전 갱신을 붙일 수 있게 됐다 |

> **`SameSite`는 관측으로 나왔다.** 실제 로그인 응답의 `Set-Cookie`를 읽어 보고 알았다 —
> 스펙에는 안 적혀 있고, 백엔드 쪽에서는 Swagger UI가 같은 사이트라 정상으로 보인다.
