import { useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SignalHero } from './SignalHero'
import type { RoundBadgeKind } from '../_/api/types'

/*
  헤더 — 남는 건 이름·위험 배지·판정식뿐이다(MG-06 §3). 계정 상태·참여 프로젝트·팀은
  뺐다 — 팀은 사람이 아니라 회차 줄의 속성이라 타임라인 쪽으로 옮겼다(§3 "팀을 사람
  옆에 박지 않는다").

  ⚠ 뒤로가기 — 예전엔 `/manager/trainees`(명부)로 고정 링크였다. 이 화면은 명부
  말고도 면담 목록(MG-03)·히트맵(MG-02) 개인 뷰에서도 이름 클릭으로 들어온다 —
  고정 링크면 그 입구가 어디든 "돌아갈 곳"이 항상 명부가 돼 버린다(사용자 지적 —
  히트맵에서 들어왔는데 뒤로가기가 명부로 감). `navigate(-1)`(브라우저 히스토리
  뒤로)로 바꿔 **들어온 곳으로 그대로 돌아가게** 했다. 히트맵은 그 화면 상태(반·팀·
  회차)를 세션에 따로 저장해 뒀다가(`heatmap/viewState.ts`) 다시 마운트될 때
  복원한다 — `navigate(-1)`만으로는 주소만 같아질 뿐 화면 상태까지는 안 돌아온다.
*/
export function DetailHeader({
  name,
  cohortName,
  className,
  riskKind,
  why,
}: {
  name: string
  cohortName: string
  /** 반 배정 전이면 null */
  className: string | null
  riskKind: RoundBadgeKind | null
  why?: string | null
}) {
  const navigate = useNavigate()
  return (
    <div className="mb-4 flex items-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        aria-label="뒤로가기"
        onClick={() => navigate(-1)}
        className="p-1.5"
      >
        <ArrowLeft className="size-5" />
      </Button>
      <div className="flex flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-xl leading-tight font-bold tracking-[-0.01em]">{name}</h1>
        <SignalHero kind={riskKind} />
        {/* 반 배정 전이면 기수만 — `9기 · null`이 되지 않게 여기서 접는다 */}
        <span className="text-sm text-fg-muted">
          {[cohortName, className].filter(Boolean).join(' · ')}
        </span>
        {why && <span className="ml-auto text-xs text-fg-subtle">{why}</span>}
      </div>
    </div>
  )
}
