# App Runner 배포 — 프론트에서 안 닿습니다 + 넣어 주셔야 할 환경변수

> 대상: `https://mmbvymzj5k.ap-northeast-1.awsapprunner.com`
> SMTP 테스트용으로 알려 주신 주소인데 **아직 애플리케이션에 닿지 않습니다.**
>
> **두 가지를 적었다** — ① 지금 안 닿는 원인 후보와 확인 순서 ② 붙고 나면 **반드시 넣어야 하는
> 환경변수**(Railway에서 푼 것이 이 배포에는 안 따라옵니다).

---

## 1. 관측 — 콜드 스타트가 아니라 라우팅 자체가 안 됩니다

"첫 요청 후 1~2분 뒤 다시" 안내대로 깨우고 60초 기다린 뒤 재시도했다. 여러 경로를 다 봤다.

```
GET /                     404   0.17s
GET /swagger-ui.html      404   0.52s
GET /v3/api-docs          404   0.35s
GET /api-docs             404
GET /actuator/health      404
GET /api/v0/consents      404
```

**응답 헤더가 원인을 말해 준다.**

```
HTTP/1.1 404 Not Found
server: envoy            ← App Runner의 라우터가 직접 답하고 있다
content-length: 0        ← 본문이 없다
```

### 왜 콜드 스타트가 아니라고 보나

| 콜드 스타트라면 | 지금 |
|---|---|
| 첫 요청이 **수십 초** 걸리거나 502·503이 뜬다 | **0.2~0.5초에 즉답** |
| 앱이 뜬 뒤엔 스프링이 **자기 404**(JSON 본문)를 준다 | **본문 0바이트 · `server: envoy`** |
| `/actuator/health`나 `/`가 언젠가 200이 된다 | 60초 뒤에도 전부 404 |

즉 **컨테이너가 아직 트래픽을 받지 못하는 상태**로 보인다. envoy가 "그런 라우트 없음"으로
잘라내고 있어서 애플리케이션까지 요청이 가지 않는다.

---

## 2. 확인해 주실 것 — 이 순서로

### ① 서비스 상태

App Runner 콘솔에서 **`Running`** 인지 본다.
`Operation in progress` · `Create failed` · `Paused` 중 하나면 여기서 끝난다.

### ② 헬스체크 설정 ← **가장 흔한 원인**

App Runner 헬스체크가 **`HTTP`이고 경로가 `/`** 로 잡혀 있으면, 스프링이 `/`에 404를 주므로
**영원히 unhealthy**가 되고 배포가 트래픽을 안 받는다.

| 해결 | |
|---|---|
| 프로토콜을 **`TCP`** 로 | 가장 간단하다. 포트만 열려 있으면 통과 |
| 또는 경로를 **실제 200이 나오는 곳**으로 | `actuator/health`를 열어 두고 그쪽을 가리킨다 |

> ⚠️ **`/actuator/health`도 지금 404다.** actuator 의존성이 없거나 노출 설정이 꺼져 있으면
> 그 경로를 헬스체크로 잡아도 똑같이 실패한다. **TCP가 안전하다.**

### ③ 포트

App Runner 기본은 **8080**이다. 스프링이 다른 포트(`server.port`)로 뜨면 안 붙는다.
컨테이너 설정의 포트와 애플리케이션 포트가 같은지 확인.

### ④ Swagger 경로

주신 링크가 `/swagger-ui.html`인데 Railway는 `/swagger-ui/index.html`이었다.
**설정이 다른 것인지, 축약해서 주신 것인지** 알려 주시면 우리 스크립트가 맞춰 본다.
(우리가 실제로 읽는 것은 UI가 아니라 **`/v3/api-docs`** 다.)

### 붙었는지 확인하는 법

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://mmbvymzj5k.ap-northeast-1.awsapprunner.com/v3/api-docs
# 200 이면 붙은 것. 404 + server: envoy 면 아직이다
```

---

## 3. 🔴 붙고 나면 — **환경변수를 다시 넣어야 합니다**

**이건 새 배포라 Railway에 넣으신 값이 안 따라옵니다.** 3차 요청에서 푼 막힘 2건이
**그대로 되돌아옵니다.**

```bash
# 없으면 → 프론트 로그인이 403 LOGIN_ORIGIN_NOT_ALLOWED 로 막힌다
AUTH_LOGIN_ALLOWED_ORIGINS=https://frontend-eight-neon-73.vercel.app,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173,http://localhost:4173

