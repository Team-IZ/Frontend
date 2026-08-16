# 백엔드 API — 31차 요청 · 스펙에 샌 필드 하나, 이름이 사실과 다른 응답 하나

> **29차 회신 감사합니다. R2 열여섯 건을 실서버 스펙에서 전부 확인했고, `api:check`의
> error가 14 → 0이 됐습니다.** 저희 CI가 풀려 막혀 있던 PR을 올렸습니다.
>
> 전역 검사 2종을 넣어 주신 것이 특히 반갑습니다 — *"사람이 검사를 추가해야 하는 구조가
> 원인"* 이라는 진단이 정확하다고 생각합니다.
>
> 이번 것은 **작습니다.** 두 건이고 둘 다 화면을 깨뜨리지는 않습니다.
> 측정 — 2026-08-16 · 실서버 · 프록시(Lambda URL) 경유 · 오퍼레이션 143 · 스키마 307.

---

## 0. 한눈에

| | 무엇 | 우선순위 |
|---|---|---|
| **R1** | `SessionActivityRequest`에 **자바 게터가 샌 것으로 보이는 `empty` 필드**가 있습니다 | 🟡 낮음 |
| **R2** | `trainees/preview`가 **드라이런인데 응답이 `registeredCount`** 라고 말합니다 | 🟡 낮음 |
| **🟠** | **29차 R1(404 무응답)은 그대로입니다** — 재현만 붙입니다 | 🟠 인프라 |
| **✅** | 29차 회신 **열여섯 건 + Q1 확인** | — |

---

## 1. 🟡 R1 — `SessionActivityRequest.empty`

29차에서 `minProperties: 1`로 고쳐 주신 그 스키마입니다. **그 판단에는 저희도 동의해서
검사기를 그쪽에 맞췄습니다**(§3). 다만 옆에 필드가 하나 더 있습니다.

```jsonc
"SessionActivityRequest": {
  "type": "object",
  "minProperties": 1,
  "properties": {
    "awaySeconds":           { "description": "창을 떠나 있다 돌아온 시간(초)…" },
    "disconnectedSeconds":   { "description": "…" },
    "firstKeystrokeDelayMs": { "description": "…" },
    "empty":                 { "type": "boolean" }        // ← 설명도 예시도 없습니다
  }
}
```

`POST /assessment-sessions/{sessionId}/activity`의 **요청 본문**입니다.

**`isEmpty()` 게터가 스펙 생성기에 잡힌 것 아닐까 싶습니다.** 29차 회신에 *"서버가 실제로
거절하는 것(`isEmpty()` → 400)을 `minProperties: 1`로 적었다"* 고 쓰셨는데, 그 메서드가
그대로 프로퍼티가 된 모양입니다.

- 스펙 전체 307개 스키마에서 **설명 없는 boolean은 이 하나뿐**입니다
- 다른 세 필드는 설명·예시·`minimum`/`maximum`까지 다 있습니다

### 왜 말씀드리나 — 화면이 안 보내도 되는 값을 묻게 됩니다

생성기가 이것도 요청 타입에 넣습니다.

```ts
body: {
  awaySeconds?: number
  disconnectedSeconds?: number
  firstKeystrokeDelayMs?: number
  empty?: boolean          // ← 이걸 뭘로 채워야 하는지 화면이 알 수 없습니다
}
```

**지금 당장 깨지는 것은 없습니다** — optional이라 안 보내면 그만이고, 응시 세션은 저희
화면이 아직 안 붙였습니다. 다만 그 화면을 만드는 사람이 *"`empty`를 `true`로 보내야 하나"*
를 한 번은 물어보게 됩니다.

> `@JsonIgnore`를 붙이시거나, 레코드라면 `isEmpty()`를 `hasNothing()` 같은 이름으로
> 바꾸시면 스펙에서 빠질 것 같습니다. **저희가 대신 판단할 수 없는 것**이라 그대로
> 전합니다.

---

## 2. 🟡 R2 — `preview`가 드라이런인데 응답은 「등록했다」고 말합니다

Q1(CSV 넓히기)을 확인하다 나왔습니다.

```
POST /api/v0/cohorts/{cohortId}/trainees/preview

→ {"requestedCount":1, "registeredCount":1, "invitationSentCount":0,
   "batchRequestId":null, "failures":[]}
```

**`registeredCount: 1`** 입니다. 스키마도 등록과 같은 `RegisterTraineesResponse`입니다.

### 실제로는 아무것도 안 만듭니다 — 확인했습니다

```
POST …/trainees/preview        (이름 「검증용길동」 · verify31@ex.com)
  → registeredCount: 1

GET  …/trainees?query=verify31@ex.com
  → 0건                                   ← 드라이런이 맞습니다 ✅
```

**동작은 옳습니다.** 이름이 사실과 다를 뿐입니다.

### 왜 말씀드리나

저희가 이 응답을 처음 보고 **"미리보기를 눌렀는데 진짜 등록된 것 아닌가"** 하고 기수
명단을 뒤졌습니다. 화면에 붙일 때도 같은 자리에서 멈칫하게 됩니다 —
`registeredCount`를 「등록될 인원」으로 읽어야 하는데, **같은 이름의 필드가 등록 API에서는
「등록된 인원」**이기 때문입니다.

