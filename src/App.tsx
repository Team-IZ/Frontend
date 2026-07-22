import { Routes, Route, Navigate } from 'react-router'
import Login from '@/pages/Login'
import PasswordReset from '@/pages/PasswordReset'
import InviteSignup from '@/pages/InviteSignup'

export default function App() {
  return (
    <Routes>
      {/* 공개 화면 — 로그인 없이 접근 가능 */}
      <Route path="/shared/login" element={<Login />} /> {/* SC-A01 */}
      <Route path="/shared/password-reset" element={<PasswordReset />} /> {/* SC-A03 */}
      {/* 초대 링크 진입 — 토큰이 변형(매니저 가입 / 교육생 활성화)을 결정 */}
      <Route path="/invite/:token" element={<InviteSignup />} /> {/* SC-A02 */}
      {/*
        진입점만 로그인으로 보낸다("*"가 아니라 "/"). 매니저·교육생·슈퍼어드민 대시보드는
        아직 이식 대상이 아니라서(이번 배치는 인증 화면만), "*"로 전부 받으면 로그인 성공 후
        Login의 "이미 로그인 시 initialScreen으로 이동" 가드와 서로 되돌려보내는 무한 리다이렉트가 생긴다.
      */}
      <Route path="/" element={<Navigate to="/shared/login" replace />} />
    </Routes>
  )
}
