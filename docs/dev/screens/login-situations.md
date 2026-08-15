# AU-01 로그인 — 상황 전수

> `docs/dev/screen-hardening.md` 1단계 결과물. 대상 파일: `LoginScreen.tsx` ·
> `LoginScreen.route.tsx` · `authStates.tsx` · `src/api/auth/authApi.ts` ·
> `src/api/auth/useAuthMutations.ts`. API: `POST /auth/login` · `GET /members/me` ·
> `POST /auth/refresh`.
>
> **범위 밖(정책 미확정, 구현하지 않음)**: 5회 실패 계정 잠금 UI · 캡차 · 세션 만료 사전 경고.
> 서버는 이미 `LOGIN_TEMPORARILY_BLOCKED`(429, 일시 차단)를 주고 프론트도 이미 반응하고
> 있으나, 이것과 별개로 "몇 번 실패하면 계정을 영구 잠글지" 등의 정책은 아직 안 정해졌다 —
> 여기서는 **지금 있는 서버 동작을 관찰·문서화**만 하고 새 정책을 만들지 않는다.
> `PasswordResetScreen.tsx` · `InviteScreen.tsx`는 범위 밖.

---

## 조회 흐름

```
useSession()            GET /members/me         ─┐ 앱 진입마다 항상 한 번 (로그인 여부 모름 → 물어본다)
  └ 401이면 미들웨어가    POST /auth/refresh      ─┘ 쿠키로 자동 재시도 (client.ts, 이 화면 파일 아님)

LoginScreen 진입:
  onSubmit               POST /auth/login         제출 시 1회
  useSignIn (성공 시)     (요청 없음)              accessToken을 스토어에 꽂고 /me 무효화만
  handleResend            POST /auth/invitations/resend   "초대 메일 다시 받기" 클릭 시
```

`GET /members/me`·`POST /auth/refresh`는 이 화면이 직접 부르지 않는다 — `useSession()`이
부르고, 401 재시도는 `client.ts` 미들웨어(공용, 범위 밖)가 처리한다. 이 화면은 그 결과
(`user`·`isLoading`·`endReason`)만 읽는다.

---

## 축

### 축 A. 세션 확인 상태 (`useSession()`)

| | |
|---|---|
| A1 | `isLoading` — 아무것도 그리지 않는다(`return null`). 로그인 폼이 깜빡이는 것을 막으려는 의도 |
| A2 | 로그인 안 됨(`user === null`) — 폼을 그린다 |
| A3 | 이미 로그인됨 — `<Navigate to={initialScreenFor(role)} replace />`로 즉시 되돌림 |
| A4 | 세션이 저절로 끝남, 사유 `expired` — 알림 없음(흔한 일이라 조용히) |
| A5 | 세션이 저절로 끝남, 사유 `identity-changed` — "계정 정보가 변경되어 다시 로그인해 주세요." 알림, 마운트 시 1회 판정(`useState` 초기값) |

A4·A5는 **이 화면이 다시 마운트되는 시점**에만 의미가 있다 — 딴 화면에서 세션이 끊겨
`RequireRole`이 리다이렉트해 온 경우. `page.goto('/shared/login')`로 직접 들어가면 재현 안
된다(5단계에서 실제 리다이렉트 경로로 재현해야 함).

### 축 B. 로그인 제출 결과 (`POST /auth/login`, `resolveAuthState`)

| | 코드 | HTTP | 알림 | 비고 |
|---|---|---|---|---|
| B1 | (성공) | 200 | — | `signIn()` → `navigate(initialScreenFor(role))` |
| B2 | `LOGIN_INVALID` | 400 | danger + 재발송 링크 | 자격 불일치·미활성 계정 둘 다 여기(계정 열거 방지) |
| B3 | `VALIDATION_FAILED` | 400 | danger | 이메일·비밀번호 형식 |
| B4 | `LOGIN_ACCOUNT_INACTIVE` | 403 | danger, "담당자에게 문의" | |
| B5 | `LOGIN_ORG_SUSPENDED` | 403 | danger, "담당자에게 문의" | |
| B6 | `LOGIN_ORIGIN_NOT_ALLOWED` | 403 | danger, "담당자에게 문의" | |
| B7 | `LOGIN_NO_ORG_CONTEXT` | 500 | danger, "담당자에게 문의" | |
| B8 | `LOGIN_TEMPORARILY_BLOCKED` | 429 | warning + `blockSubmit` | `retryAfter`초 정적 문구(카운트다운 아님) — 정책 미확정 항목과 무관, **이미 있는** 서버 동작 |
| B9 | 스펙에 없는 코드 | ? | danger, 시스템 오류 폴백 | |
| B10 | 네트워크 도달 실패 | — | danger, "서버에 연결하지 못했습니다" | `ApiError.isNetwork`(status 0) |
| B11 | 응답 지연 | — | 버튼 "로그인 중…" + 입력·버튼 disabled | 스켈레톤 없음(폼 자체가 이미 그려져 있어 불필요) |

