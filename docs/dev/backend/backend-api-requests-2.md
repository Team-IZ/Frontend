# 백엔드 API — 2차 요청

> 1차: [backend-api-requests.md](backend-api-requests.md)
> 대상: `https://backend-production-37e3.up.railway.app/v3/api-docs` (재측정 완료)
>
> **이번 요청은 실질적으로 1건이다.** 1차에서 남았던 4건 중 3건은 **프론트가 흡수하는 것이
> 맞다고 판단해 철회한다.** 아래 1절에 그 판정 과정을 적었다 — 왜 요청하지 않는지가
> 요청하는 것만큼 중요하다.

---

## 0. 1차 요청 반영 확인 — 전부 검증했다

스펙을 다시 받아 같은 스크립트로 재측정했다. **보고서의 수치가 전부 맞다.**

| | 이전 | 지금 | |
|---|---|---|---|
| 에러 응답이 성공 스키마를 가리킴 | 99건 | **0건** — 99건 전부 `ErrorResponse` | ✅ |
| `required` 없는 스키마 | 79/108 | **4/110** | ✅ |
| `nullable` 표기 | 0 | **61곳**(스키마 기준) · 설명에만 있는 곳 0 | ✅ |
| `produces: */*` | 55건 | **0건** | ✅ |
| `operationId` 중복·`_N` | 있음 | **0** | ✅ |
| 공유 enum | 0 | **9종** `$ref` | ✅ |
| 전역 `security` | 없음 | 전역 + 공개 11경로만 `security: []` | ✅ |
| `x-readiness` | 없음 | **55개 전부** | ✅ |

**런타임도 확인했다.** `code`가 실제로 내려오고(`"code":"UNAUTHENTICATED"`),
`fieldErrors`도 실제로 온다(`[{field:"password",message:"must not be blank"}]`).

**예외로 남긴 2건은 판단이 맞다.** `@JsonInclude(NON_NULL)`로 키가 빠지는 4개를 `required`에서
뺀 것도, `dataRetentionDays`가 Java enum이 아니라 인라인으로 남은 것도 프론트에 문제가 없다.

### 특히 좋았던 것 — 에러 코드가 기계 추출된다

`examples` 키를 에러 코드명으로 쓴 것이 99건 **전부**에 적용됐다. 덕분에 스펙에서
**코드 목록 30종이 그대로 뽑힌다.**

```
ORG_NAME_TAKEN · ORG_IDEMPOTENCY_CONFLICT · ORG_NOT_FOUND · ORG_ALREADY_DELETED ·
ORG_NOT_DELETED · ORG_DELETE_CONFIRM_MISMATCH · ORG_POLICY_NOT_FOUND · LAST_OPERATOR ·
LAST_SUPER_ADMIN · OPERATOR_NOT_FOUND · OPERATOR_INVITATION_NOT_FOUND · ALREADY_INVITED ·
INVITE_MAIL_FAILED · AI_MODEL_NOT_AVAILABLE · CALIBRATION_IN_PROGRESS ·
CALIBRATION_VERSION_CODE_TAKEN · RETENTION_NOT_MET · SUPER_ADMIN_NOT_FOUND …
```

프론트는 이걸로 **에러 코드 유니온 타입을 자동 생성**한다. 오타 난 코드로 분기하면
컴파일이 실패하고, 백엔드가 코드를 추가하면 스펙만 갱신해도 우리 타입에 반영된다.
**이번 요청(1절)이 원하는 것도 정확히 이 구조를 나머지 도메인에 넓히는 것이다.**

---

## 1. 1차에서 남은 4건 — 다시 판정했다

**기준 하나로 갈랐다: "프론트가 코드로 해결할 수 있나."** 할 수 있으면 요청하지 않는다.

| 1차에 적었던 것 | 판정 | 왜 |
|---|---|---|
| **도메인 에러 코드** | 🔴 **요청** | **서버만 할 수 있다.** 응답에 없는 정보를 클라이언트가 복원할 방법이 없다 |
| 미매핑 경로 401 → 404 | 🟡 **확인만** | **프론트 자동 생성이 위험의 대부분을 없앤다**(2-1) |
| 목록 응답 봉투 5종 | ⚪ **철회** | **우리가 정규화한다**(2-2) |
| `redirectPath` | 🟡 **질문 1개** | 라우팅은 원래 클라이언트 지식이다(2-3) |

---

## 2. 🔴 요청 — 도메인 에러 코드를 나머지 도메인에도

