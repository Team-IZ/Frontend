import { Link } from 'react-router'
import { REACH_STYLE, NA_PATTERN } from '@/components/common/reach'
import { cn } from '@/lib/utils/cn'
import type { HeatmapCell, HeatmapRow, HeatmapView } from '../_/api/types'

/*
  히트맵 표 — y축·셀 폭을 `<colgroup>`으로 고정한다(`table-fixed`만으로는 행마다
  내용 길이가 달라 흔들린다) · 평균 행(테두리 강조) → 상세 행. 셀 색은
  `@/components/common/reach`의 `REACH_STYLE`을 쓴다 — 반·팀 평균(연속값)은 반올림한
  정수로 색을 고르고, 개인 셀도 같은 스케일을 쓴다.

  **집단 미달**(9-6)은 서버가 셀·개념마다 `groupShortfall`로 판정해 준다. 목일 때는
  화면이 「인원 절반 이상이 2단 이하」를 직접 셌는데, 그 규칙이 이제 서버 것이다 —
  계층마다 판정 집단이 다르고(CLASS는 담당 반 전체, TEAM·TRAINEE는 그 스코프) 그
  규칙을 화면이 다시 갖고 있으면 반드시 한쪽만 바뀐다.

  ⚠ **셀 하나로 합쳤다.** 목은 반·팀 평균 셀(`AggCell`)과 개인 셀(`PersonCell`)을
  다른 타입으로 뒀는데 서버는 `cells[]` 하나다 — 계층이 달라도 같은 모양이고,
  다른 것은 값의 뜻(평균이냐 도달이냐)뿐이다. 그래서 표기만 계층으로 가른다.

  ⚠ 취약·주의 글자 라벨과 2단 이하 밑줄은 뺐다(렌더 확인 후 사용자 지시) — 색과
  집단 미달 테두리만으로 판정을 표시한다.

  ⚠ 셀 폭은 정의서 §3 제안값(92px)의 2배(렌더 확인 후 사용자 지시), y축은 220px.

  ⚠ **클릭 가능 텍스트에 지속적인 링크 스타일**(렌더 확인 후 사용자 지시) — 호버
  전에도 `text-primary` + 옅은 밑줄을 깔아 「이건 링크다」를 색 말고도 알린다.
*/
const Y_COL_W = 220
const CELL_COL_W = 184

function colorLevel(v: number): 0 | 1 | 2 | 3 | 4 {
  return Math.min(4, Math.max(0, Math.round(v))) as 0 | 1 | 2 | 3 | 4
}

/**
 * 그릴 값이 없는 셀.
 *
 * 🔴 **집계 셀과 개인 셀이 서로 다른 필드로 말한다**(하드닝 2차 실측).
 *
 *     합계·반·팀 셀   validCount 0        아무도 유효 응시를 안 했다
 *     개인 셀        status NOT_ATTENDED  그 사람이 안 봤다 (validCount는 늘 null)
 *
 * `validCount === 0`만 보고 있었더니 **미응시인 사람에게 값이 그대로 찍혔다** —
 * 1차 6팀 윤지우가 `NOT_ATTENDED`인데 화면에는 `3단 · 2단 · 0단`이었다. 매니저가
 * 응시한 것으로 읽는다. 서버가 값을 같이 보내는 이유는 모르겠으나(요청서로 올린다),
 * **상태가 값보다 먼저다.**
 *
 * `value`가 0인 것과도 구분해야 한다(0단을 받은 것과 아무도 안 본 것은 다르다).
 * 파생값이 아니라 원인이 되는 값으로 판정한다(screen-hardening §자주 나오는 함정).
 */
const VALID_STATUS = new Set(['VALID', 'COMPLETE'])
const isEmptyCell = (c: HeatmapCell) => c.validCount === 0 || !VALID_STATUS.has(c.status)

