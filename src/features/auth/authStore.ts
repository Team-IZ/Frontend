/*
  로그인 세션 스토어.

  ## 왜 스토어인가 — React 상태가 아니라
  토큰을 실제로 쓰는 것은 HTTP 미들웨어(`src/api/_contract/client.ts`)이고 그건 컴포넌트가
  아니다. **React 밖 코드가 React 상태를 읽으면 만들어질 당시의 옛 값에 갇힌다**(클로저).
  스토어는 `useAuthStore.getState()`로 **어디서든 동기로** 최신 값을 준다 — 인터셉터가
  토큰을 꺼내는 표준 방식이 이것이다.

  ## 여기 없는 것 — 사용자 정보
  "지금 로그인한 사람이 누구인가"는 **서버가 안다**. `useSession()`이 `GET /members/me`를
  읽어 온다. 그래서 이 스토어에는 신원이 없고, **브라우저 저장소에 남는 인증 정보가 하나도 없다.**

  | | 어디 |
  |---|---|
  | `accessToken` | **메모리만.** 저장소에 남기면 XSS 한 번에 지속 탈취된다 |
  | `refreshToken` | httpOnly 쿠키. 브라우저가 자동으로 싣고 JS는 만질 수 없다 |
  | 사용자 신원 | **서버**(`/me`). 정지·역할 변경이 다음 조회에서 바로 드러난다 |

  새로고침하면 토큰이 사라지는데, 첫 `/me` 요청이 401을 받고 **미들웨어가 쿠키로 재발급해
  자동으로 재시도**한다 — 세션 복원을 위한 별도 코드가 없는 이유다.
*/
import { create } from 'zustand'
import type { QueryClient } from '@tanstack/react-query'
import { ApiError, connectAuth, type RefreshResult, type SessionEndReason } from '@/api/_contract'
import { refresh as refreshApi } from '@/api/auth/authApi'
import { memberKeys } from '@/api/member/memberKeys'
import type { Role } from './authTypes'

/**
 * 역할 → 로그인 직후 화면.
 *
 * **클라이언트가 갖는 것이 맞다.** 서버도 `redirectPath`를 주지만 그건 백엔드가 우리 라우트를
 * 추측해 만든 값이라 실제 경로와 다르고(`/cohorts/7기`), 스펙 설명에도 "따르지 않아도 된다"고
 * 적혀 있다. URL을 바꿀 때마다 백엔드 배포가 필요해지는 결합을 만들지 않는다.
 */
const INITIAL_SCREEN: Record<Role, string> = {
  SUPER_ADMIN: '/superadmin/orgs', // SA-01
  OPERATOR: '/operator/dashboard', // OP-01
  MANAGER: '/manager/dashboard', // MG-01
  TRAINEE: '/trainee/home', // TR-01
}

export const initialScreenFor = (role: Role) => INITIAL_SCREEN[role]

type AuthState = {
  accessToken: string | null
  /** 세션이 **저절로** 끝난 이유. 직접 로그아웃했으면 null이다 — 그때는 설명할 것이 없다 */
  endReason: SessionEndReason | null

  setAccessToken: (token: string) => void
  clear: (reason?: SessionEndReason | null) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  endReason: null,
  setAccessToken: (accessToken) => set({ accessToken, endReason: null }),
  clear: (reason = null) => set({ accessToken: null, endReason: reason }),
}))

/*
  옛 버전이 sessionStorage에 세션을 저장했다. 지금은 아무도 읽지 않지만 **이미 켜 본 사람의
  브라우저에는 남아 있다** — "저장소에 인증 정보가 하나도 없다"를 그 사람들에게도 사실로 만든다.
  몇 주 뒤 지운다.
*/
sessionStorage.removeItem('iz-get.auth')
sessionStorage.removeItem('iz-get.session')

/** React 밖에서 쓰는 접근자 — 미들웨어·이벤트 핸들러가 이걸 쓴다 */
export const getAccessToken = () => useAuthStore.getState().accessToken

/**
 * 통신 계층에 인증을 꽂는다. 앱 부팅 시 **한 번만** 부른다(`main.tsx`).
 *
 * 한 번으로 끝나는 것이 스토어를 쓴 이유다 — 토큰이 React 상태였을 때는 세션이 바뀔 때마다
 * 다시 꽂아야 했고, 그 재주입이 "옛 값에 갇힌다"는 문제의 증상이었다.
 *
 * `queryClient`를 받는 이유 — `onSessionExpired`가 `accessToken`만 지우고 `/me` 캐시를
 * 그대로 두면, `RequireRole`은 캐시된(stale이어도 값은 남아있는) `user`만 보고 로그인
 * 화면으로 안 보낸다. 그 사이 다른 화면은 진짜 401을 맞아 깨진 채로 방치된다(실측,
 * 2026-08-19 — 리프레시 토큰 만료 후 헤더는 로그인 상태를 계속 보여주는데 홈 화면은
 * "불러오지 못했습니다"만 반복). `/me` 캐시를 여기서 지워야 `user`가 `null`이 되고
 * `RequireRole`이 정상적으로 리다이렉트한다.
 */
export function connectSession(queryClient: QueryClient) {
  connectAuth({
    getToken: getAccessToken,

    async refresh(): Promise<RefreshResult> {
      try {
        const res = await refreshApi()
        useAuthStore.getState().setAccessToken(res.accessToken)
        return { ok: true, token: res.accessToken }
      } catch (e) {
        /*
          백엔드가 재발급 실패를 두 코드로 가른다.
          신원이 바뀐 경우(비밀번호 변경 등)는 **왜 튕겼는지 말해야** 한다 — 안 그러면
          이유 없이 로그아웃된 것으로 보이고 사용자는 버그로 읽는다.
        */
        const identityChanged = e instanceof ApiError && e.code === 'REFRESH_IDENTITY_CHANGED'
        return { ok: false, reason: identityChanged ? 'identity-changed' : 'expired' }
      }
    },

    onSessionExpired: (reason) => {
      useAuthStore.getState().clear(reason)
      // invalidate가 아니라 remove다 — invalidate는 재조회가 끝날 때까지 옛 data를
      // 그대로 들고 있어서 그 사이 `user`가 계속 참이다. remove는 즉시 비운다.
      queryClient.removeQueries({ queryKey: memberKeys.getCurrentMember() })
    },
  })
}
