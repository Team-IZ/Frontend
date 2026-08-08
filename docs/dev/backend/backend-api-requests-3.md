# 백엔드 API — 3차 요청

> 1차: [backend-api-requests.md](backend-api-requests.md) · 2차: [backend-api-requests-2.md](backend-api-requests-2.md)
>
> **2차까지 요청한 것은 전부 반영됐고**(도메인 코드 34개 오퍼레이션 · 코드 60종 · 미매핑 404 회귀 테스트),
> 프론트가 실제 계정으로 **생성 코드 전 구간을 태워 봤다.** 이번 요청은 그 과정에서 나온 것이다.
>
> **요청 2건 · 우리가 답할 차례 3건.** 요청 둘 다 **막힘(blocking)** 이라 이것만 먼저 봐 주시면 된다.

---

## 0. 한눈에

| | | 상태 |
|---|---|---|
| **R1** | 리프레시 쿠키 `SameSite=Lax` → **재발급이 아예 동작하지 않는다** | 🔴 막힘 |
| **R2** | Origin 허용 목록 — **배포 도메인 + 로컬 포트 여러 개** | 🔴 배포 시 막힘 · 로컬도 자주 막힘 |
| **R3** | `GET /members/me` | 🟠 세션 복원의 전제 |
| A1~A3 | 2차에서 물어보신 것 — **우리 답** | ✅ |

### 먼저 — 실제 계정으로 확인한 것

프론트 통신 계층이 **전부 정상 동작한다.** 알려 주신 4계정으로 로그인해 확인했다.

```
생성된 login() → 4계정 전부 성공 (SUPER_ADMIN · OPERATOR · MANAGER · TRAINEE)
틀린 비밀번호  → 400 LOGIN_INVALID          ← 코드 분기가 실제로 된다
토큰 실어 호출 → findOrganizations 정상 응답 ← 인증 헤더 주입 정상
토큰 없이 호출 → 401 UNAUTHENTICATED        ← 재발급을 시도하지 않는다(의도대로)
```

**2차에서 나눠 주신 에러 코드가 그대로 화면 분기로 쓰이고 있다.** `LOGIN_INVALID`가
일반 코드가 아니라는 판정까지 코드로 확인된다.

---

## 1. 🔴 R1 — 리프레시 쿠키가 `SameSite=Lax`라 **재발급이 동작하지 않는다**

### 관측

```
POST /api/v0/auth/login  (Origin: http://localhost:5173)
→ set-cookie: refresh_token=…; Path=/api/v0/auth; Max-Age=604800; HttpOnly; SameSite=Lax
                                                                             ^^^^^^^^^^^^^^
```

### 무엇이 문제인가

`SameSite=Lax`는 **다른 사이트에서 보내는 fetch/XHR 요청에 쿠키를 싣지 않는다.**
최상위 페이지 이동(주소창으로 들어가는 GET)에만 붙는다.

우리 프론트는 `localhost:5173`(개발) · Vercel 도메인(배포)이고 백엔드는 `railway.app`이다 —
**서로 다른 사이트**다. 그래서:

```
로그인       → 성공. 쿠키도 저장된다
POST /auth/refresh → 브라우저가 쿠키를 빼고 보낸다 → 401 → 로그아웃
```

**재발급이 전면 불가**하고, 이건 배포 환경만의 문제가 아니라 **로컬 개발에서도 똑같이 막힌다.**

> **왜 지금까지 안 드러났나** — Swagger UI는 백엔드와 **같은 사이트**라 `Lax`로도 쿠키가 실린다.
> 브라우저에서 프론트를 띄워 봐야만 드러나는 종류다.

### 요청

```
SameSite=None; Secure
```

백엔드가 https라 `Secure` 조건은 이미 충족한다. `Path=/api/v0/auth`로 범위를 좁혀 두신 것은
그대로 좋다.

### CSRF는 걱정하지 않으셔도 된다 — 이미 막고 계신다

보통 `SameSite=None`은 CSRF 노출이 커지는데, **이 서버는 Origin을 직접 검사한다.**
(아래 R2에서 확인 — 허용되지 않은 Origin은 `403 LOGIN_ORIGIN_NOT_ALLOWED`)

그 검사가 CSRF 방어로 이미 작동하므로 `None`으로 바꿔도 안전하다.
**오히려 이 구조라서 안심하고 요청드리는 것이다.**

---

## 2. 🔴 R2 — Origin 허용 목록 (배포 도메인 + 로컬)

### 등록해 주실 도메인

```
https://frontend-eight-neon-73.vercel.app
```

### 관측 — 지금은 거절된다

```
OPTIONS /api/v0/auth/login   Origin: http://localhost:5173                     → 200 · allow-credentials: true
OPTIONS /api/v0/auth/login   Origin: https://frontend-eight-neon-73.vercel.app → 403
POST    /api/v0/auth/login   Origin: https://frontend-eight-neon-73.vercel.app → 403  "Invalid CORS request"
```