### 축 C. 재발송(`resendAccountInvitation`) — B2에서만 노출

| | |
|---|---|
| C1 | 클릭 전 — "초대 메일 다시 받기" 링크 |
| C2 | 클릭 → 성공 → "초대 메일을 다시 보냈습니다"로 교체 |
| C3 | 클릭 → **실패(네트워크·5xx)** — `handleResend`에 `try/catch`가 없다. 코드로 확정: 실패해도 `resendDone`이 안 켜져 링크가 그대로 남지만, throw가 이벤트 핸들러 밖으로 나가 **unhandled rejection**이 된다. 사용자는 성공했는지 실패했는지 구분할 수 없다 |

### 축 D. 클라이언트 검증 (React Hook Form, 네트워크 없음)

| | |
|---|---|
| D1 | 이메일 빈 값 — "이메일을 입력해주세요." |
| D2 | 이메일 형식 오류 — `EMAIL_INVALID_MESSAGE` |
| D3 | 비밀번호 빈 값 — "비밀번호를 입력해주세요." |
| D4 | 제출 중(`isSubmitting`) — 재제출 막힘 |

### 축 E. Caps Lock 경고 (`useCapsLockWarning`)

| | |
|---|---|
| E1 | 꺼짐 — 표시 없음 |
| E2 | 비밀번호 필드에서 켜짐 — `role="status"` 경고, 값이 가려져 있으니 특히 중요 |
| E3 | 필드를 벗어나면(blur) 사라짐 — 켜진 채로 다른 필드로 Tab 이동해도 사라지는지 확인 필요(D 없음, 렌더로) |

### 축 F. 비밀번호 표시 토글

| | |
|---|---|
| F1 | 기본 — 가려짐(`type=password`), 아이콘 `Eye` |
| F2 | 토글 후 — 평문(`type=text`), 아이콘 `EyeOff`, `aria-pressed` |

### 축 G. 발표용 · dev 전용 UI 노출

| | |
|---|---|
| G1 | `QUICK_LOGIN_ACCOUNTS`(=`VITE_DEV_ACCOUNTS`) 없음 — 버튼 상자 자체가 없음(의도, 주석에 명시) |
| G2 | 있음 — 역할 4버튼, 클릭 시 폼과 같은 로그인 흐름 재사용 |
| **G3** | **환경 가드 결여** — `Header.tsx`·`sidebarConfig.ts`는 같은 데이터를 쓸 때 `(import.meta.env.DEV \|\| __GIT_BRANCH__ === 'develop') && QUICK_LOGIN_ACCOUNTS.length > 0`로 **두 겹**(env var 존재 + 브랜치/DEV)을 본다(주석: "**두 겹이다**"). `LoginScreen.tsx`는 `QUICK_LOGIN_ACCOUNTS.length > 0` **한 겹뿐** — env var가 프로덕션 Vercel 프로젝트의 Production 스코프에 잘못 세팅되면(사람 실수) 실제 배포에 역할별 바로 입장 버튼이 뜬다 |
| **G4** | **가드 아예 없음** — 파일 하단 "개발용 안내" 블록(초대 링크 `/invite/mgr-8f3a`·`/invite/stu-4c19`, API 연동 상태 설명)은 `QUICK_LOGIN_ACCOUNTS` 유무와도 무관하게 **항상** 렌더된다. 주석 자체가 "실제 배포 시 이 블록 통째로 제거"라고 적어 두고도 런타임 가드가 없다 — 사람이 지우는 것을 잊으면 그대로 프로덕션 로그인 화면에 실서버 연동 상태·내부 테스트 초대 링크가 노출된다 |

