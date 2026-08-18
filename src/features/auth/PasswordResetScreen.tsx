import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { requestPasswordReset, verifyResetToken, confirmPasswordReset } from './passwordResetApi'
import { resolvePasswordResetState } from './passwordResetStates'
import type { PasswordResetState } from './passwordResetStates'
import { checkPasswordPolicy } from './passwordPolicy'
import { ApiError } from '@/api/_contract'
import { useCapsLockWarning } from './useCapsLockWarning'
import BrandPanel from './components/BrandPanel'
import AuthForm from './components/AuthForm'
import TextLink from './components/TextLink'
import AuthStatusCard from './components/AuthStatusCard'
import Stepbar from './components/Stepbar'
import { Alert } from '@/components/ui/Alert'
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/Field'
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

interface RequestFormValues {
  email: string
}

interface SetPasswordFormValues {
  password: string
  passwordConfirm: string
}

/** AU-03 §3 ① 요청 — 계정 유무·활성 상태와 무관하게 항상 같은 결과(계정 열거 방지) */
function RequestStage() {
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  /** 제출 실패(네트워크·5xx) — 폼은 유지, 인라인 알림. 카드로 넘어간 뒤 재발송 실패는 resendError */
  const [submitAlert, setSubmitAlert] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestFormValues>({ defaultValues: { email: '' } })

  async function onSubmit(values: RequestFormValues) {
    setSubmitAlert(null)
    try {
      await requestPasswordReset(values.email)
      setSentEmail(values.email)
    } catch (err) {
      setSubmitAlert(resolvePasswordResetState(err).message)
    }
  }

  async function handleResend() {
    if (!sentEmail) return
    setResendError(null)
    try {
      await requestPasswordReset(sentEmail)
      setResent(true)
    } catch (err) {
      setResendError(resolvePasswordResetState(err).message)
    }
  }

  if (sentEmail) {
    return (
      <AuthStatusCard
        variant="info"
        icon="✉"
        title="메일을 보냈습니다"
        description={
          <>
            받은 편지함을 확인해 주세요.
            <br />
            입력하신 주소가 계정에 등록돼 있으면 재설정 링크가 도착합니다.
          </>
        }
        aux={
          resendError ? (
            <span className="text-danger">{resendError}</span>
          ) : (
            '메일이 오지 않으면 스팸함을 확인해 주세요.'
          )
        }
        actions={
          <>
            {resent ? (
              <span className="self-center text-[13px] text-fg-subtle">다시 보냈습니다.</span>
            ) : (
              <Button variant="ghost" onClick={handleResend}>
                다시 보내기
              </Button>
            )}
            <Button nativeButton={false} render={<Link to="/shared/login" />}>
              로그인으로
            </Button>
          </>
        }
      />
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Stepbar active={1} />

      {submitAlert && <Alert variant="danger">{submitAlert}</Alert>}

      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="reset-email">이메일</FieldLabel>
        <Input
          id="reset-email"
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

      <div className="pt-1">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? '전송 중…' : '재설정 메일 보내기'}
        </Button>
      </div>

      <div className="text-center">
        <TextLink to="/shared/login">← 로그인으로</TextLink>
      </div>
    </form>
  )
}

