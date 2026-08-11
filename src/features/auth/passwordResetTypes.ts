// ─────────────────────────────────────────────────────────────
// 비밀번호 재설정 API 계약
// 출처: 배포 스펙 `POST /api/v0/auth/password-reset/*` (api/openapi.json) — **여기가 단일 원천**
// 이전 판은 목업 케이스 표(password-reset.html#cases)를 옮긴 것이었다. 이슈 178로 실서버
// 연동하며 실제 스펙(`src/api/auth/authTypes.ts`)에 맞춰 정리했다 — authTypes.ts(로그인)와
// 같은 근거·구조.
// ─────────────────────────────────────────────────────────────

/** POST /auth/password-reset/requests — 항상 202, 계정 유무·활성 상태와 무관하게 동일 응답 */
export interface RequestResetRequest {
  email: string
}

/** POST /auth/password-reset/validations 응답 — `expiresAt`은 화면이 아직 안 써서 안 옮긴다 */
export interface ResetTokenInfo {
  email: string
}

/** POST /auth/password-reset/confirmations — 확인란 값도 서버로 같이 보낸다(서버가 재검증) */
export interface ConfirmResetRequest {
  token: string
  password: string
  passwordConfirm: string
}

/*
  ⚠️ 없어진 것 — `revokeFailed`("다른 기기 세션 폐기 실패" 부분성공, #donepartial).
  실제 확정 응답(`PasswordResetConfirmationResponse`)엔 `status`·`message`만 있고 세션 폐기
  결과를 알려주는 필드가 없다 — 서버가 그 정보를 안 주므로 화면에서 도달 불가능한 상태였다.
  백엔드가 필드를 추가하면 그때 복원한다. 성공 응답은 지금 화면이 값을 안 써서 void로 둔다.
*/

/**
 * 케이스 계약 · AUTH-05 (구현 근거)
 * `RESET_TOKEN_EXPIRED`~`RESET_FAILED`는 목업 케이스 표와 그대로 대응. `WEAK_PASSWORD`·
 * `VALIDATION_FAILED`는 실제 스펙에만 있던 것 — 클라이언트가 이미 정책·일치 여부를 검사해서
 * 거의 안 오지만, 경쟁 상태(정책이 그 사이 바뀌는 등)를 대비해 폴백 문구를 둔다.
 *
 * 여기 없는 코드(네트워크·5xx·미지의 값)는 `resolvePasswordResetState`가 폴백으로 처리한다.
 */
export type PasswordResetErrorCode =
  | 'RESET_TOKEN_EXPIRED' // 2 — 링크 만료
  | 'RESET_TOKEN_USED' // 3 — 이미 사용됨 (2와 같은 화면)
  | 'RESET_TOKEN_INVALID' // 4 — 위변조·목적 불일치, 보안 로그
  | 'SAME_AS_CURRENT' // 6 — 지금 쓰는 비밀번호와 같음
  | 'RESET_FAILED' // 7 — 저장 실패·롤백 (비밀번호 아직 안 바뀜)
  | 'WEAK_PASSWORD' // 스펙에만 있음 — 클라이언트 정책 검사가 보통 먼저 막는다
  | 'VALIDATION_FAILED' // 스펙에만 있음 — 형식 오류 일반
