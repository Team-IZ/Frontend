import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  define: {
    // Vercel이 빌드 시점에 심어주는 배포 브랜치 — import.meta.env.DEV는 프로덕션
    // 빌드(vite build)에서 항상 false라 develop 프리뷰 배포도 걸러진다. dev 전용
    // UI를 "로컬이거나 develop 배포"로 보이려면 브랜치 이름이 따로 필요하다.
    __GIT_BRANCH__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_REF ?? ''),
  },
})
