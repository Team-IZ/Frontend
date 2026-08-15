import { TableFrame } from '@/components/common/TableFrame'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import type { RoundDiagnosis } from '../api/types'
import { UNASKED_HINT } from '../labels'
import DistributionBar, { DistributionLegend } from './DistributionBar'

/** 회차별 — 어느 회차가 어려웠나. 반을 가로로 비교하는 OP-02와 축이 다르다(같은 250명이 봤다) */
export default function RoundBreakdown({ rounds }: { rounds: RoundDiagnosis[] }) {
  return (
    <div>
      {/* 범례는 표 위에 — 막대 읽는 법이 먼저다(개념별 섹션과 같은 자리) */}
      <div className="border-border bg-surface-2 mb-4 rounded-md border px-4 py-2">
        <DistributionLegend />
      </div>
      <TableFrame>
        <Table className="table-fixed rounded-none border-0">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[264px]">프로젝트</TableHead>
              <TableHead>도달 단계 분포</TableHead>
              <TableHead className="w-[116px] text-right">2단 이하</TableHead>
              {/*
                개념별 표엔 있는데 여기만 없었다 — 같은 `ReachDistribution`을 그리는
                두 표에서 한쪽만 이 값을 감추면, 막대의 빗금 조각이 회차별에선 셀 수
                없는 것으로 읽힌다(CSV엔 양쪽 다 들어가 있어 화면만 어긋나 있었다).
              */}
              <TableHead className="w-[132px] text-right">
                묻지 못함
                <small className="text-fg-subtle mt-0.5 block text-2xs font-normal">
                  {UNASKED_HINT}
                </small>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rounds.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-normal align-middle font-semibold">
                  {r.name}
                  <small className="text-fg-subtle mt-0.5 block text-xs font-normal">
                    {r.conceptNames.join(' · ')}
                  </small>
                </TableCell>
                <TableCell className="whitespace-normal align-middle">
                  <DistributionBar distribution={r.distribution} />
                </TableCell>
                <TableCell className="text-right align-middle tabular-nums">
                  {/* 색 임계값을 쓰지 않는다 — ConceptDistribution과 같은 이유(E8) */}
                  <b>{Math.round((r.belowLevel2Count / r.gradedCount) * 100)}%</b>
                  <small className="text-fg-subtle mt-0.5 block text-2xs">
                    {r.belowLevel2Count} / {r.gradedCount}명
                  </small>
                </TableCell>
                <TableCell className="text-right align-middle tabular-nums">
                  <b>{r.distribution.unasked}명</b>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableFrame>
    </div>
  )
}
