import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from '@/app/routes'
import './index.css'

/*
  AuthProvider는 v1 격리와 함께 뺐다 — v2 뼈대(#50)는 인증을 다루지 않고,
  인증을 다시 짤 때 features-v1/auth를 참고해 새로 붙인다.

  HashRouter가 아니라 createBrowserRouter를 쓴다(app/routes.tsx). 주소에 #이 없어야
  링크·SEO·초대 링크(/invite/:token)가 자연스럽다. 정적 호스팅에 올릴 때는 서버에서
  모든 경로를 index.html로 되돌려주는 설정(SPA fallback)이 필요하다.
*/
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
