import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  cancelOrgDeletion,
  updateOrgSettings,
  updateOrgStatus,
  type Org,
  type OrgDetail,
  type VisibilityDefault,
} from '../../mockData'
import DeleteOrgDialog from './DeleteOrgDialog'

/*
  SA-02 §3 "설정 탭" — 계약 한도 · 기능 토글 · 테넌트 정책. 각 행은 즉시 반영되는
  단일 컨트롤이라(폼 제출 없음, 와이어프레임에 저장 버튼이 없다) 바꾸는 즉시
  updateOrgSettings/updateOrgStatus를 부르고 onChange()로 화면을 새로 읽어온다.

  토글 3개의 기본 on/off는 와이어(`.tgl` vs `.tgl off`)를 그대로 읽었다 — GitHub
  조직 연동·ZIP 업로드는 기본 on, 빅프 기여도 분석만 명시적으로 off였다.
*/

const BUDGET_OPTIONS = [200, 300, 400, 600, 800, 1000] as const
const TOKEN_LIMIT_OPTIONS = [50, 80, 100, 150, 200, 300] as const
const RETENTION_OPTIONS = [90, 180, 365] as const
const VISIBILITY_OPTIONS: VisibilityDefault[] = ['요약', '상세']

function itemsOf<T extends string | number>(values: readonly T[], format: (v: T) => string) {
  return Object.fromEntries(values.map((v) => [String(v), format(v)]))
}

function SettingRow({
  title,
  description,
  children,
  danger,
}: {
  title: string
  description: string
  children: ReactNode
  danger?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border py-4 last:border-0">
      <div>
        <p className={danger ? 'text-danger text-sm font-bold' : 'text-sm font-bold'}>{title}</p>
        <p className="text-fg-subtle mt-0.5 text-xs">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function SettingsTab({
  org,
  detail,
  onChange,
}: {
  org: Org
  detail: OrgDetail
  onChange: () => void
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const s = detail.settings

  function patch<K extends keyof typeof s>(key: K, value: (typeof s)[K]) {
    updateOrgSettings(org.id, { [key]: value })
    onChange()
  }

  return (
    <div className="flex flex-col gap-4">
      {org.deletion && (
        <Alert variant="danger">
          <AlertTitle>삭제 대기 중입니다</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{org.deletion.purgeAt}에 파기됩니다. 그전까지는 복구할 수 있습니다.</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                cancelOrgDeletion(org.id)
                onChange()
              }}
            >
              복구
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border border-border bg-surface px-4">
        <SettingRow
          title="기관 상태"
          description="정지하면 소속 계정의 로그인이 막힙니다. 데이터는 보존됩니다"
        >
          <Select
            value={org.status}
            onValueChange={(v) => {
              updateOrgStatus(org.id, (v as Org['status']) ?? org.status)
              onChange()
            }}
            items={{ ACTIVE: '활성', SUSPENDED: '정지' }}
          >
            <SelectTrigger className="w-28" aria-label="기관 상태">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">활성</SelectItem>
              <SelectItem value="SUSPENDED">정지</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow
          title="AI 월 예산 상한"
          description="넘으면 경고가 표시됩니다. 서비스는 중단되지 않습니다"
        >
          <Select
            value={String(s.budgetUsd)}
            onValueChange={(v) => patch('budgetUsd', Number(v ?? s.budgetUsd))}
            items={itemsOf(BUDGET_OPTIONS, (v) => `$${v}`)}
          >
            <SelectTrigger className="w-28" aria-label="AI 월 예산 상한">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUDGET_OPTIONS.map((v) => (
                <SelectItem key={v} value={String(v)}>
                  ${v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow title="기관 · 월 토큰 한도" description="넘으면 새 세션이 열리지 않습니다">
          <Select
            value={String(s.tokenLimitM)}
            onValueChange={(v) => patch('tokenLimitM', Number(v ?? s.tokenLimitM))}
            items={itemsOf(TOKEN_LIMIT_OPTIONS, (v) => `${v}M`)}
          >
            <SelectTrigger className="w-28" aria-label="기관 · 월 토큰 한도">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOKEN_LIMIT_OPTIONS.map((v) => (
                <SelectItem key={v} value={String(v)}>
                  {v}M
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow title="데이터 보존기간" description="종료 기수 데이터 보관 기간">
          <Select
            value={String(s.retentionDays)}
            onValueChange={(v) => patch('retentionDays', Number(v ?? s.retentionDays))}
            items={itemsOf(RETENTION_OPTIONS, (v) => `${v}일`)}
          >
            <SelectTrigger className="w-28" aria-label="데이터 보존기간">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_OPTIONS.map((v) => (
                <SelectItem key={v} value={String(v)}>
                  {v}일
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow
          title="신규 기수 공개 범위 기본값"
          description="교육생에게 결과를 어디까지 공개할지의 기본값"
        >
          <Select
            value={s.defaultVisibility}
            onValueChange={(v) =>
              patch('defaultVisibility', (v as VisibilityDefault) ?? s.defaultVisibility)
            }
            items={itemsOf(VISIBILITY_OPTIONS, (v) => v)}
          >
            <SelectTrigger className="w-28" aria-label="신규 기수 공개 범위 기본값">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISIBILITY_OPTIONS.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow title="GitHub 조직 연동" description="기관 저장소를 한 번에 연동합니다">
          <Switch
            checked={s.githubOrgSync}
            onCheckedChange={(checked) => patch('githubOrgSync', checked)}
            aria-label="GitHub 조직 연동"
          />
        </SettingRow>

        <SettingRow
          title="ZIP 업로드"
          description="조직 밖 저장소를 내는 경로. 끄면 GitHub 연동만 남는다."
        >
          <Switch
            checked={s.zipUpload}
            onCheckedChange={(checked) => patch('zipUpload', checked)}
            aria-label="ZIP 업로드"
          />
        </SettingRow>

        <SettingRow title="빅프 기여도 분석" description="커밋 기준 기여도">
          <Switch
            checked={s.contributionAnalysis}
            onCheckedChange={(checked) => patch('contributionAnalysis', checked)}
            aria-label="빅프 기여도 분석"
          />
        </SettingRow>

        <SettingRow title="기관 삭제" description="보존기간이 지난 뒤 파기됩니다" danger>
          <Button
            variant="ghost"
            className="text-danger border-danger-border"
            disabled={Boolean(org.deletion)}
            onClick={() => setDeleteOpen(true)}
          >
            기관 삭제
          </Button>
        </SettingRow>
      </div>

      <DeleteOrgDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        org={org}
        retentionDays={s.retentionDays}
        onDeleted={onChange}
      />
    </div>
  )
}