### 무엇이 문제인가

에러 코드가 붙은 오퍼레이션과 **HTTP 상태 문자열만 있는 오퍼레이션이 갈려 있다.**

| | |
|---|---|
| **도메인 코드 있음 — 13건** | Organization · Platform Governance · Usage Metering |
| **일반 코드뿐 — 24건** | **Auth 10 · Academic Operations 9 · Member 3 · Consent 1 · Reporting** |

일반 코드란 `BAD_REQUEST` · `VALIDATION_FAILED` · `CONFLICT` · `FORBIDDEN` · `NOT_FOUND` ·
`GONE` 처럼 **HTTP 상태를 그대로 옮긴 것**이다. 상태 코드에 이미 있는 정보라 새로 알려주는 것이 없다.

```jsonc
// 실제 응답 — 없는 계정으로 로그인
{"status":400,"error":"400 BAD_REQUEST","code":"BAD_REQUEST","message":"로그인을 실패했습니다"}
// 스펙상 POST /auth/login 이 낼 수 있는 코드 전부
400: [VALIDATION_FAILED, BAD_REQUEST]   403: [FORBIDDEN]
```

### 왜 프론트가 해결할 수 없나

**정보가 응답에 존재하지 않는다.** "비밀번호 틀림"과 "미활성 계정"이 **같은 `code`**로 온다.
클라이언트가 쓸 수 있는 유일한 단서는 `message` 문자열인데,

- `message`는 스펙에 *"사람이 읽는 기본 문구라 바뀔 수 있다"* 고 명시돼 있다 → **계약이 아니다.**
- 문자열 비교로 분기하면 백엔드가 문구를 다듬는 순간 **화면이 조용히 깨진다.** 테스트도 못 잡는다.

이건 프론트 자동 생성으로도, 어떤 클라이언트 설계로도 못 푼다. **없는 정보다.**

### 우리 화면이 실제로 무엇을 하려는지

로그인 화면은 **케이스 9개를 이미 코드로 갖고 있다**(`src/features/auth/authTypes.ts`).
목업 케이스 표에서 온 것이고, **코드마다 화면이 하는 일이 다르다.**

| 우리 코드 | 화면이 하는 일 | 상태코드 제안 |
|---|---|---|
| `AUTH_INVALID` | 문구만 (계정 열거 방지 문구) | 400/401 |
| `AUTH_THROTTLED` | **남은 초를 카운트다운**하고 버튼을 잠근다 → `retryAfter`(초) **필요** | 429 |
| `AUTH_UNVERIFIED` | **초대 메일 재발송 안내**를 띄운다 | 403 |
| `AUTH_INACTIVE` | 정지 계정 — **문의 안내**만 | 403 |
| `AUTH_TOKEN_ISSUE` | **재시도** 버튼 | 500 |
| `AUTH_ROLLBACK` | 〃 (비밀번호는 안 바뀜을 명시) | 500 |
| `AUTH_COOKIE` | 〃 (브라우저 설정 안내) | 500 |
| `AUTH_NO_CONTEXT` | 관리자 문의 — 재시도해도 같음 | 500 |

**이름은 그쪽 규칙에 맞춰도 된다**(`AUTH_*` 접두어를 고집하지 않는다).
**필요한 것은 "이 넷이 서로 다른 값으로 온다"는 사실 하나뿐이다.**

> ### 계정 열거 방지와 충돌하지 않는다 — 노출은 우리가 정한다
> `AUTH_UNVERIFIED`·`AUTH_INACTIVE`를 구분해 주는 것이 "계정이 존재한다"를 흘리는 것 아니냐는
> 우려가 있을 수 있다. **분리해서 생각하면 된다.**
>
> - **서버는 코드를 구분해 준다** → 프론트가 *행동*을 고를 수 있다.
> - **화면 문구는 프론트가 합친다** → 필요하면 셋을 같은 문구로 보여준다.
>
> 만약 **"열거 위험 때문에 일부러 합쳤다"** 면 그 판단을 알려 달라. 그러면 우리가 케이스
> 표를 고친다 — **보안 결정을 프론트가 뒤집을 생각은 없다.** 다만 지금은 합친 것인지
> 아직 안 붙인 것인지 구분이 안 된다.

### 우선순위 — 전부 한 번에 안 해도 된다

