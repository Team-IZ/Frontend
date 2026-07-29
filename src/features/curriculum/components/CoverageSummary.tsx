import { Card } from '@/components/ui/Card'

/*
  SC-M12 · CUR-02 커버리지 요약.

  "이 기수 프로젝트가 측정하는 주제 N개 중 M개를 이 교안이 커버"를 보여준다.
  전적으로 읽기다 — 자동 계산이고 매니저 액션이 없다(§6 CUR-02 case 5).

  미커버 주제는 "한 교안이 전부 커버할 필요 없음"이라 오류가 아니라, 기수에 교안을
  더 올리라는 커버리지 신호다(D103). 그래서 위험(danger)이 아니라 주의(warning)
  색으로, "교안 추가 권장" 문구와 함께 보여준다.
*/
type Props = {
  /** 기수 라벨. 예: "7기" */
  cohortLabel: string
  /** 이 기수 프로젝트가 측정하는 전체 주제 수 */
  total: number
  /** 그중 이 교안이 커버하는 수 */
  covered: number
  /** 이 기수 어느 교안도 안 다루는 주제 */
  uncovered: string[]
}

export default function CoverageSummary({ cohortLabel, total, covered, uncovered }: Props) {
  return (
    <Card className="gap-4 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">커버리지 요약</h3>
        <span className="text-fg-subtle text-xs">자동 계산 · 매니저 액션 없음</span>
      </div>

      <p className="text-fg-muted text-base">
        이 기수({cohortLabel}) 프로젝트가 측정하는 주제{' '}
        <b className="text-fg tabular-nums">{total}개</b> 중{' '}
        <b className="text-primary tabular-nums">{covered}개</b>를 이 교안이 커버합니다.
      </p>

      {uncovered.length === 0 ? (
        <p className="text-success text-sm">이 기수 측정 주제를 모두 커버합니다.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-fg-subtle text-xs">
            미커버 — 이 기수 교안 어디에도 없음 · 교안 추가 권장
          </p>
          <div className="flex flex-wrap gap-2">
            {uncovered.map((topic) => (
              <span
                key={topic}
                className="bg-warning-soft text-warning border-warning-border inline-flex items-center rounded-full border px-3 py-1.5 text-sm"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
