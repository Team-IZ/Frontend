import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from '@/app/routes'
import { isApiError } from '@/api/_contract'
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
      retry: (count, error) => isApiError(error) && error.status >= 500 && count < 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)
