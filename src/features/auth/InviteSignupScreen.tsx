import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { getInvite, signup, activate, resendInvite } from './inviteApi'
import { consentsFor } from './consents'
import type { ConsentItem } from './consents'
import { resolveInviteState, checkPasswordPolicy } from './inviteStates'
import type { InviteState } from './inviteStates'
import type { InviteApiError, InviteInfo } from './inviteTypes'
import { useCapsLockWarning } from './useCapsLockWarning'
import BrandPanel from './components/BrandPanel'
import AuthForm from './components/AuthForm'
import TextLink from './components/TextLink'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/InputGroup'
import { Kbd } from '@/components/ui/Kbd'
import { Separator } from '@/components/ui/Separator'
import { Button } from '@/components/ui/Button'

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
 * SC-A02 §3·§8 · 동의 그룹
 * 구분선 리스트 · 항목별 필수/선택 배지 · 전문 보기 펼침
 * 필수 전체 동의 전에는 제출 불가(CS1) — 판정은 부모가 수행
 */
function ConsentList({
  items,
  checked,
  onChange,
  highlightMissing,
  disabled,
}: {
  items: ConsentItem[]
  checked: string[]
  onChange: (codes: string[]) => void
  highlightMissing?: boolean
  disabled?: boolean
}) {
  const [opened, setOpened] = useState<string | null>(null)
  const allChecked = items.every((item) => checked.includes(item.code))

  function toggleAll() {
    onChange(allChecked ? [] : items.map((item) => item.code))
  }

  function toggleOne(code: string) {
    onChange(checked.includes(code) ? checked.filter((c) => c !== code) : [...checked, code])
  }

  return (
    <div className="rounded-md border border-border bg-canvas">
      {/* 전체 동의 */}
      <label className="flex cursor-pointer items-center gap-2.5 px-3.5 py-3">
        <Checkbox checked={allChecked} onCheckedChange={toggleAll} disabled={disabled} />
        <span className="text-[13px] font-semibold text-fg">전체 동의</span>
      </label>

      {items.map((item) => {
        const isChecked = checked.includes(item.code)
        const missing = highlightMissing && item.required && !isChecked

        return (
          <div key={item.code}>
            <Separator />
            <div className={`px-3.5 py-2.5 ${missing ? 'bg-danger-soft' : ''}`}>
              <div className="flex items-start gap-2.5">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggleOne(item.code)}
                  disabled={disabled}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={item.required ? 'info' : 'neutral'}>
                      {item.required ? '필수' : '선택'}
                    </Badge>
                    <span className="text-[13px] text-fg-muted">{item.title}</span>
                    {item.note && <span className="text-[12px] text-danger">· {item.note}</span>}
                  </div>
                  {item.subNote && (
                    <p className="mt-1 text-[11px] text-fg-subtle">{item.subNote}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setOpened(opened === item.code ? null : item.code)}
                  className="shrink-0 text-[11px] text-fg-subtle underline underline-offset-2 hover:text-fg-muted"
                >
                  전문 보기
                </button>
              </div>

              {opened === item.code && (
                <p className="mt-2 rounded-sm border border-border bg-white px-3 py-2 text-[11px] leading-relaxed text-fg-subtle">
                  [{item.title}] 약관 전문이 표시되는 영역입니다. 수집 항목 · 이용 목적 · 보유 기간
                  · 제3자 제공 대상이 이곳에 게시됩니다.
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
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

  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const passwordCaps = useCapsLockWarning()
  const passwordConfirmCaps = useCapsLockWarning()

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

  const passwordField = register('password', {
    validate: (value) => {
      const unmet = checkPasswordPolicy(value)
      return unmet.length === 0 || `비밀번호 조건 미충족 · ${unmet.join(', ')}`
    },
  })
  const passwordConfirmField = register('passwordConfirm', {
    validate: (value, formValues) =>
      value === formValues.password || '비밀번호가 일치하지 않습니다.',
  })

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
              <Alert variant={alert.variant}>
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
              </Alert>
              {alert.blocksForm && <TextLink to="/shared/login">← 로그인 화면으로</TextLink>}
            </div>
          )}

          {/* 정상 토큰 → 변형별 폼 */}
          {!verifying && invite && !alert?.blocksForm && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <p className="text-[12px] text-success">✓ 초대 링크로 이메일이 확인되었습니다</p>

              {/* 변형 A만 이름 입력 — 교육생은 명단에 이름이 이미 등록됨 */}
              {invite.inviteType === 'MANAGER' && (
                <Field>
                  <FieldLabel htmlFor="invite-name">이름</FieldLabel>
                  <Input
                    id="invite-name"
                    placeholder="이름을 입력하세요"
                    disabled={isSubmitting}
                    {...register('name')}
                  />
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="invite-email">
                  이메일 <span className="text-fg-subtle font-normal">· {copy.emailHint}</span>
                </FieldLabel>
                <Input
                  id="invite-email"
                  value={invite.email}
                  readOnly
                  className="bg-canvas text-fg-muted cursor-default"
                />
              </Field>

              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="invite-password">비밀번호</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="invite-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호 설정"
                    autoComplete="new-password"
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
                {passwordCaps.capsLock && (
                  <p role="status" className="text-warning flex items-center gap-1.5 text-xs">
                    <Kbd>⇪ Caps Lock</Kbd> 켜짐 — 대문자로 입력됩니다.
                  </p>
                )}
                {/* 정책은 상시 노출, 제출 실패 시 미충족 기준만 danger로 (case6) */}
                {policyUnmet.length > 0 ? (
                  <FieldError>비밀번호 조건 미충족 · {policyUnmet.join(', ')}</FieldError>
                ) : (
                  <FieldDescription>8자 이상, 영문·숫자·특수문자 포함</FieldDescription>
                )}
              </Field>

              <Field data-invalid={!!errors.passwordConfirm}>
                <FieldLabel htmlFor="invite-password-confirm">비밀번호 확인</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="invite-password-confirm"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    placeholder="다시 입력"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.passwordConfirm}
                    {...passwordConfirmField}
                    onKeyDown={passwordConfirmCaps.onKeyDown}
                    onKeyUp={passwordConfirmCaps.onKeyUp}
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
                  <p role="status" className="text-warning flex items-center gap-1.5 text-xs">
                    <Kbd>⇪ Caps Lock</Kbd> 켜짐 — 대문자로 입력됩니다.
                  </p>
                )}
                <FieldError>{errors.passwordConfirm?.message}</FieldError>
              </Field>

              <ConsentList
                items={items}
                checked={consents}
                onChange={setConsents}
                highlightMissing={showMissingConsents}
                disabled={isSubmitting}
              />

              <div className="pt-1">
                {/* 필수 전체 동의 전 제출 불가 (CS1) */}
                <Button type="submit" size="lg" disabled={isSubmitting || !allRequiredAgreed}>
                  {isSubmitting ? '처리 중…' : copy.submit}
                </Button>
              </div>
            </form>
          )}
        </AuthForm>
      </div>
    </div>
  )
}
