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
import type { findModelSettings_Response } from '@/api/platform/platformTypes'
import {
  calibrationStatus,
  TIER_DESCRIPTION,
  TIER_LABEL,
  TIER_ORDER,
  calibrationProgressText,
  formatDate,
  formatDateTime,
  formatPrice,
} from '../labels'
import ModelChangeDialog from './ModelChangeDialog'
import TierModelDialog from './TierModelDialog'
import PricingDialog from './PricingDialog'

/*
  SA-03 §3 "모델 · 단가" 탭.

  **모델 목록을 화면이 갖지 않는다.** `modelPricings`가 곧 모델 목록이다(단가 미설정 모델도
  포함되고 `status`로 사용 가능 여부가 온다). 예전에는 `AVAILABLE_MODELS` 상수를 들고
  있었는데, 그러면 백엔드가 모델을 추가해도 화면이 모른다.

  **모델을 UUID로 다루고 이름으로 보여준다.** 서버가 `modelId`(UUID)·`modelDisplayName`·
  `modelCode`를 함께 주므로 화면이 매핑을 만들 이유가 없다.
*/

type Settings = findModelSettings_Response
type Pricing = Settings['modelPricings'][number]
type TierMapping = Settings['tierMappings'][number]

function SettingRow({
  title,
  description,
  badge,
  children,
}: {
  title: string
  description: ReactNode
  badge?: string
  children: ReactNode
}) {
  return (
    <div className="border-border flex items-center justify-between gap-6 border-b py-4 last:border-0">
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

export default function ModelPricingTab({ settings }: { settings: Settings }) {
  const [modelChangeOpen, setModelChangeOpen] = useState(false)
  const [tierTarget, setTierTarget] = useState<TierMapping | null>(null)
  const [pricingTarget, setPricingTarget] = useState<Pricing | null>(null)

  const { gradingPolicy, tierMappings, modelPricings } = settings
  const { activeCalibration, runningCalibration } = gradingPolicy

  const unpriced = modelPricings.filter((p) => p.pricingMissing)
  /*
    서버 응답 순서에 기대지 않는다 — 정확도 → 균형 → 비용으로 고정한다.
    **3개 미만으로 와도 조용히 숨기지 않는다** — 티어 자리 자체는 항상 그리고,
    매핑이 없는 티어만 "매핑 없음"으로 표시한다(렌더 확인: 예전엔 `.filter(Boolean)`으로
    빠진 티어가 통째로 사라져 3개가 있어야 하는지조차 알 수 없었다).
  */
  const orderedTiers = TIER_ORDER.map((code) => ({
    tierCode: code,
    mapping: tierMappings.find((t) => t.tierCode === code) ?? null,
  }))

  /*
    재캘리브레이션이 도는 중에는 채점 모델을 또 바꾸지 못하게 막는다.
    전 기관 대상이고 되돌릴 수 없는 작업이라, 겹치면 어느 기준으로 채점됐는지 알 수 없어진다.
  */
  const recalibrating = runningCalibration != null

  return (
    <div className="flex flex-col gap-4">
      {unpriced.length > 0 && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>
            <span className="font-mono">{unpriced.map((p) => p.modelDisplayName).join(', ')}</span>{' '}
            단가가 입력되지 않았습니다
          </AlertTitle>
          <AlertDescription>
            이 모델이 쓰인 만큼은 비용 화면에서 단가 미설정으로 표시되고 금액에 합산되지 않습니다.
          </AlertDescription>
        </Alert>
      )}

      {recalibrating && runningCalibration && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>
            전 기관 재캘리브레이션 {calibrationStatus(runningCalibration.status).label} ·{' '}
            <span className="font-mono">{runningCalibration.versionCode}</span>
          </AlertTitle>
          <AlertDescription>
            {[
              calibrationProgressText(runningCalibration.progress),
              '끝날 때까지 채점 모델을 다시 바꿀 수 없습니다.',
            ]
              .filter(Boolean)
              .join(' · ')}
          </AlertDescription>
        </Alert>
      )}

      <div className="border-border bg-surface rounded-md border px-4">
        <SettingRow
          title="채점 모델"
          description="기관이 바꿀 수 없습니다. 바뀌면 전 기관 재캘리브레이션이 필요합니다"
          badge="전 기관 공통"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold">{gradingPolicy.modelDisplayName}</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={recalibrating}
              onClick={() => setModelChangeOpen(true)}
            >
              변경
            </Button>
          </div>
        </SettingRow>

        <SettingRow
          title="캘리브레이션 버전"
          description={
            activeCalibration
              ? `${formatDate(gradingPolicy.effectiveFrom)} 적용 · 이후 모든 채점 결과에 이 버전이 붙습니다`
              : '아직 적용된 버전이 없습니다'
          }
        >
          {activeCalibration ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">{activeCalibration.versionCode}</span>
              <Badge variant={calibrationStatus(activeCalibration.status).variant}>
                {calibrationStatus(activeCalibration.status).label}
              </Badge>
              {/*
                일부 기관이 실패한 채로 ACTIVE가 될 수 있다 — 그 기관들은 옛 기준으로 채점된다.
                완료율만 보면 "거의 다 됐다"로 읽히므로 실패 건수를 같이 쓴다.
              */}
              {(activeCalibration.progress?.failed ?? 0) > 0 && (
                <span className="text-warning text-xs font-semibold">
                  {calibrationProgressText(activeCalibration.progress)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-fg-subtle text-xs">—</span>
          )}
        </SettingRow>
      </div>

      <div>
        <p className="text-fg-subtle mb-2 text-xs font-semibold">
          티어 매핑 <span className="text-fg-subtle font-normal">· 코드 세션</span>
        </p>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-32">티어</TableHead>
              <TableHead className="w-56">모델</TableHead>
              <TableHead>쓰이는 곳</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderedTiers.map(({ tierCode, mapping }) => (
              <TableRow key={tierCode}>
                <TableCell className="font-bold">{TIER_LABEL[tierCode]}</TableCell>
                <TableCell className="text-xs">
                  {mapping ? (
                    mapping.modelDisplayName
                  ) : (
                    <span className="text-warning font-semibold">매핑 없음</span>
                  )}
                </TableCell>
                <TableCell className="text-fg-muted text-xs">
                  {TIER_DESCRIPTION[tierCode]}
                </TableCell>
                <TableCell>
                  {mapping && (
                    <button
                      type="button"
                      onClick={() => setTierTarget(mapping)}
                      className="text-primary text-xs font-semibold hover:underline"
                    >
                      변경
                    </button>
                  )}
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
          비워 두면 단가 미설정이 됩니다 — <b>0은 &quot;무료&quot;를 뜻하므로 다릅니다.</b>
        </p>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-52">모델</TableHead>
              <TableHead className="w-24">입력</TableHead>
              <TableHead className="w-24">출력</TableHead>
              <TableHead className="w-24">캐시 입력</TableHead>
              <TableHead className="w-36">최종 수정</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {modelPricings.map((p) => (
              <TableRow
                key={p.modelId}
                className={p.pricingMissing ? 'bg-warning-soft' : undefined}
              >
                <TableCell className="text-xs">
                  <span className="flex items-center gap-1.5">
                    {p.modelDisplayName}
                    {p.status !== 'ACTIVE' && (
                      <Badge variant="neutral" className="text-[10px]">
                        중지
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-xs tabular-nums">
                  {p.pricingMissing ? (
                    <span className="text-warning font-semibold">미설정</span>
                  ) : (
                    formatPrice(p.inputPricePerMillionTokens)
                  )}
                </TableCell>
                <TableCell className="text-xs tabular-nums">
                  {formatPrice(p.outputPricePerMillionTokens)}
                </TableCell>
                <TableCell className="text-xs tabular-nums">
                  {formatPrice(p.cachedInputPricePerMillionTokens)}
                </TableCell>
                <TableCell className="text-fg-muted text-xs">
                  {formatDateTime(p.priceUpdatedAt)}
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => setPricingTarget(p)}
                    className="text-primary text-xs font-semibold hover:underline"
                  >
                    {p.pricingMissing ? '입력' : '수정'}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ModelChangeDialog
        open={modelChangeOpen}
        onOpenChange={setModelChangeOpen}
        gradingPolicy={gradingPolicy}
        models={modelPricings}
      />

      <TierModelDialog
        open={tierTarget !== null}
        onOpenChange={(v) => !v && setTierTarget(null)}
        tierMapping={tierTarget}
        models={modelPricings}
      />

      <PricingDialog
        open={pricingTarget !== null}
        onOpenChange={(v) => !v && setPricingTarget(null)}
        pricing={pricingTarget}
      />
    </div>
  )
}