### 축 H. 알림 지속성

| | |
|---|---|
| H1 | `blockSubmit` 알림(B8) 중 이메일 입력 변경 → 알림 사라짐(계정별 상태라는 의도, 주석에 명시) |
| H2 | 그 외 알림(B2~B7, B9~B10) 중 이메일 변경 → **알림 유지**(의도, 다른 계정 시도해도 직전 실패 사유가 남아 있음) |

---

## 조합 수

데이터축만(B×C×D는 상호 배타적 트랙): B(11) × G(4, 조합상 G1/G2×G3/G4) ≈ 40대. A(5)·E(3)·F(2)·H(2)는
각자 별도 트랙이라 곱하지 않는다. **전부 못 본다** — 2단계에서 실제로 갈리는 지점만 추린다.

---

## 공통 축 — 6갈래

| | AU-01에서 물을 것 |
|---|---|
| 네트워크·인프라 | 오프라인 제출(B10) · 로그인 콜드 스타트(실측 TTFB 4s대) · 재발송 요청 실패(C3) |
| 인증·세션 | A4·A5(세션 자동 종료 후 재진입) · 탭 두 개에서 동시 401(공용 `client.ts` 단일 비행 — 이 화면 파일 밖, 검증만) · 이미 로그인 상태로 `/shared/login` 직접 진입(A3) |
| 시간·타이밍 | 429 `retryAfter` 표시가 정적 문구(카운트다운 없음) — 사용자가 화면을 보고 있어도 시간이 줄어드는 걸 못 본다. 자정 근처는 이 화면에 날짜 표시가 없어 해당 없음 |
| 사용자 조작 | 제출 중 뒤로가기·새로고침 · 재시도 연타(D4가 막는지) · 로그인 폼 Enter 제출 · 200% 확대 · quick-login 버튼 연타 |
| 표현·성능 | 첫 진입 CLS(`stableHeight`로 이미 방어) · 알림 등장/소멸 시 레이아웃 · 이메일이 아주 길 때 입력칸 오버플로 |
| 접근성 | Caps Lock 경고가 `role="status"`로 스크린 리더에 읽히는지 · 비밀번호 표시 토글 `aria-pressed`·`aria-label` · 폼 검증 에러가 `aria-invalid`와 함께 스크린 리더에 연결되는지(`FieldError`가 `aria-describedby`를 잇는지 컴포넌트 확인 필요) |
| 값의 빈 구석 | `retryAfter`가 없을 때 폴백(`?? 60`) · 이메일이 빈 문자열일 때 재발송 요청(`{ email: '' }`로 나갈 수 있는지, D1이 먼저 막는지) |

---

## 2단계 · 실측 (curl + Playwright, 2026-08-14)

### API 실측 — curl (백엔드 직접, `.env.local`의 `VITE_API_BASE`를 이번 세션만 Lambda 프록시 주소로 채워 확인 — 로컬 dev에서 이 값이 비어 있으면 프록시가 없는 이 브랜치에선 요청이 나가지 않는다)

| 요청 | 결과 | TTFB |
|---|---|---|
| `POST /auth/login` 정상(매니저) | 200 | 3.95s(콜드 스타트로 보임, 이후 요청은 아래처럼 1s대) |
| `POST /auth/login` 틀린 비밀번호 | 400 `LOGIN_INVALID` | 1.12s |
| `POST /auth/login` 없는 이메일 | 400 `LOGIN_INVALID`(계정 존재 여부 동일 코드 — 의도대로) | 0.83s |
| `POST /auth/login` 이메일 형식 오류 | 400 `VALIDATION_FAILED`, `fieldErrors:[{field:"email",code:"EMAIL"}]` | 0.55s |
| `POST /auth/login` 필드 누락 | 400 `VALIDATION_FAILED`, `fieldErrors` 2건(email·password `NOT_BLANK`) | 0.58s |
| `POST /auth/login` 연속 실패 6회째(trainee01) | **429 `LOGIN_TEMPORARILY_BLOCKED`, `retryAfter:59`** | 0.63s |
| `GET /members/me` 유효 토큰 | 200, `role`·`organizationId` 등 | 1.15s |
| `GET /members/me` 토큰 없음/조작된 토큰 | 401 `UNAUTHENTICATED` | — |
| `POST /auth/refresh` 유효 쿠키 | 200, 새 `accessToken` | 1.19s |
| `POST /auth/refresh` 쿠키 없음 | 401 `REFRESH_TOKEN_INVALID` | — |

