import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Navigate, Link } from 'react-router'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { initialScreenFor } from './authStore'
import { useSession, useSignIn } from './useSession'
import { login, resendAccountInvitation } from '@/api/auth/authApi'
import { resolveAuthState } from './authStates'
import type { AuthState } from './authStates'
import { useCapsLockWarning } from './useCapsLockWarning'
import { QUICK_LOGIN_ACCOUNTS } from './quickLoginAccounts'
import BrandPanel from './components/BrandPanel'
import AuthForm from './components/AuthForm'
import TextLink from './components/TextLink'
import { Alert } from '@/components/ui/Alert'
import { Field, FieldLabel, FieldError } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/InputGroup'
import { Kbd } from '@/components/ui/Kbd'
import { Button } from '@/components/ui/Button'
import { EMAIL_PATTERN, EMAIL_INVALID_MESSAGE } from '@/lib/validation'

interface LoginFormValues {
  email: string
  password: string
}

/**
 * AU-01 · 로그인 (전 화면 공통 관문)
 * - 역할은 서버가 판정하며, 화면에 역할 선택 UI를 두지 않음
 * - 실패는 화면을 벗어나지 않고 인라인 알림 + 재입력
 * - 공개 회원가입 링크 없음 (초대 기반 계정)
 * - 케이스 계약: docs/plan/v2/wireframe/shared/login.html#cases
 */
