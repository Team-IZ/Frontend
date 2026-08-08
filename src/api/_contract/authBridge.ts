/*
  통신 계층과 인증 상태를 잇는 **빈칸**.

  왜 주입인가 — `client.ts`가 인증 스토어를 직접 import하면 두 가지가 생긴다.
    ① 순환 의존: 인증 스토어는 로그인·재발급을 부르려고 client를 import한다 → 고리가 닫힌다
    ② 결합: 통신 계약을 쓰려면 인증 구현이 반드시 딸려온다 (테스트에서 가짜 토큰을 못 꽂는다)

  그래서 client는 **"토큰을 주는 함수"라는 모양만** 알고, 실제 구현은 앱이 부팅할 때 꽂는다.
  의존 방향이 `인증 → client` 한쪽으로만 흐르므로 순환이 원천 차단된다.

  전역 `let` 여러 개가 아니라 객체 하나인 이유: 앞으로 늘어난다(로그아웃 콜백·기수 스코프
  헤더 등). 변수로 흩으면 "무엇을 꽂아야 하는지"가 파일 전체에 퍼진다.
*/

export type AuthBridge = {
  /** 지금 요청에 실을 액세스 토큰. 로그인 전이면 null */
  getToken: () => string | null
  /**
   * 401을 만났을 때 토큰을 새로 받는다. 쿠키로 인증하므로 인자가 없다.
   * 실패 이유까지 돌려주는 이유는 아래 `onSessionExpired` 주석 참고.
   */
  refresh: () => Promise<RefreshResult>
  /**
   * 갱신이 실패해 세션이 끝났을 때. 로그아웃 + 로그인 화면으로 보내는 자리.
   *
   * **이유를 나눠 받는 것이 중요하다.** 백엔드가 재발급 실패를 두 코드로 가른다:
   * - `REFRESH_TOKEN_INVALID` — 만료·폐기. **조용히** 로그인 화면으로 보내면 된다
   * - `REFRESH_IDENTITY_CHANGED` — 비밀번호 변경 등으로 신원이 바뀜. **왜 튕겼는지 알려야** 한다
   *
   * 둘을 합치면 후자가 "이유 없이 로그아웃됐다"가 되고, 사용자는 버그로 읽는다.
   */
  onSessionExpired: (reason: SessionEndReason) => void
}

/** `expired`는 안내 없이, `identity-changed`는 재로그인 사유를 띄운다 */
export type SessionEndReason = 'expired' | 'identity-changed'

export type RefreshResult = { ok: true; token: string } | { ok: false; reason: SessionEndReason }

/** 기본값은 "아무것도 모르는 상태" — 이 상태로도 공개 API는 정상 동작한다 */
export const authBridge: AuthBridge = {
  getToken: () => null,
  refresh: async () => ({ ok: false, reason: 'expired' }),
  onSessionExpired: () => {},
}

let connected = false

/** 앱 부팅 시 1회. 인증 스토어가 자기 함수들을 꽂는다 */
export function connectAuth(impl: Partial<AuthBridge>) {
  Object.assign(authBridge, impl)
  connected = true
}

/*
  꽂지 않은 채 인증이 필요한 요청을 보내면 401만 돌아오고 원인을 알 수 없다.
  실제로 겪은 적이 있어 개발 모드에서 한 번 경고한다 — 조용한 실패를 만들지 않는다.
*/
let warned = false
export function warnIfDisconnected() {
  if (connected || warned || !import.meta.env?.DEV) return
  warned = true
  console.warn('[api] authBridge가 연결되지 않았습니다 — connectAuth()를 앱 부팅에서 호출하세요.')
}
