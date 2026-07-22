import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { getInvite, signup, activate, resendInvite } from '@/api/inviteApi'
import { consentsFor } from '@/auth/consents'
import { resolveInviteState, checkPasswordPolicy } from '@/auth/inviteStates'
import type { InviteState } from '@/auth/inviteStates'
import type { InviteApiError, InviteInfo } from '@/types/invite'
import BrandPanel from '@/components/BrandPanel'
import AuthForm from '@/components/AuthForm'
import InlineAlert from '@/components/InlineAlert'
import TextField from '@/components/TextField'
import PasswordField from '@/components/PasswordField'
import PasswordPolicyHint from '@/components/PasswordPolicyHint'
import ReadonlyField from '@/components/ReadonlyField'
import ConsentGroup from '@/components/ConsentGroup'
import PrimaryButton from '@/components/PrimaryButton'
import TextLink from '@/components/TextLink'

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

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [consents, setConsents] = useState<string[]>([])
  const [policyUnmet, setPolicyUnmet] = useState<string[]>([])
  const [confirmError, setConfirmError] = useState('')
  const [showMissingConsents, setShowMissingConsents] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resendDone, setResendDone] = useState(false)

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!invite) return

    setAlert(null)
    setConfirmError('')
    setPolicyUnmet([])

    // 비밀번호 정책 (case6)
    const unmet = checkPasswordPolicy(password)
    if (unmet.length > 0) {
      setPolicyUnmet(unmet)
      return
    }
    if (password !== passwordConfirm) {
      setConfirmError('비밀번호가 일치하지 않습니다.')
      return
    }
    // 필수 동의 (CS1)
    if (!allRequiredAgreed) {
      setShowMissingConsents(true)
      return
    }

    setSubmitting(true)
    try {
      if (invite.inviteType === 'MANAGER') {
        await signup({ token, name, password, consents })
      } else {
        await activate({ token, password, consents })
      }
      navigate('/shared/login', { replace: true })
    } catch (err) {
      setAlert(resolveInviteState((err as InviteApiError).code))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    await resendInvite(token)
    setResendDone(true)
  }

  const copy = invite ? COPY[invite.inviteType] : COPY.MANAGER

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-white shadow-sm">
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
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <p className="text-[12px] text-success">✓ 초대 링크로 이메일이 확인되었습니다</p>

              {/* 변형 A만 이름 입력 — 교육생은 명단에 이름이 이미 등록됨 */}
              {invite.inviteType === 'MANAGER' && (
                <TextField
                  label="이름"
                  value={name}
                  onChange={setName}
                  placeholder="이름을 입력하세요"
                  disabled={submitting}
                />
              )}

              <ReadonlyField label="이메일" hint={copy.emailHint} value={invite.email} />

              <div>
                <PasswordField
                  label="비밀번호"
                  value={password}
                  onChange={setPassword}
                  placeholder="비밀번호 설정"
                  autoComplete="new-password"
                  disabled={submitting}
                />
                <PasswordPolicyHint unmet={policyUnmet} />
              </div>

              <div>
                <PasswordField
                  label="비밀번호 확인"
                  value={passwordConfirm}
                  onChange={setPasswordConfirm}
                  placeholder="다시 입력"
                  autoComplete="new-password"
                  disabled={submitting}
                />
                {confirmError && <p className="mt-1.5 text-[12px] text-danger">{confirmError}</p>}
              </div>

              <ConsentGroup
                items={items}
                checked={consents}
                onChange={setConsents}
                highlightMissing={showMissingConsents}
                disabled={submitting}
              />

              <div className="pt-1">
                {/* 필수 전체 동의 전 제출 불가 (CS1) */}
                <PrimaryButton loading={submitting} disabled={!allRequiredAgreed}>
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
