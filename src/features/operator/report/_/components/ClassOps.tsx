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
 *   - 정렬은 나쁜 순 — 등수 숫자는 안 붙인다(E2).
 *
 * ⚠ **서버가 나쁜 순으로 주지 않는다.** 이 주석은 *"이미 이렇게 정렬된 데이터가 온다"*
 * 라고 적혀 있었는데 실측은 **반 이름순**이었다(A 17 · B 17 · C 16 · **D 21** · E 13 ·
 * F 17 · G 12 · H 19 — 최악인 D반이 4번째). 아래 집단 미달 표도 같았다.
 * **믿지 말고 화면에서 정렬한다** — 나쁜 순이 이 섹션의 규칙이다.
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
  const rows = classRisk
    .filter((c) => c.className !== '기수 전체')
    /* 나쁜 순. 비율이 같으면 반 이름순이라 순서가 조회마다 흔들리지 않는다 */
    .sort((a, b) => {
      const r = (c: ClassRiskRate) => (c.traineeCount > 0 ? c.atRiskCount / c.traineeCount : -1)
      return r(b) - r(a) || a.className.localeCompare(b.className)
    })

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

  /*
    ⚠ **서버는 반 이름순으로 준다**(실측 — A→H). 그러면 **가장 나쁜 반이 맨 아래**
    깔린다(8기에서 H반 88%가 11번째였다). 바로 위 「반별 위험자 비율」은 나쁜 순인데
    여기만 알파벳순이라, 같은 섹션 안에서 두 표가 다른 규칙으로 정렬돼 있었다.

    ─── 정렬 컨트롤을 달지 않는 이유 ────────────────────────────
    이 화면은 탐색 도구가 아니라 **문서**다(정의서 §4). 조작이 늘수록 화면과 PDF가
    어긋나고(개념별 분포 토글이 이미 *"PDF·CSV에는 전체가 교안순으로"* 라는 경고를
    달고 있다), 11행짜리 표에 정렬 UI는 콘텐츠보다 컨트롤이 커지는 쪽이다.

    ─── 대신 한 순서로 두 질문에 답한다 ──────────────────────────
    이 표에는 **다른 질문 둘**이 걸려 있다.
      ① *"어디가 제일 나쁜가"* → 미달 비율 순
      ② *"같은 개념이 여러 반에서 반복되나"* → 개념끼리 붙어 있어야 보인다(반복 배지)
    비율 하나로만 줄 세우면 ②가 흩어지고, 개념으로만 묶으면 ①이 사라진다.
    **개념을 그 개념의 최악 비율로 줄 세우고, 개념 안에서 다시 비율 순**으로 둔다 —
    맨 위가 곧 최악이면서 같은 개념이 붙어 있다.

    정렬은 화면이 만드는 규칙이 아니라 **값 그대로의 순서**라 E8(화면이 기준을 정하지
    않는다)에 안 걸린다 — 등수 숫자도 안 붙인다(E2).
  */
  const rate = (s: GroupShortfall) => s.shortfallCount / s.totalCount
  const worstByConcept = new Map<string, number>()
  for (const s of groupShortfalls) {
    worstByConcept.set(s.conceptName, Math.max(worstByConcept.get(s.conceptName) ?? 0, rate(s)))
  }
  const sortedShortfalls = [...groupShortfalls].sort(
    (a, b) =>
      worstByConcept.get(b.conceptName)! - worstByConcept.get(a.conceptName)! ||
      a.conceptName.localeCompare(b.conceptName) ||
      rate(b) - rate(a),
  )

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-1.5">
        <h5 className="text-xs font-bold">반별 위험자 비율</h5>
        <span className="text-fg-subtle text-2xs">
          · 2단 이하 개념이 2개 이상인 학생 · {roundLabel}
        </span>
      </div>
      {/*
        ⚠ **빈 상자를 그리지 않는다.** `{overall && …}`만 걸어 놨더니 기준선 값이 없을 때
        **테두리만 남은 흰 상자**가 떴다 — 무엇을 기다리는 건지, 원래 비어 있는 건지
        아무 말도 안 한다. 반이 0개일 때도 라벨 줄만 남았다.

        「없음」(실선)이다 — 발행 시점에 얼린 문서라 기다린다고 채워지지 않는다
        (02-layout §4 유형 2). 바로 아래 집단 미달 빈 상태와 같은 규칙이다.
      */}
      {!overall || rows.length === 0 ? (
        <Empty variant="empty" className="mb-6">
          <EmptyHeader>
            <EmptyTitle>반별로 낼 수 있는 비율이 없습니다</EmptyTitle>
            <EmptyDescription>
              {!overall
                ? '기수 전체 기준선이 집계되지 않아 반끼리 견줄 수 없습니다.'
                : '이 기수에 편성된 반이 없습니다.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="border-border bg-surface mb-6 rounded-md border px-5 py-3">
          <RiskBars overall={overall} rows={rows} />
        </div>
      )}

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
            <EmptyTitle>반 절반 이상이 미달한 프로젝트가 없습니다</EmptyTitle>
            <EmptyDescription>위험 판정이 모두 개인 사유로 남았습니다.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <TableFrame>
          <Table className="table-fixed rounded-none border-0">
            <TableHeader>
              <TableRow>
                {/*
                  **흡수 열은 「검증 개념」이다.** 반대로 잡혀 있어서 `회차 · 반`이
                  634px를 먹고(실측) 내용은 `6차 · A반` 한 줄뿐이라, 개념 이름 옆에
                  빈 벌판이 붙어 두 열이 붙어 보였다. 서술 열이 남는 폭을 가져가야
                  데이터가 왼쪽에 붙어 스캔된다(표 열 폭 표준 · OP-03 D22와 같다).
                */}
                <TableHead>검증 개념</TableHead>
                <TableHead className="w-[200px]">프로젝트 · 반</TableHead>
                <TableHead className="w-[116px] text-right">미달</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedShortfalls.map((s, i) => (
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
                    {/*
                      ⚠ **`round`가 빈 문자열로 온다**(실측 — 8기 11건 전부, 21차 Q3).
                      그대로 이어 붙이면 `· H반`처럼 **구분점만 매달린다** — 없는 값
                      자리에 구분자를 그리지 않는다. 서버가 값을 주면 그대로 붙는다.
                    */}
                    {[s.round, s.className].filter(Boolean).join(' · ')}
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
  /*
    ⚠ **인원이 0이면 비율이 `NaN`이다** — 그대로 그리면 `NaN%`가 찍히고 막대 폭도 깨진다.
    모르는 값을 0으로 채우지 않는다(그러면 「위험자 없음」이라고 거짓말을 한다) —
    아래에서 그 행만 `—`로 그린다.
  */
  const ratio = (c: ClassRiskRate) => (c.traineeCount > 0 ? c.atRiskCount / c.traineeCount : null)
  const cohortRate = ratio(overall) ?? 0

  /*
    눈금은 0~100%가 아니라 데이터 범위에 맞춘다(ClassCompareBlock과 같은 이유) —
    값이 12~36%인데 트랙을 100%로 잡으면 막대가 전부 왼쪽에 몰려 차이가 안 보인다.
  */
  const scale = Math.max(cohortRate, ...rows.map((r) => ratio(r) ?? 0), 0.01) * 1.15
  const pct = (rate: number) => `${(rate / scale) * 100}%`

  return (
    <div>
      {/* 기준선 라벨 — 트랙 위 한 번만. 매 행마다 반복하면 10번 겹친다 */}
      <p className="text-fg-subtle mb-2 flex h-4 items-end text-2xs">
        <span className="w-[112px] shrink-0" />
        <span className="relative flex-1">
          {/*
            **선 위 중앙에 앉힌다.** `left`만 주고 `pl-1.5`로 밀었더니 글자가 통째로
            선 오른쪽에 서서, 어느 위치를 가리키는지 눈으로 재야 했다.
            `translateX(-50%)`가 글자 폭을 몰라도 중앙을 잡는다.
          */}
          <span
            className="text-fg-muted absolute font-semibold whitespace-nowrap"
            style={{ left: pct(cohortRate), top: '-10px', transform: 'translateX(-50%)' }}
          >
            기수 전체 {Math.round(cohortRate * 100)}%
          </span>
        </span>
        <span className="w-[118px] shrink-0" />
      </p>
      {rows.map((row) => {
        const rate = ratio(row)
        /** 기준선 초과 = 기수보다 나쁘다. 같으면 초과가 아니다 */
        const worse = rate != null && rate > cohortRate
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
                style={{ width: rate == null ? 0 : pct(rate) }}
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
                {/* 인원이 0이면 비율이 없다 — 0%가 아니다 */}
                {rate == null ? '—' : `${Math.round(rate * 100)}%`}
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
