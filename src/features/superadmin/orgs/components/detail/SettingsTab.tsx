import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/Field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { cn } from '@/lib/utils/cn'
import { useFindOrganizationOperationSettings } from '@/api/usage/useUsageQueries'
import { useRestoreOrganization } from '@/api/organization/useOrganizationMutations'
import type { findOrganizationOperationSettings_Response } from '@/api/usage/usageTypes'
import type { findOrganization_Response } from '@/api/organization/organizationTypes'
import { isDeletionLocked, purgeDateOf } from '../../labels'
import SettingEditDialog, { type SettingsPatch } from './SettingEditDialog'
import DeleteOrgDialog from './DeleteOrgDialog'

/*
  SA-02 ④ 설정 — **항목별 모달**이다(SA-03 플랫폼 설정과 같은 구조).

  ## 왜 인라인 즉시저장이 아닌가
  목일 때는 컨트롤을 바꾸는 순간 그 필드만 저장했다. API는 그게 안 된다 —
  `organization_policy`가 **append-only 이력**이라 저장할 때마다 `policyVersion`이 오르고,
  스위치를 다섯 번 만지면 버전이 다섯 개 쌓인다. 모달은 **저장 한 번 = 버전 하나**다.

  그리고 모달은 취소가 있다. 즉시저장은 실수하면 되돌릴 방법이 없다.

  ## 모달이 자기 필드만 보낸다
  `PATCH` 부분 수정이라 가능하다(6차 요청 R1로 `PUT` 전체 치환에서 바뀌었다).
  전체를 되돌려 보내면 **그 사이 남이 다른 모달에서 바꾼 것을 옛 값으로 덮어쓴다.**

  ## `policyVersion`은 화면에 없다
  사용자가 만지는 값이 아니라 "이 설정이 몇 번째 판인가"다.
*/

type Org = findOrganization_Response
type Settings = findOrganizationOperationSettings_Response

const DISCLOSURE_ITEMS = { SUMMARY: '요약', PRIVATE: '비공개', FULL: '전체' } as const
const TIER_ITEMS = {
  ACCURACY_FIRST: '정확도 우선',
  BALANCED: '균형',
  COST_FIRST: '비용 우선',
} as const
/*
  보존기간은 서버가 `enum: [90, 180, 365]`로 준다(8차 §6에서 문자열 enum이 고쳐졌다).
  Select는 문자열만 다루므로 화면에서만 문자열로 쓰고, 보낼 때 이 표로 되돌린다 —
  `Number()`는 넓은 `number`를 내서 리터럴 유니온에 안 맞는다.
*/
const RETENTION_ITEMS = { '90': '90일', '180': '180일', '365': '365일' } as const
const RETENTION_DAYS = { '90': 90, '180': 180, '365': 365 } as const

/** 저장량 상한 선택지 — `null`이 무제한이다(스펙). 바이트로 보낸다 */
const STORAGE_ITEMS: { value: string; label: string; bytes: number | null }[] = [
  { value: 'unlimited', label: '무제한', bytes: null },
  { value: '100', label: '100 GB', bytes: 100 * 1024 ** 3 },
  { value: '500', label: '500 GB', bytes: 500 * 1024 ** 3 },
  { value: '1024', label: '1 TB', bytes: 1024 * 1024 ** 3 },
]

/** 토큰 한도 — 백만 단위로 고르고 원값으로 보낸다 */
const TOKEN_ITEMS: { value: string; label: string; tokens: number | null }[] = [
  { value: 'unlimited', label: '무제한', tokens: null },
  { value: '50', label: '50M', tokens: 50_000_000 },
  { value: '100', label: '100M', tokens: 100_000_000 },
  { value: '300', label: '300M', tokens: 300_000_000 },
]

const BUDGET_ITEMS = ['500', '1000', '3000', '5000'] as const

