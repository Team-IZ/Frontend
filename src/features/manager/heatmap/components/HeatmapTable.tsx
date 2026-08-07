import { Link } from 'react-router'
import Badge from '@/components/ui/Badge'
import { REACH_STYLE, NA_PATTERN } from '@/features/manager/trainees/lib/reach'
import { cn } from '@/lib/utils/cn'
import {
  BADGE_LABEL,
  type AggCell,
  type AggRow,
  type HeatmapResult,
  type PersonRow,
} from '../mockData'

/*
  히트맵 표 — y축·셀 폭을 `<colgroup>`으로 고정한다(`table-fixed`만으로는 행마다
  내용 길이가 달라 흔들린다) · 평균 행(테두리 강조) → 그룹 안내 행 → 상세 행. 셀
  색은 `trainees/lib/reach.ts`의 `REACH_STYLE`을 그대로 쓴다 — 반·팀 평균(연속값)은
  반올림한 정수로 색을 고르고, 개인 셀은 도달 단계 그대로 쓴다(정의서 "개인은 원값").

  **집단 미달**(9-6)은 그 행 자체가 전원의 절반 이상 2단 이하일 때 테두리(ring)로
  표시한다 — 반별 비교 행이든 팀별 비교 행이든 각자의 스코프 기준으로 계산된다.

  ⚠ 취약·주의 글자 라벨과 2단 이하 밑줄은 뺐다(렌더 확인 후 사용자 지시) — 색과
  집단 미달 테두리만으로 판정을 표시한다. 숫자를 셀 한가운데 세로로도 정확히
  가운데 오게 한 줄만 남겼다(라벨 자리를 비워 두던 두 번째 줄이 없어져 `align-middle`
  하나로 충분해졌다).

  ⚠ 셀 폭은 정의서 §3 제안값(92px)의 2배(렌더 확인 후 사용자 지시 — "너무 한쪽에
  몰려 좁아 보인다")에서 다시 조정됐다. y축 폭은 300 → 220으로 줄였다 — "A반"·
  "1팀" 같은 짧은 이름이 표(색칠된 셀)에서 너무 멀어 보인다는 지적(렌더 확인 후).
  "담당 반"·그룹 안내 행처럼 같은 열을 쓰는 다른 행도 같이 가까워지는데, 그 텍스트
  자체는 바꾸지 않았다 — 사용자가 지적한 건 간격이지 문구가 아니다.

  ⚠ **클릭 가능 텍스트에 지속적인 링크 스타일**(렌더 확인 후 사용자 지시) — 원래는
  `cursor-pointer hover:text-primary`(호버 전에는 평범한 글자와 구분이 안 됨)와
  옅은 `›`(`text-fg-subtle`) 하나였는데, "처음 봤을 때 안 눌러볼 것 같다"는 지적을
  받았다. 반·팀 드릴 행 라벨(`AggRowLine`)과 개인 이름(`PersonRowLine`의 `Link`)
  둘 다 **호버 여부와 무관하게** `text-primary` + 옅은 밑줄(`decoration-primary/40`)
  을 항상 깔고, 호버 시 밑줄만 진해지게(`hover:decoration-primary`) 바꿨다 — 색만
  쓰지 않고 밑줄을 같이 준 건 색각 이상 사용자도 "이건 링크다"를 구분할 수 있게
  하려는 것(전통적인 하이퍼링크 관례). `›`도 옅은 회색 대신 굵은 `text-primary`로
  맞춰 같은 신호로 보이게 했다. 평균 행("반 전체")·개인 셀처럼 클릭할 수 없는
  요소는 이 스타일이 안 붙는다 — `onClick`이 있을 때만 적용되는 조건부 클래스라
  자동으로 갈린다.
*/
const Y_COL_W = 220 // y축(반/팀/이름) 열 폭
const CELL_COL_W = 184 // 개념 셀 열 폭

function colorLevel(avg: number): 0 | 1 | 2 | 3 | 4 {
  return Math.min(4, Math.max(0, Math.round(avg))) as 0 | 1 | 2 | 3 | 4
}

function AggCellView({ cell }: { cell: AggCell }) {
  if (cell.kind === 'na') {
    return (
      <td
        style={NA_PATTERN}
        className="h-14 rounded text-center align-middle text-2xs font-normal text-fg-subtle"
      >
        ―
      </td>
    )
  }
  return (
    <td
      className={cn(
        'h-14 rounded text-center align-middle font-bold tabular-nums',
        REACH_STYLE[colorLevel(cell.avg)],
        cell.flagged && 'outline outline-2 outline-warning outline-offset-[-2px]',
      )}
    >
      <span className="text-[21px]">{cell.avg.toFixed(1)}</span>
    </td>
  )
}

