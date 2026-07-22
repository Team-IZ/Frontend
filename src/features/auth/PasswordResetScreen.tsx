import BrandPanel from './components/BrandPanel'
import AuthForm from './components/AuthForm'
import TextLink from './components/TextLink'

/** SC-A03 · 비밀번호 재설정 (자리표시 — 공통 컴포넌트 재사용 확인용) */
export default function PasswordReset() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <BrandPanel />
        <AuthForm title="비밀번호 찾기" subtitle="SC-A03 · 이후 배치에서 구현 예정입니다.">
          <TextLink to="/shared/login">← 로그인으로 돌아가기</TextLink>
        </AuthForm>
      </div>
    </div>
  )
}
