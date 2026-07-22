import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from '@/app/routes'
import { AuthProvider } from '@/features/auth/AuthContext'
import './index.css'

/*
  전역 프로바이더가 둘이 됐다(AuthProvider · RouterProvider). 셋째가 생기면
  app/providers.tsx로 뺀다 — 지금 빼면 wrapper 두 줄짜리 파일이 하나 늘 뿐이다.
  근거: docs/dev/frontend-architecture.md §2

  AuthProvider가 바깥이다. 라우트 화면이 useAuth()를 쓰므로 라우터보다 위에 있어야 한다.

  HashRouter가 아니라 createBrowserRouter를 쓴다(app/routes.tsx). 주소에 #이 없어야
  링크·SEO·초대 링크(/invite/:token)가 자연스럽다. 정적 호스팅에 올릴 때는 서버에서
  모든 경로를 index.html로 되돌려주는 설정(SPA fallback)이 필요하다.
*/
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