- **B8(429) 실서버로 확인됨** — 스펙·코드가 정확히 일치. 5회 넘게 틀리면 6번째 요청이 429로
  막힌다(백엔드가 이미 구현한 동작, 프론트는 이미 대응 코드가 있다 — 이번 범위에서 새로
  만들 필요 없음).
- `refresh_token` 쿠키 실측: `Path=/api/v0/auth; Secure; HttpOnly; SameSite=None; Max-Age=604800`.
  `SameSite=None`은 **크로스사이트 서드파티 쿠키 취급**을 받는다는 뜻 — 이건 `#201`
  (same-origin 프록시) 영역이라 이 이슈에서 다루지 않는다. 이미 다른 이슈로 추적 중.
- trainee01 계정이 위 429 재현 때문에 이후 약 60초간 로그인이 막혀 있었다 — 그 사이 다른
  계정(operator·manager)으로 나머지 실측을 진행해 순서를 피했다.

### 코드 리뷰로 확정된 것 (①우리 코드, 렌더 없이 판정 가능)

- **🔴 G4 · 확정된 결함 · ✅ 고침 — dev 전용 안내 블록이 가드 없이 항상 렌더된다.**
  실서버 연동 상태 설명과 실제 초대 딥링크(`/invite/mgr-8f3a`, `/invite/stu-4c19`)가 프로덕션
  로그인 화면에도 그대로 나간다. `Header.tsx`가 같은 데이터에 쓰는 가드
  (`import.meta.env.DEV || __GIT_BRANCH__ === 'develop'`)를 그대로 가져와 감쌌다.
- **🔴 G3 · 확정된 결함 · ✅ 고침 — quick-login 버튼 블록이 한 겹만 막는다.**
  `QUICK_LOGIN_ACCOUNTS.length > 0`뿐이라 env var가 프로덕션 스코프에 잘못 세팅되면 그대로
  뜬다. 같은 가드를 추가해 `Header.tsx`·`sidebarConfig.ts`와 동일하게 두 겹으로 맞췄다.
- **C3 · 확정된 결함 · ✅ 고침 — `handleResend`가 실패를 삼키지 않고 그대로 던진다.**
  `try/catch`를 추가해 실패 시에도 `resendDone`을 켜지 않고 조용히 두지 않도록
  `resolveAuthState`와 같은 패턴의 알림으로 실패를 알린다(재사용 — 새 문구 체계를 안
  만든다).

### 실제 렌더에서만 확인 가능한 것 (Playwright, 2026-08-16)

로컬 `npm run dev`(5173) 대상. 이 환경(로컬 Windows, Claude Code CLI 네이티브)은 `docs/dev/handoff.md`가
경고하는 "샌드박스는 Chromium 다운로드가 막힌다"에 해당하지 않는다 — `%LOCALAPPDATA%\ms-playwright`에
브라우저가 이미 캐시돼 있어 `npx playwright`로 정상 구동 확인함. 스크립트는 스크래치패드에 둠(레포에
안 남김).

- **한글 IME 조합 — 이메일·비밀번호 둘 다 정상.** CDP `Input.imeSetComposition`으로 `ㅁ→ㅣ→ㄴ→ㅣ`를
  120ms 간격으로 흘려보낸 뒤 `Input.insertText`로 "미니" 확정 — 두 필드 모두 값이 정확히 `"미니"`로
  들어갔다(`"ㅁㅣㄴㅣ미니"`처럼 안 깨짐). **이메일 필드는 `watch('email')`이 매 키 입력마다
  `LoginScreen`을 리렌더한다는 점에서 조합 깨짐 후보였는데**, React Hook Form의 `register`가
  ref 기반 비제어 입력이라 부모 리렌더가 DOM `value`를 덮어쓰지 않아 실제로는 안전했다. 코드 변경 없음.