| | 지금 | 제안 |
|---|---|---|
| 스키마 | `RegisterTraineesResponse` 공용 | `PreviewTraineesResponse` 분리 |
| 필드 | `registeredCount` | `registrableCount` · `validCount` 등 |
| 최소한 | — | **설명에 「실제로 등록하지 않는다」한 줄** |

**맨 아래 한 줄만이라도 충분합니다.** 스키마를 가르는 것이 부담이면 설명으로 족합니다 —
저희가 알아야 하는 것은 *"이 수가 예정인지 결과인지"* 하나입니다.

> `batchRequestId: null`도 같이 옵니다. 드라이런이라 배치가 없는 것이 자연스러운데,
> 등록 응답에서는 이 값이 진행률 조회 키라(25차 Q2) **null 여부로 갈라야 하는지**가
> 애매합니다. 스키마가 갈리면 이것도 같이 정리됩니다.

---

## 3. ✅ 29차 회신 — 열여섯 건 확인했습니다

| | 무엇 | 확인 |
|---|---|---|
| **R2 ①** | `required` 없는 객체 10건 | 전부 반영 ✅ |
| **R2 ②** | 설명은 `null`인데 타입이 안 받던 것 6건 | `oneOf: [$ref, null]`로 나옵니다 ✅ |
| **재발 방지** | 전역 검사 2종 신설 | — |
| **Q1** | `.xlsx` 안 받음 · CSV는 넓힘 | 실측 통과 ✅ (아래) |

### 저희 검사기를 그쪽 판정에 맞췄습니다

`SessionActivityRequest` 하나가 저희 `api:check`에 남아 있었는데, **회신 설명이 맞다고
판단해 검사 규칙을 고쳤습니다.**

> 세 값이 전부 선택이고 **어느 것을 보낼지는 그때 관찰된 신호가 정한다** — 하나를 골라
> required로 올리면 스펙이 사실과 달라진다.

`minProperties >= 1`을 `required`의 대안으로 인정합니다. 이 규칙이 잡으려는 것은
*"무엇이 항상 오는지 아무도 안 적었다"* 이지 `required`라는 키 자체가 아니니까요.

```
npm run api:check     error 14 → 0 · warn 30(전부 참고용)
```

**29차 §5의 *"결과가 같은지 맞춰 보자"* 에 대한 답입니다 — 이제 같습니다.**

### `UpdateModelPricingRequest`는 저희 화면에서 바로 걸렸습니다

*"오퍼레이터 화면 것이 아니라 SA-03"* 이라고 하셨는데, **저희가 SA-03을 이미 붙여 놨습니다.**
스펙을 받자마자 타입 검사가 그 자리를 정확히 짚었습니다.

```
PricingDialog.tsx(123,11): Type 'number | null | undefined'
                           is not assignable to type 'number | null'
```

`PUT`이 전체 치환이고 `null`이 *"미설정으로 되돌려라"* 는 **지시**라는 설명 그대로라,
화면도 두 키를 항상 싣도록 고쳤습니다. **찾아 주셔서 도움이 됐습니다.**

### Q1 — 넓히신 것을 실측했습니다

```
CP949 · 「번호,이메일,소속,이름」 4열 · 순서 뒤바뀜   → 200  ✅
UTF-8 · 「이메일,이름」 2열 순서 바뀜                → 200  ✅
이름 열 없음                                      → 400  CSV_FORMAT_INVALID
이름이 빈칸                                       → 400  TRAINEE_NAME_INVALID
```

에러 문구도 *"순서는 상관없고 다른 열이 섞여 있어도 됩니다"* 로 바뀌어 있어, **화면이
따로 설명할 것이 없어졌습니다.**

`.xlsx`를 안 받으시는 이유(POI 의존성 + 6MB 상한에 먼저 걸림)도 납득했습니다 —
**「엑셀은 CSV로 저장해 주세요」 한 줄**로 안내하고 인코딩·열 정리 안내는 뺍니다.
화면의 사전 차단을 푸는 것은 저희 쪽 작업이라 여기에 청하지 않습니다.

---

## 4. 🟠 참고 — 29차 R1은 그대로입니다

인프라 쪽으로 넘기신 것으로 알고 있습니다. **재현만 붙입니다.**

```
GET /api/v0/definitely-not-a-real-path   →  무응답 (30초 타임아웃)
GET /api/v0/zzz-no-such-route            →  무응답 (30초)

── 같은 시각 · 같은 토큰 ──
GET    /api/v0/members/me                →  200 (2초)
DELETE /api/v0/cohorts                   →  405 (즉시)
```

29차에서 찾아 주신 `AiProxyWarmUp` 주석(*"원본 도메인은 PAUSED를 스스로 깨우지 못하고
404만 돌려준다"*)이 지금도 가장 그럴듯한 설명입니다.

**저희 화면은 404를 「아직」으로 그릴 준비가 돼 있습니다** — 프록시가 통과시키는 순간
25차 R4·R8이 같이 풀립니다.

---

## 5. 정리

| | 청하는 것 |
|---|---|
| **R1** | `SessionActivityRequest.empty` — `@JsonIgnore` 또는 게터 이름 변경 |
| **R2** | `preview` 응답 — 스키마 분리, 아니면 **설명 한 줄** |
| **R1(29차)** | 프록시의 404 판정 — 인프라 |

두 건 다 **급하지 않습니다.** 다음에 그 파일을 여실 때 같이 봐 주시면 됩니다.