(배포 페이지 자체는 살아 있다 — `GET https://frontend-eight-neon-73.vercel.app` → 200)

> **거절이 예외 핸들러보다 앞에서 일어난다.** 응답 본문이 `ErrorResponse`가 아니라
> 평문 `Invalid CORS request`다. CORS 필터가 컨트롤러 전에 잘라내기 때문이라 정상 동작이고,
> 프론트도 이 경우는 `403`으로 흘려 처리한다. **고쳐 달라는 얘기가 아니라 참고용**이다.

### 왜 우선순위가 높은가

처음엔 "CORS 설정이라 배포 직전에 하면 된다"고 봤는데, **그게 아니었다.**

| | 누가 막나 | 증상 |
|---|---|---|
| CORS | **브라우저**가 응답을 안 넘겨준다 | 콘솔에 CORS 오류 |
| **이 서버의 Origin 검사** | **서버가 403으로 거절한다** | `LOGIN_ORIGIN_NOT_ALLOWED` |

즉 허용 목록에 없으면 **로그인 자체가 안 된다.** 배포하는 날 발견하면 그날은 아무것도 못 한다.

### 로컬 개발 오리진도 좁다 — 5173 하나뿐이다

전수로 확인했다.

```
http://localhost:5173   200   ← 이것만 열려 있다
http://localhost:5174   403
http://localhost:5175   403
http://127.0.0.1:5173   403
http://localhost:4173   403
http://localhost:3000   403
```

**이게 실제로 문제가 되는 경우가 셋이다.**

| 상황 | 왜 생기나 |
|---|---|
| **포트가 밀린다** (5174·5175…) | Vite는 5173이 이미 쓰이면 **말없이 다음 포트로 올라간다.** 개발 서버를 두 개 띄우거나 이전 것이 안 죽었을 때 매번 일어난다 — 이 레포에서 실제로 겪었다 |
| **`127.0.0.1`로 연다** | 브라우저에게 `localhost`와 `127.0.0.1`은 **다른 오리진**이다. 주소를 손으로 치면 갈린다 |
| **`vite preview`(4173)** | 배포 빌드를 로컬에서 확인하는 명령. 배포 전 점검에 쓴다 |

**증상이 고약하다** — 포트가 밀린 걸 모르고 "로그인이 갑자기 안 된다"로 보인다.
원인이 코드가 아니라 포트라 찾는 데 오래 걸린다.

### 요청 — 허용 목록

```
https://frontend-eight-neon-73.vercel.app     ← 배포 (필수)
http://localhost:5173                          ← 이미 있음
http://localhost:5174
http://localhost:5175
http://127.0.0.1:5173
http://localhost:4173                          ← vite preview
```

**로컬 오리진을 넉넉히 여는 것이 위험하지 않은 이유:** `http://localhost:*`는 **그 사람의 자기 컴퓨터**에서
띄운 것만 해당한다. 공격자가 이 오리진을 쓰려면 이미 피해자 PC에서 코드를 돌리고 있다는 뜻이라,
그 시점엔 CORS가 막을 수 있는 게 없다. 실무에서 개발 오리진을 여러 개 여는 것이 일반적인 이유다.

> **운영 환경에서는 로컬 오리진을 빼는 편이 낫다.** 프로필(dev/prod)로 갈 수 있으면
> 그렇게 해 주시고, 지금처럼 배포가 하나뿐이면 그냥 두셔도 된다.

**프리뷰 배포는 나중 얘기다.** Vercel은 PR마다 `frontend-<해시>-<팀>.vercel.app`처럼
URL이 매번 바뀌어서 고정 등록이 안 된다. 와일드카드(`*.vercel.app`) 매칭이 가능한지만
알려 주시면 되고, **보안상 부담되면 안 해도 된다** — 프리뷰에서 로그인을 포기하고
로컬로 확인하면 된다.

> **잘 되어 있는 것 하나** — `X-Swagger-Client-Origin`을 **Swagger UI 요청에서만** 허용하도록
> 막아 두셨다. 저희가 Node 테스트에서 그 헤더로 우회하려다 정확히 거절당했다. 의도대로 동작한다.

---

## 3. 🟠 R3 — `GET /api/v0/members/me`

### 왜 필요한가

로그인 뒤 **새로고침**하면 브라우저 메모리가 비워진다. 리프레시 쿠키로 토큰은 되살릴 수 있는데,
재발급 응답이 토큰만 준다.

```jsonc
RefreshTokenResponse: { accessToken, accessTokenExpiresIn }   // 역할·이름이 없다
```

역할을 모르면 **사이드바도 라우팅도 그릴 수 없다.** 그래서 지금은 역할을 브라우저 저장소에
남겨 두는데, 대가가 둘이다.

| | |
|---|---|
| **역할이 낡는다** | 계정이 정지되거나 역할이 바뀌어도 화면은 다음 API 호출 전까지 모른다 |
| 저장소에 남는다 | 토큰은 저장하지 않지만, 신원 정보가 남는 것 자체를 없애고 싶다 |