function PersonCellView({ level, retried }: { level: 0 | 1 | 2 | 3 | 4 | null; retried: boolean }) {
  if (level === null) {
    return (
      <td
        style={NA_PATTERN}
        className="h-11 rounded text-center align-middle text-2xs font-normal text-fg-subtle"
      >
        ―
      </td>
    )
  }
  return (
    <td
      className={cn(
        'h-11 rounded text-center align-middle font-bold tabular-nums',
        REACH_STYLE[level],
      )}
    >
      <span className="text-[21px]">{level}단</span>
      {/* 렌더 확인 후 사용자 지시 — 더 크고 진하게. `opacity-70`으로 흐리게 하던
          것을 없애 색이 옅어지지 않게 했다(뜻은 범례 예시로 옮겨 설명한다,
          `HeatmapLegend.tsx`) */}
      {retried && <span className="ml-1 text-[16px] font-extrabold">↑</span>}
    </td>
  )
}

function AggRowLine({
  row,
  onClick,
  isAvgRow,
}: {
  row: AggRow
  onClick?: () => void
  isAvgRow?: boolean
}) {
  return (
    <tr>
      <td
        onClick={onClick}
        style={{ width: Y_COL_W }}
        className={cn(
          'py-1 pr-3 text-sm font-medium whitespace-nowrap text-fg',
          isAvgRow && 'font-bold',
          onClick &&
            'cursor-pointer text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary',
        )}
      >
        {row.label} <small className="text-2xs font-normal text-fg-subtle">{row.countLabel}</small>
        {onClick && <span className="ml-0.5 font-bold text-primary no-underline">›</span>}
      </td>
      {row.cells.map((c, i) => (
        <AggCellView key={i} cell={c} />
      ))}
    </tr>
  )
}

/*
  이름 칸에 배지를 같이 넣는다(따로 열을 만들지 않는다) — 열을 하나 더 만들면
  개인 뷰만 반·팀 뷰보다 표가 넓어져 계층을 오갈 때 히트맵 크기·위치가 흔들린다
  (렌더 확인 후 발견 — 반·팀·개인 셋 다 y축 150px + 셀 92px×3, 총 4열로 통일).
*/
function PersonRowLine({
  row,
  traineePath,
}: {
  row: PersonRow
  traineePath: (id: string) => string
}) {
  const nameCell = (
    <td
      style={{ width: Y_COL_W }}
      className="py-1 pr-3 align-top text-sm font-medium whitespace-nowrap text-fg"
    >
      <Link
        to={traineePath(row.id)}
        className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
      >
        {row.name}
      </Link>
      {row.badge && (
        <Badge
          variant={row.badge === 'DECLINE' ? 'warning' : 'danger'}
          className="ml-1.5 align-middle"
        >
          {BADGE_LABEL[row.badge]}
        </Badge>
      )}
    </td>
  )

  if (!row.cells) {
    return (
      <tr>
        {nameCell}
        {/* bg-surface-2는 카드 배경(흰색)과 명도 차이가 거의 없어 안 보였다(렌더
            확인 후 지적) — Badge neutral 변형과 같은 bg-neutral-soft로 바꿨다.
            결석·미응시는 텍스트 말고는 구분할 다른 시각 요소가 없어(렌더 확인 후
            질문 — "구분할 수 있는지") "미응시"로 통일했다. 원인(`row.status`
            ABSENT/NOT_STARTED)은 데이터에 그대로 남아 있어, 나중에 실제로 구분
            표시가 필요해지면 여기 텍스트만 다시 갈라 쓰면 된다. */}
        <td
          colSpan={3}
          className="h-11 rounded bg-neutral-soft text-center align-middle text-2xs text-fg-muted"
        >
          미응시
        </td>
      </tr>
    )
  }
  return (
    <tr>
      {nameCell}
      {row.cells.map((c, i) => (
        <PersonCellView key={i} level={c.level} retried={c.retried} />
      ))}
    </tr>
  )
}

/*
  ⚠ "⚠ 반: 위험"·"⚠ 팀: 위험"·"⚠ 팀원: 위험" 토글이 결과를 전부 걸러내면(위험한
  행이 하나도 없으면) 행이 0개가 되는데, 그동안은 표가 그냥 조용히 비어 보였다
  (렌더 확인 후 사용자 지적 — "변화가 없는 것 같다"·"문구가 없는 게 어색하다",
  필터가 실제로는 동작하고 있었지만 빈 결과에 아무 설명이 없어 고장난 것처럼
  보였다). 0행일 때 이 안내 행을 대신 그린다.

  ⚠ **y축 칸은 비워 두고 개념 3칸만 `colSpan`으로 합친다**(렌더 확인 후 사용자
  지시) — 처음엔 4칸을 통째로 합쳐 `text-center`를 줬는데, y축 열(220px)까지
  가운데 정렬 기준에 포함돼 메시지가 실제 히트맵(색칠된 3칸)보다 왼쪽으로 치우쳐
  보였다("히트맵에 중간선을 그었을 때 같은 선상에 있으면 좋겠다"). y축 칸을
  빈 `<td>`로 남겨 `colgroup` 폭만 차지하게 하고, 나머지 3칸만 합쳐 가운데
  정렬하면 메시지 중심이 히트맵 3칸의 중심과 정확히 겹친다.
*/
function EmptyFilterRow({ message }: { message: string }) {
  return (
    <tr>
      <td aria-hidden="true" />
      <td colSpan={3} className="py-6 text-center text-xs text-fg-subtle">
        {message}
      </td>
    </tr>
  )
}

