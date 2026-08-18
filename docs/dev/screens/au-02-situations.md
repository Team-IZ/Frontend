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

## 2단계·5단계로 확정된 것

아래는 원래 "미검증으로 남긴 것"에 있던 항목 중 이번에 curl·Playwright로 실제 확인한 것 —
자세한 절차·응답 원문은 뒤의 "2단계 실측"·"5단계 플로우를 탄다" 절 표에 있다.

**curl로 실서버 확인:**

- `INVITATION_INVALID`(A4·B4) — 위조 토큰으로 `resolve`·`manager-signup`·`trainee-activation`
  세 엔드포인트 전부 400 `INVITATION_INVALID` 응답 확인
- 계정 열거 방지(`resend`, C1) — 존재/미존재 이메일 모두 202 + 완전히 동일한 메시지 확인
- 네트워크 도달 실패(A7·B7) — DNS 실패로 `ApiError.isNetwork` 경로가 실제로 트리거되는 것을
  transport 레벨에서 확인

**Playwright로 렌더 확인(응답 가로채기 + 실제 클릭, 18건 전수):**

- 변형 A(매니저)·변형 B(교육생) 정상 흐름 — 필드 구성·동의 개수·제출 후 `/shared/login` 이동까지
  실제 클릭으로 렌더 확인
- E3 필수 동의 미체크 시 제출 버튼 비활성 — 렌더 확인
- `#expired`(A2)·`#already`(A3)·`#invalid`(A4)·`#notlisted`(A5) 네 상태 카드 — **화면이 이 코드를
  받았을 때 올바르게 렌더하는지**는 전부 확인(A3·A5는 서버가 실제로 이 코드를 주는지 자체는 아직
  미검증 — 아래 참고)
- B2(제출 단계 만료) — 인라인 알림 + 재발송 링크 노출 확인
- **C3 재검증** — 재발송이 500으로 실패해도 링크가 안 사라지는 것(회귀 없음) 실제 클릭으로 확인
- **G3** — 교육생 링크에서 검증 중 매니저 문구가 실제로 잠깐 보이는 것을 렌더로 확인(비치명 결론까지 포함)
- 한글 IME 조합(이름 필드) — CDP composition으로 조합 안 깨짐 확인
- Caps Lock `onFocus` 배선 — 크래시 없이 필드 간 포커스 전환 확인(물리 키 토글 자체는 여전히 미검증)

---

## 2단계 · 실측 (curl, 2026-08-18)

실서버(`https://xvdanr6m362b2ge232vdmfbrny0kwakz.lambda-url.ap-northeast-1.on.aws`, Lambda 프록시 —
`docs/dev/handoff.md` 8/16 기록·AU-01 실측과 동일 주소) 직접 호출. `.env.local`은 비워 둔 채(dev
서버의 `vite.config.ts` 프록시가 같은 주소로 중계) — curl은 이 주소로 바로 쳤다.

| 요청 | 결과 |
|---|---|
| `POST /auth/invitations/resolve` 위조 토큰 | 400 `INVITATION_INVALID`(A4 코드 실서버 확인) |
| `POST /auth/invitations/resolve` 빈 토큰 | 400 `VALIDATION_FAILED`(스펙 밖 코드 — 아래 참고) |
| `POST /auth/manager-signup` 위조 토큰 | 400 `INVITATION_INVALID` |
| `POST /auth/trainee-activation` 위조 토큰 | 400 `INVITATION_INVALID` |
| `POST /auth/invitations/resend` 존재하는 dev 계정 이메일 | 202, "입력하신 주소로 초대를 보낸 기록이 있으면…" |
| `POST /auth/invitations/resend` 존재하지 않는 이메일 | 202, **동일한 메시지**(계정 열거 방지 실측 확인) |
| `POST /auth/invitations/resend` 형식 오류 이메일 | 400 `VALIDATION_FAILED` |
| 위 네 엔드포인트 전부 DNS 실패(존재하지 않는 호스트) | `curl exit 6`(connect 실패) — `ApiError.isNetwork` 경로가 실제로 트리거됨을 transport 레벨에서 확인 |

- **`INVITATION_EXPIRED`·`INVITATION_ALREADY_ACCEPTED`·`INVITATION_NOT_IN_ROSTER` 3종은 curl로
  확인 못 함.** 진짜 발급된 초대 토큰이 있어야 하는데, 토큰 원문은 API 응답 어디에도 없고 실제
  메일 링크 안에만 있다(`inviteApi.ts` 주석과 일치) — 발송 후 실제 받은편지함을 확인해야 얻을 수
  있다. 사용자에게 물어 **코드 리뷰 + Playwright 가로채기로 대체하기로 결정**(이 세션 대화 로그
  참고). 3종 다 아래 5단계에서 실제 렌더로 대신 확인함 — **서버가 정확히 이 코드·상태를 주는지는
  여전히 미검증**으로 남는다(오늘 다른 Cowork 세션이 실메일로 초대 흐름 자체는 종단 검증했으나
  특정 에러 코드 3종을 겨냥한 것은 아니었다, `docs/dev/handoff.md` 8/18 "추가 2").
- **빈 토큰(`VALIDATION_FAILED`)은 실제로 도달 불가능한 경로** — 라우트가 `/invite/:token`이라
  `token` 세그먼트 없이는 이 화면 자체에 안 들어온다(`InviteScreen.route.tsx` 확인). 코드가 반응할
  필요는 없다 — 참고용으로만 남긴다.