# 없으면 → 로그인은 되는데 재발급이 전혀 안 된다(브라우저가 쿠키를 안 싣는다)
REFRESH_TOKEN_COOKIE_SAME_SITE=None
REFRESH_TOKEN_COOKIE_SECURE=true
```

> **왜 이 둘이 필요한지는 [3차 요청서](backend-api-requests-3.md) R1·R2에 있다.**
> 요약하면 — 프론트(`vercel.app`·`localhost`)와 백엔드가 **다른 사이트**라
> ① 서버가 Origin을 검사해 거절하고 ② `SameSite=Lax` 쿠키는 크로스사이트 fetch에 안 실린다.

**나머지 선택 변수**는 기본값이 있어 안 넣어도 된다
(`AUTH_LOGIN_ALLOW_ORIGIN_WILDCARDS` · `AUTH_LOGIN_THROTTLE_*` ·
`REFRESH_TOKEN_COOKIE_NAME` · `REFRESH_TOKEN_COOKIE_PATH`).

### SMTP도 이 배포의 변수다

이 배포를 만든 목적이 메일 발송이므로, **SMTP 설정이 실제로 들어갔는지** 함께 확인 부탁드린다.
Railway에서 막혀 있던 것들이 여기서는 되어야 한다 —
`inviteOperator` · `resendOperatorInvitation` · `cancelInvitation` · `inviteSuperAdmin`.

> **`inviteSuperAdmin`은 스펙상 `x-readiness: available`인데 Railway에서는 502가 난다**
> (우리가 실제로 확인했다). 이 배포에서 되면 그대로 두시고, **여기서도 안 되면
> `x-readiness`를 `hold`로 바꿔 주시는 편이 낫다** — "된다고 표시된 API가 안 되는" 것이
> 가장 나쁘다(생성기가 함수를 만들고 화면이 쓰게 된다).

---

## 4. 붙으면 우리가 바로 확인할 것

알려 주시면 아래를 한 번에 돌린다. **문제가 있으면 그날 안에 알려 드릴 수 있다.**

```bash
API=https://mmbvymzj5k.ap-northeast-1.awsapprunner.com

# ① 스펙이 Railway 것과 같은가
curl -s -H 'Cache-Control: no-cache' "$API/v3/api-docs?cb=$(date +%s)" -o apprunner.json
#   → 우리 검사기(api:check)로 error 0 확인

# ② Origin 허용 (마지막 evil은 403이어야 정상)
for O in https://frontend-eight-neon-73.vercel.app http://localhost:5173 \
         http://localhost:5174 http://localhost:5175 http://127.0.0.1:5173 \
         http://localhost:4173 https://evil.example.com; do
  printf '%-46s %s\n' "$O" \
    "$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "$API/api/v0/auth/login" \
        -H "Origin: $O" -H 'Access-Control-Request-Method: POST')"
done

# ③ 쿠키가 SameSite=None; Secure 인가
curl -s -i -X POST "$API/api/v0/auth/login" -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:5173' -d '{"email":"<이메일>","password":"<비밀번호>"}' | grep -i set-cookie

# ④ 계정 4개 로그인 · /me · 인증 API — 브라우저에서
# ⑤ ★ 초대 메일 실제 발송 (이 배포의 목적)
```

**계정도 이 배포에서 그대로인지** 알려 주시면 좋겠다. Railway와 DB가 다르면 계정이 없을 수 있다.

---

## 5. 참고 — 프론트 쪽은 주소만 바꾸면 된다

우리는 API 주소를 환경변수 하나로 갖고 있어서, **이 배포로 옮기는 데 코드 변경이 없다.**

```
VITE_API_BASE=https://mmbvymzj5k.ap-northeast-1.awsapprunner.com
```

그래서 **두 배포를 오가며 비교하는 것도 가능하다** — SMTP가 필요한 흐름만 이쪽에서
확인하고 나머지는 Railway에서 계속 개발할 수 있다.
