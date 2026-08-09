import { reachClass, reachFg } from '../labels'
import type { ChangeDirection, CohortCompare } from '../api/types'

/*
  기수 간 비교 — **같은 교안 · 같은 개념만.**

  ▸ **여기서는 절대 눈금이다**(1~4단). 같은 개념·같은 교안이라 두 기수에서 값의 뜻이
    같다 — 회차 흐름 탭이 부호를 쓰는 것과 **값의 성격이 다르다.** 그래서 이 탭에서만
    **MG-02 램프를 공유**하고, 그 공유가 여기서는 실제로 성립한다(op-06-admin.md OP06-2).
  ▸ **교안 버전을 함께 쓴다.** *"교안을 고친 것이 효과가 있었나"* 가 이 표의 핵심
    질문이고 버전이 없으면 답할 수 없다.
  ▸ **새 개념은 비교 대상이 아니라고 말한다.** 빈칸으로 두면 `0점`이나 `나빠졌다`로
    읽힌다.
  ▸ 회차 흐름 탭과 **같은 격자로 그린다** — 두 탭이 다른 표처럼 생기면 같은 화면으로
    안 읽힌다. 행이 검증 개념이고 열이 기수라는 것만 다르다.
*/

/**
 * 변화. **단위를 만들지 않는다** — 도달 단계는 기획이 정한 눈금이라 `단`을 쓸 수 있다.
 *
 * ⚠ **판정을 화면이 하지 않는다.** 한때 `|diff| <= 0.2`를 임계값으로 두고 갈랐는데
 * 그 숫자가 어느 문서에도 없어서 **화면이 기준을 만드는 것**이었다(E8). 서버가
 * `changeThreshold`를 갖고 판정까지 해 준다 — 여기서는 문구와 색만 고른다.
 */
function Change({ direction, delta }: { direction: ChangeDirection; delta: number | null }) {
  if (direction === 'NOT_COMPARABLE') {
    return (
      <span className="text-fg-subtle text-xs">
        비교 대상 아님
        <span className="mt-0.5 block text-2xs">한쪽 기수에 없거나 아직 집계 전인 개념</span>
      </span>
    )
  }
  const tone =
    direction === 'SIMILAR' ? 'text-fg-muted' : direction === 'WORSE' ? 'text-danger' : 'text-info'
  const label = direction === 'SIMILAR' ? '— 비슷' : direction === 'WORSE' ? '↘ 나빠짐' : '↗ 나아짐'
  return (
    <span className={`text-xs ${tone}`}>
      {label}
      {delta !== null && (
        <span className="mt-0.5 block text-2xs tabular-nums">
          {delta > 0 ? '+' : ''}
          {delta.toFixed(1)}단
        </span>
      )}
    </span>
  )
}

/** 도달 단계 칸. 값 하나 + 호버·포커스로 뜻 */
function ReachCell({ avg, label }: { avg: number | null; label: string }) {
  if (avg === null) {
    return (
      <span className="text-fg-subtle bg-surface-2 block rounded-sm py-1.5 text-center text-2xs">
        없던 개념
      </span>
    )
  }
  return (
    <span
      tabIndex={0}
      title={`${label} 평균 도달 ${avg.toFixed(1)}단 (1~4단)`}
      className={`focus-visible:ring-primary block rounded-sm py-1.5 text-center text-sm font-semibold tabular-nums focus-visible:ring-2 focus-visible:outline-none ${reachClass(avg)} ${reachFg(avg)}`}
    >
      {avg.toFixed(1)}
    </span>
  )
}

export default function CohortCompareTable({ data }: { data: CohortCompare }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="bg-surface sticky left-0 z-10 pb-2 text-left align-bottom font-normal">
              {/*
                **좌상단에는 「이 표가 무엇인가」만.** 값·색 설명은 아래 계단 범례가
                이미 하고 있었다 — 회차 흐름 탭과 같은 배치로 맞춘다(두 탭이 다르게
                생기면 같은 화면으로 안 읽힌다).
              */}
              <span className="text-fg block text-xs font-semibold">검증 개념</span>
              <span className="text-fg-subtle block text-2xs">같은 교안 · 같은 개념</span>
            </th>
            <th className="w-[104px] pb-2 text-center align-bottom">
              <span className="text-fg block text-xs font-semibold">{data.compareCohortLabel}</span>
              <span className="text-fg-subtle block text-2xs">지난 기수</span>
            </th>
            <th className="w-[104px] pb-2 text-center align-bottom">
              <span className="text-fg block text-xs font-semibold">{data.currentCohortLabel}</span>
              <span className="text-fg-subtle block text-2xs">이번 기수</span>
            </th>
            <th className="w-[112px] pb-2 pl-4 text-left align-bottom">
              <span className="text-fg block text-xs font-semibold">변화</span>
            </th>
            <th className="w-[124px] pb-2 pl-4 text-left align-bottom">
              <span className="text-fg block text-xs font-semibold">교안 버전</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.conceptId}>
              <th
                scope="row"
                className="bg-surface sticky left-0 z-10 py-1.5 pr-3 text-left font-normal"
              >
                <span className="text-fg block text-sm font-semibold">{r.conceptName}</span>
                {/* 출처가 없으면 어느 개념인지 짚을 수 없다 — 교안 위치까지 준다(G5) */}
                <span className="text-fg-subtle block text-2xs">{r.source}</span>
              </th>
              <td className="p-0.5">
                <ReachCell avg={r.baseAvg} label={data.compareCohortLabel ?? ''} />
              </td>
              <td className="p-0.5">
                <ReachCell avg={r.currentAvg} label={data.currentCohortLabel} />
              </td>
              <td className="py-1.5 pl-4">
                <Change direction={r.direction} delta={r.delta} />
              </td>
              <td className="text-fg-muted py-1.5 pl-4 text-xs">
                {r.baseVersion === null ? (
                  r.currentVersion
                ) : r.baseVersion === r.currentVersion ? (
                  <>
                    {r.currentVersion} <span className="text-fg-subtle">· 그대로</span>
                  </>
                ) : (
                  <>
                    {r.baseVersion} → <b className="text-fg font-semibold">{r.currentVersion}</b>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
