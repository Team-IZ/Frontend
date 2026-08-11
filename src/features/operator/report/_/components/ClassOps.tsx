import { TableFrame } from '@/components/common/TableFrame'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import type { ClassRiskRate, GroupShortfall } from '../api/types'

/**
 * 반 · 집단 미달 — 운영 관점. 둘을 한 섹션에 둔다(정의서 §6) — 반 편차만 있으면
 * 외부 독자가 "그 반 매니저 문제"로 읽는다.
 *
 * 반별 위험자 비율 막대는 **실제 구현된 OP-01 대시보드의 `ClassCompareBlock.tsx`를
 * 그대로 따른다**(와이어프레임이 아니라 — 이미 실제 화면이 있으면 그게 원본이다).
 * 그 컴포넌트의 핵심 규칙:
 *   - **"기수 전체" 비율이 임계값이 아니라 관측값**이라 E8(화면이 기준을 정하지
 *     않는다)에 안 걸린다 — 그래서 그 값을 **기준선(세로선)**으로 모든 막대 위에
 *     겹쳐 긋고, 그 선을 **넘는 반만** danger색이 붙는다. 등수·상위 N개 같은
 *     화면이 지어낸 규칙이 아니다.
 *   - 기준선 아래는 무채색(`bg-border-strong`) — 정상 범위를 칠하면 색이 신호가
 *     아니라 바탕이 된다.
 *   - 정렬은 나쁜 순(이미 이렇게 정렬된 데이터가 온다) — 등수 숫자는 안 붙인다(E2).
 */
