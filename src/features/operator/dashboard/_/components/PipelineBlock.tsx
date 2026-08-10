import { format, parseISO } from 'date-fns'
import { Link } from 'react-router'
import { GO_STATUS, projectPath } from '../labels'
import type { RoundPipeline } from '../api/types'

/*
  이번 회차 파이프라인 — **제출 → 분석 → 응시 → 리포트.**

  ▸ **`분석 실패`를 단계 자리에서 내렸다.** 목업은 `제출 231/250 → 분석 실패 2팀 →
    응시 198/231`이었는데 문제가 셋이었다:
      ① 실패는 **단계가 아니라 예외**인데 `분석` 단계 자리를 차지했다
      ② **단위가 명 → 팀 → 명**으로 튀어 "231명 중 2팀이 실패"로 읽힌다
      ③ 실패가 2팀인데 **응시 분모가 제출 전량**이라 산술이 안 맞았다
    단계를 정직하게 넷으로 두고 실패는 그 단계의 **보조**로 내리면 셋이 같이 풀린다.
  ▸ **응시 분모는 분석 완료 수**다 — 응시 창이 분석 완료부터 열린다(B4).
  ▸ 아직 제출이 없으면 뒤 단계를 **`—`로 그린다.** `0`이 아니다 — 없음과 0은 다르게
    표시한다(F3). 0으로 쓰면 "분석 실패가 0건"이라는 사실을 주장하게 되는데,
    아직 분석을 시작도 안 했다.
*/

/**
 * `07-16 18:00`. 연도는 기수 안에서 안 바뀐다.
 *
 * ⚠ **문자열을 자르지 않는다.** 한때 `iso.split('T')`로 잘랐는데, 서버 마감이
 * **UTC**(`2027-02-26T14:59:00Z`)라 그대로 자르면 **KST 23:59가 14:59로 보인다** —
 * 학생에게 알려주는 마감이 9시간 당겨진 채 표시된다. `Date`로 파싱해 보는 사람의
 * 시간대로 그린다.
 *
 * **날짜만 오는 값도 받는다**(회차 시작 `2026-08-03`). 그때는 시각을 안 쓴다 —
 * 없는 `00:00`을 지어내면 그 시각에 열리는 것처럼 읽힌다.
 */
function stamp(iso: string) {
  if (!iso.includes('T')) return format(parseISO(iso), 'MM-dd')
  return format(parseISO(iso), 'MM-dd HH:mm')
}

/**
 * 단계 하나. **값은 항상 중립색**이다 — 파이프라인의 숫자는 진행 상황이지 판정이 아니라서
 * 색을 칠하면 "제출 231이 나쁜 값"으로 읽힌다. 붉은 것은 `note`(실패)뿐이다.
 */
function Stage({
  label,
  children,
  note,
}: {
  label: string
  children: React.ReactNode
  /** 그 단계에 붙는 예외. 없어도 자리는 유지한다 — 아래 주석 */
  note?: React.ReactNode
}) {
  return (
    <span className="flex flex-col gap-0.5 pr-6">
      <span className="text-fg-subtle text-2xs">{label}</span>
      {/*
        `text-lg`(16px) + 볼드였는데, 이 블록은 **1줄짜리 컨텍스트**다(지금 어느 회차인가).
        네 값이 16px 볼드로 나란히 있으면 주인공(`조치 필요` 13px)보다 크게 외친다.
        14px + semibold로 내린다 — 여전히 본문보다 크고 숫자로 읽히지만 경쟁하지 않는다.
      */}
      <span className="text-base font-semibold tabular-nums">{children}</span>
      {/*
        **자리를 항상 차지한다.** 조건부로 붙이면 그 단계만 세로로 길어져 네 값의 기준선이
        어긋난다 — 실제 렌더에서 `분석`만 아래로 밀려 화살표와 안 맞았다.

        목업 링크는 10px인데 **타입 램프에 10px 단계가 없다**(01-design-checklist 「미반영」 —
        *"11px로 올릴지 램프에 마이크로 단계를 추가할지 결정 필요"*). 열려 있는 결정을
        화면이 대신 내리지 않고 **이미 있는 11px(`text-2xs`)** 로 올린다.
      */}
      <span className="mt-px min-h-4 text-2xs">{note}</span>
    </span>
  )
}

/**
 * 단계 사이 화살표. 장식이라 읽어줄 것이 없다.
 * 값 줄에 맞춰 내린다 — `items-center`로 두면 라벨·보조줄까지 포함한 가운데라 값보다 아래다.
 */
const Arrow = () => (
  <span aria-hidden className="text-border-strong -mt-1 pr-6 text-sm">
    →
  </span>
)