function CellView({ cell, level }: { cell: HeatmapCell; level: HeatmapView['level'] }) {
  const person = level === 'TRAINEE'
  const h = person ? 'h-11' : 'h-14'

  if (isEmptyCell(cell)) {
    return (
      <td
        style={NA_PATTERN}
        className={cn(h, 'rounded text-center align-middle text-2xs font-normal text-fg-subtle')}
        title={emptyReason(cell)}
      >
        ―
      </td>
    )
  }
  return (
    <td
      className={cn(
        h,
        'rounded text-center align-middle font-bold tabular-nums',
        REACH_STYLE[colorLevel(cell.value)],
        cell.groupShortfall && 'outline outline-2 outline-warning outline-offset-[-2px]',
      )}
      title={countsLabel(cell)}
    >
      {/* 개인은 도달 단계 그대로, 반·팀은 평균이라 소수 한 자리 */}
      <span className="text-xl">
        {person ? `${colorLevel(cell.value)}단` : cell.value.toFixed(1)}
      </span>
    </td>
  )
}

/** 왜 비었나 — 집계 셀은 인원을 셋으로 갈라 주고, 개인 셀은 `status` 하나로 말한다 */
const PERSON_STATUS_LABEL: Record<string, string> = {
  NOT_ATTENDED: '미응시',
  SESSION_INCOMPLETE: '중단',
  CONFIRMED_INVALID: '무효',
  INVALID: '무효',
}

