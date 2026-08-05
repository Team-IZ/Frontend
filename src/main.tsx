import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from '@/app/routes'
import { AuthProvider } from '@/features/auth/AuthContext'
import { Toaster } from '@/components/ui/Sonner'
import './index.css'

/*
  전역 프로바이더가 둘이 됐다(AuthProvider · RouterProvider). 셋째가 생기면
  app/providers.tsx로 뺀다 — 지금 빼면 wrapper 두 줄짜리 파일이 하나 늘 뿐이다.

  AuthProvider가 바깥이다. 라우트 화면이 useAuth()를 쓰므로 라우터보다 위에 있어야 한다.

  HashRouter가 아니라 createBrowserRouter를 쓴다(app/routes.tsx). 주소에 #이 없어야
  링크·SEO·초대 링크(/invite/:token)가 자연스럽다. 정적 호스팅에 올릴 때는 서버에서
  모든 경로를 index.html로 되돌려주는 설정(SPA fallback)이 필요하다.

  `<Toaster />` — sonner의 렌더 타깃. 어디서든 `toast.success(...)`를 부를 수 있게
  여기 한 번만 심는다. 화면이 각자 심으면 그 화면을 안 거친 라우트에서 부른 toast는
  아무 데도 안 뜬다(실제로 OP-05가 이 상태였다 — 클릭해도 아무 반응이 없어 보였다).
*/
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  </StrictMode>,
)