export default function PipelineBlock({ p, today }: { p: RoundPipeline; today: string }) {
  /** 아직 안 일어난 단계 — 값이 아니라 부재다 */
  const none = <span className="text-fg-subtle">—</span>

  /*
    **마감이 판별선이다.** 같은 `19명 미제출`이라도 마감 전이면 진행 중이고 마감 후면
    사고다 — 지표판은 그 둘을 구분해서 말해야 한다. 지금까지는 마감 시각을 오른쪽 구석에
    회색으로만 써서, 사용자가 오늘 날짜와 비교해 판단해야 했다.
  */
  // 마감이 UTC라 날짜도 로컬로 옮겨 비교한다 — 자정 근처에서 하루가 어긋난다
  const overdue = p.dueAt !== null && format(parseISO(p.dueAt), 'yyyy-MM-dd') < today

  /**
   * **각 단계에서 빠진 수를 명시한다.** 지표판인데 분수만 주면 `231/250`에서 19를
   * 사용자가 빼야 한다 — 그 뺄셈이 이 화면이 대신해야 하는 판단이다.
   *
   * 마감 전에는 중립(아직 낼 수 있다), 마감 후에는 붉은색(확정된 결손).
   */
  const missing = (n: number, label: string) =>
    n > 0 && (
      <span className={overdue ? 'text-danger font-medium' : 'text-fg-subtle'}>
        {n}명 {label}
      </span>
    )

  return (
    <div className="flex flex-wrap items-center px-6 py-2.5">
      <Stage label="제출" note={!p.notStarted && missing(p.total - p.submitted, '미제출')}>
        {p.submitted}
        <span className="text-fg-subtle text-xs font-normal">/{p.total}</span>
      </Stage>
      <Arrow />

      <Stage
        label="분석"
        /*
          실패는 단계값이 아니라 **이 단계에 붙는 예외**다. 유일하게 붉은 값이므로 갈 곳이
          있어야 한다(OP-01 §5) — 그 회차 현황으로 보낸다. 실패가 0이면 줄 자체가 없다:
          `0팀 실패`는 누를 이유가 없고, 없는 문제를 매번 보고하는 줄이 된다.
        */
        note={
          !p.notStarted &&
          p.analysisFailedTeams > 0 && (
            <Link to={projectPath(p.projectId)} className="text-danger font-bold hover:underline">
              ⚠ {p.analysisFailedTeams}팀 실패 · {GO_STATUS} ↗
            </Link>
          )
        }
      >
        {p.notStarted ? (
          none
        ) : (
          <>
            {p.analyzed}
            <span className="text-fg-subtle text-xs font-normal">/{p.submitted}</span>
          </>
        )}
      </Stage>
      <Arrow />

      {/* 분모가 제출이 아니라 **분석 완료 수**다 — 응시 창이 분석 완료부터 열린다(B4) */}
      <Stage label="응시" note={!p.notStarted && missing(p.analyzed - p.attended, '미응시')}>
        {p.notStarted ? (
          none
        ) : (
          <>
            {p.attended}
            <span className="text-fg-subtle text-xs font-normal">/{p.analyzed}</span>
          </>
        )}
      </Stage>
      <Arrow />

      <Stage
        label="리포트"
        /* 왜 아직 없는지를 쓴다 — 부재의 이유는 해석이 아니다(A7) */
        note={
          !p.notStarted &&
          !p.reportPublished && <span className="text-fg-subtle">마감 후 일괄 발행</span>
        }
      >
        {p.notStarted ? none : p.reportPublished ? '발행' : '미발행'}
      </Stage>

      {/*
        오른쪽 메타. 회차를 **전체 중 몇 번째**로 쓴다 — 오퍼레이터는 기수를 운영하므로
        "아직 남았다"와 "마지막 회차다"의 판단이 다르다(OP-01 §3). 분모는 등록된
        프로젝트 수이고 `8` 같은 상수가 아니다(OP-02 §4-2).
      */}
      <span className="text-fg-subtle ml-auto text-right text-xs leading-[1.7]">
        {p.roundLabel.replace(/\s\d+차$/, '')}{' '}
        <b className="text-fg-muted font-medium">
          {p.roundNo}차 / {p.roundTotal}회
        </b>
        {p.dueAt && (
          <>
            {' · 제출 마감 '}
            <b className={overdue ? 'text-danger font-bold' : 'text-fg-muted font-medium'}>
              {stamp(p.dueAt)}
              {overdue && ' 지남'}
            </b>
          </>
        )}
        {p.startAt && (
          <>
            {' · 제출 시작 '}
            <b className="text-fg-muted font-medium">{stamp(p.startAt)}</b>
          </>
        )}
        <br />
        {p.notStarted ? (
          '아직 들어온 제출이 없습니다'
        ) : (
          <>
            응시 창은 <b className="text-fg-muted font-medium">개인별 24시간</b>(분석 완료부터)
          </>
        )}
      </span>
    </div>
  )
}
