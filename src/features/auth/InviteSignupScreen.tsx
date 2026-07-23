import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { getInvite, signup, activate, resendInvite } from './inviteApi'
import { consentsFor } from './consents'
import { resolveInviteState, checkPasswordPolicy } from './inviteStates'
import type { InviteState } from './inviteStates'
import type { InviteApiError, InviteInfo } from './inviteTypes'
import BrandPanel from './components/BrandPanel'
import AuthForm from './components/AuthForm'
import InlineAlert from './components/InlineAlert'
import TextField from './components/TextField'
import PasswordField from './components/PasswordField'
import PasswordPolicyHint from './components/PasswordPolicyHint'
import ReadonlyField from './components/ReadonlyField'
import ConsentGroup from './components/ConsentGroup'
import PrimaryButton from './components/PrimaryButton'
import TextLink from './components/TextLink'

/** 변형별 문구 (와이어프레임 기준) */
const COPY = {
  MANAGER: {
    brandTitle: (
      <>
        운영 계정을
        <br />
        설정하세요
      </>
    ),
    brandDesc: '초대받은 계정으로 이름과 비밀번호를 설정하면 바로 시작할 수 있습니다.',
    title: '회원가입',
    subtitle: '초대받은 계정으로 가입을 완료하세요.',
    emailHint: '초대받은 주소 (확인됨)',
    submit: '가입하기',
  },
  TRAINEE: {
    brandTitle: (
      <>
        검증 세션을
        <br />
        시작하세요
      </>
    ),
    brandDesc: '비밀번호를 설정하고 데이터 처리에 동의하면 계정이 활성화됩니다.',
    title: '계정 활성화',
    subtitle: '비밀번호 설정과 동의로 활성화됩니다.',
    emailHint: '명단 등록 (확인됨)',
    submit: '활성화하기',
  },
}

interface InviteFormValues {
  name: string
  password: string
  passwordConfirm: string
}

/**
 * SC-A02 · 회원가입 · 계정 활성화
 * 한 화면에서 초대 토큰이 변형을 결정 (매니저=변형 A / 교육생=변형 B)
 * 자유 가입 없음 — 초대 링크로만 진입 (AUTH-01·06, D12)
 */
export default function InviteSignup() {
  const { token = '' } = useParams()
  const navigate = useNavigate()

  const [verifying, setVerifying] = useState(true)
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [alert, setAlert] = useState<InviteState | null>(null)

  const [consents, setConsents] = useState<string[]>([])
  const [showMissingConsents, setShowMissingConsents] = useState(false)
  const [resendDone, setResendDone] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({
    defaultValues: { name: '', password: '', passwordConfirm: '' },
  })

  const password = watch('password')
  // 정책 미충족 목록은 제출 시도 후에만 노출 (case6)
  const policyUnmet = errors.password ? checkPasswordPolicy(password) : []

  // 진입 시 초대 토큰 검증 → 변형 결정
  useEffect(() => {
    getInvite(token)
      .then(setInvite)
      .catch((err: InviteApiError) => setAlert(resolveInviteState(err.code)))
      .finally(() => setVerifying(false))
  }, [token])

  const items = invite ? consentsFor(invite.inviteType) : []
  const requiredCodes = items.filter((i) => i.required).map((i) => i.code)
  const allRequiredAgreed = requiredCodes.every((code) => consents.includes(code))

  async function onSubmit(values: InviteFormValues) {
    if (!invite) return

    setAlert(null)

    // 필수 동의 (CS1)
    if (!allRequiredAgreed) {
      setShowMissingConsents(true)
      return
    }

    try {
      if (invite.inviteType === 'MANAGER') {
        await signup({ token, name: values.name, password: values.password, consents })
      } else {
        await activate({ token, password: values.password, consents })
      }
      navigate('/shared/login', { replace: true })
    } catch (err) {
      setAlert(resolveInviteState((err as InviteApiError).code))
    }
  }

  async function handleResend() {
    await resendInvite(token)
    setResendDone(true)
  }

  const copy = invite ? COPY[invite.inviteType] : COPY.MANAGER

  return (
    <div className="flex min-h-screen w-full bg-canvas">
      <div className="flex w-full bg-surface">
        <BrandPanel title={copy.brandTitle} description={copy.brandDesc} />

        <AuthForm title={copy.title} subtitle={copy.subtitle}>
          {verifying && <p className="text-[13px] text-fg-subtle">초대 링크를 확인하는 중…</p>}

          {/* 토큰이 무효면 폼을 렌더하지 않음 */}
          {!verifying && alert && (
            <div className="space-y-4">
              <InlineAlert variant={alert.variant}>
                {alert.message}
                {alert.action === 'RESEND' && (
                  <span className="ml-2">
                    {resendDone ? (
                      <span className="text-fg-subtle">초대 메일을 다시 보냈습니다.</span>
                    ) : (
                      <TextLink onClick={handleResend}>재발송</TextLink>
                    )}
                  </span>
                )}
                {alert.action === 'LOGIN' && (
                  <span className="ml-2">
                    <TextLink to="/shared/login">로그인</TextLink>
                  </span>
                )}
              </InlineAlert>
              {alert.blocksForm && <TextLink to="/shared/login">← 로그인 화면으로</TextLink>}
            </div>
          )}

          {/* 정상 토큰 → 변형별 폼 */}
          {!verifying && invite && !alert?.blocksForm && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <p className="text-[12px] text-success">✓ 초대 링크로 이메일이 확인되었습니다</p>

              {/* 변형 A만 이름 입력 — 교육생은 명단에 이름이 이미 등록됨 */}
              {invite.inviteType === 'MANAGER' && (
                <TextField
                  label="이름"
                  placeholder="이름을 입력하세요"
                  disabled={isSubmitting}
                  {...register('name')}
                />
              )}

              <ReadonlyField label="이메일" hint={copy.emailHint} value={invite.email} />

              <div>
                <PasswordField
                  label="비밀번호"
                  placeholder="비밀번호 설정"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  {...register('password', {
                    validate: (value) => {
                      const unmet = checkPasswordPolicy(value)
                      return unmet.length === 0 || `비밀번호 조건 미충족 · ${unmet.join(', ')}`
                    },
                  })}
                />
                <PasswordPolicyHint unmet={policyUnmet} />
              </div>

              <PasswordField
                label="비밀번호 확인"
                placeholder="다시 입력"
                autoComplete="new-password"
                disabled={isSubmitting}
                error={errors.passwordConfirm?.message}
                {...register('passwordConfirm', {
                  validate: (value, formValues) =>
                    value === formValues.password || '비밀번호가 일치하지 않습니다.',
                })}
              />

              <ConsentGroup
                items={items}
                checked={consents}
                onChange={setConsents}
                highlightMissing={showMissingConsents}
                disabled={isSubmitting}
              />

              <div className="pt-1">
                {/* 필수 전체 동의 전 제출 불가 (CS1) */}
                <PrimaryButton loading={isSubmitting} disabled={!allRequiredAgreed}>
                  {copy.submit}
                </PrimaryButton>
              </div>
            </form>
          )}
        </AuthForm>
      </div>
    </div>
  )
}
