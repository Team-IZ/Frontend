# AU-03 비밀번호 재설정 — 상황 전수

> `docs/dev/screen-hardening.md` 1단계 결과물. 대상 파일: `PasswordResetScreen.tsx` ·
> `PasswordResetScreen.route.tsx` · `passwordResetStates.ts` · `passwordResetTypes.ts` ·
> `passwordResetApi.ts`. API: `POST /auth/password-reset/requests` ·
> `POST /auth/password-reset/validations` · `POST /auth/password-reset/confirmations`.
>
> **범위 밖(구현 불가·정책 미확정)**: `#donepartial`(세션 폐기 부분 실패) — 실제
> `PasswordResetConfirmationResponse`에 폐기 결과 필드가 없어 화면이 그 상태에 도달할 방법이
> 없다(`passwordResetTypes.ts` 주석, 백엔드가 필드를 추가하면 복원). 접근성 `aria-describedby`
> 미연결(AU-01에서 이미 발견·기록만 함, 공용 컴포넌트). 케이스 계약 단일 원천:
> [`password-reset.html#cases`](../../plan/v2/wireframe/shared/password-reset.html#cases).

---

## 조회 흐름

```
① 요청  RequestStage       POST /auth/password-reset/requests    제출 시 1회, 항상 202
② 설정  SetPasswordStage    POST /auth/password-reset/validations  진입 시 1회(토큰 검증)
                            POST /auth/password-reset/confirmations 제출 시 1회
```

라우트는 `/shared/password-reset` 하나뿐 — `?token=` 쿼리 유무로 컴포넌트 내부에서만 단계를
가른다(정의서 §9, "토큰 없이 ②에 오면 ①로 보낸다"). `token` 값이 빈 문자열(`?token=`)이어도
falsy라 자동으로 ①로 떨어진다(코드 확인, 별도 처리 불필요).

---

## 축 A. ① 요청 제출 (`RequestStage.onSubmit`)

| | | 비고 |
|---|---|---|
| A1 | (성공, 항상 202) | 정상·없는 이메일·미활성 계정 셋 다 여기로 — 카드 전환, 계정 열거 방지 |
| A2 | 네트워크·5xx 실패 | **🔴 발견·✅ 이번에 고침.** 원래 `try/catch`가 아예 없어 실패해도 아무 알림 없이 조용히 멈췄다(이 화면 유일하게 에러 처리가 전혀 없던 제출 경로). `resolvePasswordResetState(err).message`를 `submitAlert`로 노출하도록 고쳤다 |
| A3 | 이메일 빈 값·형식 오류 | RHF 클라이언트 검증, D축과 동일 패턴 |
| A4 | 제출 중 | 버튼 "전송 중…" + 입력 잠금 |

## 축 B. ① 요청 후 재발송 (`RequestStage.handleResend`) — A1 카드에서만 노출

| | | 비고 |
|---|---|---|
| B1 | 클릭 전 — "다시 보내기" 버튼 |
| B2 | 클릭 → 성공 → "다시 보냈습니다"로 교체 |
| B3 | 클릭 → 실패(네트워크·5xx) | **🔴 발견·✅ 이번에 고침.** A2와 같은 결함 — `try/catch` 추가, `resendError`를 카드 `aux` 영역에 danger 색으로 노출(원래 있던 "스팸함 확인" 안내 문구를 에러 발생 시에만 대체) |

## 축 C. ② 설정 — 토큰 검증 (`verifyResetToken`, 진입 시 1회)

| | 코드 | `action` | 화면 |
|---|---|---|---|
| C1 | (성공) | — | 새 비밀번호 폼 렌더 |
| C2 | `RESET_TOKEN_EXPIRED` / `RESET_TOKEN_USED` | `REQUEST_AGAIN` | `#expired` 카드 — [다시 요청하기] → ① |
| C3 | `RESET_TOKEN_INVALID` | `CONTACT` | `#invalid` 카드 — [문의하기], 보안 로그 |
| C4 | 네트워크 도달 실패 | (없음) | **🔴 발견·✅ 이번에 고침** — 아래 "코드 리뷰로 확정된 것" 참고 |
| C5 | 스펙에 없는 코드 | (없음) | 위와 같은 결함, 같은 수정으로 커버됨 |
| C6 | 검증 중 | — | "링크를 확인하는 중…" 텍스트만 |

## 축 D. ② 설정 제출 (`SetPasswordStage.onSubmit`, `confirmPasswordReset`)

| | 코드 | 처리 |
|---|---|---|
| D1 | (성공) | `#done` 카드 — "비밀번호가 바뀌었습니다", 다른 기기 모두 로그아웃 안내 |
| D2 | `SAME_AS_CURRENT` | 필드 인라인 에러(`setError('password', ...)`)로 특별 처리 — 알림 배너가 아니라 정책 힌트처럼 필드 하단에 붙는다 |
| D3 | `RESET_FAILED` | danger 알림, 폼 유지("비밀번호는 아직 안 바뀜") |
| D4 | 네트워크·스펙 밖 코드 | danger 알림, `resolvePasswordResetState` 폴백 메시지 |
| D5 | 제출 중 | 버튼 "비밀번호를 바꾸는 중…" |

## 축 E. 클라이언트 검증

| | |
|---|---|
| E1 | 비밀번호 정책 미충족 |
| E2 | 비밀번호 확인 불일치 |

## 축 F. Caps Lock · 비밀번호 표시 토글

AU-01 E3 수정(`onFocus` 배선)이 `SetPasswordStage`의 `passwordCaps`·`passwordConfirmCaps` 둘 다
이미 적용돼 있음을 코드로 확인. 이번에 새로 건드릴 것 없음.

---

## 코드 리뷰로 확정된 것 (렌더 없이 판정 가능)

- **🔴 A2·B3 · 확정된 결함 · ✅ 고침 — `RequestStage.onSubmit`·`handleResend`에 `try/catch`가
  아예 없었다.** 이 화면에서 유일하게 실패 시 아무 피드백도 없던 두 지점. `resolvePasswordResetState`를
  재사용해(새 문구 체계를 안 만듦) 각각 폼 상단 알림·카드 `aux`에 노출하도록 고쳤다.
- **🔴 C4·C5 · 확정된 결함 · ✅ 고침 — 토큰 검증 실패 렌더링이 `tokenAlert.message`(실제 계산된
  메시지)를 무시하고 있었다.** 기존 코드는 `action === 'REQUEST_AGAIN'`이 아니면 무조건 하드코딩된
  "유효하지 않은 링크입니다 + 문의하기"(`#invalid` 카드)를 보여줬다 — `RESET_TOKEN_INVALID`(진짜
  위변조, `action: 'CONTACT'`)와 네트워크 오류·스펙 밖 코드(`action` 없음)가 똑같은 화면으로
  뭉개져 있었다는 뜻. 서버에 물어보지도 못한 상태(네트워크 실패)를 "유효하지 않은 링크"로 단정하는
  것은 사용자에게 잘못된 정보다. `action`을 `REQUEST_AGAIN`·`CONTACT`·그 외(네트워크·미지) 3단으로
  나눠, 마지막 분기는 `resolvePasswordResetState`가 이미 구분해 둔 `tokenAlert.message`를 그대로
  쓰도록 고쳤다. `CONTACT` 분기의 하드코딩된 문구는 그대로 유지했다 — 보안상 위변조 토큰에 대해
  원인을 구체적으로 흘리지 않는 것은 의도된 설계(정의서 §6)라 이번 수정 대상이 아니다.

---

## 2단계·5단계로 확정된 것

아래는 원래 "미검증으로 남긴 것"에 있던 항목 중 이번에 curl·Playwright·사용자 직접 재현으로
확인한 것 — 자세한 절차·응답 원문은 뒤의 "2단계 실측"·"5단계 플로우를 탄다" 절 표에 있다.

**curl로 실서버 확인:**

- `RESET_TOKEN_INVALID`(C3) — 위조 토큰으로 `validations`·`confirmations` 둘 다 400
  `RESET_TOKEN_INVALID` 응답 확인
- 계정 열거 방지(`requests`, A1) — 존재/미존재 이메일 모두 202 + 완전히 동일한 메시지 확인
- 네트워크 도달 실패 — DNS 실패로 `ApiError.isNetwork` 경로가 실제로 트리거되는 것을 transport
  레벨에서 확인

**Playwright로 렌더 확인(응답 가로채기 + 실제 클릭, 14건 전수):**

- ①→②→완료 전체 플로우 — 요청 제출부터 로그인 이동까지 실제 클릭으로 이어서 확인
- **A2·B3 재검증** — 이번에 새로 추가한 `try/catch`가 실제로 danger 알림(폼 상단)·`aux` 문구
  (카드)를 띄우는 것 확인
- `#expired`(C2)·`#invalid`(C3) 상태 카드 — 화면이 이 코드를 받았을 때 올바르게 렌더하는지 확인
  (서버가 실제로 `RESET_TOKEN_EXPIRED`/`USED`를 주는지 자체는 아직 미검증 — 아래 참고)
- **C4/C5 재검증** — 토큰 검증 중 네트워크 완전 실패 시 "유효하지 않은 링크"로 오판하지 않고
  실제 계산된 메시지가 뜨는 것을 실제 클릭 흐름으로 확인(이번 라운드 핵심 수정)
- **C4 — 사용자가 브라우저 DevTools의 Request Blocking으로 직접 재현.** `validations` 요청을
  502로 강제 차단해 실제 브라우저에서 재현했고, "문제가 발생했어요" 카드가 정상 노출되는 것을
  확인했다(Playwright 가로채기와는 별개로, 실제 브라우저·실제 사용자 조작으로 한 번 더 검증됨)
- D2(`SAME_AS_CURRENT`) — 배너가 아니라 비밀번호 필드 바로 아래 인라인으로 뜨는 것 확인
- D3(`RESET_FAILED`) — danger 배너 + 폼 유지 확인
- §9 `token=` 빈 값 — ①(`RequestStage`)로 자동 폴백되는 것 렌더로 재확인
- 한글 IME 조합(이메일 필드) — CDP composition으로 조합 안 깨짐 확인

---

## 2단계 · 실측 (curl, 2026-08-18)

실서버(`https://xvdanr6m362b2ge232vdmfbrny0kwakz.lambda-url.ap-northeast-1.on.aws`, Lambda 프록시,
AU-01·AU-02와 동일 주소) 직접 호출.

| 요청 | 결과 |
|---|---|
| `POST /auth/password-reset/requests` 존재하는 dev 계정(`manager@example.com`) | 202, "입력하신 주소가 계정에 등록돼 있으면…" |
| `POST /auth/password-reset/requests` 존재하지 않는 이메일 | 202, **동일한 메시지**(계정 열거 방지 실측 확인 — A1) |
| `POST /auth/password-reset/requests` 형식 오류 이메일 | 400 `VALIDATION_FAILED` |
| `POST /auth/password-reset/validations` 위조 토큰 | 400 `RESET_TOKEN_INVALID`(C3 코드 실서버 확인) |
| `POST /auth/password-reset/validations` 빈 토큰 | 400 `VALIDATION_FAILED`(도달 불가 — 아래 참고) |
| `POST /auth/password-reset/confirmations` 위조 토큰 | 400 `RESET_TOKEN_INVALID` |
| 위 세 엔드포인트 전부 DNS 실패 | `curl exit 6` — `ApiError.isNetwork` 경로 트리거 확인 |

- **`RESET_TOKEN_EXPIRED`·`RESET_TOKEN_USED`·`SAME_AS_CURRENT`·`RESET_FAILED` 4종은 curl로 확인
  못 함.** 진짜 발급된 재설정 토큰이 있어야 하는데 토큰 원문은 실제 메일 링크 안에만 있다 —
  AU-02와 같은 이유로 사용자와 상의해 **코드 리뷰 + Playwright 가로채기로 대체**(이 세션 대화
  로그 참고). 5단계에서 실제 렌더로 대신 확인함 — 서버가 정확히 이 코드를 주는지는 미검증으로
  남는다.
- **빈 토큰(`?token=`)은 URL에 값 없이 접근해도 도달 불가능** — `token` falsy면 컴포넌트가 자동으로
  `RequestStage`(①)로 떨어져 애초에 `validations` 호출 자체가 안 나간다(`PasswordResetScreen.tsx`
  확인, 아래 5단계 §9에서 실제 렌더로도 재확인).
- `token` 존재하지만 무의미한 값(위조)으로 직접 URL 진입은 위 `RESET_TOKEN_INVALID` 실측과 같은
  경로 — 이미 확인됨.

## 5단계 · 플로우를 탄다 (Playwright, 2026-08-18)

로컬 `npm run dev`(5173), `page.route`로 서버 응답을 가로챈 뒤 **실제 클릭·입력**으로 검증. 스크립트는
스크래치패드에 둠. **14건 전수 통과.**

| 시나리오 | 확인한 것 | 결과 |
|---|---|---|
| ①→②→완료 전체 플로우 | 요청 제출 → "메일을 보냈습니다" 카드 → (링크 클릭 대체) → 새 비밀번호 폼 → 확정 → "비밀번호가 바뀌었습니다" → [로그인] 클릭 → `/shared/login` | ✅ |
| **A2 재검증** | 요청(①) 500 실패 → danger 알림 노출 + 폼 유지(이 화면에서 유일하게 에러 처리가 아예 없던 자리, 이번에 고친 것 — 회귀 없음) | ✅ |
| **B3 재검증** | ① 성공 뒤 재발송(B축)이 500 실패 → 카드 `aux` 영역에 danger 문구로 대체(스팸함 안내 문구 대신) | ✅ |
| C2 만료/사용됨 | `#expired` 카드 · [다시 요청하기] 클릭 → ①로 이동(경로 확인) | ✅ |
| C3 위변조 | `#invalid` 카드, [문의하기]만 있고 재요청 버튼 없음(보안 설계 의도대로) | ✅ |
| **C4/C5 재검증** | 토큰 검증 중 네트워크 완전 실패(connectionrefused) → "문제가 발생했어요" + **실제 계산된 메시지**("서버에 연결하지 못했습니다") 노출, **"이 링크로는 비밀번호를 바꿀 수 없어요"(위변조 문구)로 오판하지 않음** — 이번 라운드 핵심 수정이 실제 렌더로 확인됨 | ✅ |
| **C4 사용자 직접 재현** | Playwright가 아니라 **사용자가 실제 Chrome DevTools Request Blocking으로 `validations`를 502로 직접 차단** — "문제가 발생했어요" 정상 노출, 위변조 문구로 안 새는 것 재확인(실제 브라우저·실제 조작) | ✅ |
| D2 SAME_AS_CURRENT | 배너(`[data-slot=alert]`) 0개 · 비밀번호 필드 바로 아래 `role=alert`로 "지금 쓰는 비밀번호와 달라야 합니다" — 정책 힌트처럼 인라인 노출 확인 | ✅ |
| D3 RESET_FAILED | danger 배너 1개 + 폼 유지(비밀번호 아직 안 바뀜) | ✅ |
| §9 `token=` 빈 값 | URL에 `?token=`만 있어도(값 없음) 자동으로 ①(`RequestStage`)로 폴백 | ✅ |
| IME 한글 조합 | 이메일 필드(①) — CDP composition 후 "미니" 정확히 입력 | ✅ |

첫 러닝에서 스크립트 자체의 판정 오류 2건을 발견·수정했다(제품 결함 아님, 기록만 남김):
`role=alert`가 배너(`Alert`)와 인라인 필드 에러(`FieldError`) 둘 다에 쓰여(`data-slot=alert`로
구분해야 함) D2 배너 판정이 처음에 오탐이었고, `waitForURL` 글롭 패턴이 쿼리스트링 있는 현재
URL과 겹쳐 C2의 "다시 요청하기" 이동 판정이 한 번 타임아웃 났다(시간 대기로 바꿔 해결) —
「측정 대상을 확인한다」(screen-hardening.md 2단계)와 같은 종류의 함정이라 여기 남긴다.

## 6단계 · 남긴다

### 이번 라운드에서 고친 것 (전부 코드 리뷰 단계에서 고치고, 이번 5단계에서 실제 클릭으로 재검증 완료)

1. A2·B3 — `RequestStage.onSubmit`·`handleResend`에 없던 `try/catch` 추가
2. C4·C5 — 토큰 검증 실패 렌더링이 `action` 3단(REQUEST_AGAIN/CONTACT/기타)을 안 가르고 전부
   "유효하지 않은 링크"로 뭉개던 것 — 네트워크 실패도 위변조와 같은 문구로 잘못 단정하던 결함,
   Playwright 가로채기 + **사용자의 실제 DevTools 재현(502 직접 차단)** 둘 다로 회귀 없음 확인

### 이번 범위에서 의도적으로 안 건드린 것

- **`#donepartial`(세션 폐기 부분 실패)** — 실제 응답에 필드가 없어 화면이 도달 불가능한 상태,
  백엔드가 필드를 추가하면 복원
- **접근성 `aria-describedby` 미연결** — AU-01에서 이미 발견·기록, 공용 컴포넌트라 조율 필요

### 미검증으로 남긴 것

- **`RESET_TOKEN_EXPIRED`·`RESET_TOKEN_USED`·`SAME_AS_CURRENT`·`RESET_FAILED`의 실서버 응답 일치
  여부** — 진짜 발급된 토큰(실제 메일 수신)이 있어야 curl로 확인 가능. 이번엔 Playwright
  가로채기로 대체(사용자 확인) — 다음에 실제 비밀번호 재설정 메일 라운드를 돌릴 때 같이 확인.
  특히 `RESET_TOKEN_USED`는 유효한 토큰 하나로 성공적으로 재설정한 뒤 **같은 토큰을 재사용**하면
  자연스럽게 재현 가능(실제 계정 비밀번호가 바뀌는 부수효과 있음 — 실행 전 사용자 동의 필요).
- **Caps Lock 실제 물리 키보드 재현** — 새 비밀번호·확인 두 필드, AU-01과 동일한 자동화 한계.
