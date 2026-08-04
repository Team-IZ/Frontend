import { Link } from 'react-router'
import {
  CELL_STATE_HINT,
  CELL_STATE_LABEL,
  SIGN_CLASS,
  UNCOUNTED_CLASS,
  UNCOUNTED_LABEL,
  UNCOUNTED_SHORT,
  projectPath,
} from '../labels'
import type { GridRow, RoundGrid } from '../api/types'

/*
  회차 격자 — **값이 아니라 색을 읽는 표다.**

  ▸ **칸에는 값 하나**(E11). 분모·비교는 호버로 준다 — 칸마다 글자가 셋이면 색을 못 읽고
    표가 아니라 목록이 된다.
  ▸ **다만 호버가 유일한 경로가 되면 안 된다.** 터치·키보드·스크린리더에 호버가 없다.
    셀을 포커스 가능하게 두고 `title`을 같이 달아, 마우스든 Tab이든 같은 내용이 나온다.
    (`표로 보기`가 필요해지면 그때 더한다 — 지금은 격자 자체가 표다)
  ▸ **행 이름 열은 가로 스크롤에도 남는다**(sticky). 어느 반의 값인지 모르면 표가 아니다.
  ▸ **기준선 행은 색이 없고 정렬에서도 빠진다** — 자기 자신과 비교할 수 없다.
*/

const total = (u: GridRow['uncounted']) => u.absent + u.invalid + u.aborted

/** 실제 채점된 사람 = 명부 − 미집계. **화면이 대신 빼 준다** */
const graded = (row: GridRow) => row.size - total(row.uncounted)

const KINDS = ['absent', 'invalid', 'aborted'] as const

/**
 * 미집계 — **총계만 쓰면 어디를 볼지가 안 나온다**(OP-02 §4-2). 세 종류가 서로 다른 곳을
 * 가리킨다: 미응시는 반 운영, 무효는 세션 설계·응시 태도(9-4), 중단은 기술 문제.
 *
 * **비율 막대를 쓰지 않는다.** 값이 한 자리 수라 `2/4`도 `1/1`도 같은 폭이 되어
 * 절대량이 사라진다. 그렇다고 개수만큼 도트를 찍으면 **기수 전체 행에서 16개**가 되어
 * 세는 것이 불가능하다(실제로 그렇게 만들었다가 렌더에서 걸렸다).
 *
 * → **숫자 + 종류별 칩.** 총계는 숫자가, 쏠린 종류는 칩이 말한다. 개수와 무관하게
 * 폭이 일정해 행끼리 비교된다.
 */
function UncountedCell({ u }: { u: GridRow['uncounted'] }) {
  const n = total(u)
  if (n === 0) {
    // 0을 강조하지 않는다 — 없음과 0을 다르게 표시한다(F3)
    return <span className="text-fg-subtle pr-[52px]">—</span>
  }
  return (
    <span
      className="flex items-center justify-end"
      title={KINDS.filter((k) => u[k] > 0)
        .map((k) => `${UNCOUNTED_LABEL[k]} ${u[k]}`)
        .join(' · ')}
    >
      <b className="w-7 text-right text-fg-muted font-semibold tabular-nums">{n}</b>
      {/*
        **테두리·구분선을 뺐다.** 칩마다 상자를 두면 행 11개 × 선 4개가 잔선으로 쌓여
        표가 지저분해진다 — 폭이 고정돼 있으면 상자 없이도 열이 맞고, **열 머리의 라벨과
        세로로 이어져** 무슨 숫자인지가 읽힌다.
      */}
      <span className="flex">
        {KINDS.map((k) => (
          <span
            key={k}
            className={`w-8 text-center text-2xs tabular-nums ${
              u[k] > 0 ? `font-medium ${UNCOUNTED_CLASS[k]}` : 'text-fg-subtle/25'
            }`}
          >
            {u[k] > 0 ? u[k] : '·'}
          </span>
        ))}
      </span>
    </span>
  )
}

