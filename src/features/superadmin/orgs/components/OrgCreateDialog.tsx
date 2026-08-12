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
import { useCreateOrganization } from '@/api/organization/useOrganizationMutations'
import { checkNameAvailability } from '@/api/organization/organizationApi'
import type {
  createOrganization_Body,
  createOrganization_Response,
} from '@/api/organization/organizationTypes'
import { isApiError, isGenericCode } from '@/api/_contract'

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

/*
  서버가 내는 코드 → 화면 문구. **문구는 프론트가 정한다** — 서버 `message`는 "사람이 읽는
  기본 문구라 바뀔 수 있다"고 스펙에 적혀 있다.

  모르는 코드는 폴백으로 간다. 스펙에 없는 코드가 올 수 있고(스펙이 늘 최신은 아니다),
  일반 코드(`CONFLICT` 등)는 상태만 말할 뿐 원인을 못 가른다.
*/
const SUBMIT_ERROR_MESSAGE: Record<string, string> = {
  ORG_NAME_TAKEN: '이미 있는 기관명입니다.',
  ORG_IDEMPOTENCY_CONFLICT: '같은 요청이 이미 처리 중입니다. 잠시 후 확인해 주세요.',
}
const SUBMIT_ERROR_FALLBACK = '기관을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.'

/*
  ⚠️ 스펙 오류 우회 — `dataRetentionDays`가 `type: integer`인데 `enum`이 **문자열**
  `["90","180","365"]`로 적혀 있어(같은 스키마의 `example`은 숫자 `180`) 생성 타입이
  `'90' | '180' | '365'`가 됐다. **보내야 하는 것은 숫자다.**

  백엔드에 수정 요청해 뒀고(`UpdateOperationSettingRequest`도 같은 상태다),
  스펙이 고쳐지면 **이 함수만 지우면 된다.** 캐스트를 호출부에 흩지 않으려고 한 곳에 모은다.
*/
const asRetentionDays = (days: number) =>
  days as unknown as createOrganization_Body['dataRetentionDays']

function submitErrorMessage(error: unknown): string {
  if (!isApiError(error)) return SUBMIT_ERROR_FALLBACK
  if (!isGenericCode(error.code) && SUBMIT_ERROR_MESSAGE[error.code]) {
    return SUBMIT_ERROR_MESSAGE[error.code]
  }
  return SUBMIT_ERROR_FALLBACK
}

type NameCheckState = 'idle' | 'checking' | 'available' | 'taken' | 'unknown'

export default function OrgCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (org: createOrganization_Response) => void
}) {
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [retentionDays, setRetentionDays] = useState<number>(180)
  const [nameCheck, setNameCheck] = useState<NameCheckState>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)

  /*
    생성이 성공하면 **이 도메인의 조회가 전부 무효화된다**(생성 훅 기본 동작).
    목록·상단 집계가 같은 `organization` 접두어라 둘 다 다시 읽힌다 — 화면이 따로
    갱신을 부르지 않는 이유다.
  */
  const create = useCreateOrganization()

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

  // 입력 중 실시간 중복 확인 — 디바운스 400ms. 한 글자마다 서버에 묻지 않는다
  useEffect(() => {
    const trimmed = name.trim()
    if (!trimmed) {
      setNameCheck('idle')
      return
    }
    setNameCheck('checking')
    let cancelled = false
    const timer = setTimeout(() => {
      checkNameAvailability({ query: { name: trimmed } })
        .then(({ available }) => {
          if (!cancelled) setNameCheck(available ? 'available' : 'taken')
        })
        // 중복 확인 실패는 막지 않는다 — 최종 판정은 생성 요청이 한다(409)
        // 'idle'로 되돌리면 "아직 안 물어봄"과 "물어봤는데 실패함"이 같은 값이 된다 —
        // 사용자가 구분할 방법이 없어(F5) 따로 상태를 둔다
        .catch(() => {
          if (!cancelled) setNameCheck('unknown')
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
    !create.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitError(null)
    try {
      const org = await create.mutateAsync({
        body: {
          name: name.trim(),
          // 빈 값은 안 보낸다 — 서버가 "비우면 도메인 제한 없음"으로 읽는다
          emailDomain: domain.trim() || null,
          dataRetentionDays: asRetentionDays(retentionDays),
        },
      })
      onCreated(org)
      onOpenChange(false)
    } catch (err) {
      setSubmitError(submitErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>기관 생성</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {submitError && <Alert variant="danger">{submitError}</Alert>}

          <Field data-invalid={nameCheck === 'taken'}>
            <FieldLabel htmlFor="org-name">기관명</FieldLabel>
            <div className="relative">
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="기관명을 입력하세요"
                disabled={create.isPending}
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
            ) : nameCheck === 'unknown' ? (
              <p className="text-fg-subtle text-xs">
                중복 확인에 실패했습니다. 제출 시 다시 확인합니다.
              </p>
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
              disabled={create.isPending}
              autoComplete="off"
            />
            <FieldDescription>이 도메인 주소로만 초대할 수 있습니다</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="org-retention">데이터 보존기간</FieldLabel>
            <Select
              value={String(retentionDays)}
              onValueChange={(v) => setRetentionDays(Number(v ?? retentionDays))}
              disabled={create.isPending}
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
              disabled={create.isPending}
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {create.isPending ? '만드는 중…' : '기관 생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
