import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/*
  로컬 dev 전용 API 프록시 대상.

  브라우저가 /api를 이 주소로 크로스사이트 직접 호출하면 refresh_token 쿠키가
  서드파티 쿠키로 취급돼 새로고침마다 로그인 화면으로 튕긴다(#201, decision-log D33
  실측: Cookie 요청 헤더 자체가 안 실림, Sec-Fetch-Storage-Access: none). 아래
  server.proxy가 /api를 프론트와 같은 출처(localhost:5173)로 받아 이 서버가 대신
  중계하면 브라우저 입장엔 퍼스트파티 요청이 된다. 배포에서는 vercel.json의 rewrite가
  같은 역할을 한다. `VITE_API_BASE`는 이제 빈 값(상대경로)이 정상이다(.env.local 참고).
*/
const API_PROXY_TARGET = 'https://xvdanr6m362b2ge232vdmfbrny0kwakz.lambda-url.ap-northeast-1.on.aws'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
  define: {
    // Vercel이 빌드 시점에 심어주는 배포 브랜치 — import.meta.env.DEV는 프로덕션
    // 빌드(vite build)에서 항상 false라 develop 프리뷰 배포도 걸러진다. dev 전용
    // UI를 "로컬이거나 develop 배포"로 보이려면 브랜치 이름이 따로 필요하다.
    __GIT_BRANCH__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_REF ?? ''),
  },
})