| 순위 | 대상 | 왜 |
|---|---|---|
| **1** | `POST /auth/login` | **첫 연동 화면이다.** 여기가 되면 나머지 패턴이 확정된다 |
| **2** | `/auth/password-reset/*` 3건 · `/auth/invitations/*` · `/auth/manager-signup` · `/auth/trainee-activation` | 만료·이미 사용됨·불일치가 **전부 `CONFLICT`/`GONE`으로 뭉쳐 있다.** 화면 문구가 갈려야 한다 |
| **3** | Academic Operations 9건 (기수·반·배정) | 대부분 `NOT_FOUND`/`CONFLICT`. **배정 롤백**처럼 되돌릴 수 없는 것부터 |
| **4** | Member 3건 | 명단 등록 실패 사유(중복 이메일·도메인 불일치)가 구분돼야 한다 |

**형식은 이미 확립돼 있다.** `ORG_NAME_TAKEN`을 붙인 것과 똑같이 하면 되고,
`examples` 키에 코드명을 넣는 방식도 그대로면 된다. **새로 정할 것이 없다.**

---

## 3. 🟡 확인만 부탁 — 요청이 아니다

### 3-1. 미매핑 경로가 401인 건 — 토큰이 **있을 때**도 그런가?

1차에 *"프론트 오타가 강제 로그아웃을 유발한다"* 고 적었는데, **다시 보니 우리 쪽에서
거의 다 막힌다.**

- **자동 생성 후에는 경로를 손으로 쓰지 않는다.** 모든 경로가 스펙에서 나오므로 **오타는
  컴파일 에러**가 된다. 1차에서 걱정한 시나리오 자체가 잘 안 생긴다.
- 401 재시도 규칙도 우리가 조인다 — **토큰을 실제로 보낸 요청의 401에만 갱신을 시도**하고,
  갱신은 **1회만** 한다.

**그래서 질문 하나만 남는다: 유효한 토큰으로 없는 경로를 부르면 404가 오나, 401이 오나?**
(우리가 관측한 401은 토큰 없이 보낸 것이라 시큐리티 필터에서 걸린 것으로 보인다.)

- **404면 아무 문제 없다.** 이 항목은 그대로 닫는다.
- **401이면** 여전히 "토큰 만료"와 구분이 안 되므로, 그때 404로 바꿔 달라고 다시 요청하겠다.

> 계정을 하나 주시면 저희가 직접 확인하고 닫겠다. **테스트용 슈퍼어드민 계정 1개** 부탁드린다.

### 3-2. `LoginResponse.redirectPath` — `role` 말고 다른 정보가 실리나?

예시가 `"/cohorts/12%EA%B8%B0"` 인데 프론트에 그런 라우트가 없다.

**질문:** 이 값이 `role`에서 유도할 수 없는 정보를 담는가?

| 답 | 우리가 할 일 |
|---|---|
| **아니다(role로 정해진다)** | **우리가 무시하고 `role`로 라우팅한다.** 백엔드는 아무것도 안 해도 된다 — 필드를 지워도 되고 둬도 된다 |
| **그렇다**(예: 특정 기수로 딥링크) | 낼 수 있는 값 목록을 알려 달라. 우리 라우트 표와 대조해 맞추겠다 |

> **우리 의견:** 라우팅은 프론트 지식이다. URL 구조를 바꿀 때마다 백엔드 배포가 필요해지는
> 결합은 안 만드는 게 낫다. **`role`만으로 충분하고, 그건 이미 응답에 있다.**

### 3-3. `POST /auth/refresh`의 쿠키·헤더 파라미터 — 코드 생성기가 여기서 걸렸다

실제로 타입을 생성해 보니 이 오퍼레이션만 컴파일이 깨졌다.

```jsonc
parameters: [
  { name: "refresh_token", in: "cookie", required: true },   // ← 클라이언트가 못 만진다
  { name: "X-Swagger-Client-Origin", in: "header" }          // ← "Swagger UI 테스트 전용"
]
```

- **`refresh_token`은 httpOnly 쿠키라 JS가 읽지도 쓰지도 못한다.** 브라우저가 자동으로
  싣는데 스펙이 `required` 파라미터로 선언하니, 생성된 타입이 **호출자에게 값을 요구**한다.
  (우리 쪽에서 채워 넣어 우회했다 — 동작에는 문제없다)
- **`X-Swagger-Client-Origin`은 설명에 *"Swagger UI 테스트 전용"* 이라고 적혀 있다.**
  테스트 도구용 파라미터가 공개 계약에 있으면, 모르는 사람은 프로덕션에서도 보내야 하는 줄 안다.

