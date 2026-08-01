import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Navigate, Link } from 'react-router'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useAuth } from './AuthContext'
import { login, resendInviteMail } from './authApi'
import { resolveAuthState } from './authStates'
import type { AuthState } from './authStates'
import type { ApiError } from './authTypes'
import { useCapsLockWarning } from './useCapsLockWarning'
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface LoginFormValues {
  email: string
  password: string
}

/**
 * SC-A01 · 로그인 (P0 · 전 화면 공통 관문)
 * - 역할은 서버가 판정하며, 화면에 역할 선택 UI를 두지 않음 (§2)
 * - 실패는 화면을 벗어나지 않고 인라인 알림 + 재입력 (v8 규칙)
 * - 공개 회원가입 링크 없음 (초대 기반 계정 · AUTH-01/06)
 */
export default function Login() {
  const navigate = useNavigate()
  const { session, signIn } = useAuth()
  const [alert, setAlert] = useState<AuthState | null>(null)
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
      const res = await login(values)
      // 인증 컨텍스트에 세션 저장 → 이후 보호된 화면 진입 가능
      signIn(res)
      // 서버가 지정한 초기 화면으로 이동 (클라이언트가 역할→화면 매핑을 하지 않음)
      navigate(res.initialScreen)
    } catch (err) {
      const { code, retryAfter } = err as ApiError
      setAlert(resolveAuthState(code, retryAfter))
    }
  }

  async function handleResend() {
    await resendInviteMail(email)
    setResendDone(true)
  }

  // 이미 로그인한 사용자가 로그인 화면에 오면 자기 초기 화면으로 되돌림
  if (session) {
    return <Navigate to={session.initialScreen} replace />
  }

  return (
    <div className="flex min-h-screen w-full bg-canvas">
      <div className="flex w-full bg-surface">
        <BrandPanel />

        {/* stableHeight: 알림이 뜨고 사라져도 제목·입력 필드 위치가 흔들리지 않게 (§6) */}
        <AuthForm title="로그인" subtitle="계정 정보를 입력하세요." stableHeight>
          {/* noValidate: 브라우저 기본 검증 대신 RHF/Alert로 상태를 일원화 (§3) */}
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
                  pattern: { value: EMAIL_PATTERN, message: '올바른 이메일 형식이 아닙니다.' },
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

          {/* 개발용 안내 — 실제 배포 시 제거 */}
          <div className="mt-8 rounded-md bg-canvas px-3 py-2.5 text-[11px] leading-relaxed text-fg-subtle">
            <b className="text-fg-muted">Mock 계정</b> · 비밀번호 <code>pass1234</code>
            <br />
            manager@org.com · trainee@org.com · admin@iz-get.com
            <br />
            <b className="text-fg-muted">상태 시연</b> · newtrainee@(미활성) · suspended@(정지) ·
            error@ · rollback@ · cookie@ · noctx@org.com
            <br />
            같은 계정 3회 연속 실패 → 지연(잠금 아님, 30초 후 재시도)
            <br />
            <b className="text-fg-muted">초대 링크(SC-A02)</b> ·{' '}
            <Link to="/invite/mgr-8f3a" className="text-primary hover:underline">
              매니저 가입
            </Link>{' '}
            ·{' '}
            <Link to="/invite/stu-4c19" className="text-primary hover:underline">
              교육생 활성화
            </Link>
            <br />
            가입/활성화 후 <b className="text-fg-muted">newmanager@org.com</b> ·{' '}
            <b className="text-fg-muted">newtrainee@org.com</b> + 직접 설정한 비밀번호로 로그인
            <br />
            <b className="text-fg-muted">비밀번호 재설정(AU-03)</b> ·{' '}
            <Link
              to="/shared/password-reset?token=reset-valid"
              className="text-primary hover:underline"
            >
              정상
            </Link>{' '}
            ·{' '}
            <Link
              to="/shared/password-reset?token=reset-expired"
              className="text-primary hover:underline"
            >
              만료
            </Link>{' '}
            ·{' '}
            <Link
              to="/shared/password-reset?token=reset-used"
              className="text-primary hover:underline"
            >
              사용됨
            </Link>{' '}
            ·{' '}
            <Link
              to="/shared/password-reset?token=reset-tampered"
              className="text-primary hover:underline"
            >
              위변조
            </Link>{' '}
            ·{' '}
            <Link
              to="/shared/password-reset?token=reset-revokefail"
              className="text-primary hover:underline"
            >
              세션폐기실패
            </Link>{' '}
            ·{' '}
            <Link
              to="/shared/password-reset?token=reset-failing"
              className="text-primary hover:underline"
            >
              저장실패
            </Link>
            <br />
            reset-valid로 제출 시 비밀번호를 <code>pass1234</code>(현재값)로 넣으면 same-as-current
            시연
          </div>
        </AuthForm>
      </div>
    </div>
  )
}
