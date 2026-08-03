import { useEffect, useState } from 'react'
import { CheckIcon, XIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { checkOrgName, createOrg, type Org, type OrgApiErrorCode } from '../mockData'

/*
  SA-01 §3 "생성 모달" · 케이스 1(중복 기관명, 제출 전 차단) · 케이스 3(생성 실패 롤백).

  기관명은 react-hook-form의 제출 시점 검증이 아니라 **입력 중 실시간**으로 서버에
  물어야 해서(정의서 "실시간 중복 확인" · 목업 #dupname) 이 필드만 직접 상태로
  관리하고 디바운스한다 — 폼 전체를 RHF로 감싸는 이득보다, RHF의 onChange 모드가
  키 입력마다 재검증을 트리거해 디바운스와 부딪히는 손실이 더 크다(필드 3개짜리
  작은 폼이라 분리 비용도 작다).

  실패해도 입력값을 지우지 않는다(케이스3 "아무것도 만들어지지 않았고 입력한 내용은
  그대로") — 그래서 실패 시 dialog를 닫지 않고 submitError만 세팅한다.
*/

const RETENTION_OPTIONS = [90, 180, 365] as const
const RETENTION_ITEMS = Object.fromEntries(RETENTION_OPTIONS.map((d) => [String(d), `${d}일`]))

const SUBMIT_ERROR_MESSAGE: Record<OrgApiErrorCode, string> = {
  ORG_NAME_TAKEN: '이미 있는 기관명입니다.',
  ORG_CREATE_FAILED: '기관을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.',
}

type NameCheckState = 'idle' | 'checking' | 'available' | 'taken'

export default function OrgCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (org: Org) => void
}) {
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [retentionDays, setRetentionDays] = useState<number>(180)
  const [nameCheck, setNameCheck] = useState<NameCheckState>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<OrgApiErrorCode | null>(null)

  // 열릴 때만 초기화한다 — 실패 후에도 dialog가 열려 있는 동안엔 입력값을 유지해야 한다.
  useEffect(() => {
    if (open) {
      setName('')
      setDomain('')
      setRetentionDays(180)
      setNameCheck('idle')
      setSubmitError(null)
    }
  }, [open])

  // 입력 중 실시간 중복 확인 — 디바운스 400ms(mockData.checkOrgName의 지연과 맞춤)
  useEffect(() => {
    const trimmed = name.trim()
    if (!trimmed) {
      setNameCheck('idle')
      return
    }
    setNameCheck('checking')
    let cancelled = false
    const timer = setTimeout(() => {
      checkOrgName(trimmed).then(({ available }) => {
        if (!cancelled) setNameCheck(available ? 'available' : 'taken')
      })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [name])

  const canSubmit =
    name.trim().length > 0 &&
    domain.trim().length > 0 &&
    nameCheck !== 'taken' &&
    nameCheck !== 'checking' &&
    !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const org = await createOrg({ name: name.trim(), domain: domain.trim(), retentionDays })
      onCreated(org)
      onOpenChange(false)
    } catch (err) {
      setSubmitError((err as { code: OrgApiErrorCode }).code)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>기관 생성</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {submitError && <Alert variant="danger">{SUBMIT_ERROR_MESSAGE[submitError]}</Alert>}

          <Field data-invalid={nameCheck === 'taken'}>
            <FieldLabel htmlFor="org-name">기관명</FieldLabel>
            <div className="relative">
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="기관명을 입력하세요"
                disabled={submitting}
                aria-invalid={nameCheck === 'taken'}
                autoComplete="off"
                className="pr-9"
              />
              {nameCheck === 'available' && (
                <CheckIcon
                  aria-hidden="true"
                  className="text-success absolute top-1/2 right-3 size-4 -translate-y-1/2"
                />
              )}
              {nameCheck === 'taken' && (
                <XIcon
                  aria-hidden="true"
                  className="text-danger absolute top-1/2 right-3 size-4 -translate-y-1/2"
                />
              )}
            </div>
            {nameCheck === 'taken' ? (
              <p className="text-danger text-xs font-medium">이미 있는 기관명입니다</p>
            ) : nameCheck === 'available' ? (
              <p className="text-success text-xs font-medium">사용 가능한 이름입니다</p>
            ) : nameCheck === 'checking' ? (
              <p className="text-fg-subtle text-xs">확인하는 중…</p>
            ) : (
              <FieldDescription>다른 기관과 겹치지 않는 이름이어야 합니다</FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="org-domain">도메인</FieldLabel>
            <Input
              id="org-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.ac.kr"
              disabled={submitting}
              autoComplete="off"
            />
            <FieldDescription>이 도메인 주소로만 초대할 수 있습니다</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="org-retention">데이터 보존기간</FieldLabel>
            <Select
              value={String(retentionDays)}
              onValueChange={(v) => setRetentionDays(Number(v ?? retentionDays))}
              disabled={submitting}
              items={RETENTION_ITEMS}
            >
              <SelectTrigger id="org-retention" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETENTION_OPTIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d}일
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>종료 기수 데이터 보관 기간</FieldDescription>
          </Field>

          <DialogFooter className="-mx-4 -mb-4 mt-0">
            <Button
              type="button"
              variant="ghost"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? '만드는 중…' : '기관 생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
