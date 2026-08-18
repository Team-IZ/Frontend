# AU-02 회원가입 · 계정 활성화 — 상황 전수

> `docs/dev/screen-hardening.md` 1단계 결과물. 대상 파일: `InviteScreen.tsx` · `InviteScreen.route.tsx` ·
> `inviteStates.ts` · `inviteTypes.ts` · `inviteApi.ts` · `consents.ts`. API:
> `POST /auth/invitations/resolve` · `POST /auth/manager-signup` · `POST /auth/trainee-activation` ·
> `POST /auth/invitations/resend`.
>
> **범위 밖(정책·설계 미확정)**: `components/ui/Field.tsx`의 `aria-describedby` 미연결(공용 컴포넌트,
> AU-01에서 이미 발견·기록만 함) · 재수강생 초대를 애초에 보낼지 여부(OP-06 소관, AU-02 정의서 §6).
> 케이스 계약 단일 원천: [`signup-activation.html#cases`](../../plan/v2/wireframe/shared/signup-activation.html#cases).

---

## 축 A. 토큰 검증 (`getInvite`, 진입 시 1회)

| | 코드 | 화면 |
|---|---|---|
| A1 | (성공) | 변형 A/B 폼 렌더 |
| A2 | `INVITATION_EXPIRED` | `#expired` 카드 — 이메일 입력 후 재발송(검증 단계는 `invite.email`을 아직 모른다) |
| A3 | `INVITATION_ALREADY_ACCEPTED` | `#already` 카드 — [로그인]. 재수강생(B5=`ACCOUNT_EXISTS`)도 여기로 합쳐진다(백엔드가 코드를 4종만 확정, `inviteTypes.ts` 주석) |
| A4 | `INVITATION_INVALID` | `#invalid` 카드 — [문의하기] |
| A5 | `INVITATION_NOT_IN_ROSTER` | `#notlisted` 카드 — [문의하기] (교육생 전용) |
| A6 | 스펙에 없는 코드 | 폴백 카드 — "문제가 발생했어요" + 문의하기 |
| A7 | 네트워크 도달 실패 | 폴백 카드 — "서버에 연결하지 못했습니다" + 문의하기 |
| A8 | 검증 중 | "초대 링크를 확인하는 중…" 텍스트만 |

## 축 B. 제출 결과 (`signup`/`activate`, `resolveInviteState`)

| | 코드 | 알림 | 비고 |
|---|---|---|---|
| B1 | (성공) | — | `/shared/login`으로 이동 |
| B2 | `INVITATION_EXPIRED` | danger + [초대 메일 다시 받기] | 이 시점엔 `invite.email`을 알아 자동으로 그 주소로 재발송 |
| B3 | `INVITATION_ALREADY_ACCEPTED` | warning + [로그인] | 동시 탭·재시도 경합으로 검증 통과 뒤 제출 시점에 이미 수락된 경우 |
| B4 | `INVITATION_INVALID` | danger + [문의하기] | |
| B5 | `INVITATION_NOT_IN_ROSTER` | danger + [문의하기] | |
| B6 | 스펙에 없는 코드 · `PASSWORD_CONFIRMATION_MISMATCH` · `REQUIRED_CONSENT_MISSING` · `WEAK_PASSWORD` · `ACTIVATION_STATE_CHANGED` | danger, 시스템 메시지 폴백 | 앞 셋은 클라이언트가 이미 막아 거의 안 옴 |
| B7 | 네트워크 도달 실패 | danger, "서버에 연결하지 못했습니다" | |
| B8 | 제출 중 | 버튼 "계정을 만들고 있어요…" + 입력 잠금 | |

## 축 C. 제출 단계 재발송(`handleResend`) — B2에서만 노출

| | |
|---|---|
| C1 | 클릭 전 — "초대 메일 다시 받기" 링크 |
| C2 | 클릭 → 성공 → "초대 메일을 다시 보냈습니다"로 교체 |
| C3 | 클릭 → 실패(네트워크·5xx) — **🔴 발견·✅ 이번에 고침.** `try/catch`가 없어 unhandled rejection만 나고 사용자에겐 아무 반응도 없었다. AU-01 `LoginScreen.tsx`의 C3과 같은 결함 클래스 — 재발송 링크(action='RESEND')를 유지한 채 danger 알림을 띄우도록 고쳤다 |

## 축 D. 검증 단계 재발송(`handleResendToTypedEmail`) — A2에서만 노출

이메일을 모르는 상태라 사용자가 직접 입력한다. 이미 `try/catch` + `resendPending`/`resendInputError`로
구현돼 있어 이번 라운드에서 손대지 않았다(제출 단계 C축과 대칭이지만 검증 단계는 처음부터 제대로
돼 있었다).

## 축 E. 클라이언트 검증 (React Hook Form)

| | |
|---|---|
| E1 | 비밀번호 정책 미충족 — 정책은 상시 노출, 제출 시도 후에만 미충족 기준을 danger로 |
| E2 | 비밀번호 확인 불일치 |
| E3 | 필수 동의 미체크(CS1) — 제출 막힘 + 미체크 항목 강조(`highlightMissing`) |
| E4 | 선택 동의 미체크(CS2) — 정상 진행 |
| E5 | 제출 중(`isSubmitting`) — 재제출 막힘 |

## 축 F. Caps Lock · 비밀번호 표시 토글

AU-01에서 고친 `onFocus` 배선(E3 — 재포커스 시 미탐지)이 `passwordCaps`·`passwordConfirmCaps` 둘 다
이미 적용돼 있음을 코드로 확인(`useCapsLockWarning` 공유 컴포넌트, 2026-08-16 세션에서 3파일 동시
수정). 이번에 새로 건드릴 것 없음.

## 축 G. 변형 분기 (A vs B)

| | |
|---|---|
| G1 | 변형 A(매니저·오퍼레이터) — 이름 입력 필드 있음, 동의 2개(전부 필수) |
| G2 | 변형 B(교육생) — 이름 필드 없음(명단에 이미 있음), 동의 5개(필수 4 + 선택 1) |
| G3 | `invite`가 아직 null인 검증 중에는 `copy = COPY.MANAGER`로 폴백 — 교육생 링크라도 검증 완료 전 짧은 순간 "회원가입" 타이틀이 보일 수 있음(비-치명적, 실제 렌더로 체감 여부 확인 필요) |

---

## 코드 리뷰로 확정된 것 (렌더 없이 판정 가능)

- **🔴 C3 · 확정된 결함 · ✅ 고침 — `handleResend`(제출 단계 재발송)가 실패를 삼키지 않고
  그대로 던진다.** `try/catch`를 추가해 실패 시 `submitAlert`에 danger 알림 + `action: 'RESEND'`를
  유지하도록 고쳤다(링크가 사라지지 않아야 사용자가 재시도할 수 있다 — AU-01 C3 재검증 때 나온
  회귀와 같은 함정이라 처음부터 `action` 유지로 짰다).

---

## 미검증으로 남긴 것 (2단계·5단계 — 로컬 Claude Code CLI + Playwright 필요)

- curl 실측: 4개 에러 코드(`INVITATION_EXPIRED`·`INVITATION_ALREADY_ACCEPTED`·`INVITATION_INVALID`·
  `INVITATION_NOT_IN_ROSTER`) 전부 실서버 응답과 일치하는지.
- 실제 렌더: 변형 A/B 각각 정상 흐름 · 재수강생(A3) 흐름 · C3 수정이 실제 클릭으로도 알림을
  유지하는지 · G3(검증 중 타이틀 깜빡임)이 실제로 보이는지.
- Caps Lock 실제 키보드 재현 — 비밀번호·비밀번호 확인 두 필드 모두.
- 한글 IME 조합 — 이름 필드(변형 A만 있음, AU-01 로그인 필드와 별개로 재확인 필요).
