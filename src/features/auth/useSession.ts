/*
  화면이 "지금 로그인한 사람"을 보는 유일한 창구.

  ## 왜 스토어가 아니라 서버 조회인가
  신원은 **서버 상태**다. 브라우저가 들고 있으면 낡는다 — 계정이 정지되거나 역할이 바뀌어도
  화면은 모른다. `GET /members/me`를 캐시해서 읽으면 그 틈이 닫힌다.

  ## 부팅 흐름 — 세션 복원 코드가 따로 없다
  ```
  앱 시작 → useSession()이 /me 조회
     ├ 200 → 로그인 상태
     └ 401 → client 미들웨어가 쿠키로 재발급 → 자동 재시도
              ├ 성공 → 200 → 로그인 상태 (새로고침해도 유지된다)
              └ 실패 → onSessionExpired → 비로그인
  ```
  **새로고침 복원이 401 처리의 부수 효과로 공짜로 나온다.** 그래서 이 파일에 복원 로직이 없다.

  ## 로그인 안 한 사람도 /me를 부른다
  쿠키는 httpOnly라 JS가 "로그인했는지"를 미리 알 수 없다. 그래서 항상 한 번 물어본다 —
  비로그인이면 401 두 번(조회 + 재발급)으로 끝나고, 그게 이 방식의 비용 전부다.
*/
import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useGetCurrentMember } from '@/api/member/useMemberQueries'
import { memberKeys } from '@/api/member/memberKeys'
import { logout as logoutApi } from '@/api/auth/authApi'
import { initialScreenFor, useAuthStore } from './authStore'
import type { Role } from './authTypes'

export function useSession() {
  const { data, isPending, isError } = useGetCurrentMember()
  const endReason = useAuthStore((s) => s.endReason)

  return {
    /** 로그인한 사람. 비로그인이면 null */
    user: data ?? null,
    /** 아직 확인 중 — **이 동안 로그인 폼을 보여주면 깜빡인다** */
    isLoading: isPending && !isError,
    /** 세션이 저절로 끝난 이유. 직접 로그아웃했으면 null */
    endReason,
    /** 이 사람의 시작 화면 */
    initialScreen: data ? initialScreenFor(data.role as Role) : null,
  }
}

/** 로그인 성공 뒤 — 토큰을 꽂고 `/me`를 다시 읽는다 */
export function useSignIn() {
  const queryClient = useQueryClient()
  const setAccessToken = useAuthStore((s) => s.setAccessToken)

  return useCallback(
    async (res: { accessToken: string }) => {
      setAccessToken(res.accessToken)
      // 로그인 응답에도 신원이 들어 있지만 `/me`를 원본으로 삼는다 — 두 곳에서 읽으면 갈린다
      await queryClient.invalidateQueries({ queryKey: memberKeys.all })
    },
    [queryClient, setAccessToken],
  )
}

/**
 * 로그아웃 — 서버 세션(쿠키)까지 폐기한다.
 *
 * `queryClient.clear()`가 중요하다. 안 지우면 **다음 사람이 앞사람의 데이터를 잠깐 본다** —
 * 캐시가 남아 있으면 화면이 그걸 먼저 그리기 때문이다.
 */
export function useSignOut() {
  const queryClient = useQueryClient()
  const clear = useAuthStore((s) => s.clear)

  return useCallback(async () => {
    // 서버가 실패해도 로컬 세션은 반드시 끝낸다 — 못 나가는 것이 더 나쁘다
    await logoutApi().catch(() => {})
    clear(null)
    queryClient.clear()
  }, [queryClient, clear])
}