/** AU-03 §3 ② 설정 — 링크(?token=) 진입, 새 비밀번호 설정 */
function SetPasswordStage({ token }: { token: string }) {
  const navigate = useNavigate()
  const [verifying, setVerifying] = useState(true)
  const [tokenAlert, setTokenAlert] = useState<PasswordResetState | null>(null)
  const [submitAlert, setSubmitAlert] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const passwordCaps = useCapsLockWarning()
  const passwordConfirmCaps = useCapsLockWarning()

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordFormValues>({ defaultValues: { password: '', passwordConfirm: '' } })

  const password = watch('password')
  const policyUnmet = errors.password ? checkPasswordPolicy(password) : []

  const passwordField = register('password', {
    validate: (value) => {
      const unmet = checkPasswordPolicy(value)
      return unmet.length === 0 || unmet.join(' · ')
    },
    // 확인란 에러가 이미 떠 있으면, 비밀번호 쪽을 고쳐도 확인란을 재검사해 스테일 에러 제거
    onChange: () => {
      if (errors.passwordConfirm) void trigger('passwordConfirm')
    },
  })
  const passwordConfirmField = register('passwordConfirm', {
    validate: (value, formValues) =>
      value === formValues.password || '비밀번호가 일치하지 않습니다.',
    deps: ['password'],
  })

  // 진입 시 토큰 검증 — 만료·사용됨·위변조면 폼을 렌더하지 않는다. 계정 활성 상태는 보지 않는다
  useEffect(() => {
    verifyResetToken(token)
      .catch((err: unknown) => setTokenAlert(resolvePasswordResetState(err)))
      .finally(() => setVerifying(false))
  }, [token])

  async function onSubmit(values: SetPasswordFormValues) {
    setSubmitAlert(null)
    try {
      await confirmPasswordReset({
        token,
        password: values.password,
        passwordConfirm: values.passwordConfirm,
      })
      setDone(true)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SAME_AS_CURRENT') {
        setError('password', { type: 'manual', message: '지금 쓰는 비밀번호와 달라야 합니다' })
        return
      }
      setSubmitAlert(resolvePasswordResetState(err).message)
    }
  }

  if (verifying) {
    return <p className="text-[13px] text-fg-subtle">링크를 확인하는 중…</p>
  }

  // password-reset.html #expired·#invalid — 토큰 검증 실패 상태 카드
  if (tokenAlert) {
    if (tokenAlert.action === 'REQUEST_AGAIN') {
      return (
        <AuthStatusCard
          variant="warning"
          icon="◷"
          title="링크가 만료되었습니다"
          description="재설정 링크는 한 번만, 정해진 시간 안에만 쓸 수 있어요."
          aux="다시 요청하면 새 링크를 보내드립니다."
          actions={
            <Button nativeButton={false} render={<Link to="/shared/password-reset" />}>
              다시 요청하기
            </Button>
          }
        />
      )
    }
    if (tokenAlert.action === 'CONTACT') {
      // RESET_TOKEN_INVALID — 위변조는 재요청해도 같은 일이 반복될 것이라 문의로 보낸다
      // (§6, 보안 로그). AU-02의 동일 케이스와 같은 톤 — danger + 문의하기.
      // 목업 #invalid 페이지가 한때 #expired를 복사한 채(scard warn·다시 요청하기
      // 버튼)로 남아 있었는데, 케이스 계약표·정의서와 대조해 danger·문의하기로
      // 정정했다(목업도 함께 수정).
      return (
        <AuthStatusCard
          variant="danger"
          icon="!"
          title="유효하지 않은 링크입니다"
          description="이 링크로는 비밀번호를 바꿀 수 없어요."
          aux="메일에 있는 링크를 다시 눌러 보세요. 계속 같으면 담당자에게 문의해 주세요."
          actions={
            <Button nativeButton={false} render={<a href="mailto:support@iz-get.com" />}>
              문의하기
            </Button>
          }
        />
      )
    }
    /*
      네트워크·알 수 없는 오류(action 없음) — 토큰이 진짜 위변조인지 아닌지 서버에
      물어보지도 못한 상태다. "유효하지 않은 링크"로 단정하면 안 된다(2026-08-18
      하드닝 — 이전엔 이 분기가 따로 없어서 여기까지 그대로 흘러 CONTACT 케이스와
      똑같은 "유효하지 않은 링크입니다"가 떴다). `resolvePasswordResetState`가 이미
      네트워크/미지 코드를 구분해 계산해 둔 `tokenAlert.message`를 그대로 쓴다.
    */
    return (
      <AuthStatusCard
        variant="danger"
        icon="!"
        title="문제가 발생했어요"
        description={tokenAlert.message}
        aux="잠시 후 링크를 다시 열어 주세요. 계속 같으면 담당자에게 문의해 주세요."
        actions={
          <Button nativeButton={false} render={<a href="mailto:support@iz-get.com" />}>
            문의하기
          </Button>
        }
      />
    )
  }

  if (done) {
    return (
      <AuthStatusCard
        variant="success"
        icon="✓"
        title="비밀번호가 바뀌었습니다"
        description="새 비밀번호로 다시 로그인해 주세요."
        aux="보안을 위해 다른 기기에서는 모두 로그아웃되었어요."
        actions={
          <Button onClick={() => navigate('/shared/login', { replace: true })}>로그인</Button>
        }
      />
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Stepbar active={2} />

      {/* 저장 실패(case7) — 비밀번호는 아직 안 바뀜, 폼은 유지 */}
      {submitAlert && <Alert variant="danger">{submitAlert}</Alert>}

      <Field data-invalid={!!errors.password}>
        <FieldLabel htmlFor="reset-password">새 비밀번호</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="reset-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="비밀번호 설정"
            autoComplete="new-password"
            disabled={isSubmitting}
            aria-invalid={!!errors.password}
            {...passwordField}
            onKeyDown={passwordCaps.onKeyDown}
            onKeyUp={passwordCaps.onKeyUp}
            onFocus={passwordCaps.onFocus}
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
        {passwordCaps.capsLock && (
          <p role="status" className="flex items-center gap-1.5 text-xs text-warning">
            <Kbd>⇪ Caps Lock</Kbd> 켜짐 — 대문자로 입력됩니다.
          </p>
        )}
        {errors.password ? (
          <FieldError>
            {policyUnmet.length > 0 ? policyUnmet.join(' · ') : errors.password.message}
          </FieldError>
        ) : (
          <FieldDescription>8자 이상 · 영문·숫자·특수문자 포함</FieldDescription>
        )}
      </Field>

      <Field data-invalid={!!errors.passwordConfirm}>
        <FieldLabel htmlFor="reset-password-confirm">새 비밀번호 확인</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="reset-password-confirm"
            type={showPasswordConfirm ? 'text' : 'password'}
            placeholder="다시 입력"
            autoComplete="new-password"
            disabled={isSubmitting}
            aria-invalid={!!errors.passwordConfirm}
            {...passwordConfirmField}
            onKeyDown={passwordConfirmCaps.onKeyDown}
            onKeyUp={passwordConfirmCaps.onKeyUp}
            onFocus={passwordConfirmCaps.onFocus}
            onBlur={(event) => {
              passwordConfirmCaps.onBlur(event)
              passwordConfirmField.onBlur(event)
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label={showPasswordConfirm ? '비밀번호 숨기기' : '비밀번호 표시'}
              aria-pressed={showPasswordConfirm}
              disabled={isSubmitting}
              onClick={() => setShowPasswordConfirm((v) => !v)}
            >
              {showPasswordConfirm ? <EyeOffIcon /> : <EyeIcon />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {passwordConfirmCaps.capsLock && (
          <p role="status" className="flex items-center gap-1.5 text-xs text-warning">
            <Kbd>⇪ Caps Lock</Kbd> 켜짐 — 대문자로 입력됩니다.
          </p>
        )}
        <FieldError>{errors.passwordConfirm?.message}</FieldError>
      </Field>

      <div className="pt-1">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? '비밀번호를 바꾸는 중…' : submitAlert ? '다시 시도' : '비밀번호 변경'}
        </Button>
      </div>

      <div className="text-center">
        <TextLink to="/shared/login">← 로그인으로</TextLink>
      </div>
    </form>
  )
}

/**
 * AU-03 · 비밀번호 재설정 — 요청 → 설정 두 단계
 * 라우트는 `/shared/password-reset` 하나뿐 — 쿼리 파라미터 `token` 유무로 컴포넌트
 * 내부에서만 단계를 나눈다(§9 — 토큰 없이 ②에 오면 막다른 화면 대신 ①로 보낸다).
 * 새 라우트를 추가하지 않는다.
 */
export default function PasswordResetScreen() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  return (
    <div className="flex min-h-screen w-full bg-canvas">
      <div className="flex w-full bg-surface">
        <BrandPanel />
        {token ? (
          <AuthForm
            title="새 비밀번호 설정"
            subtitle="지금 쓰던 비밀번호와 다른 비밀번호를 입력하세요."
          >
            <SetPasswordStage token={token} />
          </AuthForm>
        ) : (
          <AuthForm
            title="비밀번호 재설정"
            subtitle="계정 이메일을 입력하면 재설정 링크를 보냅니다."
          >
            <RequestStage />
          </AuthForm>
        )}
      </div>
    </div>
  )
}