function emptyReason(c: HeatmapCell) {
  const byStatus = PERSON_STATUS_LABEL[c.status]
  if (byStatus) return byStatus
  const parts = [
    c.notAttendedCount > 0 && `미응시 ${c.notAttendedCount}`,
    c.invalidCount > 0 && `무효 ${c.invalidCount}`,
    c.interruptedCount > 0 && `중단 ${c.interruptedCount}`,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '아직 결과가 없습니다'
}

function countsLabel(c: HeatmapCell) {
  return [`유효 ${c.validCount}`, emptyReason(c)].filter(Boolean).join(' · ')
}

function RowLine({
  row,
  level,
  onClick,
  isSummary,
  traineePath,
  className,
  listedRows,
}: {
  row: HeatmapRow
  level: HeatmapView['level']
  onClick?: () => void
  isSummary?: boolean
  traineePath?: (id: string) => string
  className?: string
  /** 실제로 그려진 개인 행 수 — 합계 행이 「N / M명」을 만들 때만 쓴다 */
  listedRows?: number
}) {
  const label = isSummary ? '전체' : (row.rowName ?? '—')
  /*
    🔴 **명단에서 아예 빠진 사람이 있다**(하드닝 2차 실측). 1차 1팀은 `memberCount 5`인데
    `rows`가 4개였고, **왜 빠졌는지 응답 어디에도 없었다**(notAttended·invalid·interrupted
    전부 0). 화면이 「전체 5명」이라고만 쓰면 한 명이 사라진 것처럼 보인다.

    ⚠ **`validCount`로 세지 않는다.** 그건 개념별 유효 응시자 수라 뜻이 다르다 —
    6팀은 `memberCount 4 · validCount 3`인데 **행은 4개**다(한 명이 미응시로 행에는
    있다). `validCount`를 쓰면 그 경우까지 「3 / 4명」이 되어 개인 행과 어긋난다.

    **행 수와 견준다** — 그려진 것과 있어야 할 것의 차이가 이 표기의 뜻이다.

    🔴 **개인 계층에서만 쓴다.** 반·팀 계층의 행은 사람이 아니라 반·팀이라, 행 수와
    `memberCount`를 견주면 뜻이 안 맞는 숫자가 나온다 — 2차 팀 격자에서 「5 / 26명」이
    나왔다(팀 5개 · 사람 26명). 처음에 계층을 안 가르고 넣어 만든 회귀다.
  */
  const countsPeople = level === 'TRAINEE'
  const missing =
    countsPeople && isSummary && listedRows !== undefined && row.memberCount !== null
      ? row.memberCount - listedRows
      : 0
  const count =
    row.memberCount === null
      ? ''
      : missing > 0
        ? `${listedRows} / ${row.memberCount}명`
        : `${row.memberCount}명`
  /* 개인 행의 이름은 상세로 가는 링크다 — 반·팀 행은 드릴다운(클릭) */
  const asLink = level === 'TRAINEE' && !isSummary && row.rowId && traineePath

  return (
    <tr className={className}>
      <td
        onClick={asLink ? undefined : onClick}
        style={{ width: Y_COL_W }}
        className={cn(
          'py-1 pr-3 text-sm font-medium whitespace-nowrap text-fg',
          isSummary && 'font-bold',
          !asLink &&
            onClick &&
            'cursor-pointer text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary',
        )}
      >
        {asLink ? (
          <Link
            to={traineePath(row.rowId!)}
            className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
          >
            {label}
          </Link>
        ) : (
          label
        )}
        {count && (
          <small
            className="text-fg-subtle ml-1 text-2xs font-normal"
            title={
              isSummary &&
              listedRows !== undefined &&
              row.memberCount !== null &&
              listedRows < row.memberCount
                ? `${row.memberCount - listedRows}명은 이 회차 명단에 없습니다`
                : undefined
            }
          >
            {count}
          </small>
        )}
        {!asLink && onClick && (
          <span className="ml-0.5 font-bold text-primary no-underline">›</span>
        )}
      </td>
      {row.cells.map((c) => (
        <CellView key={c.problemNo} cell={c} level={level} />
      ))}
    </tr>
  )
}

export default function HeatmapTable({
  view,
  onDrill,
  traineePath,
}: {
  view: HeatmapView
  /** 반·팀 행을 눌러 한 단 내려간다. 개인 계층에서는 안 준다 */
  onDrill?: (rowId: string) => void
  traineePath: (id: string) => string
}) {
  const concepts = view.concepts

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1">
        <colgroup>
          <col style={{ width: Y_COL_W }} />
          {concepts.map((c) => (
            <col key={c.problemNo} style={{ width: CELL_COL_W }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="pr-3 text-left text-2xs font-normal text-fg-subtle">
              {view.level === 'CLASS' ? '반' : view.level === 'TEAM' ? '팀' : '교육생'}
            </th>
            {concepts.map((c) => (
              <th
                key={c.problemNo}
                className="px-1 pb-1 text-center text-xs font-semibold text-fg-muted"
              >
                {/* 집단 미달은 서버 판정이다 — 화면이 세지 않는다 */}
                {c.groupShortfall && <span className="mr-1 text-warning">⚠</span>}
                {c.conceptName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/*
            🔴 합계 행을 `<tr>`로 한 번 더 감싸고 있었다 — `RowLine`이 이미 `<tr>`을
            돌려주는데 그 안에 또 넣어 **중첩 tr**이 됐고, 브라우저가 복구하면서
            `<colgroup>` 폭이 안 먹어 합계 셀만 좁게 그려졌다(렌더에서 잡았다).
            테두리는 행 자체에 준다.
          */}
          {view.summary && (
            <RowLine
              row={view.summary}
              level={view.level}
              isSummary
              listedRows={view.rows.length}
              className="[&>td]:border-b [&>td]:border-border"
            />
          )}
          {view.rows.length === 0 ? (
            <tr>
              <td colSpan={concepts.length + 1} className="py-8 text-center text-sm text-fg-subtle">
                이 범위에는 아직 결과가 없습니다.
              </td>
            </tr>
          ) : (
            view.rows.map((row) => (
              <RowLine
                key={row.rowId ?? row.rowName}
                row={row}
                level={view.level}
                onClick={onDrill && row.rowId ? () => onDrill(row.rowId!) : undefined}
                traineePath={traineePath}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
