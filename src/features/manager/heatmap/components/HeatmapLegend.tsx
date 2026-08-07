import { REACH_STYLE, NA_PATTERN } from '@/components/common/reach'
import { cn } from '@/lib/utils/cn'

/*
  색 범례 — 표를 읽는 열쇠라 표 바로 위(오른쪽 정렬)에 둔다(정의서 "범례는 히트맵
  바로 아래"였다가 목업 최종본에서 표 위로 자리 잡았다 — 케이스 계약은 목업이
  원천이라 그대로 따른다). 개인 뷰에서만 단계 뜻(1~4단)을 같은 줄에 더 붙인다 —
  반·팀 뷰는 평균이라 "N단"이 없어 필요 없다.

  ⚠ 테두리 예시(왼쪽)는 렌더 확인 후 사용자 요청으로 추가했다 — "테두리가 언제
  붙는지" 질문을 받고 글로 답하는 대신, 색 범례와 같은 줄 왼쪽에 실제 모양을 그려서
  보여준다. 표 카드 밖(이 컴포넌트는 `HeatmapTable` 앞에 그려진다)에 있어 카드 안
  실제 셀과 헷갈리지 않는다.

  ⚠ 밑줄 예시는 뺐다 — 취약·주의 라벨과 함께 밑줄 표시 자체를 없앴다(렌더 확인 후
  사용자 지시). 이제 판정 신호는 색과 이 테두리 하나뿐이다.

  ⚠ 개인 히트맵의 ↑(다시 보기로 상승) 예시를 추가했다(렌더 확인 후 사용자 지시) —
  지난 라운드에 그룹 안내 문구("↑(재응시 후 상승)")를 한 문장 형식으로 줄이며 그
  설명이 빠졌는데, "화살표 설명을 붙여 달라"는 요청을 받아 문구 대신 여기 예시로
  옮겼다. `showLevelMeaning`(개인 뷰에서만 true)으로 같이 가려 반·팀 뷰에는 안
  보이게 했다 — 그 뷰엔 재응시 개념(개인 단계)이 없다.

  ⚠ **줄맞춤 버그(이번 라운드 수정)** — 처음 넣었을 때 스와치 폭을 기존 `w-9`
  고정값 그대로 두고, 화살표만 `text-[15px]`로 글자 크기를 다르게 얹었다. 폭이
  좁아 "2단↑"이 한 줄에 다 안 들어가 줄바꿈되는 게 렌더 확인에서 드러났다(사용자
  스크린샷). 스와치를 **고정 폭 대신 `min-w-9` + 가로 패딩 + `whitespace-nowrap`**
  으로 바꿔 내용 길이에 맞게 늘어나게 했고(테두리 예시에도 같이 적용 — 부작용
  없음), 화살표 크기도 스와치 다른 글자와 같은 크기로 통일해 두 줄로 갈라지는
  원인 자체를 없앴다.
*/
const LEVEL_MEANING: [string, string][] = [
  ['1단', '무엇을 하는지'],
  ['2단', '왜 그렇게 했는지'],
  ['3단', '다른 방법과 비교'],
  ['4단', '언제 깨지는지'],
]

function MarkExample({
  swatchClassName,
  swatchLabel,
  desc,
}: {
  swatchClassName: string
  swatchLabel: React.ReactNode
  desc: string
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn(
          'flex h-6 min-w-9 items-center justify-center rounded-xs px-1.5 text-[11px] font-bold whitespace-nowrap',
          swatchClassName,
        )}
      >
        {swatchLabel}
      </span>
      <span className="text-2xs text-fg-muted">{desc}</span>
    </span>
  )
}

export default function HeatmapLegend({ showLevelMeaning }: { showLevelMeaning: boolean }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <MarkExample
          swatchClassName={cn(
            REACH_STYLE[2],
            'outline outline-2 outline-warning outline-offset-[-2px]',
          )}
          swatchLabel="2.0"
          desc="테두리 = 집단 미달(과반 2단 이하)"
        />
        {showLevelMeaning && (
          <MarkExample
            swatchClassName={REACH_STYLE[3]}
            swatchLabel="2단 ↑"
            desc="↑ = 재응시 후 상승"
          />
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5 text-2xs text-fg-muted">
          <span>취약</span>
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <span
              key={l}
              aria-hidden="true"
              className={cn('h-3 w-[18px] rounded-xs', REACH_STYLE[l].split(' ')[0])}
            />
          ))}
          <span>양호</span>
          <span aria-hidden="true" style={NA_PATTERN} className="ml-1.5 h-3 w-[18px] rounded-xs" />
          <span>문항 없음</span>
        </div>
        {showLevelMeaning && (
          <div className="flex flex-wrap justify-end gap-3.5 text-2xs text-fg-subtle">
            {LEVEL_MEANING.map(([step, desc]) => (
              <span key={step}>
                <b className="font-bold text-fg-muted">{step}</b> {desc}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
