// ─────────────────────────────────────────────────────────────
// 인증 API 계약
// 출처: 배포 스펙 `POST /api/v0/auth/login` (api/openapi.json) — **여기가 단일 원천**
// 이전 판은 목업 케이스 표(AUTH-03 9 case)를 옮긴 것이었고, 서버가 실제로 내는 코드와
// 달랐다. 백엔드 2차 회신으로 확정된 값으로 맞춘다.
// ─────────────────────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'OPERATOR' | 'MANAGER' | 'TRAINEE'

/** SC-A01/A02 상태 알림 색 — @/components/ui/Alert의 variant 어휘와 맞춘다 */
export type AlertVariant = 'danger' | 'warning' | 'info'

/** POST /auth/login 요청 */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * 화면이 쓰는 로그인 결과.
 *
 * - `refreshToken`은 **httpOnly 쿠키**로 내려온다 — 화면이 접근하지도 저장하지도 않는다.
 * - `initialScreen`은 **서버 값이 아니라 우리가 `role`에서 만든다.** 서버의 `redirectPath`는
 *   백엔드가 프론트 라우트를 추측해 만든 값이라(`/cohorts/12기`) 실제 라우트와 다르고,
 *   URL을 바꿀 때마다 백엔드 배포가 필요해진다. 백엔드도 "무시해도 된다"고 회신했다.
 */
export interface LoginResult {
  accessToken: string
  role: Role
  initialScreen: string
}

/**
 * 로그인이 낼 수 있는 에러 코드 — **스펙에서 그대로 온 값**이다.
 * `POST /auth/login`: 400 · 403 · 429 · 500
 *
 * 여기 없는 코드(네트워크·5xx·미지의 값)는 `resolveAuthState`가 폴백으로 처리한다.
 * 코드가 전부일 것이라 가정하지 않는다 — 스펙이 늘 최신이라는 보장이 없다.
 */
export type LoginErrorCode =
  | 'VALIDATION_FAILED' // 400 이메일·비밀번호 형식
  | 'LOGIN_INVALID' // 400 자격 불일치 (미활성 계정도 여기로 온다 — 아래 주석)
  | 'LOGIN_ACCOUNT_INACTIVE' // 403 정지된 계정
  | 'LOGIN_ORG_SUSPENDED' // 403 계정은 멀쩡한데 기관이 정지됨
  | 'LOGIN_ORIGIN_NOT_ALLOWED' // 403 허용되지 않은 요청 출처
  | 'LOGIN_TEMPORARILY_BLOCKED' // 429 연속 실패 지연 (retryAfter 동봉)
  | 'LOGIN_NO_ORG_CONTEXT' // 500 계정에 역할·기관 정보가 없다

/*
  ⚠️ 없어진 케이스 — 왜 없어졌는지를 남긴다. 안 적으면 다음 사람이 다시 넣는다.

  AUTH_UNVERIFIED (활성화 전 계정)
    활성화 전 계정은 비밀번호 자체가 없어서, 구분하려면 **비밀번호 검사 앞에서** 상태를
    봐야 한다. 그러면 비밀번호를 모르는 사람이 "이 이메일이 가입돼 있는지"를 확인할 수 있다
    — 진짜 계정 열거다. 그래서 서버가 `LOGIN_INVALID`로 합쳤고 우리도 동의했다.
    대신 **재발송 안내를 `LOGIN_INVALID` 화면에 붙인다**(authStates) — 아무것도 흘리지 않으면서
    실제로 막힌 사람에게는 닿는다.

  AUTH_TOKEN_ISSUE · AUTH_COOKIE
    **서버가 판별할 수 없다.** 토큰 발급 실패는 5xx로 뭉뚱그려 오고, 쿠키 설정 실패는
    브라우저 쪽 사정이다. 폴백(5xx·네트워크)이 담당한다.

  AUTH_ROLLBACK
    로그인이 아니라 비밀번호 재설정 흐름의 `RESET_FAILED`(500)로 존재한다.
*/