**요청(낮음):** 둘 다 `parameters`에서 빼고 **설명으로만** 남겨 주면 좋겠다.
**급하지 않다** — 우리 우회가 이미 있고 동작에 영향이 없다.

### 3-4. `fieldErrors`의 메시지가 영문 기본값이다

```json
"fieldErrors":[{"field":"password","message":"must not be blank"}]
```

Bean Validation 기본 문구다. **급하지 않다** — 우리 폼은 자체 검증이 먼저라 이게 화면에
노출될 일이 거의 없다. 다만 나중에 여유가 생기면 `FieldError`에도 `code`(예: `NOT_BLANK`·
`INVALID_FORMAT`)를 넣어 주면 프론트가 문구를 직접 정할 수 있다. **지금은 그대로 둬도 된다.**

---

## 4. ⚪ 철회 — 목록 응답 봉투는 우리가 정규화한다

1차에 *"봉투 5종을 통일해 달라"* 고 적었다. **철회한다.**

```
content · page · size · totalElements · totalPages   (Organization · Cohort)
content · activeCount                                (SuperAdmin)
organizationId · content · activeCount               (Operator)
classrooms                                           (Classroom)
enrollments                                          (Enrollment)
```

**우리 자동 생성기가 이걸 흡수할 수 있다.** 스펙에서 "배열인 필드가 무엇인지"와 "페이지
필드가 있는지"를 읽을 수 있으므로, 생성 단계에서 `{ items, total, page, size }` 한 모양으로
바꿔 화면에 넘긴다. **기계적인 변환이라 사람이 실수할 여지가 없고, 백엔드 DTO를 건드리는
것보다 싸다.**

**대신 하나만 부탁한다 — 나중에 어떤 목록에 페이징을 추가하면 알려 달라.**
지금 `classrooms`·`enrollments`는 페이징이 없어서 우리가 `total = items.length`로 채운다.
**페이징이 붙는 순간 이 값이 조용히 틀린다**(한 페이지 개수를 전체로 보고한다). 그때는
`totalElements`를 같이 내려 주면 된다.

---

## 5. 정리

| | 백엔드가 할 일 |
|---|---|
| 🔴 **요청 1건** | **도메인 에러 코드** — `/auth/login`부터, 형식은 `ORG_NAME_TAKEN`과 동일 |
| 🟡 확인 2건 | 유효 토큰 + 없는 경로 = 404인가 / `redirectPath`가 `role` 외 정보를 담는가 |
| 🟢 부탁 1건 | **테스트용 슈퍼어드민 계정 1개** (직접 확인해서 미결을 닫으려 한다) |
| ⚪ 나중에 | 목록에 페이징을 추가하면 알려 주기 · `FieldError.code`(여유 있을 때) |

1차 요청이 8건이었는데 이번이 1건인 이유는 **1차가 거의 다 반영됐기 때문**이다.
남은 것도 *"프론트가 못 하는 것"* 만 남겼다. 확인 부탁드린다.

---

## 부록 — 재측정 명령

> ⚠️ **캐시 주의.** Railway 엣지가 옛 스펙을 준다. 재배포 후 확인할 때는 **반드시 캐시버스터**를
> 붙인다 — 이것 때문에 "반영 안 됐다"고 한 번 오판했다.

```bash
curl -s -H 'Cache-Control: no-cache' \
  "https://backend-production-37e3.up.railway.app/v3/api-docs?cb=$(date +%s)" -o api-docs.json

# 일반 코드만 있는 오퍼레이션 세기
node -e "
const s=require('./api-docs.json');
const G=new Set(['BAD_REQUEST','VALIDATION_FAILED','CONFLICT','FORBIDDEN','NOT_FOUND','GONE',
 'UNAUTHORIZED','UNAUTHENTICATED','INTERNAL_SERVER_ERROR','BAD_GATEWAY','UNPROCESSABLE_ENTITY','ACCESS_DENIED']);
let generic=0, domain=0;
for(const [p,it] of Object.entries(s.paths)) for(const [m,op] of Object.entries(it)){
  if(!op?.responses)continue;
  const codes=Object.entries(op.responses).filter(([c])=>+c>=400)
    .flatMap(([,r])=>Object.keys(r.content?.['application/json']?.examples||{}));
  if(!codes.length)continue;
  codes.some(c=>!G.has(c)) ? domain++ : generic++;
}
console.log('도메인 코드 있음:',domain,' 일반 코드뿐:',generic);"
```
