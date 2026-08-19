import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from '@/app/routes'
import { isApiError } from '@/api/_contract'
import { applyTraineeFreshness } from '@/api/traineeFreshness'
import { connectSession } from '@/features/auth/authStore'
import { Toaster } from '@/components/ui/Sonner'
import './index.css'

/*
  ## 인증에 Provider가 없다
  세션은 스토어(`features/auth/authStore.ts`)에 있고 React 트리 밖에서도 읽힌다.
  `connectSession()`이 통신 계층에 토큰 게터·재발급을 꽂는데, **부팅 시 한 번이면 끝난다** —
  값이 React 상태였다면 바뀔 때마다 다시 꽂아야 했다.

  ## 서버 상태 기본값
  **재시도는 5xx에만.** 4xx는 다시 보내도 같은 답이고, 특히 **로그인 실패를 두 번 보내면
  실패 카운터가 두 번 오른다**(백엔드가 연속 실패 차단을 붙이면 바로 문제가 된다).
  401은 여기서 다루지 않는다 — `_contract/client.ts`의 재발급이 따로 처리한다.

  `refetchOnWindowFocus: false` — **검증 세션(TR-03)이 창 이탈을 기록하는 화면**이다.
  이탈 후 복귀마다 네트워크가 튀는 것은 그 화면의 성격과 정면으로 안 맞는다.
  오래 열어 두는 관리 화면에서 필요하면 **그 화면에서 켠다**(전역 기본은 끔이 안전하다).

  `<Toaster />` — sonner의 렌더 타깃. 어디서든 `toast.success(...)`를 부를 수 있게 여기 한 번만
  심는다. 화면이 각자 심으면 그 화면을 안 거친 라우트에서 부른 toast는 아무 데도 안 뜬다.
*/
connectSession()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /*
        **네트워크 실패(`status: 0`)도 재시도한다.** 5xx만 잡으면 **지금 실제로 나는 실패를
        하나도 못 잡는다.**

        실측(2026-08-12) — 대시보드가 조회 셋을 동시에 쏘면 브라우저가 **CORS 프리플라이트
        (`OPTIONS`) 셋을 먼저 동시에** 보내는데, 프록시가 그중 둘을 **502**로 죽인다
        (3회 반복 모두 `502/502/200`). 프리플라이트가 죽으면 브라우저는 **본 요청을 아예
        보내지 않고** `net::ERR_FAILED`를 낸다 — 그것이 `status: 0`이라 5xx 조건에 안 걸린다.

        원본으로 같은 요청을 보내면 5/5 성공이고 App Runner 로그에도 에러가 없다
        (서비스 `RUNNING`) — **프록시(Lambda) 층의 동시성 문제다.**

        오프라인도 `status: 0`이라 같이 걸리지만 손해가 없다 — 3회면 4초 안에 끝나고
        그다음 `errorCopy`가 「인터넷 연결을 확인해 주세요」를 낸다. 지금은 **한 번 튕기면
        그걸로 끝**이라 프록시가 회복돼도 화면이 실패인 채로 남았다.
      */
      /*
        ⚠ **예산 초과(`isTimeout`)는 재시도하지 않는다.** 통신 계층이 90초를 기다려 준
        뒤에 끊은 것이라(`_contract/client.ts`), 같은 규칙으로 3회를 더 보내면 사용자가
        **6분을 기다린다.** 오프라인은 즉시 실패라 3회가 4초로 끝나지만 이쪽은 아니다 —
        `status: 0`이 같다고 같은 정책을 쓰면 안 되는 자리다.

        콜드스타트(최대 76초)는 이미 그 90초 예산 **안에서** 흡수된다. 재시도가 그 몫을
        대신할 필요가 없다.
      */
      retry: (count, error) =>
        isApiError(error) &&
        !error.isTimeout &&
        (error.status >= 500 || error.isNetwork) &&
        count < 3,
      /*
        **흔들림(jitter)이 핵심이다.** 동시에 죽은 요청들이 **같은 순간에** 재시도하면
        또 겹쳐서 또 죽는다 — 고정 지연으로는 충돌이 그대로 반복된다.

        0.4~0.8초 → 0.8~1.2초 → 1.6~2.0초. **실패했을 때만** 붙고 최악이 4초다.

        ⚠ **증상 완화이지 해결이 아니다.** 프록시가 프리플라이트를 제대로 처리하면 이 값을
        되돌린다(요청서 대상).
      */
      retryDelay: (count) => 400 * 2 ** count + Math.random() * 400,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
})

/*
  교육생 화면 조회만 캐시를 끈다 — 전역 기본(30초)은 그대로 두고 도메인별로 덮어쓴다.
  이유와 대상은 `api/traineeFreshness.ts`에 있다.
*/
applyTraineeFreshness(queryClient)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)