export default function RoundGridTable({ grid }: { grid: RoundGrid }) {
  /** 팀 계층인가 — 기준선 이름이 `기수`가 아니면 반 안으로 내려온 것이다 */
  const showCount = grid.baselineName !== '기수'

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {/*
              축 라벨은 좌상단이다(MG-02와 같은 자리). **기준선 이름이 바뀌면 여기도 바뀐다**
              — 안 바꾸면 무엇과 비교한 색인지 알 수 없다.
            */}
            {/*
              **좌상단에는 「이 표가 무엇인가」만 둔다.**

              전에는 여기 네 줄이 쌓여 있었다 — 표 이름 · 값의 뜻 · 용어 정의 · 색의 뜻.
              성격이 다른 셋이 같은 무게로 붙어 있어 번잡했고, 특히 용어 정의는
              **한 번 알면 다시 안 읽는 정보**가 매번 자리를 차지했다.

              층을 갈랐다: **표 이름은 여기**, **기호 설명(값·색)은 범례**,
              **용어 정의는 범례의 `ⓘ`**. 축 라벨은 *"이 축이 뭐냐"* 이고 범례는
              *"이 기호가 뭐냐"* 인데, `숫자 = 비율`·`색 = 부호`는 둘 다 기호 설명이라
              범례 것이다. 읽는 순서와도 맞는다 — 표를 보다 색이 궁금해지면 그때 아래를 본다.
            */}
            <th className="bg-surface sticky left-0 z-10 w-[172px] pb-2 text-left align-bottom font-normal">
              <span className="text-fg block text-xs font-semibold">
                {grid.baselineName === '기수' ? '반' : `${grid.baselineName} › 팀`}
              </span>
              <span className="text-fg-subtle block text-2xs">
                {grid.rows.length - 1}개 {grid.baselineName === '기수' ? '반' : '팀'}
              </span>
            </th>
            {grid.columns.map((c) => (
              <th key={c.projectId} className="pb-2 align-bottom">
                {/* 열 머리를 누르면 그 회차 현황으로 간다. 프로젝트명이 없으면 어느 회차인지 못 짚는다 */}
                <Link to={projectPath(c.projectId)} className="group block px-1 text-center">
                  <span className="text-fg group-hover:text-primary block text-xs font-semibold">
                    {c.label}
                  </span>
                  <span className="text-fg-subtle block truncate text-2xs">{c.projectName}</span>
                </Link>
              </th>
            ))}
            {/*
              **열 머리가 숫자의 뜻을 말한다.** `16 9 5 2`처럼 숫자만 나열하면 무엇이
              무엇인지 알 수 없고, 범례는 표 아래 오른쪽 끝이라 눈이 왕복해야 한다.
              표에서 그 일을 하는 것은 열 머리다 — 세 칸 위에 세 라벨을 얹는다.
            */}
            <th className="w-[216px] pb-2 pl-4 align-bottom">
              {/*
                설명 줄(`채점에서 빠져 분모가 줄었습니다`)을 뺐다 — **행 이름 열이
                `25명 → 채점 21`로 직접 보여주므로** 같은 말이 두 곳에 있었다.
              */}
              <span className="text-fg block text-right text-xs font-semibold">
                채점에서 빠진 사람
              </span>
              <span className="mt-0.5 flex items-end justify-end gap-0">
                <span className="w-7" />
                {KINDS.map((k) => (
                  <span
                    key={k}
                    className={`w-8 text-center text-2xs ${UNCOUNTED_CLASS[k]}`}
                    title={UNCOUNTED_LABEL[k]}
                  >
                    {UNCOUNTED_SHORT[k]}
                  </span>
                ))}
              </span>
            </th>
          </tr>
        </thead>

        <tbody>
          {grid.rows.map((row) => (
            <tr key={row.name}>
              {/*
                **기준선 행을 면으로 구분한다.** 색의 뜻이 전부 이 행 대비인데, 지금은
                배경도 흰색이고 아래 선 1px뿐이라 **그냥 첫 번째 행처럼 보였다.**
                무엇과 비교한 색인지 표에서 알 수 없으면 격자가 성립하지 않는다.
              */}
              <th
                scope="row"
                className={`sticky left-0 z-10 py-1.5 text-left font-normal ${
                  row.baseline ? 'bg-surface-2 border-border-strong border-b-2' : 'bg-surface'
                }`}
              >
                <span className="text-fg text-sm font-semibold">{row.name}</span>
                {/*
                  **분모를 행 이름 옆에 쓴다.** `미집계 16`이라고만 하면 *"무엇에서
                  줄었나"* 가 없어서, 사용자가 `25명 − 4`를 직접 빼야 했다(셀의 12%가
                  `30/234`인데 234가 화면 어디에도 없었다 — 호버에만).

                  **분모는 행의 속성**이지 셀마다 다르지 않으므로 행 이름 열이 그 자리다.
                  격자 칸은 여전히 값 하나라 E11을 안 어긴다 — 행 머리는 격자가 아니다.
                */}
                <span className="text-fg-subtle ml-1.5 text-2xs">
                  {row.size}명
                  {graded(row) < row.size && (
                    <span className="text-fg-muted"> → 채점 {graded(row)}</span>
                  )}
                </span>
                {/* 이 행이 왜 위에 있는지 — 정렬에서 빠지는 이유이기도 하다 */}
                {row.baseline && (
                  <span className="text-fg-muted mt-0.5 block text-2xs">아래 색의 기준</span>
                )}
              </th>

              {row.cells.map((cell) => {
                const label =
                  cell.state === 'VALUE'
                    ? `${cell.ratio}%`
                    : CELL_STATE_LABEL[cell.state as 'PENDING' | 'BEFORE']
                const hint =
                  cell.state === 'VALUE'
                    ? `위험자 ${cell.risky}명 / 채점 ${cell.graded}명${
                        cell.sign === 'BASELINE'
                          ? ''
                          : ` · ${grid.baselineName}보다 ${
                              cell.sign === 'WORSE'
                                ? '나쁨'
                                : cell.sign === 'BETTER'
                                  ? '좋음'
                                  : '같음'
                            }`
                      }`
                    : CELL_STATE_HINT[cell.state as 'PENDING' | 'BEFORE']
                return (
                  <td
                    key={cell.round}
                    className={`p-0.5 ${
                      row.baseline ? 'bg-surface-2 border-border-strong border-b-2' : ''
                    }`}
                  >
                    {/*
                      **포커스로도 같은 내용이 나온다.** 호버 전용이면 터치·키보드
                      사용자에게 분모가 아예 없다(PRODUCT.md — 키보드만으로 전 화면).
                    */}
                    <span
                      tabIndex={0}
                      title={hint}
                      aria-label={`${row.name} ${cell.round}차 · ${label} · ${hint}`}
                      className={`focus-visible:ring-primary block rounded-sm py-1.5 text-center text-sm tabular-nums focus-visible:ring-2 focus-visible:outline-none ${
                        cell.state === 'VALUE'
                          ? `font-semibold ${SIGN_CLASS[cell.sign]}`
                          : /*
                              **값이 없는 칸에 면을 깔지 않는다.** `bg-surface-2`를 줬더니
                              `집계 전` 열이 11행 내리 이어져 **정보가 없는 열이 표에서
                              가장 진한 띠**가 됐다. 없는 것은 조용해야 한다.
                            */
                            'text-fg-subtle/70 text-2xs'
                      }`}
                    >
                      {label}
                      {/*
                        **팀 계층에서만 실수를 같이 쓴다**(OP-02 §「팀 계층에는 방향이 없다」) —
                        4명 팀에서 1명이면 25%라 **비율이 튄다.** 반은 25명이라 그 문제가
                        없어서 붙이지 않는다.

                        E11(칸에 값 하나)의 예외다. 규칙의 이유가 *"칸마다 글자가 셋이면
                        색을 못 읽는다"* 인데, 여기는 **한 줄 더**이고 그것이 없으면 값
                        자체를 잘못 읽는다.
                      */}
                      {showCount && cell.state === 'VALUE' && (
                        <span className="text-fg-subtle block text-2xs font-normal">
                          {cell.risky}명
                        </span>
                      )}
                    </span>
                  </td>
                )
              })}

              <td
                className={`py-1.5 pl-4 text-right text-xs ${
                  row.baseline ? 'bg-surface-2 border-border-strong border-b-2' : ''
                }`}
              >
                <UncountedCell u={row.uncounted} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
