# 백엔드 API — 33차 요청 · 제출 헤더가 CORS에서 막힙니다

> **세션 API 8개와 제출 2개가 전부 `사용 가능`이 된 것을 확인했습니다.** 그래서 막아
> 두었던 제출 버튼을 열고 **실제로 ZIP을 올려 봤는데, 브라우저가 요청을 보내지도
> 못했습니다.**
>
> 🔴 **원인은 CORS 설정 한 줄입니다.** 스펙이 **필수**로 요구하는 `Idempotency-Key`
> 헤더가 `Access-Control-Allow-Headers`에 없습니다. 헤더를 빼면 `400`이고 넣으면
> 브라우저가 막아서, **프론트에서는 우회할 방법이 없습니다.**
>
> ⚠️ **이 문제는 스웨거·curl에서는 재현되지 않습니다**(§2). 서버 쪽에서 테스트하면
> 정상으로 보입니다.

---

## 0. 한눈에

| | 무엇 | 우선순위 |
|---|---|---|
| **R1** | `Idempotency-Key`가 CORS 허용 목록에 없습니다 — **제출이 통째로 막힙니다** | 🔴 **한 줄이면 풀립니다** |

요청은 이것 하나입니다. 나머지는 확인 사항입니다.

---

## 1. 🔴 R1 — 필수 헤더가 CORS에서 거부됩니다

### 스펙이 요구하는 것

```
POST /api/v0/submissions/zip
  query  : assessmentRoundId   (필수)
  header : Idempotency-Key     (필수 — 생략하면 400)
  body   : multipart/form-data · file
```

`POST /api/v0/submissions`도 같습니다.

### 실제로 일어난 일

교육생 계정으로 ZIP을 골라 제출 버튼을 눌렀더니 브라우저가 이렇게 답했습니다.

```
Access to fetch at '…/api/v0/submissions/zip?assessmentRoundId=…'
from origin 'http://localhost:5173' has been blocked by CORS policy:
Request header field idempotency-key is not allowed by
Access-Control-Allow-Headers in preflight response.
```

**요청이 서버에 도착하지 않았습니다.** 브라우저가 본 요청(POST) 전에 보내는 사전
확인(preflight)에서 걸려, 본 요청 자체를 보내지 않았습니다.

### 사전 확인 응답을 직접 받아 봤습니다

세 번 던져 봤고, **요청한 헤더를 그대로 되돌려주는 방식**인데 이 헤더만 빠집니다.

| 요청한 헤더 | 서버가 허용한 것 |
|---|---|
| `authorization, idempotency-key` | **`authorization`** ← 탈락 |
| `content-type, x-request-id` | `content-type, x-request-id` ✅ |
| `content-type` | `content-type` ✅ |

```
$ curl -X OPTIONS '…/api/v0/submissions/zip?assessmentRoundId=x' \
    -H 'Origin: http://localhost:5173' \
    -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: authorization,idempotency-key'

HTTP/1.1 200 OK
access-control-allow-origin:  http://localhost:5173
access-control-allow-headers: authorization          ← idempotency-key 없음
access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
```

**`X-Request-Id`는 통과합니다.** 커스텀 헤더 전체가 막힌 것이 아니라 **이 헤더만**
목록에 없습니다.

### 저희가 우회할 수 없습니다

| 시도 | 결과 |
|---|---|
| 헤더를 뺀다 | 스펙상 필수라 **`400`** |
| 헤더를 넣는다 | **브라우저가 요청을 안 보낸다** |
| 다른 이름으로 보낸다 | 서버가 못 알아본다 |

프론트에서 고를 수 있는 선택지가 없습니다.

### 요청

`Access-Control-Allow-Headers`에 **`Idempotency-Key`를 추가**해 주세요.
`X-Request-Id`가 이미 들어 있는 그 자리입니다.

> 다른 오퍼레이션도 이 헤더를 씁니다 — `POST /organizations`(선택) ·
> `DELETE /organizations/{id}`(선택) · `POST /cohorts/{id}/notifications/reminders`(필수).
> 지금은 저희가 그것들을 안 부르지만, **한 곳에 추가하면 전부 함께 풀립니다.**

---

## 2. ⚠️ 이 문제는 서버 쪽 테스트로는 안 보입니다