- **E3 · Caps Lock 경고, 재포커스 시 미탐지 — 🔴 확정된 결함 · ✅ 고침(2026-08-16 추가 세션).**
  이전 기록("blur 시 무조건 지우는 것은 의도된 동작, 버그 아님")은 절반만 맞았다 — blur에서
  지우는 것 자체는 의도대로지만, **재포커스 시 다시 켜는 경로가 아예 없었다.** `onKeyDown`·
  `onKeyUp`에서만 Caps Lock 상태를 읽고 `onFocus`가 없어서, Caps Lock을 켠 채 필드를 벗어났다
  다시 들어오면 **필드 안에서 키를 한 번 눌러 `detect()`가 돌기 전까지 경고가 안 뜬다.**
  Playwright/CDP는 OS Caps Lock 토글 자체를 못 켜(위 문단 그대로 유효 — 자동화 한계) 이 결함은
  **자동화가 아니라 사용자가 실제 물리 키보드로 재현·보고해서 발견됐다.**
  고침: `window` 레벨 `keydown`/`keyup` 리스너(`useEffect`)로 필드 밖 입력까지 포함해 "마지막으로
  알려진 Caps Lock 상태"를 계속 추적하고, 새로 추가한 `onFocus`에서 그 값으로 필드의 `capsLock`을
  초기화한다. `FocusEvent`엔 `getModifierState`가 없어 포커스 시점에 직접 물을 수 없다는 제약은
  그대로 두고(문제가 있던 그 지점이 아니라 전역 추적이라는 다른 경로로 우회), `onBlur`의 기존
  reset(필드 벗어나면 지운다)은 그대로 유지했다. `useCapsLockWarning`을 같이 쓰는
  `LoginScreen.tsx`·`PasswordResetScreen.tsx`·`InviteScreen.tsx` 전부에 `onFocus` 배선을 추가함(셋
  다 같은 결함을 공유하고 있었다). **자동 검증 불가 — 코드 리뷰로 확정, 실제 키보드 재확인은
  사용자 몫으로 남긴다.**
- **접근성 · `FieldError`가 `aria-describedby`로 입력과 안 이어져 있음 — 발견했으나 이번 범위에서
  안 고침.** `src/components/ui/Field.tsx`의 `FieldError`는 `role="alert"`만 갖고 `id`를 안 만들어
  입력에 연결하지 않는다. `role="alert"`가 등장 시점엔 스크린 리더에 강제로 읽히므로(암묵적
  assertive live region) 실패 직후 알림 자체는 전달되지만, 필드로 다시 포커스가 돌아왔을 때
  `aria-describedby`로 "이 입력이 왜 틀렸는지"가 다시 안 읽힌다. **공용 컴포넌트**(`components/ui`)라
  로그인 화면 하나만의 문제가 아니고 이 레포의 모든 폼에 영향 — CLAUDE.md §7 "공용 파일 수정은
  조율" 대상이라 이번 범위(로그인 5파일)에서 안 고치고 기록만 남긴다. 다음에 손댈 사람을 위한 메모:
  `Field`가 고유 id를 만들어 `Input`엔 `aria-describedby`, `FieldError`엔 그 `id`를 달아주는 패턴이면
  될 것(현재 `id`는 각 화면이 수동으로 `login-email` 식으로 붙이고 있어, 자동 연결하려면 `useId()`
  기반 컨텍스트가 필요 — 설계가 필요한 작업이라 이번 스코프 밖).
- **C3 재검증 — 렌더로 다시 재보니 회귀 발견 · ✅ 그 자리에서 고침.** 위 "코드 리뷰로 확정된 것"의
  C3 수정을 실제로 눌러 재현: `POST /auth/login`을 `LOGIN_INVALID`로 가로채 재발송 링크가 뜨게 한
  뒤, `POST /auth/invitations/resend`를 500으로 가로채 클릭 → **unhandled rejection은 사라졌지만
  (수정 의도대로), `setAlert(resolveAuthState(err))`가 알림 객체를 통째로 갈아치우면서 `showResend`
  플래그까지 같이 날아가 재발송 링크 자체가 사라졌다** — 사용자가 재발송을 다시 시도할 방법이 없어짐
  (실패했다는 것만 알고 되돌릴 수 없는 상태). **원인은 4단계에서 고친 그 자리** — `handleResend`의
  catch에서 `{ ...resolveAuthState(err), showResend: true }`로 바꿔 실패 문구는 갱신하되 재발송
  링크는 유지하도록 고쳤다. 재측정: 실패 알림 뜸 · "다시 보냈습니다" 오탐 없음 · **링크 유지 확인**.
  (백엔드 Lambda가 이 세션 중 완전 무응답 상태(curl로 직접 확인, connect는 되는데 20초+ 응답 없음 —
  일시적 백엔드 문제로 판단, 프론트 범위 밖)라 `/me`·`/login`까지 전부 가로채 검증했다.)