export default function HeatmapTable({
  result,
  onDrillTeam,
  onDrillPerson,
  traineePath,
}: {
  result: HeatmapResult
  onDrillTeam: (classFilter: string) => void
  onDrillPerson: (classFilter: string, teamFilter: string) => void
  traineePath: (id: string) => string
}) {
  const { concepts, axis, avgRow, groupText, flaggedConcepts } = result
  if (!concepts) return null // 아직 결과가 없다 — 상위에서 Empty를 그린다

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface p-3">
      {/*
        `w-full`을 안 준다 — 표가 컨테이너 폭에 맞춰 늘어나면 `colgroup` 픽셀 값이
        비율로만 반영돼 반별·팀·개인을 오갈 때 셀 크기·표 위치가 흔들린다(렌더 확인
        후 발견). 열 개수도 반·팀·개인 셋 다 4열(이름/팀명 + 개념 3)로 고정해 뒀다
        — 배지는 이름 칸 안으로 옮겨 개인 뷰만 표가 넓어지는 일이 없게 했다.

        가운데 정렬은 한 번 넣었다가 뺐다(렌더 확인 후) — 왼쪽에 빈 공간이 커 보인다는
        지적. 왼쪽 정렬(기본값)로 되돌리고, 대신 y축 폭을 줄여 표 자체가 카드에 더
        붙게 했다.
      */}
      <table className="table-fixed border-separate [border-spacing:3px] text-sm">
        <colgroup>
          <col style={{ width: Y_COL_W }} />
          <col style={{ width: CELL_COL_W }} />
          <col style={{ width: CELL_COL_W }} />
          <col style={{ width: CELL_COL_W }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ width: Y_COL_W }} className="px-0 pb-0.5 text-left align-bottom">
              {/* "세로: X" → "세로 : X"(콜론 양옆 1칸)로 맞췄다(렌더 확인 후
                  사용자 지시) — 아래 위험 토글 라벨과 같은 간격 규칙 */}
              <span className="block text-2xs font-bold text-fg-muted">
                <i className="font-semibold text-fg-subtle not-italic">세로</i> : {axis.vertical}
              </span>
              <span className="block text-2xs font-bold text-fg-muted">
                <i className="font-semibold text-fg-subtle not-italic">가로</i> : {axis.horizontal}
              </span>
            </th>
            {concepts.map((c, i) => (
              <th key={i} className="px-1 pb-0.5 text-center align-bottom">
                <span className="block text-2xs font-semibold text-fg-subtle">개념 {i + 1}</span>
                <span className={cn('text-[13px] font-bold', flaggedConcepts[i] && 'text-warning')}>
                  {c}
                  {flaggedConcepts[i] && ' ⚠'}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AggRowLine row={avgRow} isAvgRow />
          <tr>
            <td colSpan={4} className="pt-4 pb-1 text-2xs font-semibold text-fg-muted">
              {groupText}
            </td>
          </tr>
          {result.level === 'person' ? (
            result.rows.length > 0 ? (
              result.rows.map((row) => (
                <PersonRowLine key={row.id} row={row} traineePath={traineePath} />
              ))
            ) : (
              <EmptyFilterRow message="위험에 해당하는 팀원이 없습니다." />
            )
          ) : result.level === 'class' ? (
            result.rows.length > 0 ? (
              result.rows.map((row) => (
                <AggRowLine
                  key={row.id}
                  row={row}
                  onClick={() => onDrillTeam(row.drillTo!.classFilter)}
                />
              ))
            ) : (
              <EmptyFilterRow message="위험에 해당하는 반이 없습니다." />
            )
          ) : result.rows.length > 0 ? (
            result.rows.map((row) => (
              <AggRowLine
                key={row.id}
                row={row}
                onClick={() => onDrillPerson(row.drillTo!.classFilter, row.drillTo!.teamFilter!)}
              />
            ))
          ) : (
            <EmptyFilterRow message="위험에 해당하는 팀이 없습니다." />
          )}
        </tbody>
      </table>
    </div>
  )
}