**사전 확인(preflight)은 브라우저만 보냅니다.** 스웨거 UI, curl, Postman에서는 이
단계가 없어서 요청이 그대로 서버에 도착하고 정상 응답이 옵니다.

```
curl / 스웨거   →  POST 바로 전송        →  정상
브라우저        →  OPTIONS 먼저 → 거부   →  POST를 아예 안 보냄
```

그래서 *"테스트했을 때는 됐는데요"* 가 나올 수 있어 미리 적어 둡니다.

재현하시려면 **브라우저 개발자 도구 콘솔**에서 확인하시거나, 위 `curl -X OPTIONS`
명령으로 응답 헤더를 직접 보시면 됩니다.

---

## 3. 이것이 지금 가장 큰 병목입니다

제출이 막히면 **그 뒤가 전부 막힙니다.**

```
제출 → 분석 → 응시 → 리포트
 ↑ 여기서 멈춰 있습니다
```

세션 API 8개를 열어 주셨는데 **들어갈 방법이 없습니다.** 세션은 분석이 성공해야
열리고, 분석은 제출이 있어야 돕니다. 저희가 받은 6차 명단 211명 중 분석이 끝난
계정이 0명인 것도 같은 이유로 보입니다.

### 그리고 이것이 풀리면 28차 R1이 대부분 필요 없어집니다

28차에서 **상태 재현용 계정**을 요청드렸습니다(카드 상태 10종 중 2종만 볼 수 있어서).
그때는 제출이 막혀 있어 저희가 스스로 상태를 만들 수 없었습니다.

**제출만 되면 정상 흐름을 저희 손으로 한 바퀴 돌릴 수 있습니다.**

```
제출 → 분석 중 → 분석 완료 → 응시 → 응시 완료 → 리포트
        ①         ②          ③        ④
```

28차 R1의 ①~③이 이 경로에서 자연히 생깁니다. **계정을 따로 만들어 주시지 않아도
됩니다** — R1은 이 건이 풀린 뒤 다시 판단하겠습니다. 남는 것은 놓친 경로(마감 지남 ·
창 닫힘)와 리포트 특수 케이스 정도입니다.

---

## 4. 확인한 것 ✅

스펙을 다시 받아(`오퍼레이션 143 · 스키마 319`) 대조했고 **`api:check` error 0건**입니다.

| | 결과 |
|---|---|
| **세션 API 8개** | ✅ 전부 `사용 가능`. 계약이 16·17차에 요청드린 그대로입니다 — `outcome` 5종을 서버가 판정하고, `hintsUsed`·`hintsLeft`를 서버가 세고, 힌트가 두 경로(요청·자동 지급)로 옵니다 |
| **제출 2개** | ✅ `사용 가능`으로 전환. 다만 위 CORS 건으로 실제 호출이 안 됩니다 |
| **다시 보기 시작** | ✅ `POST /assessment-sessions/reviews` 신설된 것을 확인했습니다 |
| `api:check` | ✅ error 0건 |

**세션 계약에서 특히 좋았던 것 둘을 남깁니다.**

`AnswerSubmitResponse.outcome`이 5종(`RETRY_WITH_HINT`·`NEXT_TURN`·`NEXT_PROBLEM`·
`PROBLEM_CLOSED`·`SESSION_ENDED`)으로 와서 **화면이 "힌트를 다 썼는데도 미달인가"를
세지 않아도 됩니다.** 그 판정이 화면에 있으면 힌트 규칙이 두 곳에 생깁니다.

`CurrentQuestion.lastTurnOfSession`도 그렇습니다. 마지막 답변인지를 화면이 계산하면
문제 수·통과 여부를 다시 조합해야 하는데, 그 값 하나로 버튼 문구만 바꾸면 됩니다.

---

## 5. 저희 쪽 상태

```
TR-01 홈       ✅ 연동 완료
TR-02 제출     🔴 조회는 되는데 **제출이 CORS에서 막힘**(R1)
TR-04 리포트   ✅ 연동 완료
TR-03 세션     ⏳ API는 열렸지만 **들어갈 계정이 없음** — R1이 전제입니다
```

**R1 하나만 풀리면 나머지가 순서대로 이어집니다.** 제출을 태워 분석을 돌리고, 그
계정으로 세션을 붙이고, 그 과정에서 못 보던 상태들을 확인하겠습니다.