- **G3·G4 — 프로덕션 빌드 산출물까지 확인.** `npm run build` 산출물(`dist/assets/*.js`)을 문자열로
  직접 검사: `SHOW_DEV_UI`가 `import.meta.env.DEV`(프로덕션 빌드에서 정적으로 `false`)와
  `__GIT_BRANCH__`(로컬 빌드는 `VERCEL_GIT_COMMIT_REF` 미설정이라 `''`)로 **빌드 타임에 상수
  `false`로 접힌다** — Rolldown이 그 결과 두 블록 전체를 데드코드로 트리쇼크함. `발표용 · 역할별
  바로 입장`·`토큰은 실제 메일로만`·`mgr-8f3a`·`stu-4c19` 어느 문자열도 번들에 안 남는다(런타임
  분기가 아니라 **번들에서 물리적으로 빠짐** — 소스 지도를 뒤져도 안 나온다는 뜻이라 G4가 우려한
  "내부 초대 링크 노출"보다 강한 보장). `vite preview`로 직접 띄워 보려 했으나 백엔드 CORS가
  `localhost:5173`만 허용해(`docs/dev/handoff.md` 기록과 동일) 4173 포트 프리뷰에서 `/me`가 안 풀려
  화면 자체가 비로그인 로딩에 멈췄다 — **이건 인프라 CORS 문제지 이 수정의 결함이 아니다**(라이브
  렌더 대신 번들 문자열 검사로 충분히 강한 증거를 확보했다고 판단해 여기서 멈춤).

---

## 5단계 · 플로우를 탄다 (Playwright, 2026-08-16)

`page.goto`는 딥링크 축(A3)에서만 쓰고 나머지는 실제 입력·클릭으로 재현했다. 각 계정은
`.env.local`의 dev 계정(`manager@example.com`) 사용.

| 시나리오 | 재현 방법 | 결과 |
|---|---|---|
| 정상 로그인 → 진입 | 폼 입력 → "로그인" 클릭 | `/manager/dashboard`로 정상 진입 |
| 잘못된 비밀번호 | 오답 비밀번호로 제출 | `/shared/login`에 머무름, "이메일 또는 비밀번호가 올바르지 않습니다" + 재발송 링크 노출 |
| 서버 500 | `POST /auth/login` 가로채기 → 500 | 시스템 오류 문구("일시적 오류입니다…") 노출, 버튼 재활성화(재시도 가능), 화면 안 깨짐 |
| 느린 응답 | `POST /auth/login` 3초 지연 후 200 | 제출 중 버튼 "로그인 중…"·이메일/비밀번호 입력 `disabled` 유지, 3초 뒤 정상 진입 |
| 로그인 상태에서 `/login` 재진입(A3) | 로그인 완료 후 `page.goto('/shared/login')`(딥링크 축이라 goto 허용) | 즉시 `/manager/dashboard`로 되돌려짐(폼 안 보임) |
| 세션 만료 후 재진입 — 일반 만료(A4) | 로그인 후 `/members/me`→401·`/auth/refresh`→`REFRESH_TOKEN_INVALID` 가로채기, `page.reload()` | `/shared/login`으로 이동, **알림 없음**(설계대로 조용히) |
| 세션 만료 후 재진입 — 신원 변경(A5) | 위와 동일하되 `/auth/refresh`→`REFRESH_IDENTITY_CHANGED` | `/shared/login`으로 이동, "계정 정보가 변경되어 다시 로그인해 주세요." 알림 노출 |

**전부 기대대로 동작 — 새 결함 없음.** (C3의 회귀는 위 "실제 렌더에서만 확인 가능한 것" 절에서
같이 잡혀서 여기 표에는 없음 — 재발송은 이 표의 플로우들과 별도 진입 경로라 그쪽에 둠.)

