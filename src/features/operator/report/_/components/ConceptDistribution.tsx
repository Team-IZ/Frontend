import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import { TableFrame } from '@/components/common/TableFrame'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import type { ConceptDiagnosis } from '../api/types'
import { UNASKED_HINT, shortRoundLabel } from '../labels'
import DistributionBar, { DistributionLegend } from './DistributionBar'
import ReportToolbar, { ToolbarSelect } from './ReportToolbar'

/** Select는 빈 문자열을 값으로 못 쓴다 — "전체"에 실제 값을 준다 */
const ALL = '__all__'

type Group = { key: string; label: string; rows: ConceptDiagnosis[] }

/**
 * 교안 묶음. 순서는 `mockDb`가 이미 교안·개념 모두 심각도 내림차순으로 내려준 그대로다 —
 * 여기서 다시 정렬하지 않는다(정렬이 곧 순위라는 규칙이 한 곳에만 있어야 한다).
 */
function byCurriculum(concepts: ConceptDiagnosis[]): Group[] {
  const map = new Map<string, ConceptDiagnosis[]>()
  for (const c of concepts) {
    const key = `${c.curriculumName} ${c.curriculumVersion}`
    map.set(key, [...(map.get(key) ?? []), c])
  }
  return [...map.entries()].map(([key, rows]) => ({ key, label: `교안 ${key}`, rows }))
}

/**
 * 회차 묶음. **한 개념이 여러 묶음에 들어간다** — 같은 개념이 여러 회차에 쓰이므로
 * (예: `Service와 셀렉터`는 1·2·6차) 회차 축에서는 중복이 정상이다. 회차 순서는
 * 심각도가 아니라 **시간순**이다: 이 뷰는 회차별 섹션에서 "3차가 나빴다"를 보고
 * 건너온 사람이 3차를 찾는 자리라, 그 표와 같은 순서로 늘어서 있어야 한다.
 */
function byRound(concepts: ConceptDiagnosis[]): Group[] {
  const map = new Map<string, ConceptDiagnosis[]>()
  for (const c of concepts) {
    for (const round of c.rounds) map.set(round, [...(map.get(round) ?? []), c])
  }
  const roundNo = (label: string) => Number(label.replace(/\D/g, '')) || 0
  return [...map.entries()]
    .sort(([a], [b]) => roundNo(a) - roundNo(b))
    .map(([key, rows]) => ({ key, label: key, rows }))
}

/**
 * 개념별 도달 분포 — 수업 진단의 본체. 행이 개념이지 회차가 아니다(같은 개념이 여러
 * 회차에 쓰인다). 표 프리미티브는 `projects/list/ProjectListScreen.tsx`·
 * `manager/trainees/TraineeListScreen.tsx`와 같은 공용 컴포넌트다.
 *
 * **묶는 기준을 고른다(교안순 / 회차순).** 필터를 축마다 하나씩 쌓는 대신 컨트롤 하나로
 * 같은 데이터를 두 렌즈로 본다 — 값이 빠지지 않으므로 필터가 아니고, 두 렌즈가 서로
 * 다른 질문에 답해 역할이 안 겹친다.
 *   - **교안순** — "어느 교안을 고칠까". 이 문서의 목적(§5②)이자 PDF의 형태다.
 *   - **회차순** — "3차가 왜 나빴나". 앞 섹션(회차별)에서 넘어온 사람의 질문이다.
 *     교안순으로 묶여 있으면 3차의 개념 3건이 서로 다른 교안 표에 흩어져 그 질문에
 *     답할 수 없었다 — 이 토글이 그 끊긴 자리를 잇는다.
 *
 * **목록에서 고르면 그 묶음만 남는다.** 앵커 점프만 두면 교안이 20종일 때 "눌렀는데
 * 여전히 60행 한가운데"라 누른 보람이 없다. 칩을 늘어놓는 대신 드롭다운인 이유는
 * `ReportToolbar` 주석에 있다(개수만큼 줄이 늘어나면 컨트롤이 콘텐츠보다 커진다).
 *
 * **인쇄(PDF)는 토글과 무관하게 항상 교안순 전체다.** 화면 조작이 배포되는 문서의
 * 모양을 바꾸면 그건 "값이 얼어 있는 문서"(§4)가 아니게 된다. 그래서 화면용 묶음과
 * 인쇄용 묶음을 따로 그린다(`TopStudents`가 페이지네이션 표와 전체 표를 같이 두는
 * 것과 같은 방식) — 조건부 렌더로 지우면 인쇄에서도 사라진다.
 */