function SettingRow({
  title,
  description,
  children,
  danger,
}: {
  title: string
  description: ReactNode
  children: ReactNode
  danger?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-6 border-b border-border py-4 last:border-0',
        danger && 'border-danger-border',
      )}
    >
      <div>
        <p className={cn('text-sm font-bold', danger && 'text-danger')}>{title}</p>
        <p className="text-fg-subtle mt-0.5 text-xs">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function SettingsTab({ org }: { org: Org }) {
  const organizationId = org.organizationId
  const { data, isPending, isError, refetch } = useFindOrganizationOperationSettings({
    path: { organizationId },
  })
  const [open, setOpen] = useState<'limits' | 'data' | 'features' | 'tier' | 'status' | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const restore = useRestoreOrganization()
  const [restoreError, setRestoreError] = useState<string | null>(null)

  async function handleRestore() {
    setRestoreError(null)
    try {
      await restore.mutateAsync({ path: { organizationId } })
    } catch {
      setRestoreError('복구하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  if (isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>설정을 불러오지 못했습니다</EmptyTitle>
          <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
        </EmptyHeader>
        <Button variant="ghost" onClick={() => refetch()}>
          다시 시도
        </Button>
      </Empty>
    )
  }

  if (isPending) return <Skeleton className="h-96 w-full" />

  const s: Settings = data
  const purgeAt = purgeDateOf(org)
  const close = () => setOpen(null)

  /*
    운영 설정 모달들은 초안을 `s.organizationStatus`(이 API 필드) 등으로 채운다 — 이 필드는
    삭제 대기 여부를 모른다(ACTIVE/SUSPENDED 2값뿐). 그래서 삭제 대기 중에 "기관 상태" 모달을
    열어 저장하면 화면은 안 막고 서버가 저장 시점에야 거부해 범용 에러만 떴다(K2). 헤더 배지가
    쓰는 `org.status`로 여기서 한 번만 판정해 5개 변경 버튼 전부에 재사용한다 — "기관 삭제"
    버튼도 같은 조건을 이미 쓰고 있었다.
  */
  const settingsLocked = isDeletionLocked(org.status)
  const lockedTitle = settingsLocked
    ? '삭제 대기 상태인 기관은 설정을 변경할 수 없습니다.'
    : undefined
  // labels.ts의 orgStatusBadge가 DELETION_PENDING·DELETED를 이미 같은 "삭제 대기"
  // 배지로 합쳤다(D31) — 여기 문구도 상태별로 가르지 않고 그 표시에 맞춘다.
  const deleteLockedTitle = settingsLocked ? '이미 삭제 대기 중입니다.' : undefined

  return (
    <div className="flex flex-col gap-4">
      {settingsLocked && (
        <Alert variant="danger">
          <AlertTitle>삭제 대기 중입니다</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <span>
                {purgeAt ? `${purgeAt}에 파기됩니다.` : '보존기간이 지나면 파기됩니다.'} 그전까지는
                복구할 수 있습니다.
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={restore.isPending}
                onClick={() => void handleRestore()}
              >
                복구
              </Button>
            </div>
            {restoreError && <p className="font-semibold">{restoreError}</p>}
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border border-border bg-surface px-4">
        <SettingRow
          title="기관 상태"
          description="정지하면 소속 계정의 로그인이 막힙니다. 데이터는 보존됩니다"
        >
          <ChangeButton
            value={s.organizationStatus === 'ACTIVE' ? '활성' : '정지'}
            onClick={() => setOpen('status')}
            disabled={settingsLocked}
            title={lockedTitle}
          />
        </SettingRow>

        <SettingRow
          title="한도 · 예산"
          description="넘어도 서비스가 멈추지는 않습니다. 토큰·저장량 한도는 새 세션을 막습니다"
        >
          <ChangeButton
            value={`예산 ${s.monthlyAiBudget.toLocaleString()} ${s.currencyCode}`}
            onClick={() => setOpen('limits')}
            disabled={settingsLocked}
            title={lockedTitle}
          />
        </SettingRow>

        <SettingRow
          title="데이터 정책"
          description="종료 기수의 코드·문답 원문·채점 근거 보관 기간과 신규 기수 공개 범위"
        >
          <ChangeButton
            value={`${s.dataRetentionDays}일 · ${DISCLOSURE_ITEMS[s.defaultDisclosureScope] ?? s.defaultDisclosureScope}`}
            onClick={() => setOpen('data')}
            disabled={settingsLocked}
            title={lockedTitle}
          />
        </SettingRow>

        <SettingRow title="기능 허용" description="이 기관에서 쓸 수 있는 기능을 켜고 끕니다">
          <ChangeButton
            value={`${countEnabled(s)}/4 사용`}
            onClick={() => setOpen('features')}
            disabled={settingsLocked}
            title={lockedTitle}
          />
        </SettingRow>

        <SettingRow title="코드 세션 AI 등급" description="정확도를 높일수록 비용이 오릅니다">
          <ChangeButton
            value={TIER_ITEMS[s.codeSessionTierCode] ?? s.codeSessionTierCode}
            onClick={() => setOpen('tier')}
            disabled={settingsLocked}
            title={lockedTitle}
          />
        </SettingRow>

        <SettingRow title="기관 삭제" description="보존기간이 지난 뒤 파기됩니다" danger>
          <Button
            variant="ghost"
            className="text-danger border-danger-border"
            disabled={settingsLocked}
            title={deleteLockedTitle}
            onClick={() => setDeleteOpen(true)}
          >
            기관 삭제
          </Button>
        </SettingRow>
      </div>

      {/* ── 모달 ─────────────────────────────────────────────────────────── */}

      <SettingEditDialog
        open={open === 'status'}
        onOpenChange={close}
        organizationId={organizationId}
        title="기관 상태"
        description="정지하면 소속 계정이 로그인할 수 없습니다. 데이터는 그대로 보존됩니다."
        initial={{ status: s.organizationStatus }}
        toPatch={(d, i) => (d.status === i.status ? {} : { organizationStatus: d.status })}
      >
        {(d, set) => (
          <PickerField
            label="상태"
            value={d.status}
            items={{ ACTIVE: '활성', SUSPENDED: '정지' }}
            onChange={(v) => set({ status: v as typeof d.status })}
          />
        )}
      </SettingEditDialog>

      <SettingEditDialog
        open={open === 'limits'}
        onOpenChange={close}
        organizationId={organizationId}
        title="한도 · 예산"
        initial={{
          budget: String(Math.round(s.monthlyAiBudget)),
          token: tokenKeyOf(s.monthlyTokenLimit),
          storage: storageKeyOf(s.storageLimitBytes),
        }}
        toPatch={(d, i) => {
          const patch: SettingsPatch = {}
          if (d.budget !== i.budget) patch.monthlyAiBudget = Number(d.budget)
          // null은 "무제한으로 푼다"는 뜻이라 바뀌었을 때만 보낸다(안 보내면 유지)
          if (d.token !== i.token)
            patch.monthlyTokenLimit = TOKEN_ITEMS.find((t) => t.value === d.token)?.tokens ?? null
          if (d.storage !== i.storage)
            patch.storageLimitBytes =
              STORAGE_ITEMS.find((t) => t.value === d.storage)?.bytes ?? null
          return patch
        }}
      >
        {(d, set) => (
          <>
            <PickerField
              label={`AI 월 예산 상한 (${s.currencyCode})`}
              description="넘으면 경고 배지가 붙습니다. 서비스는 중단되지 않습니다"
              value={d.budget}
              items={Object.fromEntries(BUDGET_ITEMS.map((v) => [v, Number(v).toLocaleString()]))}
              onChange={(v) => set({ budget: v })}
            />
            <PickerField
              label="월 토큰 한도"
              description="넘으면 새 세션이 열리지 않습니다"
              value={d.token}
              items={Object.fromEntries(TOKEN_ITEMS.map((t) => [t.value, t.label]))}
              onChange={(v) => set({ token: v })}
            />
            <PickerField
              label="저장량 상한"
              value={d.storage}
              items={Object.fromEntries(STORAGE_ITEMS.map((t) => [t.value, t.label]))}
              onChange={(v) => set({ storage: v })}
            />
          </>
        )}
      </SettingEditDialog>

      <SettingEditDialog
        open={open === 'data'}
        onOpenChange={close}
        organizationId={organizationId}
        title="데이터 정책"
        initial={{
          retention: String(s.dataRetentionDays) as keyof typeof RETENTION_DAYS,
          scope: s.defaultDisclosureScope,
        }}
        toPatch={(d, i) => {
          const patch: SettingsPatch = {}
          if (d.retention !== i.retention) patch.dataRetentionDays = RETENTION_DAYS[d.retention]
          if (d.scope !== i.scope) patch.defaultDisclosureScope = d.scope
          return patch
        }}
      >
        {(d, set) => (
          <>
            <PickerField
              label="데이터 보존기간"
              description="종료 기수의 코드·문답 원문·채점 근거를 이 기간만큼 보관합니다"
              value={d.retention}
              items={RETENTION_ITEMS}
              onChange={(v) => set({ retention: v as typeof d.retention })}
            />
            <PickerField
              label="신규 기수 공개 범위 기본값"
              value={d.scope}
              items={DISCLOSURE_ITEMS}
              onChange={(v) => set({ scope: v as typeof d.scope })}
            />
          </>
        )}
      </SettingEditDialog>

      <SettingEditDialog
        open={open === 'features'}
        onOpenChange={close}
        organizationId={organizationId}
        title="기능 허용"
        initial={{
          allowManagerInvite: s.allowManagerInvite,
          allowDataExport: s.allowDataExport,
          allowZipSubmission: s.allowZipSubmission,
          allowGithubIntegration: s.allowGithubIntegration,
        }}
        toPatch={(d, i) => {
          const patch: SettingsPatch = {}
          for (const key of Object.keys(d) as (keyof typeof d)[]) {
            if (d[key] !== i[key]) patch[key] = d[key]
          }
          return patch
        }}
      >
        {(d, set) => (
          <>
            <SwitchField
              label="매니저 초대"
              description="기관 안에서 새 매니저를 초대·재발송할 수 있습니다"
              checked={d.allowManagerInvite}
              onChange={(v) => set({ allowManagerInvite: v })}
            />
            <SwitchField
              label="데이터 내보내기"
              description="리포트·명단을 파일로 내려받을 수 있습니다"
              checked={d.allowDataExport}
              onChange={(v) => set({ allowDataExport: v })}
            />
            <SwitchField
              label="ZIP 코드 제출"
              description="끄면 GitHub 연동으로만 제출합니다"
              checked={d.allowZipSubmission}
              onChange={(v) => set({ allowZipSubmission: v })}
            />
            <SwitchField
              label="GitHub 조직 연동"
              description="연동 허용 여부입니다. 실제 연결·해제는 별도 흐름입니다"
              checked={d.allowGithubIntegration}
              onChange={(v) => set({ allowGithubIntegration: v })}
            />
          </>
        )}
      </SettingEditDialog>

      <SettingEditDialog
        open={open === 'tier'}
        onOpenChange={close}
        organizationId={organizationId}
        title="코드 세션 AI 등급"
        description="정확도를 높일수록 호출 비용이 오릅니다."
        initial={{ tier: s.codeSessionTierCode }}
        toPatch={(d, i) => (d.tier === i.tier ? {} : { codeSessionTierCode: d.tier })}
      >
        {(d, set) => (
          <PickerField
            label="등급"
            value={d.tier}
            items={TIER_ITEMS}
            onChange={(v) => set({ tier: v as typeof d.tier })}
          />
        )}
      </SettingEditDialog>

      <DeleteOrgDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        org={org}
        retentionDays={s.dataRetentionDays}
      />
    </div>
  )
}

function ChangeButton({
  value,
  onClick,
  disabled,
  title,
}: {
  value: string
  onClick: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-fg-muted text-sm font-medium tabular-nums">{value}</span>
      <Button variant="ghost" size="sm" disabled={disabled} title={title} onClick={onClick}>
        변경
      </Button>
    </div>
  )
}

function PickerField({
  label,
  description,
  value,
  items,
  onChange,
}: {
  label: string
  description?: string
  value: string
  items: Record<string, string>
  onChange: (value: string) => void
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={(v) => onChange(v ?? value)} items={items}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  )
}

function SwitchField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-fg-subtle mt-0.5 text-xs">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}

const countEnabled = (s: Settings) =>
  [s.allowManagerInvite, s.allowDataExport, s.allowZipSubmission, s.allowGithubIntegration].filter(
    Boolean,
  ).length

/** 서버가 준 값이 선택지에 없으면 무제한이 아니라 **모르는 값**이다 — 그대로 두면 저장 시 덮인다 */
const tokenKeyOf = (tokens: number | null) =>
  tokens == null
    ? 'unlimited'
    : (TOKEN_ITEMS.find((t) => t.tokens === tokens)?.value ?? 'unlimited')

const storageKeyOf = (bytes: number | null) =>
  bytes == null ? 'unlimited' : (STORAGE_ITEMS.find((t) => t.bytes === bytes)?.value ?? 'unlimited')