### 요청

```jsonc
GET /api/v0/members/me
{ memberId, email, name, role, organizationId, status }
```

**로그인 응답에 이미 있는 값들이라 새로 만들 것이 없다.** 이게 생기면
`부팅 → refresh → /me` 한 줄로 세션이 복원되고, **역할이 서버 진실**이 되어 권한 변경이 즉시 반영된다.

> 대안으로 `refresh` 응답에 `role`을 얹어 주셔도 되지만, `/me`가 있으면 쓸 데가 더 많다
> (화면 상단 사용자 정보 · 권한 재확인 등).

---

## 4. 우리가 답할 차례 — 2차에서 물어보신 것

### A1. 로그인 연속 실패 차단 임계값 → **5회 실패 → 60초, 이후 실패마다 2배(상한 15분)**

성공하면 카운터를 0으로 되돌린다. 가능하면 **이메일 + IP 조합**으로 세 주시면 좋겠다.

**근거:** 화면정의서가 v2에서 **계정 잠금을 버리고 지연으로 바꾼** 이유가
*"명단에 전원 이메일이 있어 잠금이 남을 막는 수단이 되고, 해제 화면이 없다"* 였다.
즉 **임계값이 낮거나 지속이 길면 그 자체가 공격 수단**이 된다.
5회는 오타 반복(교육생이 자주 그런다)을 넘기고, 60초는 자동화만 실질적으로 막는다.

화면 쪽은 코드·`retryAfter`가 이미 준비돼 있어 카운터만 붙으면 바로 동작한다.

### A2. `AUTH_UNVERIFIED`(활성화 전 계정) → **합친 채로 두는 것에 동의한다**

설명해 주신 이유가 맞다 — 활성화 전 계정은 비밀번호가 없어서 구분하려면 **비밀번호 검사 앞에서**
상태를 봐야 하고, 그건 진짜 계정 열거가 된다.

**화면 쪽 처리:** 로그인 실패(`LOGIN_INVALID`) 화면에 **초대 메일 재발송 안내를 항상 노출**한다.
틀린 비밀번호를 넣은 사람에게도 똑같이 뜨므로 아무것도 흘리지 않으면서, 실제로 초대 메일을
못 받은 사람은 스스로 길을 찾는다. **이미 반영했다.**

### A3. `redirectPath` → **무시하기로 확정했다**

동의해 주신 대로 `role`로 라우팅한다. 확인차 실제 값을 적어 두면 —
`/admin/orgs` · `/cohorts/7%EA%B8%B0` · `/home`. 우리 라우트는
`/superadmin/orgs` · `/operator/dashboard` · `/manager/dashboard` · `/trainee/home`이라 다르다.

**필드는 그대로 두셔도 되고 지우셔도 된다.** 저희는 읽지 않는다.

---

## 5. 확인된 것 — 질문 하나가 관측으로 해소됐다

**`accessTokenExpiresIn`의 단위는 밀리초다.** 실제 값이 `3600000`이었다 —
초라면 41일이라 성립하지 않으므로 **1시간**이 맞다.

이 값으로 **만료 전 미리 재발급**(사전 갱신)을 붙일 수 있게 됐다.
저희에게 이게 중요한 이유는 **검증 세션(TR-03)이 30~70분 전체화면이고 중간 이탈이 불가능**하기
때문이다 — 그 도중 토큰이 만료되고 재발급이 실패하면 응시가 통째로 날아간다.

**스펙 설명에 단위를 한 줄 적어 주시면** 다음 사람이 다시 추측하지 않아도 된다.

---

## 6. 남아 있는 낮은 순위 (2차에서 이월)

| | |
|---|---|
| `POST /auth/refresh`의 `refresh_token`(cookie) · `X-Swagger-Client-Origin`(header) 파라미터 | 스펙에서 빼고 설명으로만. 저희 쪽 우회가 있어 급하지 않다 |
| `FieldError.code` | "다음에 넣겠다"고 하셔서 그대로 둔다 |

---

## 부록 — 재현

```bash
# R1 · 쿠키 속성
curl -s -i -X POST "$API/api/v0/auth/login" \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' \
  -d '{"email":"<이메일>","password":"<비밀번호>"}' | grep -i set-cookie

# R2 · Origin 허용 여부 전수 (200이면 허용, 403이면 거절)
for O in https://frontend-eight-neon-73.vercel.app \
         http://localhost:5173 http://localhost:5174 http://localhost:5175 \
         http://127.0.0.1:5173 http://localhost:4173; do
  printf '%-46s %s\n' "$O" \
    "$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "$API/api/v0/auth/login" \
        -H "Origin: $O" -H 'Access-Control-Request-Method: POST')"
done
```

> 계정 정보는 이 문서에 적지 않았다. 재현할 때 알려 주신 테스트 계정을 넣으면 된다.
