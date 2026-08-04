import { useState, type ReactNode } from 'react'
import { TriangleAlertIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import {
  getPlatformSettings,
  getUnpricedModelsInUse,
  type ModelId,
  type ModelPricing,
  type TierMapping,
} from '../mockData'
import ModelChangeDialog from './ModelChangeDialog'
import TierModelDialog from './TierModelDialog'
import PricingDialog from './PricingDialog'

/*
  SA-03 §3 "모델 · 단가" 탭. 와이어 #page-model의 `.setrow`(채점 모델·캘리브레이션
  버전)는 SA-02 SettingsTab의 SettingRow와 같은 모양이라 그 패턴을 그대로 옮겼다
  (좌: 제목+설명, 우: 컨트롤, 구분선). 티어 매핑·단가는 표 형태라 OperatorsTab의
  bare Table 관례를 따른다.
*/

function SettingRow({
  title,
  description,
  badge,
  children,
}: {
  title: string
  description: string
  badge?: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border py-4 last:border-0">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-bold">
          {title}
          {badge && (
            <Badge variant="info" className="text-[10px]">
              {badge}
            </Badge>
          )}
        </p>
        <p className="text-fg-subtle mt-0.5 text-xs">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

type Snapshot = ReturnType<typeof getPlatformSettings>

export default function ModelPricingTab({
  snapshot,
  onChange,
}: {
  snapshot: Snapshot
  onChange: () => void
}) {
  const [modelChangeOpen, setModelChangeOpen] = useState(false)
  const [tierDialogTarget, setTierDialogTarget] = useState<TierMapping | null>(null)
  const [pricingDialogTarget, setPricingDialogTarget] = useState<ModelId | null>(null)

  const { gradingModel, tierMappings, pricing, orgCountSnapshot } = snapshot
  const unpriced = getUnpricedModelsInUse()
  const pricedModels = Object.keys(pricing) as ModelId[]
  // 단가 표에 보여줄 모델 — 이미 단가가 있는 것 + 지금 실제로 쓰이는데 아직 없는 것
  // (예: 채점 모델을 opus-6으로 바꾼 직후). 순서는 채점 모델·티어 매핑에 쓰이는
  // 순서를 앞에 두고 나머지를 뒤에 붙인다.
  const inUseOrder: ModelId[] = [gradingModel.model, ...tierMappings.map((t) => t.model)]
  const rowModels = [...new Set([...inUseOrder, ...pricedModels])]

  return (
    <div className="flex flex-col gap-4">
      {unpriced.length > 0 && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>
            <span className="font-mono">{unpriced.join(', ')}</span> 단가가 입력되지 않았습니다
          </AlertTitle>
          <AlertDescription>
            이 모델이 쓰인 만큼은 비용 화면에서 단가 미설정으로 표시되고 금액에 합산되지 않습니다.
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border border-border bg-surface px-4">
        <SettingRow
          title="채점 모델"
          description="기관이 바꿀 수 없다. 바뀌면 전 기관 재캘리브레이션이 필요합니다"
          badge="전 기관 공통"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs">{gradingModel.model}</span>
            <Button variant="ghost" size="sm" onClick={() => setModelChangeOpen(true)}>
              변경
            </Button>
          </div>
        </SettingRow>

        <SettingRow
          title="캘리브레이션 버전"
          description={`${gradingModel.appliedAt} 적용 · 이후 모든 채점 결과에 이 버전이 붙는다.`}
        >
          <span className="font-mono text-xs">{gradingModel.calibrationVersion}</span>
        </SettingRow>
      </div>

      <div>
        <p className="text-fg-subtle mb-2 text-xs font-semibold">
          티어 매핑 <span className="text-fg-subtle font-normal">· 질문 생성 · 요약</span>
        </p>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-32">티어</TableHead>
              <TableHead className="w-48">모델</TableHead>
              <TableHead>쓰이는 곳</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tierMappings.map((t) => (
              <TableRow key={t.tier}>
                <TableCell className="font-bold">{t.label}</TableCell>
                <TableCell className="font-mono text-xs">{t.model}</TableCell>
                <TableCell className="text-fg-muted text-xs">{t.usedFor}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => setTierDialogTarget(t)}
                    className="text-primary text-xs font-semibold hover:underline"
                  >
                    변경
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <p className="text-fg-subtle mb-0.5 text-xs font-semibold">
          단가 <span className="text-fg-subtle font-normal">· 100만 토큰당</span>
        </p>
        <p className="text-fg-subtle mb-2 text-xs">
          미설정으로 되돌리려면 입력·출력에 0을 입력하세요.
        </p>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-40">모델</TableHead>
              <TableHead className="w-28">입력</TableHead>
              <TableHead className="w-28">출력</TableHead>
              <TableHead className="w-28">적용일</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowModels.map((m) => {
              const row: ModelPricing | undefined = pricing[m]
              return (
                <TableRow key={m} className={!row ? 'bg-warning-soft' : undefined}>
                  <TableCell className="font-mono text-xs">{m}</TableCell>
                  <TableCell className="text-xs">
                    {row ? (
                      `$${row.inputUsdPerM.toFixed(2)}`
                    ) : (
                      <span className="text-warning font-semibold">미설정</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {row ? (
                      `$${row.outputUsdPerM.toFixed(2)}`
                    ) : (
                      <span className="text-warning font-semibold">미설정</span>
                    )}
                  </TableCell>
                  <TableCell className="text-fg-muted text-xs">{row?.appliedAt ?? '—'}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setPricingDialogTarget(m)}
                      className="text-primary text-xs font-semibold hover:underline"
                    >
                      {row ? '수정' : '입력'}
                    </button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ModelChangeDialog
        open={modelChangeOpen}
        onOpenChange={setModelChangeOpen}
        currentModel={gradingModel.model}
        orgCount={orgCountSnapshot}
        onChanged={onChange}
      />

      <TierModelDialog
        open={tierDialogTarget !== null}
        onOpenChange={(v) => !v && setTierDialogTarget(null)}
        tierMapping={tierDialogTarget}
        onChanged={onChange}
      />

      <PricingDialog
        open={pricingDialogTarget !== null}
        onOpenChange={(v) => !v && setPricingDialogTarget(null)}
        model={pricingDialogTarget}
        current={pricingDialogTarget ? pricing[pricingDialogTarget] : undefined}
        onChanged={onChange}
      />
    </div>
  )
}
