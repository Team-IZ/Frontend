import type { Report } from '../api/types'

function Stat({
  label,
  value,
  unit,
  detail,
}: {
  label: string
  value: string
  unit: string
  detail: string
}) {
  return (
    <div className="bg-surface-2 rounded-md p-4">
      <span className="text-fg-subtle mb-1 block text-2xs">{label}</span>
      <span className="text-fg text-xl font-bold tracking-[-0.01em] tabular-nums">
        {value}
        <small className="text-fg-subtle ml-0.5 text-xs font-semibold">{unit}</small>
      </span>
      <span className="text-fg-subtle mt-1 block text-2xs leading-normal">{detail}</span>
    </div>
  )
}

/** 요약 — "무엇을 빼고 세었나" + "그래서 어땠나". 분모를 맨 앞에 둔다(외부 문서라 각주로 달면 못 찾는다) */
export default function DiagnosisSummary({ report }: { report: Report }) {
  const { excluded } = report
  const overallRisk = report.classRisk.find((c) => c.className === '기수 전체')
  /*
   * 서버는 심각도 순이 아니라 교안·섹션 순으로 준다(백엔드 DTO 확인: "개념별 탭은
   * 교안을 고칠 자리를 찾는 화면이라 교안 순서가 맞고, 요약 탭만 심각도 순이
   * 필요하다"). 그래서 이 화면에서만 belowLevel2Count/gradedCount 내림차순으로
   * 다시 정렬한 뒤 앞 3개를 자른다 — ConceptDistribution.tsx(개념별 탭)는 서버가
   * 준 교안 순서를 그대로 쓴다.
   */
  const worstConcepts = [...report.concepts]
    .sort((a, b) => b.belowLevel2Count / b.gradedCount - a.belowLevel2Count / a.gradedCount)
    .slice(0, 3)
  return (
    <div>
      <div className="mb-4 grid grid-cols-4 gap-3">
        {/*
          "반당 N명"을 나눗셈으로 만들지 않는다 — 250/10은 25지만 247/10은 24.7명이
          되고, 그건 실제로 존재하지 않는 반이다. 반별 인원은 classRisk에 실제 값이
          있으므로 요약에서 평균을 지어낼 이유가 없다.
        */}
        <Stat
          label="교육생"
          value={String(report.traineeCount)}
          unit="명"
          detail={`${report.classCount}개 반`}
        />
        <Stat
          label="미니프로젝트"
          value={String(report.completedRounds)}
          unit="회"
          detail={`등록 ${report.totalRounds}회 중`}
        />
        <Stat
          label="검증 개념"
          value={String(report.conceptCount)}
          unit="건"
          detail={`교안 ${report.curriculumCount}종`}
        />
        <Stat
          label="채점된 응시"
          value={report.gradedCount.toLocaleString()}
          unit="건"
          detail={`전체 ${report.totalSubmissionCount.toLocaleString()}건`}
        />
      </div>
      {/*
        "채점 범위"(분모 계산)와 "범위 안내"(재시험 경계)를 한 줄에 섞지 않는다 —
        전자는 숫자가 실제로 이 문서의 분모에 반영된 값이고, 후자는 계산과 무관한
        범위 설명이다. 섞으면 "재시험 결과 제외"도 119건 안에 든 것처럼 오독된다.
      */}
      <div className="bg-surface-2 rounded-md px-4 py-3 text-xs">
        <div>
          <span className="text-fg-subtle mb-1.5 block text-2xs font-bold">채점 범위</span>
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 tabular-nums">
            <span>
              전체 응시 <b className="text-fg">{report.totalSubmissionCount.toLocaleString()}</b>건
            </span>
            <span className="text-fg-subtle">−</span>
            <span>
              미응시 <b className="text-fg">{excluded.notTaken}</b>
            </span>
            <span className="text-fg-subtle">−</span>
            <span>
              무효 응시 <b className="text-fg">{excluded.invalid}</b>
            </span>
            <span className="text-fg-subtle">−</span>
            <span>
              중단 <b className="text-fg">{excluded.interrupted}</b>
            </span>
            <span className="text-fg-subtle">=</span>
            <span>
              채점 <b className="text-fg">{report.gradedCount.toLocaleString()}</b>건
            </span>
          </div>
        </div>
        <div className="border-border text-fg-subtle mt-2.5 border-t pt-2 leading-[1.6]">
          재시험 결과는 반영하지 않았습니다(1차 결과만 집계)
        </div>
      </div>
      {/*
        **요약이 규모와 분모만 말하면 요약이 아니다.** 여기까지 다 읽고도 "그래서 이번
        기수 수업은 어땠는가"에 답이 없으면, 첫 장이 목차 역할만 하고 끝난다 — 외부로
        나가는 문서에서 그건 한 장을 버리는 것이다. 그래서 나머지 섹션의 헤드라인만
        올린다.

        해석이 아니라 **정렬된 데이터의 앞 세 줄**이다(이 화면에서 심각도 내림차순으로
        직접 정렬한다 — 위 `worstConcepts` 참고) — 집단 미달 표가 색 임계값 없이 정렬만으로 순위를 전달하는 것과 같은
        논리라 §4("값·라벨·범례·분모만")에 걸리지 않는다. "심각"·"주의" 같은 라벨도,
        색 임계값도 붙이지 않는다.
      */}
      <div className="mt-5">
        <h5 className="mb-2 text-xs font-bold">2단 이하가 가장 많았던 개념</h5>
        {worstConcepts.length === 0 ? (
          <p className="text-fg-subtle text-xs">확정 전이라 아직 값이 없습니다.</p>
        ) : (
          <div className="border-border divide-border divide-y rounded-md border">
            {worstConcepts.map((c) => (
              <div key={c.id} className="flex items-baseline gap-3 px-4 py-2.5 text-xs">
                <span className="text-fg min-w-0 flex-1 font-semibold">
                  {c.name}
                  <small className="text-fg-subtle ml-1.5 font-normal">
                    {c.curriculumName} {c.curriculumVersion} · {c.section}
                  </small>
                </span>
                <span className="shrink-0 tabular-nums">
                  <b className="text-fg">
                    {Math.round((c.belowLevel2Count / c.gradedCount) * 100)}%
                  </b>
                  <small className="text-fg-subtle ml-1.5 font-normal">
                    {c.belowLevel2Count} / {c.gradedCount}명
                  </small>
                </span>
              </div>
            ))}
          </div>
        )}
        {/*
          "우수 교육생 N명"·"집단 미달 N건"도 여기 있었는데 뺐다 — 가로 탭이 같은
          숫자를 라벨 옆에 이미 달고 있어서, 같은 값이 한 화면에 두 번 나오면 읽는
          사람은 둘이 서로 다른 뜻일 거라고 의심한다. 반별 위험자 비율만 남긴 이유는
          이것만 탭에 없고(탭은 개수만 센다) 나머지 요약 카드들과 성격이 같아서다.
        */}
        {overallRisk && (
          <p className="text-fg-muted mt-2.5 text-xs">
            위험자(2단 이하 개념 2개 이상)는 기수 전체{' '}
            <b className="text-fg tabular-nums">
              {Math.round((overallRisk.atRiskCount / overallRisk.traineeCount) * 100)}%
            </b>
            <span className="text-fg-subtle tabular-nums">
              {' '}
              ({overallRisk.atRiskCount} / {overallRisk.traineeCount}명)
            </span>
            입니다.
          </p>
        )}
      </div>
    </div>
  )
}