export default function ClassOps({
  roundLabel,
  classRisk,
  groupShortfalls,
}: {
  roundLabel: string
  classRisk: ClassRiskRate[]
  groupShortfalls: GroupShortfall[]
}) {
  const overall = classRisk.find((c) => c.className === '기수 전체')
  const rows = classRisk.filter((c) => c.className !== '기수 전체')

  /*
    "같은 개념이 여러 건이면 반 운영이 아니라 교안 신호"(정의서 §6)는 읽는 사람이
    내리는 해석이지, 화면이 문장으로 단정할 근거는 아니다 — 이 문서는 "값·라벨·
    범례·분모만" 두고 자연어 해석은 넣지 않는다(§4, 15번에서 AI 요약이 빠진 것과
    같은 이유). 그래서 문장이 아니라 사실(반복 횟수)만 배지로 붙인다 — 몇 건이든
    셀 수 있고, 못 세는 경우가 없다.
  */
  const shortfallCountByConcept = new Map<string, number>()
  for (const s of groupShortfalls) {
    shortfallCountByConcept.set(
      s.conceptName,
      (shortfallCountByConcept.get(s.conceptName) ?? 0) + 1,
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-1.5">
        <h5 className="text-xs font-bold">반별 위험자 비율</h5>
        <span className="text-fg-subtle text-2xs">
          · 2단 이하 개념이 2개 이상인 학생 · {roundLabel}
        </span>
      </div>
      <div className="border-border bg-surface mb-6 rounded-md border px-5 py-3">
        {overall && <RiskBars overall={overall} rows={rows} />}
      </div>

      <div className="mb-2">
        <div className="flex items-baseline gap-1.5">
          <h5 className="text-xs font-bold">집단 미달</h5>
          <span className="text-fg-subtle text-2xs">
            · 한 개념에서 반 절반 이상 미달 · {groupShortfalls.length}건
          </span>
        </div>
        {/*
          "반복" 배지의 뜻을 여기서 밝힌다. 원래는 배지의 `title` 호버였는데
          (1) 인쇄에 안 나오고 (2) 터치로는 열 수 없어서 — 이 문서의 유일한 읽기
          힌트를 가장 안 보이는 곳에 숨긴 꼴이었다. 게다가 그 문구가 "수업 진단
          탭에서 확인하세요"라며 빅프 제거 때 사라진 탭을 가리키고 있었다.
          해석("교안 신호다")까지 단정하지는 않는다(§4) — 어느 섹션을 같이 보라는
          안내에서 멈춘다.
        */}
        {[...shortfallCountByConcept.values()].some((n) => n > 1) && (
          <p className="text-fg-subtle mt-1 text-2xs">
            같은 개념이 여러 반에서 반복되면 <b className="text-fg-muted">개념별 도달 분포</b>를
            함께 보세요.
          </p>
        )}
      </div>
      {groupShortfalls.length === 0 ? (
        // 「없음」(다 봤고 0건) 유형이라 실선이다 — `Empty`의 기본값(점선)은 「아직」(대기)
        // 유형이라 여기 쓰면 "결과를 기다리는 중"으로 읽힌다(02-layout-system §4)
        <Empty variant="empty">
          <EmptyHeader>
            <EmptyTitle>반 절반 이상이 미달한 회차가 없습니다</EmptyTitle>
            <EmptyDescription>위험 판정이 모두 개인 사유로 남았습니다.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <TableFrame>
          <Table className="table-fixed rounded-none border-0">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">검증 개념</TableHead>
                <TableHead>회차 · 반</TableHead>
                <TableHead className="w-[116px] text-right">미달</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupShortfalls.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-normal align-middle font-semibold">
                    {s.conceptName}
                    {shortfallCountByConcept.get(s.conceptName)! > 1 && (
                      <span className="text-primary bg-primary-soft ml-1.5 rounded-full px-1.5 py-[1px] align-middle text-2xs font-semibold">
                        {shortfallCountByConcept.get(s.conceptName)}건 반복
                      </span>
                    )}
                    <small className="text-fg-subtle mt-0.5 block text-xs font-normal">
                      {s.curriculumName} · {s.section}
                    </small>
                  </TableCell>
                  <TableCell className="text-fg-muted text-xs">
                    {s.round} · {s.className}
                  </TableCell>
                  <TableCell className="text-right align-middle">
                    <b className="text-fg font-bold">
                      {s.shortfallCount} / {s.totalCount}명
                    </b>
                    <small className="text-fg-subtle mt-0.5 block text-2xs">
                      {Math.round((s.shortfallCount / s.totalCount) * 100)}%
                    </small>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableFrame>
      )}
    </div>
  )
}

function RiskBars({ overall, rows }: { overall: ClassRiskRate; rows: ClassRiskRate[] }) {
  const cohortRate = overall.atRiskCount / overall.traineeCount

  /*
    눈금은 0~100%가 아니라 데이터 범위에 맞춘다(ClassCompareBlock과 같은 이유) —
    값이 12~36%인데 트랙을 100%로 잡으면 막대가 전부 왼쪽에 몰려 차이가 안 보인다.
  */
  const scale =
    Math.max(cohortRate, ...rows.map((r) => r.atRiskCount / r.traineeCount), 0.01) * 1.15
  const pct = (rate: number) => `${(rate / scale) * 100}%`

  return (
    <div>
      {/* 기준선 라벨 — 트랙 위 한 번만. 매 행마다 반복하면 10번 겹친다 */}
      <p className="text-fg-subtle mb-2 flex h-4 items-end text-2xs">
        <span className="w-[112px] shrink-0" />
        <span className="relative flex-1">
          <span className="absolute whitespace-nowrap" style={{ left: pct(cohortRate) }}>
            <span className="text-fg-muted pl-1.5 font-semibold">
              기수 전체 {Math.round(cohortRate * 100)}%
            </span>
          </span>
        </span>
        <span className="w-[118px] shrink-0" />
      </p>
      {rows.map((row) => {
        const rate = row.atRiskCount / row.traineeCount
        /** 기준선 초과 = 기수보다 나쁘다. 같으면 초과가 아니다 */
        const worse = rate > cohortRate
        return (
          <div key={row.className} className="flex items-center gap-3 py-1.5 text-sm">
            <span className="w-[112px] shrink-0 font-semibold whitespace-nowrap">
              {row.className}
              <small className="text-fg-subtle ml-1 text-xs font-normal">
                {row.traineeCount}명
              </small>
            </span>

            <span className="bg-surface-2 relative h-4 flex-1 overflow-hidden rounded-sm">
              {/* 기준선을 넘은 반에만 색이 붙는다 — 정상 범위는 무채색 */}
              <span
                className={`block h-full rounded-sm ${worse ? 'bg-danger/55' : 'bg-border-strong'}`}
                style={{ width: pct(rate) }}
              />
              {/* 기준선 — 막대 위에 얹혀야 넘었는지가 보인다 */}
              <span
                aria-hidden="true"
                className="bg-fg-muted absolute inset-y-0 w-px"
                style={{ left: pct(cohortRate) }}
              />
            </span>

            <span className="w-[118px] shrink-0 text-right text-sm tabular-nums">
              <b className={worse ? 'text-danger font-bold' : 'text-fg font-semibold'}>
                {Math.round(rate * 100)}%
              </b>
              <small className="text-fg-subtle ml-1 text-xs font-normal">
                {row.atRiskCount} / {row.traineeCount}명
              </small>
            </span>
          </div>
        )
      })}
    </div>
  )
}