export default function LoginScreen() {
  const navigate = useNavigate()
  const { user, isLoading: sessionLoading, endReason: sessionEndReason } = useSession()
  const signIn = useSignIn()
  /*
    세션이 저절로 끝나 여기로 온 경우, **왜 끊겼는지**를 먼저 띄운다.
    단순 만료(`expired`)는 설명하지 않는다 — 흔한 일이라 매번 알리면 잔소리가 된다.
    비밀번호 변경 등으로 신원이 바뀐 경우만 이유를 말한다(백엔드 2차 회신 1-2).
  */
  const [alert, setAlert] = useState<AuthState | null>(
    sessionEndReason === 'identity-changed'
      ? { variant: 'info', message: '계정 정보가 변경되어 다시 로그인해 주세요.' }
      : null,
  )
  const [resendDone, setResendDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const passwordCaps = useCapsLockWarning()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ defaultValues: { email: '', password: '' } })

  const email = watch('email')
  const passwordField = register('password', { required: '비밀번호를 입력해주세요.' })

  // 잠금은 계정별 상태 — 이메일이 바뀌면 이전 계정의 잠금 알림을 유지하지 않는다
  useEffect(() => {
    setAlert((prev) => (prev?.blockSubmit ? null : prev))
  }, [email])

  async function onSubmit(values: LoginFormValues) {
    setAlert(null)
    setResendDone(false)

    try {
      const res = await login({ body: values })
      // 인증 컨텍스트에 세션 저장 → 이후 보호된 화면 진입 가능
      await signIn(res)
      navigate(initialScreenFor(res.role))
    } catch (err) {
      setAlert(resolveAuthState(err))
    }
  }

  async function handleResend() {
    await resendAccountInvitation({ body: { email } })
    setResendDone(true)
  }

  // 발표용 임시 — 실제 배포 시 이 함수와 아래 버튼 블록을 통째로 제거
  // 역할 선택 UI는 정책상 없음(§34 주석) — 이건 폼을 우회하는 데모 지름길일 뿐,
  // 서버가 역할을 판정하는 로그인 흐름 자체는 그대로 재사용한다. 로그인 후에는
  // 헤더의 같은 목록(dev 전용, Header.tsx)으로 화면 전환 없이 역할을 바꿀 수 있다.
  async function handleQuickLogin(quickEmail: string, quickPassword: string) {
    setAlert(null)
    setResendDone(false)
    try {
      const res = await login({ body: { email: quickEmail, password: quickPassword } })
      await signIn(res)
      navigate(initialScreenFor(res.role))
    } catch (err) {
      setAlert(resolveAuthState(err))
    }
  }

  /*
    세션을 확인하는 동안은 아무것도 그리지 않는다. 로그인 폼을 먼저 보여주면
    쿠키가 살아 있는 사용자에게 **로그인 화면이 깜빡였다가 사라진다.**
  */
  if (sessionLoading) return null

  // 이미 로그인한 사용자가 로그인 화면에 오면 자기 초기 화면으로 되돌림
  if (user) {
    return <Navigate to={initialScreenFor(user.role)} replace />
  }

  return (
    <div className="flex min-h-screen w-full bg-canvas">
      <div className="flex w-full bg-surface">
        <BrandPanel />

        {/* stableHeight: 알림이 뜨고 사라져도 제목·입력 필드 위치가 흔들리지 않게 (AU-01 §6) */}
        <AuthForm title="로그인" subtitle="계정 정보를 입력하세요." stableHeight>
          {/*
            발표용 임시 버튼 — 실제 배포 시 이 블록 통째로 제거.
            계정은 `.env.local`에서 온다. **없으면 상자째 안 그린다** — 빈 상자가 남으면
            "버튼이 안 뜨는 버그"로 보인다.
          */}
          {QUICK_LOGIN_ACCOUNTS.length > 0 && (
            <div className="mb-6 rounded-md bg-canvas px-3 py-2.5">
              <p className="mb-2 text-[11px] font-medium text-fg-muted">
                발표용 · 역할별 바로 입장
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_LOGIN_ACCOUNTS.map(
                  ({ label, email: quickEmail, password: quickPassword }) => (
                    <Button
                      key={quickEmail}
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={() => handleQuickLogin(quickEmail, quickPassword)}
                    >
                      {label}
                    </Button>
                  ),
                )}
              </div>
            </div>
          )}

          {/* noValidate: 브라우저 기본 검증 대신 RHF/Alert로 상태를 일원화 */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="login-email">이메일</FieldLabel>
              <Input
                id="login-email"
                type="email"
                placeholder="manager@org.com"
                autoComplete="username"
                disabled={isSubmitting}
                aria-invalid={!!errors.email}
                {...register('email', {
                  required: '이메일을 입력해주세요.',
                  pattern: { value: EMAIL_PATTERN, message: EMAIL_INVALID_MESSAGE },
                })}
              />
              <FieldError>{errors.email?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="login-password">비밀번호</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                  {...passwordField}
                  onKeyDown={passwordCaps.onKeyDown}
                  onKeyUp={passwordCaps.onKeyUp}
                  onBlur={(event) => {
                    passwordCaps.onBlur(event)
                    passwordField.onBlur(event)
                  }}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                    aria-pressed={showPassword}
                    disabled={isSubmitting}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              {/* role=status — 값이 가려진 필드라 화면을 못 보는 사용자에게도 읽혀야 한다 */}
              {passwordCaps.capsLock && (
                <p role="status" className="text-warning flex items-center gap-1.5 text-xs">
                  <Kbd>⇪ Caps Lock</Kbd> 켜짐 — 대문자로 입력됩니다.
                </p>
              )}
              <FieldError>{errors.password?.message}</FieldError>
            </Field>

            {/* 알림은 비밀번호 아래 · 버튼 위 — 폼 위쪽에 두면 뜰 때마다 입력 필드가 밀린다 */}
            {alert && (
              <Alert variant={alert.variant}>
                {alert.message}
                {alert.showResend && (
                  <span className="ml-2">
                    {resendDone ? (
                      <span className="text-fg-subtle">초대 메일을 다시 보냈습니다.</span>
                    ) : (
                      <TextLink onClick={handleResend}>초대 메일 다시 받기</TextLink>
                    )}
                  </span>
                )}
              </Alert>
            )}

            <div className="pt-1">
              <Button type="submit" size="lg" disabled={isSubmitting || alert?.blockSubmit}>
                {isSubmitting ? '로그인 중…' : '로그인'}
              </Button>
            </div>
          </form>

          <div className="mt-4 text-center">
            <TextLink to="/shared/password-reset">비밀번호를 잊으셨나요?</TextLink>
          </div>

          {/*
            개발용 안내 — 실제 배포 시 제거.

            로그인·비밀번호 재설정은 **실서버에 붙어 있다.** 계정은 위 「발표용 · 역할별
            바로 입장」 버튼이 들고 있으므로 여기 다시 적지 않는다 — 두 곳에 적으면 한쪽이
            반드시 낡는다. 재설정은 토큰이 실제 메일로만 오므로(이슈 178로 mock 토큰
            제거) 여기서 케이스별 딥링크를 못 남긴다 — 요청 단계만 아래에서 바로 시도할 수
            있다. 아래에 남긴 것은 **아직 목으로 도는 흐름**(AU-02 초대)뿐이다.
          */}
          <div className="mt-8 rounded-md bg-canvas px-3 py-2.5 text-[11px] leading-relaxed text-fg-subtle">
            <b className="text-fg-muted">로그인</b> · 실서버 연동됨. 위 버튼으로 역할별 입장
            <br />
            연속 실패 시 잠시 차단된다(잠금 아님) — 서버가 남은 시간을 알려준다
            <br />
            <b className="text-fg-muted">초대 링크(AU-02)</b> · <span>아직 목</span> ·{' '}
            <Link to="/invite/mgr-8f3a" className="text-primary hover:underline">
              매니저 가입
            </Link>{' '}
            ·{' '}
            <Link to="/invite/stu-4c19" className="text-primary hover:underline">
              교육생 활성화
            </Link>
            <br />
            <b className="text-fg-muted">비밀번호 재설정(AU-03)</b> · 실서버 연동됨 ·{' '}
            <Link to="/shared/password-reset" className="text-primary hover:underline">
              요청 화면 열기
            </Link>{' '}
            — 토큰은 실제 메일로만 오므로 케이스별 딥링크는 없다
          </div>
        </AuthForm>
      </div>
    </div>
  )
}
