import { useParams } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { DetailHeader } from './components/DetailHeader'
import { RoundReachGrid } from './components/RoundReachGrid'
import { Timeline } from './components/Timeline'
import { riskBadgeKind } from './lib/reach'
import {
  TRAINEES,
  ROUND_OPTIONS,
  getTraineeDetailOverlay,
  type RoundBadgeKind,
  type RoundId,
  type RoundRecord,
  type TraineeRow,
} from './mockData'

/*
  MG-06 · 이슈 #47 — 교육생 상세를 3탭에서 단일 타임라인으로 전면 재작성. 회차 격자·
  배지는 TraineeRow.rounds가 유일한 정보원(§3 "MG-02 그 행을 그대로 쓴다") — 상세용
  스냅샷을 따로 두지 않는다. getTraineeDetailOverlay는 그 사이 사건(세션·다시 보기·
  리포트·면담)만 얹는다.

  v2 셸 스켈레톤(이슈 #50) 위로 이식하며 ManagerShell → ConsoleShell로 바꿨다 —
  user·cohort는 인증 붙기 전까지 ConsoleShell 기본값을 그대로 쓴다(MG-05 이식과 동일
  패턴). isLead 같은 v1 전용 prop은 ConsoleShell에 없어 같이 뺐다.

  D-1(조회 권한 없는 교육생): 서버 권한 판정이 없는 목업이라 "id가 존재하는가"만
  클라이언트에서 판별한다 — 존재하지 않는 id는 상세 차단 안내로 대체한다.
*/
export default function TraineeDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const row = id ? TRAINEES.find((t) => t.id === id) : undefined

  return (
    <ConsoleShell role="manager">
      {row ? (
        // key=row.id — 교육생을 바꿔 들어오면 필터·회차 접힘 상태를 새로 초기화한다.
        <TraineeDetailContent key={row.id} row={row} />
      ) : (
        <Alert variant="danger">
          <AlertTitle>조회 권한 없는 교육생입니다</AlertTitle>
          <AlertDescription>존재하지 않거나 접근 권한이 없는 교육생입니다(D-1).</AlertDescription>
        </Alert>
      )}
    </ConsoleShell>
  )
}

/** 헤더 위험 배지 — 가장 최근 응시 회차의 위험 배지만(§7 "에이스 배지는 명부 소관") */
function personRiskBadge(
  rounds: Partial<Record<RoundId, RoundRecord>>,
): Extract<RoundBadgeKind, 'DECLINE' | 'LOW_PERSISTENT'> | null {
  for (let i = ROUND_OPTIONS.length - 1; i >= 0; i--) {
    const record = rounds[ROUND_OPTIONS[i].value]
    if (record?.status === 'ATTENDED') return riskBadgeKind(record)
  }
  return null
}

function TraineeDetailContent({ row }: { row: TraineeRow }) {
  const rounds = row.rounds ?? {}
  const riskKind = personRiskBadge(rounds)
  const overlay = getTraineeDetailOverlay(row.id)
  const timeline = overlay.timeline.map((group) => ({
    ...group,
    badge: riskBadgeKind(rounds[group.roundId]),
  }))

  return (
    <>
      <DetailHeader
        name={row.name}
        className={row.className}
        riskKind={riskKind}
        why={riskKind ? overlay.signalWhy : undefined}
      />
      <RoundReachGrid rounds={rounds} />
      <Timeline groups={timeline} rounds={rounds} />
    </>
  )
}
