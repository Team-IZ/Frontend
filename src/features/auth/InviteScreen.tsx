import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { ApiError } from '@/api/_contract'
import { getInvite, signup, activate, resendInvite } from './inviteApi'
import { consentsFor } from './consents'
import type { ConsentItem } from './consents'
import { resolveInviteState } from './inviteStates'
import type { InviteState } from './inviteStates'
import type { InviteErrorCode, InviteInfo } from './inviteTypes'
import { checkPasswordPolicy } from './passwordPolicy'
import { useCapsLockWarning } from './useCapsLockWarning'
import BrandPanel from './components/BrandPanel'
import AuthForm from './components/AuthForm'
import TextLink from './components/TextLink'
import AuthStatusCard from './components/AuthStatusCard'
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
    brandDesc: '초대받은 계정으로 이름과 비밀번호를 정하면 바로 시작할 수 있습니다.',
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
 * AU-02 §3·§8 · 동의 그룹
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
 * AU-02 · 회원가입 · 계정 활성화
 * 한 화면에서 초대 토큰이 변형을 결정 (매니저·오퍼레이터=변형 A / 교육생=변형 B)
 * 자유 가입 없음 — 초대 링크로만 진입
 */
export default function InviteScreen() {
  const { token = '' } = useParams()
  const navigate = useNavigate()

  const [verifying, setVerifying] = useState(true)
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  /** 토큰 검증 실패 — 폼 대신 상태 카드로 화면 전체를 대체 */
  const [verifyError, setVerifyError] = useState<unknown>(null)
  /** 제출 실패(저장 실패 등) — 폼은 유지한 채 인라인 알림 */
  const [submitAlert, setSubmitAlert] = useState<InviteState | null>(null)

  const [consents, setConsents] = useState<string[]>([])
  const [showMissingConsents, setShowMissingConsents] = useState(false)
  /** 검증 단계(만료 카드)·제출 단계(인라인 알림) 재발송 완료 표시 — 동시에 하나만 보이므로 공유 */
  const [resendDone, setResendDone] = useState(false)

  // 검증 단계 재발송 전용 — 이 시점엔 invite.email을 모르므로 사용자가 직접 입력한다
  const [resendEmailInput, setResendEmailInput] = useState('')
  const [resendPending, setResendPending] = useState(false)
  const [resendInputError, setResendInputError] = useState<string | null>(null)

  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const passwordCaps = useCapsLockWarning()
  const passwordConfirmCaps = useCapsLockWarning()

  const {
    register,
    handleSubmit,
    watch,
    trigger,
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

  // 진입 시 초대 토큰 검증 → 변형 결정
  useEffect(() => {
    getInvite(token)
      .then(setInvite)
      .catch((err: unknown) => setVerifyError(err))
      .finally(() => setVerifying(false))
  }, [token])

  const items = invite ? consentsFor(invite.inviteType) : []
  const requiredCodes = items.filter((i) => i.required).map((i) => i.code)
  const allRequiredAgreed = requiredCodes.every((code) => consents.includes(code))

  async function onSubmit(values: InviteFormValues) {
    if (!invite) return

    setSubmitAlert(null)

    // 필수 동의 (CS1)
    if (!allRequiredAgreed) {
      setShowMissingConsents(true)
      return
    }

    try {
      if (invite.inviteType === 'MANAGER') {
        await signup({
          token,
          userId: invite.userId,
          name: values.name,
          password: values.password,
          passwordConfirm: values.passwordConfirm,
          consents,
        })
      } else {
        await activate({
          token,
          userId: invite.userId,
          password: values.password,
          passwordConfirm: values.passwordConfirm,
          consents,
        })
      }
      navigate('/shared/login', { replace: true })
    } catch (err) {
      setSubmitAlert(resolveInviteState(err))
    }
  }

  /** 제출 단계 재발송 — 폼을 이미 연 상태라 invite.email을 안다(검증 단계와 다른 점) */
  async function handleResend() {
    if (!invite) return
    try {
      await resendInvite(invite.email)
      setResendDone(true)
    } catch {
      // 실패해도 action을 'RESEND'로 유지해 링크가 사라지지 않게 한다 —
      // AU-01 LoginScreen.tsx의 handleResend와 같은 패턴(C3 결함 재발 방지)
      setSubmitAlert({
        variant: 'danger',
        message: '메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        action: 'RESEND',
      })
    }
  }

  /** 검증 단계 재발송 — invite.email을 모르므로 사용자가 입력한 주소로 보낸다 */
  async function handleResendToTypedEmail(email: string) {
    setResendInputError(null)
    setResendPending(true)
    try {
      await resendInvite(email)
      setResendDone(true)
    } catch {
      setResendInputError('메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setResendPending(false)
    }
  }

  const copy = invite ? COPY[invite.inviteType] : COPY.MANAGER

  /** signup-activation.html #expired·#invalid·#already·#notlisted — 토큰 검증 실패 상태 카드 */
  function renderVerifyStatusCard(error: unknown) {
    const apiError = error instanceof ApiError ? error : null

    switch (apiError?.code as InviteErrorCode | undefined) {
      case 'INVITATION_EXPIRED':
        // 검증 단계라 invite.email이 없다 — 재발송하려면 사용자가 직접 이메일을 입력해야 한다
        // (resendAccountInvitation은 토큰이 아니라 email을 받는다). inviteTypes.ts 주석 참고.
        return (
          <AuthStatusCard
            variant="warning"
            icon="◷"
            title="초대 링크가 만료되었습니다"
            description="보안을 위해 초대 링크는 일정 시간이 지나면 쓸 수 없어요."
            aux={
              resendDone
                ? undefined
                : '이메일 주소를 입력하면 새 초대 링크를 다시 보내드립니다. 등록된 주소가 아니어도 같은 안내가 뜹니다.'
            }
            actions={
              resendDone ? (
                <span className="text-[13px] text-fg-subtle">초대 메일을 다시 보냈습니다.</span>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    void handleResendToTypedEmail(resendEmailInput)
                  }}
                  className="flex w-full flex-col items-center gap-2"
                >
                  <div className="flex w-full items-center gap-2">
                    <Input
                      type="email"
                      required
                      placeholder="가입 시 사용한 이메일"
                      value={resendEmailInput}
                      onChange={(event) => setResendEmailInput(event.target.value)}
                      disabled={resendPending}
                      className="h-9 text-[13px]"
                    />
                    <Button type="submit" size="sm" disabled={resendPending}>
                      {resendPending ? '보내는 중…' : '다시 받기'}
                    </Button>
                  </div>
                  {resendInputError && <p className="text-xs text-danger">{resendInputError}</p>}
                </form>
              )
            }
          />
        )
      case 'INVITATION_INVALID':
        return (
          <AuthStatusCard
            variant="danger"
            icon="!"
            title="유효하지 않은 링크입니다"
            description="링크가 잘못되었거나 이 기수의 링크가 아니에요."
            aux="메일에 있는 링크를 다시 눌러 보세요. 계속 같으면 담당자에게 문의해 주세요."
            actions={
              <Button nativeButton={false} render={<a href="mailto:support@iz-get.com" />}>
                문의하기
              </Button>
            }
          />
        )
      case 'INVITATION_ALREADY_ACCEPTED':
        // 재수강생 재활성화도 여기로 온다 — 그림은 같고 백엔드만 다르다(AU-02 §"재수강생")
        return (
          <AuthStatusCard
            variant="success"
            icon="✓"
            title="이미 활성화된 계정입니다"
            description="바로 로그인하면 돼요."
            aux="이전 기수에서 쓰던 계정이면 그대로 로그인하면 새 기수가 보입니다. 비밀번호가 기억나지 않으면 로그인 화면에서 재설정할 수 있어요."
            actions={<Button onClick={() => navigate('/shared/login')}>로그인</Button>}
          />
        )
      case 'INVITATION_NOT_IN_ROSTER':
        return (
          <AuthStatusCard
            variant="danger"
            icon="!"
            title="명단에 등록되지 않은 계정입니다"
            description="이 주소는 이번 기수 명단에서 찾지 못했어요."
            aux="다른 주소로 초대를 받았을 수 있어요. 담당 매니저에게 확인해 주세요."
            actions={
              <Button
                variant="ghost"
                nativeButton={false}
                render={<a href="mailto:support@iz-get.com" />}
              >
                문의하기
              </Button>
            }
          />
        )
      // 스펙에 없는 코드·네트워크 오류 — 화면이 흰 채로 남는 것이 가장 나쁘므로 폴백 카드를 둔다
      default:
        return (
          <AuthStatusCard
            variant="danger"
            icon="!"
            title={apiError?.isNetwork ? '서버에 연결하지 못했습니다' : '문제가 발생했어요'}
            description={
              apiError?.isNetwork
                ? '연결을 확인한 뒤 링크를 다시 열어 주세요.'
                : '잠시 후 링크를 다시 열어 주세요. 계속 같으면 담당자에게 문의해 주세요.'
            }
            actions={
              <Button
                variant="ghost"
                nativeButton={false}
                render={<a href="mailto:support@iz-get.com" />}
              >
                문의하기
              </Button>
            }
          />
        )
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-canvas">
      <div className="flex w-full bg-surface">
        <BrandPanel title={copy.brandTitle} description={copy.brandDesc} />

        <AuthForm title={copy.title} subtitle={copy.subtitle}>
          {verifying && <p className="text-[13px] text-fg-subtle">초대 링크를 확인하는 중…</p>}

          {/* 토큰 검증 실패 — 폼 대신 상태 카드로 화면 전체를 대체 */}
          {!verifying && !!verifyError && renderVerifyStatusCard(verifyError)}

          {/* 정상 토큰 → 변형별 폼 */}
          {!verifying && invite && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* 저장 실패 등 제출 단계 오류 — 폼은 유지, 인라인 알림 */}
              {submitAlert && (
                <Alert variant={submitAlert.variant}>
                  {submitAlert.message}
                  {submitAlert.action === 'RESEND' && (
                    <span className="ml-2">
                      {resendDone ? (
                        <span className="text-fg-subtle">초대 메일을 다시 보냈습니다.</span>
                      ) : (
                        <TextLink onClick={handleResend}>초대 메일 다시 받기</TextLink>
                      )}
                    </span>
                  )}
                  {submitAlert.action === 'LOGIN' && (
                    <span className="ml-2">
                      <TextLink to="/shared/login">로그인</TextLink>
                    </span>
                  )}
                  {submitAlert.action === 'CONTACT' && (
                    <span className="ml-2">
                      <a
                        href="mailto:support@iz-get.com"
                        className="text-[13px] font-medium text-primary underline-offset-2 hover:underline"
                      >
                        문의하기
                      </a>
                    </span>
                  )}
                </Alert>
              )}

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
                {/* 정책은 상시 노출, 제출 실패 시 미충족 기준만 danger로 (case6) */}
                {policyUnmet.length > 0 ? (
                  <FieldError>{policyUnmet.join(' · ')}</FieldError>
                ) : (
                  <FieldDescription>8자 이상 · 영문·숫자·특수문자 포함</FieldDescription>
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
                  {isSubmitting ? '계정을 만들고 있어요…' : copy.submit}
                </Button>
              </div>
            </form>
          )}
        </AuthForm>
      </div>
    </div>
  )
}
