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

## 미검증으로 남긴 것 (2단계·5단계 — 로컬 Claude Code CLI + Playwright 필요)

- curl 실측: `RESET_TOKEN_EXPIRED`·`RESET_TOKEN_USED`·`RESET_TOKEN_INVALID`·`SAME_AS_CURRENT`·
  `RESET_FAILED` 5개 코드가 실서버 응답과 일치하는지.
- 실제 렌더: ①→(메일)→②→완료 전체 플로우 · A2/B3/C4 수정이 실제로 네트워크를 끊었을 때 올바른
  문구로 뜨는지 · D2(SAME_AS_CURRENT)가 필드 하단에 정책 힌트처럼 자연스럽게 붙는지.
- Caps Lock 실제 키보드 재현 — 새 비밀번호·확인 두 필드.
- `token` 존재하지만 무의미한 값으로 직접 URL 진입 시 실제 렌더(코드 리뷰로는 정상 분기로
  보이나 실측 필요).
