import type { ClassCompare } from '../api/types'

/*
  반 비교 막대.

  ▸ **기준선이 이 블록의 핵심이다.** 막대만 두면 `32%`가 나쁜 값인지 이 회차가 원래
    그런지 **화면에서 알 수 없다.** 목업은 상위 몇 개를 경고색으로 칠했는데 그 경계에
    근거가 없었다 — 화면이 기준을 정하는 것이라 E8이 금지한다.

    **기수 전체 비율은 우리가 정한 임계값이 아니라 관측값**이라 E8에 걸리지 않는다.
    그리고 OP-02가 *"난이도는 기수 전체를 빼면 상쇄된다"* 며 쓰는 것과 같은 기준선이라,
    두 화면이 같은 잣대로 말하게 된다.

  ▸ **등수를 붙이지 않는다**(A6). 나쁜 순으로 정렬하되 `1위·2위` 숫자는 없다 — 금지된
    것은 순위 표기이지 정렬이 아니고, 이 블록의 질문이 *"어느 반이 처지나"* 다.
  ▸ 값은 **집단 미달로 판정된 개념(9-6)을 뺀 뒤** 센 것이다(서버가 그렇게 준다).
    안 빼면 반 전체가 한 지점에서 멈춘 것이 개인 위험이 많은 반처럼 보인다(OP-01 §3).

  **색은 기준선 대비 부호만 말한다** — 넘었나 아닌가 둘뿐이다. 농도 구간을 만들면
  그 경계에 다시 근거가 없어진다(02-layout §7).
*/
export default function ClassCompareBlock({ c }: { c: ClassCompare }) {
  /*
    **눈금은 0~100%가 아니라 데이터 범위에 맞춘다.** 값이 12~32%인데 트랙을 100%로 잡으면
    막대가 전부 왼쪽 1/3에 몰려 차이가 안 보인다. 최대값에 여유를 두고(1.15배) 잘라야
    12%와 32%가 실제로 세 배 차이로 읽힌다.

    ⚠ **눈금 상한은 데이터에서 나온 값이지 우리가 정한 기준이 아니다**(E8과 무관) —
    다만 회차가 바뀌면 상한도 바뀌므로 **막대 길이를 회차끼리 비교하면 안 된다.**
    그 비교는 OP-02 격자의 일이고, 여기는 같은 회차 안에서 반끼리만 견준다.
  */
  const scale = Math.max(c.cohortRatio, ...c.classes.map((r) => r.ratio), 1) * 1.15
  const pct = (v: number) => `${(v / scale) * 100}%`

  return (
    <div className="px-6 py-3">
      {/*
        기준선 라벨. 선만 두면 그 선이 무엇인지 알 수 없고, 셀 안에 쓰면 열 개 줄에
        열 번 반복된다 — 트랙 위 한 번만 쓴다.

        `translate-x-0`(왼쪽 정렬)이 아니라 가운데 정렬이면 라벨이 막대 위로 겹친다 —
        선 오른쪽에 붙여 트랙 안쪽 빈 자리를 쓴다.
      */}
      <p className="text-fg-subtle mb-2 flex h-4 items-end gap-3 text-2xs">
        <span className="w-[42px] shrink-0" />
        <span className="relative flex-1">
          <span className="absolute whitespace-nowrap" style={{ left: pct(c.cohortRatio) }}>
            <span className="text-fg-muted pl-1.5 font-semibold">기수 전체 {c.cohortRatio}%</span>
          </span>
        </span>
        <span className="w-24 shrink-0" />
        <span className="w-14 shrink-0" />
      </p>

      {c.classes.map((row) => {
        /** 기준선 초과 = 기수보다 나쁘다. 같으면 초과가 아니다 */
        const worse = row.ratio > c.cohortRatio
        return (
          /*
            행 간격 `py-0.5`(2px)는 막대 높이 16px에 비해 너무 붙어서 열 줄이 한 덩어리로
            보였다. `py-1.5`(6px)면 행 높이가 28px가 되어 **줄 하나를 눈으로 집을 수 있다** —
            이 블록은 개수가 정해져 있어(반 10개) 간격을 늘려도 뷰포트를 안 넘는다
            (02-layout §6 — 개수가 정해진 것은 간격을 줄여 맞추고, 반대로 여유도 낼 수 있다).
          */
          <div key={row.className} className="flex items-center gap-3 py-1.5 text-sm">
            <span className="w-[42px] shrink-0 font-semibold">{row.className}</span>

            {/* 남는 폭은 시각 요소가 가져간다 — 막대가 길수록 분포가 잘 읽힌다(02-layout §5) */}
            <span className="bg-surface-2 relative h-4 flex-1 overflow-hidden rounded-sm">
              {/*
                목업 막대는 primary를 연하게 푼 별도 색인데 **그 값이 토큰에 없다.**
                리터럴은 가드가 막고(`check:design`), 화면 하나 때문에 차트 색 토큰을
                새로 만들지도 않는다(D9 — 3번 반복되기 전엔 추출하지 않는다).
                기존 토큰의 알파로 채운다: 10줄이 진한 면이면 막대가 아니라 벽이 된다.
                **두 번째 화면에서 같은 색이 필요해지면 그때 토큰으로 올린다.**
              */}
              {/*
                **기준선을 넘은 반에만 색이 붙는다.** 열 개가 전부 칠해져 있으면 색이
                신호가 아니라 바탕이 된다 — 프로젝트 목록이 깔끔한 이유가 정확히 이것이고
                (색 면적 1%, 예외에만), 이 블록은 5%였다.

                정상 범위는 무채색으로 두면 **붉은 다섯 줄이 실제로 튄다.** 막대 길이는
                여전히 전 행에서 비교되므로 잃는 정보가 없다.
              */}
              <span
                className={`block h-full rounded-sm ${worse ? 'bg-danger/55' : 'bg-border-strong'}`}
                style={{ width: pct(row.ratio) }}
              />
              {/* 기준선. 막대 위에 얹혀야 넘었는지가 보인다 */}
              <span
                aria-hidden
                className="bg-fg-muted absolute inset-y-0 w-px"
                style={{ left: pct(c.cohortRatio) }}
              />
            </span>

            <span className="text-fg-muted w-24 shrink-0 text-right text-xs tabular-nums">
              <b className={worse ? 'font-bold text-danger' : 'font-semibold text-fg'}>
                {row.ratio}%
              </b>{' '}
              · {row.risky}/{row.graded}명
            </span>

            {/*
              담당 없는 반. `조치 필요`가 이미 한 줄로 말하지만, 막대만 보고 "이 반이 왜
              이런가"를 물을 때 담당이 없다는 사실이 같은 줄에 있어야 한다(목업 `#assign`).
              색만으로 말하지 않게 글자를 쓴다(F4).

              **자리를 항상 차지한다.** 조건부로 붙이면 그 줄만 값 열이 왼쪽으로 밀려
              숫자 정렬이 깨진다(실제로 렌더에서 F반만 어긋났다).
            */}
            <span className="text-danger w-14 shrink-0 text-right text-2xs font-bold">
              {!row.hasManager && '담당 없음'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