세션 만료 재진입 축(A4·A5)은 클릭만으로 재현할 방법이 없어(실제로는 시간이 지나 쿠키가 죽는
것을 기다려야 함) 라우트 가로채기 + `reload()`를 썼다 — `reload()`는 "탭을 나중에 다시 열었을 때"와
같은 효과라 딥링크 취급, 5단계 취지(goto로 캐시 있는 경로의 사고를 놓치지 않기)와 안 어긋난다고
판단.

---

## 6단계 · 남긴다

### 이번 라운드에서 고친 것 (전부 ✅, 위에서 원인·재현 함께 기록)

1. G4 — dev 전용 안내 블록에 `SHOW_DEV_UI` 가드 추가
2. G3 — quick-login 버튼 블록에 같은 가드 추가(두 겹으로)
3. C3 — `handleResend` 실패를 삼키지 않고 알림으로 전달
4. C3 회귀 — 실패 알림이 `showResend`까지 지우던 것을 고쳐 재발송 링크 유지
5. E3 — Caps Lock 켠 채 필드를 벗어났다 재포커스해도 안 뜨던 것(`onFocus` 부재). `window`
   레벨 추적 + `onFocus` 초기화로 고침. `useCapsLockWarning`을 공유하는
   `LoginScreen.tsx`·`PasswordResetScreen.tsx`·`InviteScreen.tsx` 전부 같이 고침(사용자가 실제
   키보드로 재현·보고, 2026-08-16 추가 세션)

### 이번 범위에서 의도적으로 안 건드린 것

- **접근성 `aria-describedby` 미연결**(`components/ui/Field.tsx`) — 공용 컴포넌트, 로그인 화면
  하나의 문제가 아니라 조율 필요. 위에 다음에 손댈 사람을 위한 메모 남김.
- **5회 실패 잠금·캡차·세션 만료 사전 경고** — 정책 미확정(`docs/dev/handoff.md` § 다음에 할 것 1).
  429 `LOGIN_TEMPORARILY_BLOCKED` 자체는 이미 서버·프론트 양쪽 구현돼 있고 이번에 실측으로
  재확인만 함(위 curl 표).

### CI로 굳힐 것

이번에 고친 네 건은 전부 "안 보여야 할 게 보임" 또는 "있어야 할 링크가 없어짐" 류 — 정적 검사로
잡기 애매한 조건부 렌더링이라 새 CI 규칙을 추가하지 않는다. 대신:

- **회귀 방지는 다음 사람이 `SHOW_DEV_UI`·`showResend` 두 이름을 grep해서 같은 실수(가드 빠뜨림)가
  다른 화면에도 있는지 확인하는 것으로 충분**하다고 판단(`Header.tsx`·`sidebarConfig.ts`는 이미
  같은 두 겹 가드를 쓰고 있어 이번 조사에서 문제 없음 확인함).
- `LOGIN_TEMPORARILY_BLOCKED`(429) 자동 회귀 테스트는 실서버 상태(계정별 429 카운터)에 의존해
  CI에 넣기 부적합 — 이번 실측(curl)으로 갈음.

### 미검증으로 남긴 것

- **E3(Caps Lock) 수정의 실제 물리 키보드 동작** — `onFocus` 배선을 코드로 확정했으나, Playwright/
  CDP가 OS Caps Lock 토글 자체를 못 켜 자동 렌더 재현은 여전히 못 함(위 "실제 렌더에서만 확인
  가능한 것" 절 참고). 애초에 이 결함 자체가 자동화가 아니라 **사용자의 실제 키보드 재현으로
  발견됐다** — 수정도 같은 방식으로, 사용자가 Caps Lock을 켠 채 비밀번호 필드를 벗어났다 다시
  포커스했을 때 경고가 바로 뜨는지 재확인 필요.
- **`vite preview`(프로덕션 빌드) 실제 렌더** — 백엔드 CORS가 5173만 허용해 4173에서 막힘.
  번들 문자열 검사로 대체 확인(위 G3·G4 참고). 배포본(Vercel) 검증이 필요해지면
  `docs/dev/handoff.md`의 배포본 검증 절차(팀장 Preview 환경변수 조치 대기 중)를 그대로 탄다.
- **A4·A5 외 축 A(세션 확인)** — A1(로딩 중 `return null`)·A2(정상 폼)는 이번 플로우 관찰에
  자연스럽게 다 지나갔다(모든 시나리오가 A1→A2를 거침), 별도 기록 안 함.