- 미활성 계정 대상 재발송 응답이 정상 계정과 같은지는 별도 계정이 없어 미검증(자연 계정 열거
  방지 로직상 같을 것으로 추정되나 실측 아님).

## 5단계 · 플로우를 탄다 (Playwright, 2026-08-18)

로컬 `npm run dev`(5173), `page.route`로 서버 응답을 가로챈 뒤 **실제 클릭·입력**으로 검증(코드
직접 판독이 아니라 렌더 확인). 스크립트는 스크래치패드에 둠(레포에 안 남김). **18건 전수 통과.**

| 시나리오 | 확인한 것 | 결과 |
|---|---|---|
| 변형 A(매니저) 정상 흐름 | 이름 필드 있음 · 체크박스 3개(전체동의+2) · 제출 → `/shared/login` | ✅ |
| 변형 B(교육생) 정상 흐름 | 이름 필드 없음 · 체크박스 6개(전체동의+5) · 제출 → `/shared/login` | ✅ |
| E3 필수 동의 미체크 | 제출 버튼 비활성 | ✅ |
| A2 만료(검증 단계) | `#expired` 카드 · 이메일 입력 후 재발송 성공 시 문구 교체 | ✅ |
| A3 이미가입 | `#already` 카드 · [로그인] 클릭 → `/shared/login` | ✅ |
| A4 무효 | `#invalid` 카드 렌더 | ✅ |
| A5 명단외 | `#notlisted` 카드 렌더 | ✅ |
| A7 네트워크 실패(검증 단계) | 폴백 카드("서버에 연결하지 못했습니다") | ✅ |
| B2 제출 단계 만료 | 인라인 알림 + 재발송 링크(`action=RESEND`) 노출 | ✅ |
| **C3 재검증** | 재발송이 500으로 실패해도 **링크가 사라지지 않음**(AU-01 C3 회귀와 같은 함정, 이번엔 처음부터 `action: 'RESEND'` 유지로 짜서 회귀 없음) | ✅ |
| **G3 검증 중 타이틀** | 교육생(`stu-`) 링크인데 검증 중 브랜드 패널 제목이 잠깐 "운영 계정을 설정하세요"(매니저 카피)로 뜬 뒤 "계정 활성화"로 바뀜 — **실제로 재현됨**, 비-치명(수백 ms) | ⚠ 아래 참고 |
| IME 한글 조합 | 이름 필드(변형 A) — CDP composition 후 "미니" 정확히 입력, 안 깨짐 | ✅ |
| Caps Lock `onFocus` | 크래시 없이 필드 간 포커스 이동(AU-01에서 고친 배선 재사용) | ✅(물리 키 토글 자체는 자동화 불가, 실측은 사용자 몫) |

### G3 — 실제로 확인됐지만 이번 범위에서 안 고침

검증 중(수백 ms) 짧게 잘못된 브랜드 카피가 보인다. 원인은 `copy = invite ? COPY[invite.inviteType]
: COPY.MANAGER`(`InviteScreen.tsx`)의 폴백이 `MANAGER`로 고정된 것 — `role`을 아직 몰라 무엇을
보여줄지 모르는 상태인데 하나를 골라야 해서 생긴 구조적 결과다. **1단계 문서가 이미 "비-치명적"으로
분류**했고 이번 라운드 스코프(§C3·A2/B3·C4/C5 하드닝)와 다른 종류의 개선(로딩 중 문구를 아예
없애거나 중립 카피로 바꾸는 설계 판단)이라 범위 밖으로 남긴다 — 실측으로 존재는 확정했으니
다음에 손댈 사람이 "정말 비-치명적인지"부터 다시 재지 않아도 된다.

## 6단계 · 남긴다

### 이번 라운드에서 고친 것

1. C3(제출 단계 재발송 실패) — `handleResend` `try/catch` 추가, `action: 'RESEND'` 유지(코드
   리뷰 단계에서 고침, 이번 5단계에서 실제 클릭으로 재검증 완료 — 회귀 없음)

### 이번 범위에서 의도적으로 안 건드린 것

- **G3(검증 중 브랜드 카피 깜빡임)** — 실제로 재현됐으나 구조적 설계 판단이 필요해 범위 밖(위 참고)
- **접근성 `aria-describedby` 미연결** — AU-01에서 이미 발견·기록, 공용 컴포넌트라 조율 필요

### 미검증으로 남긴 것

- **`INVITATION_EXPIRED`·`INVITATION_ALREADY_ACCEPTED`·`INVITATION_NOT_IN_ROSTER`의 실서버 응답
  일치 여부** — curl로 확인하려면 진짜 발급된 토큰(실제 메일 수신)이 필요해 이번 세션에서
  Playwright 가로채기로 대체(사용자 확인). 서버가 정확히 이 3개 코드를 이 상황에서 주는지 자체는
  여전히 실측 안 됨 — 다음에 실제 초대 메일 라운드(운영자 초대 → 실제 수신함 확인)를 돌릴 때
  같이 확인.
- **Caps Lock 실제 물리 키보드 재현** — `onFocus` 배선은 AU-01에서 고쳐 이 화면도 공유하지만,
  Playwright/CDP가 OS Caps Lock 토글을 못 켜 자동 재현 불가(AU-01과 동일한 한계).
- **미활성 계정 대상 재발송 응답 비교** — 별도 미활성 계정이 없어 미실측.