export default function ConceptDistribution({ concepts }: { concepts: ConceptDiagnosis[] }) {
  const [groupBy, setGroupBy] = useState<'curriculum' | 'round'>('curriculum')
  /** `null` = 전체 */
  const [only, setOnly] = useState<string | null>(null)

  const printGroups = byCurriculum(concepts)
  const groups = groupBy === 'curriculum' ? printGroups : byRound(concepts)
  const unit = groupBy === 'curriculum' ? '교안' : '회차'

  const switchTo = (next: 'curriculum' | 'round') => {
    setGroupBy(next)
    // 축이 바뀌면 고른 값은 더 이상 존재하지 않는다 — 전체로 되돌린다
    setOnly(null)
  }

  return (
    <div>
      <ReportToolbar
        note={
          only !== null
            ? `${unit} ${groups.length}${groupBy === 'curriculum' ? '종' : '회'} 중 1${groupBy === 'curriculum' ? '종' : '회'}만 보고 있습니다 · PDF·CSV에는 전체가 교안순으로 들어갑니다`
            : undefined
        }
      >
        {/* 2지 토글은 ButtonGroup이다 — Button 두 개로 만들지 않는다 */}
        <ButtonGroup>
          <Button
            variant={groupBy === 'curriculum' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => switchTo('curriculum')}
          >
            교안순
          </Button>
          <Button
            variant={groupBy === 'round' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => switchTo('round')}
          >
            회차순
          </Button>
        </ButtonGroup>

        {/*
          옵션은 **이름만** 쓴다. 한때 `· 5건 · 2단 이하 최대 57%`를 뒤에 달았는데,
          고르는 자리에서 읽을 것이 아니었다 — 건수·최악 비율은 고른 뒤 표에 다 있고,
          목록 순서가 이미 심각한 교안부터다(`mockDb`가 그 순으로 내려준다). 라벨에
          숫자를 붙이면 드롭다운이 또 하나의 표가 된다.
        */}
        <ToolbarSelect
          label={unit}
          value={only ?? ALL}
          onChange={(v) => setOnly(v === ALL ? null : v)}
          className="min-w-44"
          options={[
            {
              value: ALL,
              label: `전체 ${groups.length}${groupBy === 'curriculum' ? '종' : '회'}`,
            },
            ...groups.map((g) => ({
              value: g.key,
              label: groupBy === 'round' ? shortRoundLabel(g.key) : g.key,
            })),
          ]}
        />
      </ReportToolbar>

      {/*
        **회차순에서는 숫자의 뜻이 달라진다.** 개념 하나에 분포가 하나뿐이라(계약상
        회차별로 쪼개진 값이 없다) 여러 회차에 쓰인 개념은 어느 회차 아래에서든 같은
        값을 보여준다 — 그 회차만의 성적이 아니다. 이걸 안 밝히면 "3차의 57%"로 읽힌다.
        회차별 분해가 필요해지면 계약(`ConceptDiagnosis`)에 회차별 분포가 생겨야 한다.
      */}
      {groupBy === 'round' && (
        <p className="text-fg-subtle mb-3 text-2xs print:hidden">
          같은 개념이 여러 회차에 쓰이면 회차마다 다시 나옵니다. 숫자는 그 회차만의 값이 아니라 그
          개념이 쓰인 전 회차 합산입니다.
        </p>
      )}

      {/*
        범례는 표마다 반복하지 않고 위에 한 번 — 막대 읽는 법이 먼저다. 인쇄에서는 이
        섹션이 여러 쪽으로 넘어가면 2쪽부터 색만 있고 뜻이 없으므로 표 아래에 다시 그린다.
      */}
      <div className="border-border bg-surface-2 mb-4 rounded-md border px-4 py-2 print:hidden">
        <DistributionLegend />
      </div>

      {/* 화면용 — 고른 묶는 기준·고른 묶음 */}
      <div className="flex flex-col gap-4 print:hidden">
        {groups
          .filter((g) => only === null || only === g.key)
          .map((g) => (
            <GroupTable key={g.key} label={g.label} rows={g.rows} />
          ))}
      </div>

      {/* 인쇄용 — 토글과 무관하게 항상 교안순 전체 */}
      <div className="hidden flex-col gap-4 print:flex">
        {printGroups.map((g) => (
          <GroupTable key={g.key} label={g.label} rows={g.rows} printLegend />
        ))}
      </div>
    </div>
  )
}

function GroupTable({
  label,
  rows,
  printLegend,
}: {
  label: string
  rows: ConceptDiagnosis[]
  printLegend?: boolean
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-1.5">
        <h5 className="text-xs font-bold">{label}</h5>
        <span className="text-fg-subtle text-2xs">· {rows.length}건</span>
      </div>
      <TableFrame>
        <Table className="table-fixed rounded-none border-0">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[264px]">검증 개념</TableHead>
              <TableHead>도달 단계 분포</TableHead>
              <TableHead className="w-[116px] text-right">2단 이하</TableHead>
              <TableHead className="w-[132px] text-right">
                묻지 못함
                <small className="text-fg-subtle mt-0.5 block text-2xs font-normal">
                  {UNASKED_HINT}
                </small>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="whitespace-normal align-middle font-semibold">
                  {c.name}
                  <small className="text-fg-subtle mt-0.5 block text-xs font-normal">
                    {c.section} · {c.rounds.map(shortRoundLabel).join(' · ')}
                  </small>
                </TableCell>
                <TableCell className="whitespace-normal align-middle">
                  <DistributionBar distribution={c.distribution} />
                </TableCell>
                <TableCell className="text-right align-middle tabular-nums">
                  {/*
                    색으로 위험을 표시하지 않는다 — 몇 %부터 "심각"인지 기획에 없다(E8).
                    정렬(mockDb — 심각도 내림차순)이 이미 순위를 말한다(E2).
                  */}
                  <b>{Math.round((c.belowLevel2Count / c.gradedCount) * 100)}%</b>
                  <small className="text-fg-subtle mt-0.5 block text-2xs">
                    {c.belowLevel2Count} / {c.gradedCount}명
                  </small>
                </TableCell>
                {/* 값이 하나뿐인 칸이라 "6"과 "명"을 줄로 가르지 않는다 */}
                <TableCell className="text-right align-middle tabular-nums">
                  <b>{c.distribution.unasked}명</b>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {printLegend && (
          <div className="px-4 pt-1 pb-3">
            <DistributionLegend />
          </div>
        )}
      </TableFrame>
    </section>
  )
}
